import { supabase } from '@/integrations/supabase/client';

export interface KBExtractionRequest {
  type: 'file' | 'url';
  content: string; // Base64 for files, URL for URLs
  filename: string;
  kbId: string;
  fileId?: string; // Optional for updates
  options?: {
    chunkSize?: number;
    chunkOverlap?: number;
    generateEmbeddings?: boolean;
  };
}

export interface KBExtractionResponse {
  success: boolean;
  fileId?: string;
  extractedContent?: string;
  chunks?: number;
  embeddings?: number;
  metadata?: {
    originalFormat: string;
    extractionTime: number;
    wordCount: number;
    fileSize: number;
    convertApiUsed?: boolean;
  };
  error?: string;
}

export interface KBFile {
  id: string;
  kb_id: string;
  organization_id: string;
  file_name: string;
  file_path: string;
  file_size?: number;
  mime_type?: string;
  source_type: 'file' | 'url';
  source_url?: string;
  status: 'pending' | 'processing' | 'completed' | 'error';
  extraction_status: 'pending' | 'processing' | 'completed' | 'failed';
  extraction_metadata?: any;
  embedding_status: 'pending' | 'processing' | 'completed' | 'failed';
  embedding_count: number;
  chunk_count: number;
  extracted_content?: string;
  processing_error?: string;
  uploaded_by?: string;
  created_at: string;
  updated_at: string;
}

export interface KBExtractionLog {
  id: string;
  kb_file_id: string;
  organization_id: string;
  extraction_method: string;
  status: string;
  markdown_content?: string;
  extraction_metadata?: any;
  processing_time_ms?: number;
  error_message?: string;
  created_at: string;
  updated_at: string;
}

/**
 * Service for handling Knowledge Base file content extraction using ConvertAPI
 */
export class KBContentExtractionService {
  /**
   * Upload and extract content from a file
   */
  static async uploadAndExtractFile(
    file: File, 
    kbId: string,
    options?: KBExtractionRequest['options']
  ): Promise<{ success: boolean; fileId?: string; message: string }> {
    try {
      // Get current user and organization
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) throw new Error('User not authenticated');

      const { data: membership, error: membershipError } = await supabase
        .from('memberships')
        .select('organization_id')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .limit(1)
        .single();

      if (membershipError || !membership) {
        throw new Error('No active organization membership found');
      }

      // Validate file type
      const allowedTypes = [
        'application/pdf',
        'text/plain',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/msword',
        'text/markdown',
        'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        'application/vnd.ms-powerpoint',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.ms-excel',
        'application/rtf',
        'application/vnd.oasis.opendocument.text'
      ];

      if (!allowedTypes.includes(file.type)) {
        throw new Error(`Unsupported file type: ${file.type}. Please upload supported document formats.`);
      }

      // Validate file size (50MB max)
      const maxSize = 50 * 1024 * 1024; // 50MB
      if (file.size > maxSize) {
        throw new Error(`File ${file.name} exceeds 50MB limit.`);
      }

      // Upload file to storage first
      const timestamp = Date.now();
      const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
      const uniqueFileName = `${timestamp}_${sanitizedFileName}`;
      const storagePath = `${membership.organization_id}/kb-documents/${uniqueFileName}`;

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('kb-documents')
        .upload(storagePath, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) {
        throw new Error(`Failed to upload ${file.name}: ${uploadError.message}`);
      }

      // Convert file to base64 for ConvertAPI
      const base64Content = await this.fileToBase64(file);

      // Call extraction edge function
      const response = await this.callExtractionFunction({
        type: 'file',
        content: base64Content,
        filename: file.name,
        kbId,
        options
      });

      if (!response.success) {
        throw new Error(response.error || 'Extraction failed');
      }

      console.log(`✅ File extraction completed for ${file.name}:`, {
        fileId: response.fileId,
        chunks: response.chunks,
        embeddings: response.embeddings
      });

      return {
        success: true,
        fileId: response.fileId,
        message: `File uploaded and processed successfully. Generated ${response.chunks} chunks and ${response.embeddings} embeddings.`
      };
    } catch (error) {
      console.error('KBContentExtractionService.uploadAndExtractFile error:', error);
      throw error;
    }
  }

  /**
   * Extract content from a URL
   */
  static async uploadAndExtractUrl(
    url: string,
    kbId: string,
    filename?: string,
    options?: KBExtractionRequest['options']
  ): Promise<{ success: boolean; fileId?: string; message: string }> {
    try {
      // Validate URL format
      try {
        new URL(url);
      } catch {
        throw new Error('Invalid URL format');
      }

      // Generate filename from URL if not provided
      if (!filename) {
        const urlObj = new URL(url);
        filename = urlObj.hostname + urlObj.pathname.replace(/\//g, '_') + '.html';
      }

      // Call extraction edge function
      const response = await this.callExtractionFunction({
        type: 'url',
        content: url,
        filename,
        kbId,
        options
      });

      if (!response.success) {
        throw new Error(response.error || 'URL extraction failed');
      }

      console.log(`✅ URL extraction completed for ${url}:`, {
        fileId: response.fileId,
        chunks: response.chunks,
        embeddings: response.embeddings
      });

      return {
        success: true,
        fileId: response.fileId,
        message: `URL content extracted successfully. Generated ${response.chunks} chunks and ${response.embeddings} embeddings.`
      };
    } catch (error) {
      console.error('KBContentExtractionService.uploadAndExtractUrl error:', error);
      throw error;
    }
  }

  /**
   * Retry extraction for a failed file
   */
  static async retryExtraction(
    fileId: string,
    options?: KBExtractionRequest['options']
  ): Promise<{ success: boolean; message: string }> {
    try {
      // Get the file details
      const { data: file, error: fileError } = await supabase
        .from('kb_files')
        .select('*')
        .eq('id', fileId)
        .single();

      if (fileError || !file) {
        throw new Error('File not found');
      }

      let extractionRequest: KBExtractionRequest;

      if (file.source_type === 'url') {
        // For URLs, use the stored source_url
        extractionRequest = {
          type: 'url',
          content: file.source_url!,
          filename: file.file_name,
          kbId: file.kb_id,
          fileId,
          options
        };
      } else {
        // For files, get the file from storage and convert to base64
        const { data: fileData, error: downloadError } = await supabase.storage
          .from('kb-documents')
          .download(file.file_path);

        if (downloadError || !fileData) {
          throw new Error('Failed to download file for retry');
        }

        const base64Content = await this.blobToBase64(fileData);
        
        extractionRequest = {
          type: 'file',
          content: base64Content,
          filename: file.file_name,
          kbId: file.kb_id,
          fileId,
          options
        };
      }

      // Call extraction edge function
      const response = await this.callExtractionFunction(extractionRequest);

      if (!response.success) {
        throw new Error(response.error || 'Retry extraction failed');
      }

      return {
        success: true,
        message: `Retry successful. Generated ${response.chunks} chunks and ${response.embeddings} embeddings.`
      };
    } catch (error) {
      console.error('KBContentExtractionService.retryExtraction error:', error);
      throw error;
    }
  }

  /**
   * Get extraction status for a file
   */
  static async getExtractionStatus(fileId: string): Promise<{
    file: KBFile;
    logs: KBExtractionLog[];
  }> {
    try {
      // Get file details
      const { data: file, error: fileError } = await supabase
        .from('kb_files')
        .select('*')
        .eq('id', fileId)
        .single();

      if (fileError) throw fileError;

      // Get extraction logs
      const { data: logs, error: logsError } = await supabase
        .from('kb_extraction_logs')
        .select('*')
        .eq('kb_file_id', fileId)
        .order('created_at', { ascending: false });

      if (logsError) throw logsError;

      return {
        file: file as KBFile,
        logs: (logs || []) as KBExtractionLog[]
      };
    } catch (error) {
      console.error('KBContentExtractionService.getExtractionStatus error:', error);
      throw error;
    }
  }

  /**
   * Delete a file and its associated data
   */
  static async deleteFile(fileId: string): Promise<{ success: boolean; message: string }> {
    try {
      // Get file details first
      const { data: file, error: fileError } = await supabase
        .from('kb_files')
        .select('file_path, source_type, organization_id')
        .eq('id', fileId)
        .single();

      if (fileError || !file) {
        throw new Error('File not found');
      }

      // Delete from storage if it's a file (not URL)
      if (file.source_type === 'file') {
        const { error: storageError } = await supabase.storage
          .from('kb-documents')
          .remove([file.file_path]);

        if (storageError) {
          console.warn('Warning: Failed to delete file from storage:', storageError);
        }
      }

      // Delete vectors from vector table
      const vectorTableName = `org_vectors_${file.organization_id.replace(/-/g, '_')}`;
      const { error: vectorError } = await supabase
        .from(vectorTableName)
        .delete()
        .eq('source_file_id', fileId);

      if (vectorError) {
        console.warn('Warning: Failed to delete vectors:', vectorError);
      }

      // Delete file record (this will cascade delete extraction logs)
      const { error: deleteError } = await supabase
        .from('kb_files')
        .delete()
        .eq('id', fileId);

      if (deleteError) {
        throw new Error(`Failed to delete file: ${deleteError.message}`);
      }

      return {
        success: true,
        message: 'File and associated data deleted successfully'
      };
    } catch (error) {
      console.error('KBContentExtractionService.deleteFile error:', error);
      throw error;
    }
  }

  /**
   * Call the kb-file-extraction edge function
   */
  private static async callExtractionFunction(request: KBExtractionRequest): Promise<KBExtractionResponse> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('No active session');
      }

      // Get current user and organization context
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        throw new Error('Failed to get user information');
      }

      const { data: membership, error: membershipError } = await supabase
        .from('memberships')
        .select('organization_id')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .limit(1)
        .single();

      if (membershipError || !membership) {
        throw new Error('No active organization membership found');
      }

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      if (!supabaseUrl) {
        throw new Error('Supabase URL not configured');
      }

      console.log(`📡 Calling KB extraction function for ${request.type}:`, request.filename);

      // Add user and organization context to the request
      const requestWithContext = {
        ...request,
        userId: user.id,
        organizationId: membership.organization_id
      };

      const response = await fetch(`${supabaseUrl}/functions/v1/kb-file-extraction`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
          'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY || '',
        },
        body: JSON.stringify(requestWithContext)
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Edge Function error: ${response.status} ${response.statusText} - ${errorText}`);
      }

      const result: KBExtractionResponse = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Extraction failed');
      }

      return result;
    } catch (error) {
      console.error('Error calling extraction function:', error);
      throw error;
    }
  }

  /**
   * Convert File to base64 string
   */
  private static async fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          // Remove the data:mime/type;base64, prefix
          const base64 = reader.result.split(',')[1];
          resolve(base64);
        } else {
          reject(new Error('Failed to convert file to base64'));
        }
      };
      reader.onerror = error => reject(error);
    });
  }

  /**
   * Convert Blob to base64 string
   */
  private static async blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(blob);
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          // Remove the data:mime/type;base64, prefix
          const base64 = reader.result.split(',')[1];
          resolve(base64);
        } else {
          reject(new Error('Failed to convert blob to base64'));
        }
      };
      reader.onerror = error => reject(error);
    });
  }

  /**
   * Subscribe to file status updates for real-time progress
   */
  static subscribeToFileUpdates(
    fileId: string,
    callback: (file: KBFile) => void
  ): (() => void) {
    console.log(`🔔 Subscribing to file updates for: ${fileId}`);

    const channel = supabase.channel(`file-${fileId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'kb_files',
          filter: `id=eq.${fileId}`
        },
        (payload) => {
          console.log('📡 File update received:', payload);
          if (payload.new) {
            callback(payload.new as KBFile);
          }
        }
      )
      .subscribe();

    // Return unsubscribe function
    return () => {
      console.log('🔕 Unsubscribing from file updates');
      channel.unsubscribe();
    };
  }

  /**
   * Subscribe to extraction log updates
   */
  static subscribeToExtractionLogs(
    fileId: string,
    callback: (log: KBExtractionLog) => void
  ): (() => void) {
    console.log(`🔔 Subscribing to extraction logs for: ${fileId}`);

    const channel = supabase.channel(`extraction-logs-${fileId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'kb_extraction_logs',
          filter: `kb_file_id=eq.${fileId}`
        },
        (payload) => {
          console.log('📡 Extraction log update:', payload);
          if (payload.new) {
            callback(payload.new as KBExtractionLog);
          }
        }
      )
      .subscribe();

    // Return unsubscribe function
    return () => {
      console.log('🔕 Unsubscribing from extraction logs');
      channel.unsubscribe();
    };
  }
}