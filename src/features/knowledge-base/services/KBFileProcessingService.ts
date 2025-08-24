import { supabase } from '@/integrations/supabase/client';
import { KBFile } from './fileUploadApi';

export interface FileProcessingRequest {
  fileId: string;
  filePath: string;
  fileName: string;
  kbId: string;
  organizationId: string;
  mimeType: string;
  fileSize: number;
  uploadedBy?: string;
}

export interface WebhookConfig {
  id: string;
  name: string;
  url: string;
  secret_key?: string;
  headers?: Record<string, string>;
  timeout_seconds: number;
  retry_attempts: number;
  is_active: boolean;
}

export interface ProcessingResponse {
  success: boolean;
  statusCode: number;
  message?: string;
  processingId?: string;
  estimatedTime?: number;
  error?: string;
}

export class KBFileProcessingService {
  private static readonly WEBHOOK_NAME = 'process-kb-file';
  private static readonly MAX_RETRIES = 3;
  private static readonly RETRY_DELAY_MS = 2000;

  /**
   * Trigger N8N file processing workflow
   */
  static async triggerFileProcessing(fileData: FileProcessingRequest): Promise<ProcessingResponse> {
    try {
      console.log(`🚀 Starting file processing for: ${fileData.fileName}`);

      // Get webhook configuration
      const webhookConfig = await this.getWebhookConfig();
      if (!webhookConfig) {
        throw new Error('File processing webhook not configured. Please contact your administrator to set up automatic file processing.');
      }

      if (!webhookConfig.is_active) {
        throw new Error('File processing webhook is disabled. Please contact your administrator to enable automatic processing.');
      }

      // Update file status to processing
      await this.updateFileStatus(fileData.fileId, 'processing');

      // Call N8N webhook
      const response = await this.callWebhook(webhookConfig, fileData);

      // Update webhook stats on success
      await this.updateWebhookStats(webhookConfig.id, true, response.statusCode);

      console.log(`✅ File processing initiated successfully for: ${fileData.fileName}`);
      return response;

    } catch (error) {
      console.error(`❌ File processing failed for: ${fileData.fileName}`, error);
      
      // Update file status to error
      await this.updateFileStatus(
        fileData.fileId, 
        'error', 
        error instanceof Error ? error.message : 'Unknown processing error'
      );

      // Update webhook stats on failure
      const webhookConfig = await this.getWebhookConfig();
      if (webhookConfig) {
        await this.updateWebhookStats(webhookConfig.id, false, 0);
      }

      return {
        success: false,
        statusCode: 500,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Retry file processing for failed files
   */
  static async retryFileProcessing(fileId: string): Promise<ProcessingResponse> {
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

      const fileData: FileProcessingRequest = {
        fileId: file.id,
        filePath: file.file_path,
        fileName: file.file_name,
        kbId: file.kb_id,
        organizationId: file.organization_id,
        mimeType: file.mime_type,
        fileSize: file.file_size,
        uploadedBy: file.uploaded_by
      };

      return await this.triggerFileProcessing(fileData);

    } catch (error) {
      console.error('❌ File retry failed:', error);
      return {
        success: false,
        statusCode: 500,
        error: error instanceof Error ? error.message : 'Retry failed'
      };
    }
  }

  /**
   * Get webhook configuration from database
   */
  private static async getWebhookConfig(): Promise<WebhookConfig | null> {
    try {
      console.log('🔍 Looking for webhook config with name:', this.WEBHOOK_NAME);
      
      // First, let's check what webhooks exist in the database
      const { data: allWebhooks, error: listError } = await supabase
        .from('webhooks')
        .select('id, name, webhook_url, is_active')
        .limit(10);
        
      if (listError) {
        console.error('❌ Error listing webhooks:', listError);
      } else {
        console.log('📋 Available webhooks:', allWebhooks);
      }

      // Now try to find the specific webhook we need
      const { data, error } = await supabase
        .from('webhooks')
        .select('id, name, webhook_url, headers, is_active')
        .eq('name', this.WEBHOOK_NAME)
        .single();

      if (error) {
        console.error('❌ Failed to get webhook config for name "' + this.WEBHOOK_NAME + '":', error);
        
        // Try a broader search without feature_slug restriction
        const { data: fallbackData, error: fallbackError } = await supabase
          .from('webhooks')
          .select('id, name, webhook_url, headers, is_active')
          .eq('is_active', true)
          .limit(1)
          .single();
          
        if (!fallbackError && fallbackData) {
          console.log('✅ Found active webhook as fallback:', fallbackData.name);
          return {
            id: fallbackData.id,
            name: fallbackData.name,
            url: fallbackData.webhook_url,
            headers: fallbackData.headers || {},
            timeout_seconds: 120, // Default timeout
            retry_attempts: 3, // Default retries
            is_active: fallbackData.is_active
          } as WebhookConfig;
        }
        
        return null;
      }

      console.log('✅ Found webhook config:', data.name, data.webhook_url);
      return {
        id: data.id,
        name: data.name,
        url: data.webhook_url,
        headers: data.headers || {},
        timeout_seconds: 120, // Default timeout
        retry_attempts: 3, // Default retries
        is_active: data.is_active
      } as WebhookConfig;
    } catch (error) {
      console.error('❌ Error fetching webhook config:', error);
      return null;
    }
  }

  /**
   * Call N8N webhook with file data
   */
  private static async callWebhook(
    config: WebhookConfig, 
    fileData: FileProcessingRequest
  ): Promise<ProcessingResponse> {
    // Generate direct download URL for the file
    let downloadUrl: string | null = null;
    try {
      console.log('🔗 Generating download URL for file:', fileData.filePath);
      
      const { data: urlData, error: urlError } = await supabase.storage
        .from('kb-documents')
        .createSignedUrl(fileData.filePath, 86400); // 24 hours expiry

      if (urlError) {
        console.error('❌ Supabase URL generation error:', urlError);
      } else if (urlData?.signedUrl) {
        downloadUrl = urlData.signedUrl;
        console.log('✅ Generated download URL successfully:', downloadUrl.substring(0, 100) + '...');
      } else {
        console.warn('⚠️ No signed URL returned from Supabase');
      }
    } catch (urlError) {
      console.error('❌ Failed to generate download URL for webhook:', urlError);
    }

    const payload = {
      // Event identification
      event_type: 'file_uploaded',
      file_id: fileData.fileId,
      kb_id: fileData.kbId,
      
      // Organization context
      organization_id: fileData.organizationId,
      
      // File details
      file_name: fileData.fileName,
      file_path: fileData.filePath,
      file_size: fileData.fileSize,
      mime_type: fileData.mimeType,
      
      // User context
      uploaded_by: fileData.uploadedBy,
      user_id: fileData.uploadedBy,
      
      // Timing
      uploaded_at: new Date().toISOString(),
      timestamp: new Date().toISOString(),
      triggered_at: new Date().toISOString(),
      
      // Processing
      download_url: downloadUrl, // Direct download URL for N8N processing
      user_triggered: false, // This is automatic file processing
      
      // Additional context
      webhook_config: {
        retry_attempts: config.retry_attempts,
        timeout_seconds: config.timeout_seconds
      },
      
      // Browser context (if available from global)
      user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : 'Server',
      page_url: '/file-upload'
    };

    console.log('📋 Webhook payload prepared:', {
      ...payload,
      download_url: downloadUrl ? downloadUrl.substring(0, 100) + '...' : null
    });

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'User-Agent': 'OrganizePrime/1.0',
      ...config.headers || {}
    };

    // Add authentication if secret key is provided
    if (config.secret_key) {
      headers['Authorization'] = `Bearer ${config.secret_key}`;
    }

    let lastError: Error | null = null;
    let attempts = 0;
    const maxAttempts = Math.min(config.retry_attempts || 1, this.MAX_RETRIES);

    while (attempts < maxAttempts) {
      attempts++;
      
      try {
        console.log(`📡 Calling N8N webhook (attempt ${attempts}/${maxAttempts}):`, config.url);

        const controller = new AbortController();
        const timeoutId = setTimeout(
          () => controller.abort(),
          (config.timeout_seconds || 120) * 1000
        );

        const response = await fetch(config.url, {
          method: 'POST',
          headers,
          body: JSON.stringify(payload),
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          throw new Error(
            `N8N webhook failed with status ${response.status}: ${response.statusText}`
          );
        }

        let responseData: any = {};
        try {
          responseData = await response.json();
        } catch {
          // N8N might not return JSON, that's okay
          responseData = { message: 'Processing started' };
        }

        console.log(`✅ N8N webhook successful (attempt ${attempts}):`, responseData);

        return {
          success: true,
          statusCode: response.status,
          message: responseData.message || 'Processing started successfully',
          processingId: responseData.processingId,
          estimatedTime: responseData.estimatedTime
        };

      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error');
        console.warn(`⚠️ N8N webhook attempt ${attempts} failed:`, lastError.message);

        // If this wasn't the last attempt, wait before retrying
        if (attempts < maxAttempts) {
          await new Promise(resolve => 
            setTimeout(resolve, this.RETRY_DELAY_MS * attempts)
          );
        }
      }
    }

    // All attempts failed
    throw new Error(
      `N8N webhook failed after ${attempts} attempts. Last error: ${lastError?.message}`
    );
  }

  /**
   * Update file processing status
   */
  private static async updateFileStatus(
    fileId: string, 
    status: 'pending' | 'processing' | 'completed' | 'error',
    errorMessage?: string
  ): Promise<void> {
    try {
      const { error } = await supabase
        .from('kb_files')
        .update({
          status,
          processing_error: status === 'error' ? errorMessage : null,
          updated_at: new Date().toISOString()
        })
        .eq('id', fileId);

      if (error) {
        console.error('Failed to update file status:', error);
      }
    } catch (error) {
      console.error('Error updating file status:', error);
    }
  }

  /**
   * Update webhook statistics
   */
  private static async updateWebhookStats(
    webhookId: string, 
    success: boolean, 
    statusCode: number,
    responseTime?: number
  ): Promise<void> {
    try {
      // Update last test status in the webhooks table
      const { error } = await supabase
        .from('webhooks')
        .update({
          last_tested_at: new Date().toISOString(),
          last_test_status: success ? 'success' : 'error',
          last_error_message: success ? null : `HTTP ${statusCode}`,
          updated_at: new Date().toISOString()
        })
        .eq('id', webhookId);

      if (error) {
        console.error('Failed to update webhook stats:', error);
      } else {
        console.log(`✅ Updated webhook stats for ${webhookId}: ${success ? 'success' : 'error'}`);
      }
    } catch (error) {
      console.error('Error updating webhook stats:', error);
    }
  }

  /**
   * Get webhook health status
   */
  static async getWebhookHealth(): Promise<{
    isHealthy: boolean;
    lastSuccessful?: Date;
    totalCalls: number;
    successRate: number;
    avgResponseTime: number;
    lastError?: string;
  }> {
    try {
      const config = await this.getWebhookConfig();
      if (!config) {
        return {
          isHealthy: false,
          totalCalls: 0,
          successRate: 0,
          avgResponseTime: 0,
          lastError: 'Webhook not configured'
        };
      }

      const { data: stats, error } = await supabase
        .from('webhooks')
        .select('last_tested_at, last_test_status, last_error_message')
        .eq('id', config.id)
        .single();

      if (error || !stats) {
        return {
          isHealthy: false,
          totalCalls: 0,
          successRate: 0,
          avgResponseTime: 0,
          lastError: 'Failed to get webhook stats'
        };
      }

      const isHealthy = config.is_active && stats.last_test_status === 'success';
      const lastSuccessful = stats.last_tested_at && stats.last_test_status === 'success' 
        ? new Date(stats.last_tested_at) 
        : undefined;

      return {
        isHealthy,
        lastSuccessful,
        totalCalls: 0, // Not tracked in simplified table
        successRate: stats.last_test_status === 'success' ? 100 : 0,
        avgResponseTime: 0, // Not tracked in simplified table
        lastError: stats.last_error_message || undefined
      };
    } catch (error) {
      console.error('Error getting webhook health:', error);
      return {
        isHealthy: false,
        totalCalls: 0,
        successRate: 0,
        avgResponseTime: 0,
        lastError: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Test webhook connection
   */
  static async testWebhookConnection(): Promise<{
    success: boolean;
    responseTime: number;
    statusCode?: number;
    error?: string;
  }> {
    const startTime = Date.now();
    
    try {
      const config = await this.getWebhookConfig();
      if (!config) {
        throw new Error('Webhook not configured');
      }

      const testPayload = {
        event_type: 'webhook_test',
        test: true,
        timestamp: new Date().toISOString()
      };

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'User-Agent': 'OrganizePrime/1.0',
        ...config.headers || {}
      };

      if (config.secret_key) {
        headers['Authorization'] = `Bearer ${config.secret_key}`;
      }

      const response = await fetch(config.url, {
        method: 'POST',
        headers,
        body: JSON.stringify(testPayload),
        signal: AbortSignal.timeout((config.timeout_seconds || 30) * 1000)
      });

      const responseTime = Date.now() - startTime;

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return {
        success: true,
        responseTime,
        statusCode: response.status
      };

    } catch (error) {
      const responseTime = Date.now() - startTime;
      return {
        success: false,
        responseTime,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
}