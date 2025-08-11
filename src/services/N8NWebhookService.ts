import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// Enhanced webhook call interface
export interface WebhookCall {
  featureSlug: string;
  webhookName: string;
  payload: Record<string, any>;
  organizationContext: {
    organizationId: string;
    userId: string;
    userRole: string;
  };
}

// Webhook response interface
export interface WebhookResponse {
  success: boolean;
  data?: any;
  error?: string;
  responseTime: number;
  statusCode: number;
}

// Webhook configuration interface
export interface FeatureWebhookConfig {
  id: string;
  featureSlug: string;
  webhookName: string;
  url: string;
  method: 'POST' | 'GET' | 'PUT' | 'DELETE';
  headers?: Record<string, string>;
  enabled: boolean;
  timeout: number;
  retryConfig: {
    maxRetries: number;
    retryDelay: number;
    exponentialBackoff: boolean;
  };
  organizationId: string;
}

// Webhook event logging
interface WebhookLog {
  id: string;
  featureSlug: string;
  webhookName: string;
  organizationId: string;
  userId: string;
  success: boolean;
  responseTime: number;
  statusCode: number;
  error?: string;
  payload: Record<string, any>;
  response?: any;
  timestamp: string;
}

export class N8NWebhookService {
  private static readonly DEFAULT_TIMEOUT = 30000; // 30 seconds
  private static readonly DEFAULT_MAX_RETRIES = 3;
  private static readonly DEFAULT_RETRY_DELAY = 1000; // 1 second

  /**
   * Call a webhook for a specific feature
   */
  static async callWebhook(call: WebhookCall): Promise<any> {
    const startTime = Date.now();
    let lastError: Error | null = null;

    try {
      // Get webhook configuration
      const config = await this.getWebhookConfig(
        call.featureSlug,
        call.webhookName,
        call.organizationContext.organizationId
      );

      if (!config) {
        throw new Error(`Webhook '${call.webhookName}' not configured for feature '${call.featureSlug}'`);
      }

      if (!config.enabled) {
        throw new Error(`Webhook '${call.webhookName}' is disabled`);
      }

      // Enhance payload with organization context
      const enhancedPayload = {
        ...call.payload,
        organizationContext: call.organizationContext,
        featureSlug: call.featureSlug,
        webhookName: call.webhookName,
        timestamp: new Date().toISOString(),
        source: 'lovable_feature_platform'
      };

      // Execute webhook with retries
      const response = await this.executeWithRetries(config, enhancedPayload);

      // Log successful execution
      await this.logWebhookCall(call, response, true);

      return response.data;
    } catch (error) {
      const responseTime = Date.now() - startTime;
      lastError = error as Error;

      // Log failed execution
      await this.logWebhookCall(call, {
        success: false,
        error: lastError.message,
        responseTime,
        statusCode: 0
      }, false);

      throw lastError;
    }
  }

  /**
   * Test a webhook connection
   */
  static async testWebhook(webhookId: string): Promise<boolean> {
    try {
      // Get webhook config by ID
      const { data: webhook, error } = await supabase
        .from('feature_webhooks')
        .select('*')
        .eq('id', webhookId)
        .maybeSingle();

      if (error || !webhook) {
        throw new Error('Webhook not found');
      }

      const testPayload = {
        test: true,
        timestamp: new Date().toISOString(),
        source: 'lovable_feature_platform_test'
      };

      // Use the edge function to test the webhook
      const { data, error: functionError } = await supabase.functions.invoke('exec-n8n-webhook', {
        body: {
          webhookUrl: webhook.endpoint_url,
          method: webhook.method,
          payload: testPayload,
          test: true
        },
      });

      if (functionError || !data?.success) {
        throw new Error(data?.error || functionError?.message || 'Test failed');
      }

      // Update last tested timestamp
      await supabase
        .from('feature_webhooks')
        .update({
          last_tested_at: new Date().toISOString(),
          test_status: 'success'
        })
        .eq('id', webhookId);

      return true;
    } catch (error) {
      // Update test status as failed
      await supabase
        .from('feature_webhooks')
        .update({
          last_tested_at: new Date().toISOString(),
          test_status: 'failed',
          test_response: (error as Error).message
        })
        .eq('id', webhookId);

      throw error;
    }
  }

  /**
   * Get webhook URL for a feature
   */
  static getWebhookUrl(featureSlug: string, webhookName: string): string {
    return `/api/webhooks/${featureSlug}/${webhookName}`;
  }

  /**
   * Log webhook call for monitoring and debugging
   */
  static logWebhookCall(call: WebhookCall, response: any, success: boolean): void {
    const logEntry: Partial<WebhookLog> = {
      featureSlug: call.featureSlug,
      webhookName: call.webhookName,
      organizationId: call.organizationContext.organizationId,
      userId: call.organizationContext.userId,
      success,
      responseTime: response.responseTime || 0,
      statusCode: response.statusCode || 0,
      error: success ? undefined : response.error,
      payload: call.payload,
      response: success ? response.data : undefined,
      timestamp: new Date().toISOString()
    };

    // Store in analytics or logging system
    console.log('Webhook call log:', logEntry);

    // You could store this in a database table for analytics
    // await this.storeWebhookLog(logEntry);
  }

  /**
   * Get webhook configuration from feature settings
   */
  private static async getWebhookConfig(
    featureSlug: string,
    webhookName: string,
    organizationId: string
  ): Promise<FeatureWebhookConfig | null> {
    try {
      // Get feature webhook configuration
      const { data: webhook, error } = await supabase
        .from('feature_webhooks')
        .select('*')
        .eq('feature_id', featureSlug) // Assuming feature_id maps to slug
        .eq('name', webhookName)
        .eq('is_active', true)
        .maybeSingle();

      if (error || !webhook) {
        console.error('Webhook configuration not found:', { featureSlug, webhookName, error });
        return null;
      }

      return {
        id: webhook.id,
        featureSlug,
        webhookName,
        url: webhook.endpoint_url,
        method: webhook.method as 'POST' | 'GET' | 'PUT' | 'DELETE',
        headers: (webhook.headers as Record<string, string>) || {},
        enabled: webhook.is_active,
        timeout: webhook.timeout_seconds * 1000,
        retryConfig: {
          maxRetries: webhook.retry_attempts,
          retryDelay: this.DEFAULT_RETRY_DELAY,
          exponentialBackoff: true
        },
        organizationId
      };
    } catch (error) {
      console.error('Failed to get webhook configuration:', error);
      return null;
    }
  }

  /**
   * Execute webhook with retry logic
   */
  private static async executeWithRetries(
    config: FeatureWebhookConfig,
    payload: Record<string, any>
  ): Promise<WebhookResponse> {
    const maxRetries = config.retryConfig.maxRetries;
    const baseDelay = config.retryConfig.retryDelay;
    const useExponentialBackoff = config.retryConfig.exponentialBackoff;
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      const startTime = Date.now();

      try {
        // Use edge function to make the actual webhook call
        const { data, error } = await supabase.functions.invoke('exec-n8n-webhook', {
          body: {
            webhookUrl: config.url,
            method: config.method,
            payload,
            headers: config.headers,
            timeout: config.timeout
          },
        });

        if (error) {
          throw new Error(`Edge function error: ${error.message}`);
        }

        if (!data?.success) {
          throw new Error(`Webhook failed: ${data?.error || 'Unknown error'}`);
        }

        const responseTime = Date.now() - startTime;

        return {
          success: true,
          data: data.data,
          responseTime,
          statusCode: data.status || 200
        };

      } catch (error) {
        lastError = error as Error;
        const responseTime = Date.now() - startTime;

        // Don't retry on the last attempt
        if (attempt === maxRetries) {
          return {
            success: false,
            error: lastError.message,
            responseTime,
            statusCode: 0
          };
        }

        // Calculate delay for next attempt
        const delay = useExponentialBackoff 
          ? baseDelay * Math.pow(2, attempt)
          : baseDelay;

        console.warn(`Webhook ${config.webhookName} attempt ${attempt + 1} failed, retrying in ${delay}ms:`, error);
        
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    // This should never be reached, but just in case
    throw lastError || new Error('Unknown error');
  }

  /**
   * Get webhook health status
   */
  static async getWebhookHealth(featureSlug: string): Promise<{
    total: number;
    active: number;
    lastTested: string | null;
    successRate: number;
  }> {
    try {
      const { data: webhooks, error } = await supabase
        .from('feature_webhooks')
        .select('*')
        .eq('feature_id', featureSlug);

      if (error) throw error;

      const total = webhooks?.length || 0;
      const active = webhooks?.filter(w => w.is_active).length || 0;
      const lastTested = webhooks?.reduce((latest, webhook) => {
        if (!webhook.last_tested_at) return latest;
        if (!latest || webhook.last_tested_at > latest) {
          return webhook.last_tested_at;
        }
        return latest;
      }, null as string | null);

      // Calculate success rate based on recent tests
      const successfulTests = webhooks?.filter(w => w.test_status === 'success').length || 0;
      const successRate = total > 0 ? (successfulTests / total) * 100 : 0;

      return {
        total,
        active,
        lastTested,
        successRate
      };
    } catch (error) {
      console.error('Failed to get webhook health:', error);
      return {
        total: 0,
        active: 0,
        lastTested: null,
        successRate: 0
      };
    }
  }

  /**
   * Create or update webhook configuration
   */
  static async saveWebhookConfig(config: Partial<FeatureWebhookConfig>): Promise<void> {
    try {
      if (!config.featureSlug || !config.webhookName || !config.url) {
        throw new Error('Missing required webhook configuration fields');
      }

      const webhookData = {
        feature_id: config.featureSlug,
        name: config.webhookName,
        endpoint_url: config.url,
        method: config.method || 'POST',
        headers: config.headers || {},
        timeout_seconds: config.timeout ? config.timeout / 1000 : this.DEFAULT_TIMEOUT / 1000,
        retry_attempts: config.retryConfig?.maxRetries || this.DEFAULT_MAX_RETRIES,
        is_active: config.enabled ?? true,
        created_by: config.organizationId
      };

      const { error } = await supabase
        .from('feature_webhooks')
        .upsert(webhookData, {
          onConflict: 'feature_id,name'
        });

      if (error) {
        throw new Error(`Failed to save webhook configuration: ${error.message}`);
      }

      toast.success('Webhook configuration saved successfully');
    } catch (error) {
      console.error('Failed to save webhook configuration:', error);
      toast.error((error as Error).message);
      throw error;
    }
  }
}