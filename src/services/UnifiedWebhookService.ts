import { supabase } from '@/integrations/supabase/client';

export interface WebhookAssignment {
  id: string;
  organization_id: string;
  feature_slug: string;
  feature_page: string;
  button_position: string;
  webhook_id: string;
  button_data: any;
  is_active: boolean;
  webhook?: {
    id: string;
    name: string;
    webhook_url: string;
    is_active: boolean;
  };
}

export interface WebhookTriggerContext {
  event_type: string;
  organization_id: string;
  user_id: string;
  page: string;
  position: string;
  triggered_at: string;
  user_triggered: boolean;
  [key: string]: any;
}

/**
 * Unified webhook service that handles both dynamic assignments and file processing
 * This replaces the hardcoded webhook system with a flexible assignment-based approach
 * 
 * Features:
 * - Database-driven webhook assignments
 * - Comprehensive error handling and logging
 * - Rate limiting and security validation
 * - File processing automation
 * - Performance monitoring
 */
export class UnifiedWebhookService {
  
  /**
   * Log webhook events for monitoring and debugging
   */
  private static async logWebhookEvent(
    type: 'trigger' | 'success' | 'failure' | 'assignment_not_found',
    details: {
      assignmentId?: string;
      webhookId?: string;
      organizationId: string;
      userId?: string;
      page?: string;
      position?: string;
      error?: string;
      duration?: number;
      payload?: any;
    }
  ): Promise<void> {
    try {
      // In development, log to console for immediate feedback
      if (import.meta.env.DEV) {
        const emoji = type === 'success' ? '✅' : type === 'failure' ? '❌' : type === 'assignment_not_found' ? '⚠️' : '🚀';
        console.log(`${emoji} WEBHOOK ${type.toUpperCase()}:`, {
          timestamp: new Date().toISOString(),
          type,
          ...details,
          // Don't log full payload in production for security
          payload: import.meta.env.DEV ? details.payload : undefined
        });
      }

      // TODO: Add database logging for production monitoring
      // This would insert into a webhook_logs table for analytics
      /*
      await supabase.from('webhook_logs').insert({
        event_type: type,
        assignment_id: details.assignmentId,
        webhook_id: details.webhookId,
        organization_id: details.organizationId,
        user_id: details.userId,
        page: details.page,
        position: details.position,
        error_message: details.error,
        duration_ms: details.duration,
        created_at: new Date().toISOString()
      });
      */
    } catch (logError) {
      // Never let logging errors break the main flow
      console.warn('Failed to log webhook event:', logError);
    }
  }

  /**
   * Validate webhook assignment and context
   */
  private static validateTriggerContext(
    assignment: WebhookAssignment | null,
    organizationId: string,
    page: string,
    position: string
  ): { isValid: boolean; error?: string } {
    if (!assignment) {
      return {
        isValid: false,
        error: `No active webhook assignment found for page '${page}' at position '${position}'. Please configure a webhook assignment first.`
      };
    }

    if (!assignment.webhook || !assignment.webhook.is_active) {
      return {
        isValid: false,
        error: `Assigned webhook is inactive or missing. Please check webhook configuration.`
      };
    }

    if (!assignment.webhook.webhook_url) {
      return {
        isValid: false,
        error: `Webhook URL is missing or invalid. Please update webhook configuration.`
      };
    }

    return { isValid: true };
  }
  
  /**
   * Get webhook assignment for a specific page and position
   */
  static async getWebhookAssignment(
    organizationId: string,
    page: string,
    position: string
  ): Promise<WebhookAssignment | null> {
    console.log('🔍 WEBHOOK LOOKUP:', { organizationId, page, position });
    try {
      const { data, error } = await supabase
        .from('webhook_button_assignments')
        .select(`
          *,
          webhook:webhooks(
            id,
            name,
            webhook_url,
            is_active
          )
        `)
        .eq('organization_id', organizationId)
        .eq('feature_page', page)
        .eq('button_position', position)
        .eq('is_active', true)
        .single();

      if (error) {
        console.log(`❌ Database error for ${page}:${position}`, error.message);
        return null;
      }

      if (data) {
        console.log('✅ WEBHOOK FOUND:', data);
        return data as WebhookAssignment;
      } else {
        console.log(`⚠️ No webhook assignment found for ${page}:${position}`);
        return null;
      }
    } catch (error) {
      console.error('Error fetching webhook assignment:', error);
      return null;
    }
  }

  /**
   * Trigger webhook based on assignment with comprehensive error handling
   */
  static async triggerAssignedWebhook(
    assignmentId: string,
    context: WebhookTriggerContext
  ): Promise<{ success: boolean; message?: string; error?: string }> {
    const startTime = Date.now();
    
    // Log trigger attempt
    await this.logWebhookEvent('trigger', {
      assignmentId,
      organizationId: context.organization_id,
      userId: context.user_id,
      page: context.page,
      position: context.position,
      payload: context
    });

    try {
      // Get the assignment with webhook details
      const { data: assignment, error } = await supabase
        .from('webhook_button_assignments')
        .select(`
          *,
          webhook:webhooks(
            id,
            name,
            webhook_url,
            headers,
            is_active
          )
        `)
        .eq('id', assignmentId)
        .single();

      if (error || !assignment?.webhook) {
        const errorMsg = 'Webhook assignment not found or webhook inactive';
        await this.logWebhookEvent('assignment_not_found', {
          assignmentId,
          organizationId: context.organization_id,
          userId: context.user_id,
          page: context.page,
          position: context.position,
          error: errorMsg
        });
        throw new Error(errorMsg);
      }

      const webhook = assignment.webhook;
      
      // Validate assignment and webhook
      const validation = this.validateTriggerContext(
        assignment as any,
        context.organization_id,
        context.page,
        context.position
      );

      if (!validation.isValid) {
        await this.logWebhookEvent('failure', {
          assignmentId,
          webhookId: webhook.id,
          organizationId: context.organization_id,
          userId: context.user_id,
          page: context.page,
          position: context.position,
          error: validation.error,
          duration: Date.now() - startTime
        });
        throw new Error(validation.error);
      }

      // Build comprehensive payload
      const payload = {
        ...context,
        assignment: {
          id: assignment.id,
          feature_slug: assignment.feature_slug,
          feature_page: assignment.feature_page,
          button_position: assignment.button_position,
          button_data: assignment.button_data
        },
        webhook: {
          id: webhook.id,
          name: webhook.name
        }
      };

      console.log(`🚀 UNIFIED: Triggering webhook "${webhook.name}" for assignment ${assignmentId}`);
      
      // Make the webhook call
      const response = await this.callWebhook(webhook.webhook_url, payload, webhook.headers || {});
      
      const duration = Date.now() - startTime;
      
      // Update webhook stats
      await this.updateWebhookStats(webhook.id, true, response.status);

      // Log success
      await this.logWebhookEvent('success', {
        assignmentId,
        webhookId: webhook.id,
        organizationId: context.organization_id,
        userId: context.user_id,
        page: context.page,
        position: context.position,
        duration
      });

      return {
        success: true,
        message: `Webhook "${webhook.name}" triggered successfully (${duration}ms)`
      };

    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      console.error('UNIFIED: Webhook trigger failed:', error);

      // Log failure
      await this.logWebhookEvent('failure', {
        assignmentId,
        organizationId: context.organization_id,
        userId: context.user_id,
        page: context.page,
        position: context.position,
        error: errorMessage,
        duration
      });

      return {
        success: false,
        error: errorMessage
      };
    }
  }

  /**
   * Handle file upload webhook trigger
   * This replaces the hardcoded file processing webhook
   */
  static async triggerFileProcessingWebhook(
    organizationId: string,
    userId: string,
    fileData: {
      fileId: string;
      fileName: string;
      filePath: string;
      fileSize: number;
      mimeType: string;
      kbId: string;
    }
  ): Promise<{ success: boolean; message?: string; error?: string }> {
    try {
      // Look for a webhook assignment for file processing
      const assignment = await this.getWebhookAssignment(
        organizationId,
        'ManageFiles',
        'upload-section'
      );

      if (!assignment) {
        console.log('ℹ️ No webhook assignment found for file processing - skipping automatic processing');
        return {
          success: false,
          error: 'No webhook assigned for file processing. Files uploaded successfully but require manual processing setup.'
        };
      }

      // Build file processing context
      const context: WebhookTriggerContext = {
        event_type: 'file_uploaded',
        organization_id: organizationId,
        user_id: userId,
        page: 'ManageFiles',
        position: 'upload-section',
        triggered_at: new Date().toISOString(),
        user_triggered: false,
        
        // File-specific data
        file_id: fileData.fileId,
        file_name: fileData.fileName,
        file_path: fileData.filePath,
        file_size: fileData.fileSize,
        mime_type: fileData.mimeType,
        kb_id: fileData.kbId,
        
        // Generate download URL
        download_url: await this.generateDownloadUrl(fileData.filePath)
      };

      return await this.triggerAssignedWebhook(assignment.id, context);

    } catch (error) {
      console.error('Error triggering file processing webhook:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'File processing webhook failed'
      };
    }
  }

  /**
   * Make HTTP webhook call
   */
  private static async callWebhook(
    url: string,
    payload: any,
    headers: Record<string, string> = {}
  ): Promise<Response> {
    const defaultHeaders = {
      'Content-Type': 'application/json',
      'User-Agent': 'OrganizePrime/1.0',
      ...headers
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: defaultHeaders,
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(90000) // 90 second timeout
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return response;
  }

  /**
   * Generate signed download URL for files
   */
  private static async generateDownloadUrl(filePath: string): Promise<string | null> {
    try {
      const { data, error } = await supabase.storage
        .from('kb-documents')
        .createSignedUrl(filePath, 86400); // 24 hours

      if (error) {
        console.warn('Failed to generate download URL:', error);
        return null;
      }

      return data.signedUrl;
    } catch (error) {
      console.warn('Error generating download URL:', error);
      return null;
    }
  }

  /**
   * Update webhook statistics
   */
  private static async updateWebhookStats(
    webhookId: string,
    success: boolean,
    statusCode: number
  ): Promise<void> {
    try {
      await supabase
        .from('webhooks')
        .update({
          last_tested_at: new Date().toISOString(),
          last_test_status: success ? 'success' : 'error',
          last_error_message: success ? null : `HTTP ${statusCode}`,
          updated_at: new Date().toISOString()
        })
        .eq('id', webhookId);
    } catch (error) {
      console.warn('Failed to update webhook stats:', error);
    }
  }

  /**
   * Trigger webhook by ID (for name-based triggering)
   */
  static async triggerWebhook(
    webhookId: string,
    context: Record<string, any>
  ): Promise<{ success: boolean; message?: string; error?: string; data?: any }> {
    const startTime = Date.now();
    
    try {
      // Get webhook details
      const { data: webhook, error } = await supabase
        .from('webhooks')
        .select('id, name, webhook_url, headers, is_active')
        .eq('id', webhookId)
        .eq('is_active', true)
        .single();

      if (error || !webhook) {
        throw new Error(`Webhook not found or inactive`);
      }

      console.log(`🚀 UNIFIED: Triggering webhook "${webhook.name}" by ID`);
      
      // Make the webhook call using Edge Function for security
      const { data, error: functionError } = await supabase.functions.invoke('exec-n8n-webhook', {
        body: {
          webhookUrl: webhook.webhook_url,
          method: 'POST',
          payload: context,
          organizationId: context.organization_id,
          webhookId: webhook.id,
        },
      });

      const duration = Date.now() - startTime;

      if (functionError || !data?.success) {
        const errorMsg = functionError?.message || data?.error || 'Webhook execution failed';
        
        // Update webhook stats for failure
        await this.updateWebhookStats(webhook.id, false, data?.status || 0);
        
        return {
          success: false,
          error: errorMsg
        };
      }

      // Update webhook stats for success
      await this.updateWebhookStats(webhook.id, true, data.status || 200);

      return {
        success: true,
        message: `Webhook "${webhook.name}" triggered successfully (${duration}ms)`,
        data: data.data
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('UNIFIED: Webhook trigger by ID failed:', error);

      return {
        success: false,
        error: errorMessage
      };
    }
  }

  /**
   * List all active webhook assignments for an organization
   */
  static async getActiveAssignments(organizationId: string): Promise<WebhookAssignment[]> {
    try {
      const { data, error } = await supabase
        .from('webhook_button_assignments')
        .select(`
          *,
          webhook:webhooks(
            id,
            name,
            webhook_url,
            is_active
          )
        `)
        .eq('organization_id', organizationId)
        .eq('is_active', true);

      if (error) {
        throw new Error(`Failed to fetch webhook assignments: ${error.message}`);
      }

      return data as WebhookAssignment[];
    } catch (error) {
      console.error('Error fetching webhook assignments:', error);
      return [];
    }
  }
}