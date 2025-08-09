import { N8NWebhookConfig, N8NWebhookError, AppAnalyticsEvent } from '../types/AppTypes';
import { supabase } from '@/integrations/supabase/client';

export class N8NWebhookService {
  private static readonly DEFAULT_TIMEOUT = 30000; // 30 seconds
  private static readonly DEFAULT_MAX_RETRIES = 3;
  private static readonly DEFAULT_RETRY_DELAY = 1000; // 1 second

  /**
   * Execute N8N webhook with organization context
   */
  static async executeWebhook(
    config: N8NWebhookConfig,
    payload: Record<string, any>,
    organizationId: string,
    userId: string,
    appId?: string
  ): Promise<any> {
    const startTime = Date.now();
    let lastError: Error | null = null;

    // Add organization context to payload
    const enhancedPayload = {
      ...payload,
      organizationId,
      userId,
      appId,
      timestamp: new Date().toISOString(),
      source: 'lovable_app_platform'
    };

    const maxRetries = config.retryConfig?.maxRetries || this.DEFAULT_MAX_RETRIES;
    const baseDelay = config.retryConfig?.retryDelay || this.DEFAULT_RETRY_DELAY;
    const useExponentialBackoff = config.retryConfig?.exponentialBackoff ?? true;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const response = await this.makeWebhookRequest(config, enhancedPayload);
        
        // Track successful webhook execution
        await this.trackWebhookEvent(
          config.webhookId,
          'success',
          organizationId,
          userId,
          appId,
          {
            attempt: attempt + 1,
            duration: Date.now() - startTime,
            statusCode: response.status
          }
        );

        return response.data;
      } catch (error) {
        lastError = error as Error;
        
        // Don't retry on the last attempt
        if (attempt === maxRetries) {
          break;
        }

        // Calculate delay for next attempt
        const delay = useExponentialBackoff 
          ? baseDelay * Math.pow(2, attempt)
          : baseDelay;

        console.warn(`Webhook ${config.webhookId} attempt ${attempt + 1} failed, retrying in ${delay}ms:`, error);
        
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    // Track failed webhook execution
    await this.trackWebhookEvent(
      config.webhookId,
      'failure',
      organizationId,
      userId,
      appId,
      {
        attempts: maxRetries + 1,
        duration: Date.now() - startTime,
        error: lastError?.message || 'Unknown error'
      }
    );

    throw new N8NWebhookError(
      `Webhook ${config.webhookId} failed after ${maxRetries + 1} attempts: ${lastError?.message}`,
      config.webhookId
    );
  }

  /**
   * Make the actual webhook request
   */
  private static async makeWebhookRequest(
    config: N8NWebhookConfig,
    payload: Record<string, any>
  ): Promise<{ data: any; status: number }> {
    // Proxy through secure edge function to avoid exposing secrets
    const { data, error } = await supabase.functions.invoke('exec-n8n-webhook', {
      body: {
        webhookUrl: config.url,
        method: config.method,
        payload,
        appId: payload.appId,
        webhookId: config.webhookId,
        organizationId: payload.organizationId,
      },
    });

    if (error) {
      throw new N8NWebhookError(
        `Edge function error: ${error.message || 'Unknown error'}`,
        config.webhookId
      );
    }

    if (!data?.success) {
      throw new N8NWebhookError(
        `Webhook failed: ${data?.error || 'Unknown error'}`,
        config.webhookId,
        data?.status
      );
    }

    return { data: data.data, status: data.status || 200 };
  }

  /**
   * Get webhook configuration from app settings
   */
  static async getWebhookConfig(
    appId: string,
    organizationId: string,
    webhookId: string
  ): Promise<N8NWebhookConfig | null> {
    try {
      // Get app installation
      const { data: installation, error } = await supabase
        .from('marketplace_app_installations')
        .select('app_settings')
        .eq('app_id', appId)
        .eq('organization_id', organizationId)
        .eq('status', 'active')
        .maybeSingle();

      if (error || !installation) {
        console.error('App installation not found:', error);
        return null;
      }

      // Get webhook config from app settings
      const appSettings = installation.app_settings as any;
      const webhooks = appSettings?.webhooks || {};
      const webhookConfig = webhooks[webhookId];

      if (!webhookConfig) {
        console.error(`Webhook ${webhookId} not configured for app ${appId}`);
        return null;
      }

      return {
        webhookId,
        url: webhookConfig.url,
        method: webhookConfig.method || 'POST',
        headers: webhookConfig.headers || {},
        authentication: webhookConfig.authentication,
        retryConfig: webhookConfig.retryConfig
      };
    } catch (error) {
      console.error('Failed to get webhook configuration:', error);
      return null;
    }
  }

  /**
   * Track webhook execution events for analytics
   */
  private static async trackWebhookEvent(
    webhookId: string,
    eventType: 'success' | 'failure',
    organizationId: string,
    userId: string,
    appId?: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    try {
      if (!appId) return;

      await supabase
        .from('marketplace_app_analytics')
        .insert({
          app_id: appId,
          organization_id: organizationId,
          user_id: userId,
          event_type: `webhook_${eventType}`,
          event_category: 'n8n_integration',
          event_data: {
            webhook_id: webhookId,
            ...metadata
          }
        });
    } catch (error) {
      console.error('Failed to track webhook event:', error);
      // Don't throw error - analytics shouldn't break the main flow
    }
  }

  /**
   * Test webhook connection
   */
  static async testWebhook(
    config: N8NWebhookConfig,
    organizationId: string,
    userId: string
  ): Promise<{ success: boolean; message: string; responseTime?: number }> {
    const startTime = Date.now();
    
    try {
      const testPayload = {
        test: true,
        organizationId,
        userId,
        timestamp: new Date().toISOString(),
        source: 'lovable_app_platform_test'
      };

      await this.makeWebhookRequest(config, testPayload);
      
      const responseTime = Date.now() - startTime;
      
      return {
        success: true,
        message: 'Webhook test successful',
        responseTime
      };
    } catch (error) {
      return {
        success: false,
        message: error instanceof N8NWebhookError 
          ? error.message 
          : 'Unknown error occurred during test'
      };
    }
  }

  /**
   * Validate webhook configuration
   */
  static validateWebhookConfig(config: Partial<N8NWebhookConfig>): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!config.webhookId) {
      errors.push('Webhook ID is required');
    }

    if (!config.url) {
      errors.push('Webhook URL is required');
    } else {
      try {
        new URL(config.url);
      } catch {
        errors.push('Webhook URL must be a valid URL');
      }
    }

    if (config.method && !['GET', 'POST', 'PUT', 'DELETE'].includes(config.method)) {
      errors.push('Method must be GET, POST, PUT, or DELETE');
    }

    if (config.retryConfig) {
      if (config.retryConfig.maxRetries < 0 || config.retryConfig.maxRetries > 10) {
        errors.push('Max retries must be between 0 and 10');
      }
      if (config.retryConfig.retryDelay < 100 || config.retryConfig.retryDelay > 60000) {
        errors.push('Retry delay must be between 100ms and 60 seconds');
      }
    }

    return { valid: errors.length === 0, errors };
  }
}