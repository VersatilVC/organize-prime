import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { UnifiedWebhookService } from '@/services/UnifiedWebhookService';

export interface KBFile {
  id: string;
  kb_id: string;
  organization_id: string;
  file_name: string;
  file_path: string;
  file_size: number;
  mime_type: string;
  status: 'pending' | 'processing' | 'completed' | 'error';
  processing_error?: string;
  chunk_count: number;
  uploaded_by: string;
  created_at: string;
  updated_at: string;
  kb_configuration?: {
    id: string;
    name: string;
    display_name: string;
  };
}

export interface FileUploadProgress {
  fileId: string;
  fileName: string;
  progress: number;
  status: 'uploading' | 'processing' | 'completed' | 'error';
  error?: string;
}

/**
 * Upload a file to a specific Knowledge Base
 */
export async function uploadFileToKB(
  kbId: string, 
  file: File, 
  organizationId: string,
  onProgress?: (progress: number) => void
): Promise<KBFile> {
  try {
    // Validate file type
    const allowedTypes = [
      'application/pdf',
      'text/plain',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/msword',
      'text/markdown'
    ];
    
    if (!allowedTypes.includes(file.type)) {
      throw new Error('Unsupported file type. Please upload PDF, TXT, DOCX, or MD files.');
    }

    // Validate file size (50MB max)
    const maxSize = 50 * 1024 * 1024; // 50MB in bytes
    if (file.size > maxSize) {
      throw new Error('File size must be less than 50MB.');
    }

    // Generate unique filename to prevent conflicts
    const timestamp = Date.now();
    const fileExtension = file.name.split('.').pop();
    const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const uniqueFileName = `${timestamp}_${sanitizedFileName}`;
    
    // Storage path: {orgId}/kb-files/{kbId}/{filename}
    const storagePath = `${organizationId}/kb-files/${kbId}/${uniqueFileName}`;

    // Upload file to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('kb-documents')
      .upload(storagePath, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      throw new Error(`Failed to upload file: ${uploadError.message}`);
    }

    // Create record in kb_files table
    const { data: fileRecord, error: dbError } = await supabase
      .from('kb_files')
      .insert({
        kb_id: kbId,
        organization_id: organizationId,
        file_name: file.name,
        file_path: storagePath,
        file_size: file.size,
        mime_type: file.type,
        status: 'pending',
        chunk_count: 0,
        uploaded_by: (await supabase.auth.getUser()).data.user?.id
      })
      .select(`
        *,
        kb_configuration:kb_configurations(id, name, display_name)
      `)
      .single();

    if (dbError) {
      console.error('Database error:', dbError);
      // Clean up uploaded file if database insert fails
      await supabase.storage.from('kb-documents').remove([storagePath]);
      throw new Error(`Failed to save file record: ${dbError.message}`);
    }

    // Trigger webhook processing if assigned (replaces hardcoded webhook system)
    try {
      const webhookResult = await UnifiedWebhookService.triggerFileProcessingWebhook(
        organizationId,
        fileRecord.uploaded_by || '',
        {
          fileId: fileRecord.id,
          fileName: file.name,
          filePath: storagePath,
          fileSize: file.size,
          mimeType: file.type,
          kbId: kbId
        }
      );

      if (webhookResult.success) {
        console.log('✅ File processing webhook triggered via dynamic assignment');
      } else {
        console.log('ℹ️ No file processing webhook assigned:', webhookResult.error);
        // Update file status to indicate webhook setup needed
        await supabase
          .from('kb_files')
          .update({
            status: 'pending',
            processing_error: webhookResult.error || 'No webhook assigned for automatic processing',
            updated_at: new Date().toISOString()
          })
          .eq('id', fileRecord.id);
      }
    } catch (webhookError) {
      console.warn('File processing webhook failed:', webhookError);
      await supabase
        .from('kb_files')
        .update({
          status: 'pending',
          processing_error: 'Webhook processing failed - manual intervention required',
          updated_at: new Date().toISOString()
        })
        .eq('id', fileRecord.id);
    }

    return fileRecord as KBFile;

  } catch (error) {
    console.error('File upload failed:', error);
    throw error;
  }
}

/**
 * Get files for a specific organization and optionally filter by KB
 */
export async function getKBFiles(
  organizationId: string, 
  kbId?: string,
  offset: number = 0,
  limit: number = 50
): Promise<{ files: KBFile[], totalCount: number }> {
  try {
    let query = supabase
      .from('kb_files')
      .select(`
        *,
        kb_configuration:kb_configurations(id, name, display_name)
      `, { count: 'exact' })
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (kbId) {
      query = query.eq('kb_id', kbId);
    }

    const { data, error, count } = await query;

    if (error) {
      console.error('Failed to fetch KB files:', error);
      throw new Error(`Failed to fetch files: ${error.message}`);
    }

    return {
      files: (data || []) as KBFile[],
      totalCount: count || 0
    };

  } catch (error) {
    console.error('Error fetching KB files:', error);
    throw error;
  }
}

/**
 * Delete a KB file and clean up all associated data
 */
export async function deleteKBFile(fileId: string): Promise<void> {
  try {
    // Get file details first
    const { data: file, error: fetchError } = await supabase
      .from('kb_files')
      .select('file_path, organization_id, kb_id')
      .eq('id', fileId)
      .single();

    if (fetchError) {
      throw new Error(`Failed to fetch file details: ${fetchError.message}`);
    }

    console.log(`🗑️ Starting deletion process for file: ${fileId}`);

    // Step 1: Delete processing logs
    const { error: logsError } = await supabase
      .from('kb_processing_logs')
      .delete()
      .eq('file_id', fileId);

    if (logsError) {
      console.warn('Failed to delete processing logs:', logsError);
    }

    // Step 2: Delete vectors from organization-specific vector table
    try {
      // Get organization's vector table name from kb_configurations
      const { data: kbConfig, error: kbError } = await supabase
        .from('kb_configurations')
        .select('vector_table_name')
        .eq('organization_id', file.organization_id)
        .single();

      if (kbConfig?.vector_table_name) {
        // Delete vectors by file_id in metadata using RPC function
        const { error: vectorError } = await supabase.rpc('delete_vectors_by_file_id', {
          table_name: kbConfig.vector_table_name,
          file_id: fileId
        });

        if (vectorError) {
          console.warn('Failed to delete vectors from table:', kbConfig.vector_table_name, vectorError);
        } else {
          console.log(`✅ Deleted vectors from ${kbConfig.vector_table_name} for file ${fileId}`);
        }
      }
    } catch (vectorErr) {
      console.warn('Vector cleanup skipped:', vectorErr);
    }

    // Step 3: Delete from storage
    const { error: storageError } = await supabase.storage
      .from('kb-documents')
      .remove([file.file_path]);

    if (storageError) {
      console.warn('Failed to delete file from storage:', storageError);
    }

    // Step 4: Delete from database (this should cascade to related records)
    const { error: dbError } = await supabase
      .from('kb_files')
      .delete()
      .eq('id', fileId);

    if (dbError) {
      throw new Error(`Failed to delete file record: ${dbError.message}`);
    }

    console.log(`✅ File deletion completed: ${fileId}`);

  } catch (error) {
    console.error('❌ Error deleting KB file:', error);
    throw error;
  }
}

/**
 * Retry processing for a failed file using dynamic webhook assignments
 */
export async function retryFileProcessing(fileId: string): Promise<void> {
  try {
    // Get file data
    const { data: file, error } = await supabase
      .from('kb_files')
      .select(`
        *,
        kb_configuration:kb_configurations(id, name, display_name)
      `)
      .eq('id', fileId)
      .single();

    if (error || !file) {
      throw new Error('File not found');
    }

    console.log(`🔄 Retrying file processing for: ${file.file_name}`);

    // Reset file status
    await supabase
      .from('kb_files')
      .update({
        status: 'pending',
        processing_error: null,
        updated_at: new Date().toISOString()
      })
      .eq('id', fileId);

    // Trigger webhook processing using unified service
    const webhookResult = await UnifiedWebhookService.triggerFileProcessingWebhook(
      file.organization_id,
      file.uploaded_by || '',
      {
        fileId: file.id,
        fileName: file.file_name,
        filePath: file.file_path,
        fileSize: file.file_size,
        mimeType: file.mime_type,
        kbId: file.kb_id
      }
    );

    if (!webhookResult.success) {
      // Update status to show retry failed
      await supabase
        .from('kb_files')
        .update({
          status: 'error',
          processing_error: webhookResult.error || 'Retry failed - no webhook assigned',
          updated_at: new Date().toISOString()
        })
        .eq('id', fileId);
        
      throw new Error(webhookResult.error || 'Retry failed');
    }

    console.log('✅ File processing retry triggered via dynamic webhook assignment');

  } catch (error) {
    console.error('Error retrying file processing:', error);
    throw error;
  }
}


/**
 * Get detailed file information including processing logs
 */
export async function getFileDetails(fileId: string): Promise<{
  file: KBFile;
  processingLogs: any[];
  downloadUrl?: string;
}> {
  try {
    // Get file details
    const { data: file, error: fileError } = await supabase
      .from('kb_files')
      .select(`
        *,
        kb_configuration:kb_configurations(id, name, display_name)
      `)
      .eq('id', fileId)
      .single();

    if (fileError) {
      throw new Error(`Failed to fetch file details: ${fileError.message}`);
    }

    // Get processing logs
    const { data: processingLogs, error: logsError } = await supabase
      .from('kb_processing_logs')
      .select('*')
      .eq('file_id', fileId)
      .order('created_at', { ascending: true });

    if (logsError) {
      console.warn('Failed to fetch processing logs:', logsError);
    }

    // Get download URL for the file
    let downloadUrl: string | undefined;
    try {
      const { data: urlData } = await supabase.storage
        .from('kb-documents')
        .createSignedUrl(file.file_path, 3600); // 1 hour expiry

      downloadUrl = urlData?.signedUrl;
    } catch (urlError) {
      console.warn('Failed to generate download URL:', urlError);
    }

    return {
      file: file as KBFile,
      processingLogs: processingLogs || [],
      downloadUrl,
    };

  } catch (error) {
    console.error('Error fetching file details:', error);
    throw error;
  }
}

/**
 * Reset file status and clear errors for retry
 */
export async function resetFileForRetry(fileId: string): Promise<void> {
  try {
    console.log(`🔄 Resetting file for retry: ${fileId}`);

    // Clear processing error and reset status
    const { error } = await supabase
      .from('kb_files')
      .update({
        status: 'pending',
        processing_error: null,
        chunk_count: 0,
        updated_at: new Date().toISOString()
      })
      .eq('id', fileId);

    if (error) {
      throw new Error(`Failed to reset file status: ${error.message}`);
    }

    // Clear old processing logs
    const { error: logsError } = await supabase
      .from('kb_processing_logs')
      .delete()
      .eq('file_id', fileId);

    if (logsError) {
      console.warn('Failed to clear processing logs:', logsError);
    }

    console.log(`✅ File reset completed: ${fileId}`);

  } catch (error) {
    console.error('❌ Error resetting file:', error);
    throw error;
  }
}

/**
 * Get file processing statistics
 */
export async function getFileProcessingStats(organizationId: string): Promise<{
  totalFiles: number;
  pendingFiles: number;
  processingFiles: number;
  completedFiles: number;
  errorFiles: number;
  totalStorage: number;
  averageProcessingTime?: number;
}> {
  try {
    const { data, error } = await supabase
      .from('kb_files')
      .select('status, file_size, created_at, updated_at')
      .eq('organization_id', organizationId);

    if (error) {
      throw new Error(`Failed to fetch file stats: ${error.message}`);
    }

    const totalStorage = data?.reduce((sum, file) => sum + (file.file_size || 0), 0) || 0;
    
    // Calculate average processing time for completed files
    const completedFiles = data?.filter(f => f.status === 'completed') || [];
    let averageProcessingTime: number | undefined;
    
    if (completedFiles.length > 0) {
      const totalProcessingTime = completedFiles.reduce((sum, file) => {
        const created = new Date(file.created_at).getTime();
        const updated = new Date(file.updated_at).getTime();
        return sum + (updated - created);
      }, 0);
      
      averageProcessingTime = totalProcessingTime / completedFiles.length;
    }

    const stats = {
      totalFiles: data?.length || 0,
      pendingFiles: data?.filter(f => f.status === 'pending').length || 0,
      processingFiles: data?.filter(f => f.status === 'processing').length || 0,
      completedFiles: completedFiles.length,
      errorFiles: data?.filter(f => f.status === 'error').length || 0,
      totalStorage,
      averageProcessingTime,
    };

    return stats;

  } catch (error) {
    console.error('Error fetching file stats:', error);
    throw error;
  }
}

/**
 * Get analytics by Knowledge Base
 */
export async function getKBAnalytics(organizationId: string): Promise<{
  kbId: string;
  kbName: string;
  totalFiles: number;
  completedFiles: number;
  errorFiles: number;
  totalChunks: number;
  totalStorage: number;
  successRate: number;
}[]> {
  try {
    const { data, error } = await supabase
      .from('kb_files')
      .select(`
        kb_id,
        status,
        file_size,
        chunk_count,
        kb_configuration:kb_configurations(name, display_name)
      `)
      .eq('organization_id', organizationId);

    if (error) {
      throw new Error(`Failed to fetch KB analytics: ${error.message}`);
    }

    // Group by KB and calculate metrics
    const kbMap = new Map();
    
    data?.forEach(file => {
      const kbId = file.kb_id;
      if (!kbMap.has(kbId)) {
        kbMap.set(kbId, {
          kbId,
          kbName: file.kb_configuration?.display_name || file.kb_configuration?.name || 'Unknown',
          totalFiles: 0,
          completedFiles: 0,
          errorFiles: 0,
          totalChunks: 0,
          totalStorage: 0,
        });
      }
      
      const kb = kbMap.get(kbId);
      kb.totalFiles++;
      kb.totalStorage += file.file_size || 0;
      kb.totalChunks += file.chunk_count || 0;
      
      if (file.status === 'completed') kb.completedFiles++;
      if (file.status === 'error') kb.errorFiles++;
    });

    // Calculate success rates
    const analytics = Array.from(kbMap.values()).map(kb => ({
      ...kb,
      successRate: kb.totalFiles > 0 ? (kb.completedFiles / kb.totalFiles) * 100 : 0,
    }));

    return analytics;

  } catch (error) {
    console.error('Error fetching KB analytics:', error);
    throw error;
  }
}