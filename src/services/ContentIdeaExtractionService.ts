// Content Idea Extraction Service
// Handles file/URL extraction and N8N processing for content ideas

import { supabase } from '@/integrations/supabase/client';
import { N8NWebhookService } from '@/apps/shared/services/N8NWebhookService';
import type {
  SourceFile,
  ContentIdeaExtraction,
  ExtractionStatusResponse,
  ContentIdeaWebhookPayload,
  N8NWebhookResponse,
  AISuggestions
} from '@/types/content-creation';
import type { N8NWebhookConfig } from '@/apps/shared/types/AppTypes';

export class ContentIdeaExtractionService {
  /**
   * Upload files and URLs for extraction
   */
  static async uploadAndExtract(
    ideaId: string,
    files: File[],
    urls: string[]
  ): Promise<{ success: boolean; message: string; extractions?: string[] }> {
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

      // Prepare source files array
      const sourceFiles: SourceFile[] = [];

      // Process uploaded files - upload to storage first
      for (const file of files) {
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
          'application/vnd.ms-excel'
        ];

        if (!allowedTypes.includes(file.type)) {
          throw new Error(`Unsupported file type for ${file.name}. Please upload supported document formats.`);
        }

        // Validate file size (50MB max)
        const maxSize = 50 * 1024 * 1024; // 50MB
        if (file.size > maxSize) {
          throw new Error(`File ${file.name} exceeds 50MB limit.`);
        }

        // Generate unique filename
        const timestamp = Date.now();
        const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
        const uniqueFileName = `${timestamp}_${sanitizedFileName}`;
        
        // Storage path: {orgId}/content-ideas/{filename}
        const storagePath = `${membership.organization_id}/content-ideas/${uniqueFileName}`;

        // Upload file to Supabase Storage
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('organization-files')
          .upload(storagePath, file, {
            cacheControl: '3600',
            upsert: false
          });

        if (uploadError) {
          throw new Error(`Failed to upload ${file.name}: ${uploadError.message}`);
        }

        // Get signed URL for the uploaded file (24-hour expiry)
        const { data: urlData, error: urlError } = await supabase.storage
          .from('organization-files')
          .createSignedUrl(storagePath, 24 * 60 * 60); // 24 hours

        if (urlError || !urlData?.signedUrl) {
          throw new Error(`Failed to generate signed URL for ${file.name}: ${urlError?.message || 'No URL returned'}`);
        }

        sourceFiles.push({
          type: 'file',
          name: file.name,
          value: urlData.signedUrl, // Store signed URL instead of base64
          size: file.size,
          mimeType: file.type,
          status: 'pending'
        });
      }

      // Process URLs
      for (const url of urls) {
        sourceFiles.push({
          type: 'url',
          name: this.extractDomainFromUrl(url),
          value: url,
          status: 'pending'
        });
      }

      // Update content idea with source files and status
      const { error: updateError } = await supabase
        .from('content_ideas')
        .update({
          source_files: sourceFiles,
          extraction_status: 'pending',
          processing_status: 'extracting',
          extraction_error: null,
          processing_error: null
        })
        .eq('id', ideaId);

      if (updateError) throw updateError;

      // Database trigger will automatically queue extraction for all files when source_files is updated
      // No need for individual file processing - the trigger handles batch processing
      console.log(`✅ Uploaded ${sourceFiles.length} files/URLs to content idea ${ideaId}`);
      console.log(`📋 Database trigger will automatically queue extraction when source_files are saved`);

      return {
        success: true,
        message: `Uploaded ${sourceFiles.length} files/URLs - extraction will be queued automatically`,
        extractions: [] // No individual extraction IDs since we're using batch processing
      };
    } catch (error) {
      console.error('ContentIdeaExtractionService.uploadAndExtract error:', error);
      throw error;
    }
  }

  /**
   * Get extraction status for a content idea
   */
  static async getExtractionStatus(ideaId: string): Promise<ExtractionStatusResponse> {
    try {
      // Get content idea with extraction data
      const { data: idea, error: ideaError } = await supabase
        .from('content_ideas')
        .select(`
          extraction_status,
          processing_status,
          source_files,
          extracted_content,
          extraction_error,
          processing_error,
          ai_suggestions,
          last_processed_at
        `)
        .eq('id', ideaId)
        .single();

      if (ideaError) throw ideaError;

      // Get extraction logs
      const { data: extractions, error: extractionsError } = await supabase
        .from('content_idea_extractions')
        .select('*')
        .eq('content_idea_id', ideaId)
        .order('created_at', { ascending: false });

      if (extractionsError) throw extractionsError;

      // Collect all errors
      const errors: string[] = [];
      if (idea.extraction_error) errors.push(idea.extraction_error);
      if (idea.processing_error) errors.push(idea.processing_error);
      extractions?.forEach(ext => {
        if (ext.error_message) errors.push(ext.error_message);
      });

      return {
        extraction_status: idea.extraction_status,
        processing_status: idea.processing_status,
        source_files: idea.source_files || [],
        extractions: extractions || [],
        ai_suggestions: idea.ai_suggestions,
        errors
      };
    } catch (error) {
      console.error('ContentIdeaExtractionService.getExtractionStatus error:', error);
      throw error;
    }
  }

  /**
   * Retry extraction for a specific file
   */
  static async retryExtraction(
    ideaId: string,
    fileName: string
  ): Promise<{ success: boolean; message: string }> {
    try {
      // Get current organization
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

      // Get the source file
      const { data: idea, error: ideaError } = await supabase
        .from('content_ideas')
        .select('source_files')
        .eq('id', ideaId)
        .single();

      if (ideaError) throw ideaError;

      const sourceFile = idea.source_files?.find((f: SourceFile) => f.name === fileName);
      if (!sourceFile) {
        throw new Error(`Source file ${fileName} not found`);
      }

      // Update source file status to pending
      const updatedSourceFiles = idea.source_files.map((f: SourceFile) =>
        f.name === fileName ? { ...f, status: 'pending', error: undefined } : f
      );

      await supabase
        .from('content_ideas')
        .update({ 
          source_files: updatedSourceFiles,
          extraction_status: 'pending'
        })
        .eq('id', ideaId);

      // Database trigger will automatically queue extraction when source_files are updated
      // The trigger detects the status change and queues the retry
      console.log(`✅ Reset ${fileName} status to pending for content idea ${ideaId}`);
      console.log(`📋 Database trigger will automatically queue retry extraction`);

      return {
        success: true,
        message: `Retrying extraction for ${fileName} - will be queued automatically`
      };
    } catch (error) {
      console.error('ContentIdeaExtractionService.retryExtraction error:', error);
      throw error;
    }
  }

  /**
   * Process content idea with N8N webhook
   */
  static async processWithN8N(
    ideaId: string,
    webhookConfig: N8NWebhookConfig
  ): Promise<{ success: boolean; message: string }> {
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

      // Get content idea data
      const { data: idea, error: ideaError } = await supabase
        .from('content_ideas')
        .select('*')
        .eq('id', ideaId)
        .single();

      if (ideaError) throw ideaError;

      // Update processing status - should already be "generating ideas" from extraction
      await supabase
        .from('content_ideas')
        .update({
          processing_status: 'generating ideas',
          processing_error: null
        })
        .eq('id', ideaId);

      // Prepare webhook payload
      const payload: ContentIdeaWebhookPayload = {
        ideaId: idea.id,
        title: idea.title,
        description: idea.description,
        extractedContent: idea.extracted_content,
        targetAudience: idea.target_audience,
        contentType: idea.content_type,
        keywords: idea.keywords || [],
        organizationId: membership.organization_id,
        userId: user.id
      };

      // Execute N8N webhook
      const response = await N8NWebhookService.executeWebhook(
        webhookConfig,
        payload,
        membership.organization_id,
        user.id,
        'content-ideas'
      );

      // Process response
      await this.handleN8NResponse(ideaId, response);

      return {
        success: true,
        message: 'N8N processing initiated successfully'
      };
    } catch (error) {
      console.error('ContentIdeaExtractionService.processWithN8N error:', error);
      
      // Update error status
      await supabase
        .from('content_ideas')
        .update({
          processing_status: 'failed',
          processing_error: error instanceof Error ? error.message : 'Unknown error'
        })
        .eq('id', ideaId);

      throw error;
    }
  }

  /**
   * Handle N8N webhook response
   */
  private static async handleN8NResponse(ideaId: string, response: any): Promise<void> {
    try {
      const webhookResponse: N8NWebhookResponse = response;

      if (webhookResponse.success && webhookResponse.suggestions) {
        const aiSuggestions: AISuggestions = {
          suggestions: webhookResponse.suggestions,
          processing_metadata: {
            processing_time: webhookResponse.processing_time || 0,
            confidence_threshold: 0.7
          },
          generated_at: new Date().toISOString()
        };

        await supabase
          .from('content_ideas')
          .update({
            processing_status: 'ready',
            ai_suggestions: aiSuggestions,
            last_processed_at: new Date().toISOString()
          })
          .eq('id', ideaId);
      } else {
        await supabase
          .from('content_ideas')
          .update({
            processing_status: 'failed',
            processing_error: webhookResponse.error || 'N8N processing failed'
          })
          .eq('id', ideaId);
      }
    } catch (error) {
      console.error('Error handling N8N response:', error);
      await supabase
        .from('content_ideas')
        .update({
          processing_status: 'failed',
          processing_error: 'Failed to process N8N response'
        })
        .eq('id', ideaId);
    }
  }



  /**
   * Extract domain from URL for display name
   */
  private static extractDomainFromUrl(url: string): string {
    try {
      const urlObj = new URL(url);
      return urlObj.hostname;
    } catch {
      return url.substring(0, 50) + (url.length > 50 ? '...' : '');
    }
  }
}