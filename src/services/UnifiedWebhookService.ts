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
   * Comprehensive audit logging for webhook events
   */
  private static async logAuditEvent(
    eventType: 'assignment_created' | 'assignment_updated' | 'assignment_deleted' | 
              'webhook_triggered' | 'security_violation' | 'rate_limit_exceeded' | 
              'webhook_success' | 'webhook_failure',
    details: {
      organizationId: string;
      userId?: string;
      webhookId?: string;
      assignmentId?: string;
      featurePage?: string;
      buttonPosition?: string;
      error?: string;
      duration?: number;
      responseStatus?: number;
      responseSize?: number;
      securityLevel?: 'normal' | 'warning' | 'critical';
      riskFactors?: string[];
      eventDetails?: any;
      metadata?: any;
    }
  ): Promise<void> {
    try {
      // Determine event category
      let eventCategory: string;
      if (eventType.includes('assignment')) {
        eventCategory = 'assignment';
      } else if (eventType.includes('security') || eventType.includes('rate_limit')) {
        eventCategory = 'security';
      } else if (eventType.includes('webhook')) {
        eventCategory = 'trigger';
      } else {
        eventCategory = 'system';
      }

      // Insert audit log
      await supabase.from('webhook_audit_logs').insert({
        organization_id: details.organizationId,
        user_id: details.userId,
        webhook_id: details.webhookId,
        assignment_id: details.assignmentId,
        event_type: eventType,
        event_category: eventCategory,
        feature_page: details.featurePage,
        button_position: details.buttonPosition,
        event_details: details.eventDetails,
        security_level: details.securityLevel || 'normal',
        risk_factors: details.riskFactors,
        duration_ms: details.duration,
        response_status: details.responseStatus,
        response_size: details.responseSize,
        metadata: details.metadata
      });

      // Also log to console in development
      if (import.meta.env.DEV) {
        const emoji = eventType.includes('success') ? '✅' : 
                     eventType.includes('failure') || eventType.includes('violation') ? '❌' : 
                     eventType.includes('warning') ? '⚠️' : '📝';
        console.log(`${emoji} AUDIT: ${eventType}`, {
          org: details.organizationId,
          user: details.userId,
          webhook: details.webhookId,
          security: details.securityLevel,
          ...(details.error && { error: details.error })
        });
      }

    } catch (logError) {
      // Never let audit logging errors break the main flow
      console.warn('Failed to create audit log:', logError);
    }
  }

  /**
   * Log webhook events for monitoring and debugging (LEGACY - kept for compatibility)
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
      // Convert to new audit logging system
      let eventType: any = type;
      let securityLevel: 'normal' | 'warning' | 'critical' = 'normal';
      
      if (type === 'trigger') eventType = 'webhook_triggered';
      if (type === 'success') eventType = 'webhook_success';
      if (type === 'failure') {
        eventType = 'webhook_failure';
        securityLevel = details.error?.includes('Security') ? 'critical' : 'warning';
      }
      if (type === 'assignment_not_found') {
        eventType = 'webhook_failure';
        securityLevel = 'warning';
      }

      // Use new audit logging
      await this.logAuditEvent(eventType, {
        organizationId: details.organizationId,
        userId: details.userId,
        webhookId: details.webhookId,
        assignmentId: details.assignmentId,
        featurePage: details.page,
        buttonPosition: details.position,
        duration: details.duration,
        securityLevel,
        eventDetails: {
          error: details.error,
          hasPayload: !!details.payload,
          payloadSize: details.payload ? JSON.stringify(details.payload).length : 0
        }
      });

      // Also maintain console logging for development
      if (import.meta.env.DEV) {
        const emoji = type === 'success' ? '✅' : type === 'failure' ? '❌' : type === 'assignment_not_found' ? '⚠️' : '🚀';
        console.log(`${emoji} WEBHOOK ${type.toUpperCase()}:`, {
          timestamp: new Date().toISOString(),
          type,
          ...details,
          payload: import.meta.env.DEV ? details.payload : undefined
        });
      }

    } catch (logError) {
      // Never let logging errors break the main flow
      console.warn('Failed to log webhook event:', logError);
    }
  }

  /**
   * Check rate limiting for organization/webhook combination
   * Returns true if request should be allowed, false if rate limited
   */
  private static async checkRateLimit(
    organizationId: string,
    webhookId: string,
    maxRequestsPerMinute: number = 60
  ): Promise<{ allowed: boolean; currentCount: number; resetTime?: Date }> {
    try {
      const now = new Date();
      const currentMinute = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 
                                   now.getHours(), now.getMinutes());

      // Use upsert to handle concurrent requests safely
      const { data, error } = await supabase
        .from('webhook_rate_limits')
        .upsert({
          organization_id: organizationId,
          webhook_id: webhookId,
          time_window: currentMinute.toISOString(),
          request_count: 1,
          last_request_at: now.toISOString(),
          updated_at: now.toISOString()
        }, {
          onConflict: 'organization_id,webhook_id,time_window',
          ignoreDuplicates: false
        })
        .select('request_count')
        .single();

      if (error) {
        // If we can't check rate limits, allow the request but log the error
        console.warn('⚠️ Rate limit check failed, allowing request:', error);
        return { allowed: true, currentCount: 0 };
      }

      // If this was an insert, request_count will be 1
      // If this was an update, we need to increment the count
      if (data.request_count === 1) {
        // This was a new record, so we're good
        return { 
          allowed: true, 
          currentCount: 1,
          resetTime: new Date(currentMinute.getTime() + 60000) // Next minute
        };
      } else {
        // This was an update, increment the counter
        const { data: updatedData, error: updateError } = await supabase
          .from('webhook_rate_limits')
          .update({
            request_count: data.request_count + 1,
            last_request_at: now.toISOString(),
            updated_at: now.toISOString()
          })
          .eq('organization_id', organizationId)
          .eq('webhook_id', webhookId)
          .eq('time_window', currentMinute.toISOString())
          .select('request_count')
          .single();

        if (updateError) {
          console.warn('⚠️ Rate limit update failed, allowing request:', updateError);
          return { allowed: true, currentCount: 0 };
        }

        const newCount = updatedData.request_count;
        return {
          allowed: newCount <= maxRequestsPerMinute,
          currentCount: newCount,
          resetTime: new Date(currentMinute.getTime() + 60000)
        };
      }

    } catch (error) {
      // If rate limiting fails, allow the request but log the error
      console.warn('⚠️ Rate limiting system error, allowing request:', error);
      return { allowed: true, currentCount: 0 };
    }
  }

  /**
   * Clean up old rate limit records (call periodically)
   */
  private static async cleanupOldRateLimits(): Promise<void> {
    try {
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
      
      await supabase
        .from('webhook_rate_limits')
        .delete()
        .lt('created_at', oneHourAgo.toISOString());
        
    } catch (error) {
      console.warn('Failed to cleanup old rate limit records:', error);
    }
  }

  /**
   * Enhanced security validation for multi-tenant isolation
   */
  private static async validateMultiTenantSecurity(
    assignment: WebhookAssignment | null,
    organizationId: string,
    userId?: string
  ): Promise<{ isValid: boolean; error?: string; warnings?: string[] }> {
    const warnings: string[] = [];

    try {
      if (!assignment) {
        return { isValid: true }; // No assignment means no security risk
      }

      // 1. Validate organization boundary isolation
      if (assignment.organization_id && assignment.organization_id !== organizationId) {
        return {
          isValid: false,
          error: `Security violation: Webhook assignment belongs to different organization`
        };
      }

      // 2. Validate user membership in organization (if user provided)
      if (userId) {
        const { data: membership, error: membershipError } = await supabase
          .from('memberships')
          .select('organization_id, status, role')
          .eq('user_id', userId)
          .eq('organization_id', organizationId)
          .eq('status', 'active')
          .maybeSingle();

        if (membershipError) {
          warnings.push(`Could not verify user membership: ${membershipError.message}`);
        } else if (!membership) {
          return {
            isValid: false,
            error: `Security violation: User not authorized for organization`
          };
        }
      }

      // 3. Validate webhook URL safety (basic checks)
      if (assignment.webhook?.webhook_url) {
        const webhookUrl = assignment.webhook.webhook_url;
        
        // Check for obviously unsafe URLs
        if (webhookUrl.includes('localhost') && !import.meta.env.DEV) {
          warnings.push('Webhook points to localhost in production environment');
        }
        
        // Ensure HTTPS in production
        if (!webhookUrl.startsWith('https://') && !import.meta.env.DEV) {
          warnings.push('Webhook URL is not using HTTPS');
        }
        
        // Basic URL format validation
        try {
          new URL(webhookUrl);
        } catch {
          return {
            isValid: false,
            error: `Invalid webhook URL format: ${webhookUrl}`
          };
        }
      }

      return {
        isValid: true,
        warnings: warnings.length > 0 ? warnings : undefined
      };

    } catch (error) {
      return {
        isValid: false,
        error: `Security validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
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
    
    try {
      // First, try to find organization-specific assignment
      const { data: orgData, error: orgError } = await supabase
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
        .maybeSingle();

      if (orgError) {
        console.error(`❌ Database error for org-specific ${page}:${position}`, {
          code: orgError.code,
          message: orgError.message
        });
      }

      // If organization-specific assignment found, return it
      if (orgData) {
        console.log(`✅ Found org-specific webhook assignment for ${page}:${position}`);
        return orgData as WebhookAssignment;
      }

      // If no organization-specific assignment, check for global assignment
      const { data: globalData, error: globalError } = await supabase
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
        .is('organization_id', null) // Global assignment
        .eq('feature_page', page)
        .eq('button_position', position)
        .eq('is_active', true)
        .maybeSingle();

      if (globalError) {
        console.error(`❌ Database error for global ${page}:${position}`, {
          code: globalError.code,
          message: globalError.message
        });
        return null;
      }

      if (globalData) {
        console.log(`✅ Found global webhook assignment for ${page}:${position}`);
        return globalData as WebhookAssignment;
      }

      console.log(`⚠️ No webhook assignment found (org-specific or global) for ${page}:${position}`);
      
      // Auto-create default assignment for critical features if none exists
      if (page === 'ManageFiles' && position === 'upload-section') {
        console.log(`🔧 Auto-creating default global webhook assignment for ${page}:${position}`);
        return await this.createDefaultGlobalAssignment(page, position);
      }
      
      return null;

    } catch (error) {
      console.error('Error fetching webhook assignment:', error);
      return null;
    }
  }

  /**
   * Auto-create default global webhook assignment for critical features
   * This ensures system continuity when administrators haven't set up assignments
   */
  private static async createDefaultGlobalAssignment(
    page: string,
    position: string
  ): Promise<WebhookAssignment | null> {
    try {
      // First, try to find a suitable webhook to assign
      const { data: availableWebhooks, error: webhookError } = await supabase
        .from('webhooks')
        .select('id, name, webhook_url')
        .eq('is_active', true)
        .or('name.ilike.*upload*,name.ilike.*file*,name.ilike.*process*')
        .limit(1);

      if (webhookError || !availableWebhooks || availableWebhooks.length === 0) {
        console.warn('⚠️ No suitable webhooks found for auto-assignment creation');
        return null;
      }

      const webhook = availableWebhooks[0];
      
      // Get current user session for created_by field
      const { data: session } = await supabase.auth.getSession();
      const userId = session?.session?.user?.id;

      if (!userId) {
        console.warn('⚠️ No authenticated user for auto-assignment creation');
        return null;
      }

      // Create the global assignment
      const { data: newAssignment, error: createError } = await supabase
        .from('webhook_button_assignments')
        .insert({
          organization_id: null, // Global assignment
          user_id: userId,
          feature_slug: 'knowledge-base',
          feature_page: page,
          button_position: position,
          webhook_id: webhook.id,
          label: `Auto-created: ${page} ${position}`,
          description: `Automatically created global webhook assignment for ${page}:${position} to ensure system continuity`,
          is_active: true,
          created_by: userId,
          updated_by: userId,
        })
        .select(`
          *,
          webhook:webhooks(
            id,
            name,
            webhook_url,
            is_active
          )
        `)
        .single();

      if (createError) {
        console.error('❌ Failed to auto-create webhook assignment:', createError);
        return null;
      }

      console.log(`✅ Auto-created global webhook assignment using webhook "${webhook.name}"`);
      return newAssignment as WebhookAssignment;

    } catch (error) {
      console.error('❌ Error in auto-assignment creation:', error);
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
      
      // Enhanced security validation (NEW - preserves existing functionality)
      const securityValidation = await this.validateMultiTenantSecurity(
        assignment as any,
        context.organization_id,
        context.user_id
      );

      if (!securityValidation.isValid) {
        await this.logWebhookEvent('failure', {
          assignmentId,
          webhookId: webhook.id,
          organizationId: context.organization_id,
          userId: context.user_id,
          page: context.page,
          position: context.position,
          error: `Security validation failed: ${securityValidation.error}`,
          duration: Date.now() - startTime
        });
        throw new Error(`Security validation failed: ${securityValidation.error}`);
      }

      // Log security warnings (non-blocking)
      if (securityValidation.warnings && securityValidation.warnings.length > 0) {
        console.warn('🔒 Webhook security warnings:', {
          assignmentId,
          warnings: securityValidation.warnings
        });
      }

      // Rate limiting check (NEW - preserves existing functionality)
      const rateLimitCheck = await this.checkRateLimit(
        context.organization_id,
        webhook.id,
        60 // 60 requests per minute per organization
      );

      if (!rateLimitCheck.allowed) {
        await this.logWebhookEvent('failure', {
          assignmentId,
          webhookId: webhook.id,
          organizationId: context.organization_id,
          userId: context.user_id,
          page: context.page,
          position: context.position,
          error: `Rate limit exceeded: ${rateLimitCheck.currentCount} requests this minute (max 60)`,
          duration: Date.now() - startTime
        });
        throw new Error(`Rate limit exceeded. You have made ${rateLimitCheck.currentCount} requests this minute. Please wait until ${rateLimitCheck.resetTime?.toLocaleTimeString()} and try again.`);
      }

      // Log rate limit status (for monitoring)
      if (rateLimitCheck.currentCount > 40) { // Warn when approaching limit
        console.warn('🚦 Webhook rate limit warning:', {
          organizationId: context.organization_id,
          webhookId: webhook.id,
          currentCount: rateLimitCheck.currentCount,
          resetTime: rateLimitCheck.resetTime
        });
      }
      
      // Existing validation (preserved exactly as before)
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
        
        // Provide helpful guidance for administrators
        const errorMessage = `File processing webhook not configured. 
        
Solutions:
1. Go to Admin → Feature Management → Knowledge Base → Manage Webhooks
2. Create a webhook assignment for "ManageFiles" page at "upload-section" position
3. Or create a global webhook assignment to handle all organizations
        
Files were uploaded successfully and can be processed manually or after webhook setup.`;
        
        return {
          success: false,
          error: errorMessage
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
   * Validate webhook assignment health and provide diagnostics
   */
  static async validateAssignmentHealth(
    organizationId: string,
    page: string,
    position: string
  ): Promise<{
    isValid: boolean;
    hasAssignment: boolean;
    hasGlobalFallback: boolean;
    webhookActive: boolean;
    issues: string[];
    suggestions: string[];
  }> {
    const issues: string[] = [];
    const suggestions: string[] = [];
    let hasAssignment = false;
    let hasGlobalFallback = false;
    let webhookActive = false;

    try {
      // Check organization-specific assignment
      const { data: orgAssignment } = await supabase
        .from('webhook_button_assignments')
        .select(`*, webhook:webhooks(is_active, webhook_url)`)
        .eq('organization_id', organizationId)
        .eq('feature_page', page)
        .eq('button_position', position)
        .eq('is_active', true)
        .maybeSingle();

      if (orgAssignment) {
        hasAssignment = true;
        webhookActive = orgAssignment.webhook?.is_active || false;
        
        if (!webhookActive) {
          issues.push('Organization-specific webhook is inactive');
          suggestions.push('Reactivate the webhook or assign a different active webhook');
        }
      }

      // Check global fallback
      const { data: globalAssignment } = await supabase
        .from('webhook_button_assignments')
        .select(`*, webhook:webhooks(is_active, webhook_url)`)
        .is('organization_id', null)
        .eq('feature_page', page)
        .eq('button_position', position)
        .eq('is_active', true)
        .maybeSingle();

      if (globalAssignment) {
        hasGlobalFallback = true;
        if (!hasAssignment) {
          webhookActive = globalAssignment.webhook?.is_active || false;
        }
        
        if (!globalAssignment.webhook?.is_active) {
          issues.push('Global fallback webhook is inactive');
          suggestions.push('Contact system administrator to fix global webhook configuration');
        }
      }

      // Generate recommendations
      if (!hasAssignment && !hasGlobalFallback) {
        issues.push('No webhook assignment found (organization-specific or global)');
        suggestions.push('Create a webhook assignment in Admin → Feature Management');
        suggestions.push('Contact administrator to set up global webhook assignments');
      }

      const isValid = (hasAssignment || hasGlobalFallback) && webhookActive;

      return {
        isValid,
        hasAssignment,
        hasGlobalFallback,
        webhookActive,
        issues,
        suggestions
      };

    } catch (error) {
      issues.push(`Validation error: ${error}`);
      return {
        isValid: false,
        hasAssignment: false,
        hasGlobalFallback: false,
        webhookActive: false,
        issues,
        suggestions: ['Contact system administrator for technical support']
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