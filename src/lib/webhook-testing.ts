import { supabase } from '@/integrations/supabase/client';

export interface WebhookTestPayload {
  event_type: string;
  webhook_id: string;
  timestamp: string;
  organization_id?: string;
  user_id?: string;
  data: any;
}

export interface WebhookTestResult {
  status: 'success' | 'failed' | 'timeout';
  status_code?: number;
  response_time: number;
  response_body?: any;
  error_message?: string;
  request_headers: Record<string, string>;
  response_headers?: Record<string, string>;
  payload_size: number;
}

export interface WebhookTestOptions {
  timeout?: number;
  customPayload?: any;
  followRedirects?: boolean;
  validateSSL?: boolean;
  retryAttempts?: number;
}

/**
 * Test a webhook endpoint with a custom payload
 */
export async function testWebhookEndpoint(
  webhookUrl: string,
  secretKey: string | undefined,
  payload: WebhookTestPayload,
  options: WebhookTestOptions = {}
): Promise<WebhookTestResult> {
  const startTime = Date.now();
  const {
    timeout = 30000,
    followRedirects = true,
    validateSSL = true,
    retryAttempts = 0
  } = options;

  try {
    // Prepare the payload
    const payloadString = JSON.stringify(payload);
    const payloadSize = new Blob([payloadString]).size;

    // Prepare headers
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'User-Agent': 'OrganizePrime-Webhook/1.0',
      'X-Event-Type': payload.event_type,
      'X-Webhook-ID': payload.webhook_id,
      'X-Timestamp': payload.timestamp,
      'X-Test': 'true'
    };

    // Add organization context if available
    if (payload.organization_id) {
      headers['X-Organization-ID'] = payload.organization_id;
    }

    if (payload.user_id) {
      headers['X-User-ID'] = payload.user_id;
    }

    // Generate HMAC signature if secret key is provided
    if (secretKey) {
      const signature = await generateWebhookSignature(payloadString, secretKey);
      headers['X-Signature'] = signature;
      headers['X-Signature-Version'] = 'v1';
    }

    // Create AbortController for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    let lastError: Error | null = null;
    let attempt = 0;

    // Retry logic
    while (attempt <= retryAttempts) {
      try {
        // Make the HTTP request
        const response = await fetch(webhookUrl, {
          method: 'POST',
          headers,
          body: payloadString,
          signal: controller.signal,
          redirect: followRedirects ? 'follow' : 'manual'
        });

        clearTimeout(timeoutId);
        const endTime = Date.now();
        const responseTime = endTime - startTime;

        // Get response headers
        const responseHeaders: Record<string, string> = {};
        response.headers.forEach((value, key) => {
          responseHeaders[key] = value;
        });

        // Get response body
        let responseBody: any;
        const contentType = response.headers.get('content-type') || '';
        
        try {
          if (contentType.includes('application/json')) {
            responseBody = await response.json();
          } else {
            const text = await response.text();
            responseBody = text;
          }
        } catch (parseError) {
          responseBody = 'Could not parse response body';
        }

        // Determine success/failure
        const isSuccess = response.status >= 200 && response.status < 300;

        return {
          status: isSuccess ? 'success' : 'failed',
          status_code: response.status,
          response_time: responseTime,
          response_body: responseBody,
          error_message: isSuccess ? undefined : `HTTP ${response.status}: ${response.statusText}`,
          request_headers: headers,
          response_headers: responseHeaders,
          payload_size: payloadSize
        };

      } catch (error) {
        lastError = error as Error;
        attempt++;
        
        // If this was the last attempt, handle the error
        if (attempt > retryAttempts) {
          break;
        }
        
        // Wait before retry (exponential backoff)
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
      }
    }

    // Handle final error
    clearTimeout(timeoutId);
    const endTime = Date.now();
    const responseTime = endTime - startTime;

    // Determine error type
    let status: 'failed' | 'timeout' = 'failed';
    let errorMessage = 'Unknown error';

    if (lastError) {
      if (lastError.name === 'AbortError') {
        status = 'timeout';
        errorMessage = `Request timeout after ${timeout}ms`;
      } else if (lastError.message.includes('network') || lastError.message.includes('fetch')) {
        errorMessage = `Network error: ${lastError.message}`;
      } else {
        errorMessage = lastError.message;
      }
    }

    return {
      status,
      response_time: responseTime,
      error_message: errorMessage,
      request_headers: headers,
      payload_size: payloadSize
    };

  } catch (error) {
    const endTime = Date.now();
    const responseTime = endTime - startTime;
    
    return {
      status: 'failed',
      response_time: responseTime,
      error_message: `Test setup error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      request_headers: {},
      payload_size: 0
    };
  }
}

/**
 * Generate HMAC-SHA256 signature for webhook validation
 */
async function generateWebhookSignature(payload: string, secret: string): Promise<string> {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(secret);
  const messageData = encoder.encode(payload);

  const key = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const signature = await crypto.subtle.sign('HMAC', key, messageData);
  const hashArray = Array.from(new Uint8Array(signature));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  
  return `sha256=${hashHex}`;
}

/**
 * Create a test payload for a specific event type
 */
export function createTestPayload(
  eventType: string,
  webhookId: string,
  organizationId?: string,
  userId?: string,
  customData?: any
): WebhookTestPayload {
  const basePayload: WebhookTestPayload = {
    event_type: eventType,
    webhook_id: webhookId,
    timestamp: new Date().toISOString(),
    organization_id: organizationId,
    user_id: userId,
    data: customData || {}
  };

  // Add event-specific test data
  switch (eventType) {
    case 'user.created':
      basePayload.data = {
        user_id: userId || 'test-user-123',
        email: 'test@example.com',
        full_name: 'Test User',
        organization_id: organizationId || 'test-org-123',
        created_at: new Date().toISOString(),
        ...customData
      };
      break;

    case 'user.updated':
      basePayload.data = {
        user_id: userId || 'test-user-123',
        changes: {
          full_name: 'Updated Test User',
          last_login_at: new Date().toISOString()
        },
        organization_id: organizationId || 'test-org-123',
        updated_at: new Date().toISOString(),
        ...customData
      };
      break;

    case 'task.created':
      basePayload.data = {
        task_id: 'test-task-123',
        title: 'Test Task',
        description: 'This is a test task created for webhook testing',
        status: 'pending',
        priority: 'medium',
        project_id: 'test-project-123',
        assigned_to: userId || 'test-user-123',
        created_by: userId || 'test-user-123',
        organization_id: organizationId || 'test-org-123',
        created_at: new Date().toISOString(),
        due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        ...customData
      };
      break;

    case 'task.updated':
      basePayload.data = {
        task_id: 'test-task-123',
        changes: {
          status: 'in_progress',
          progress: 50,
          updated_by: userId || 'test-user-123'
        },
        organization_id: organizationId || 'test-org-123',
        updated_at: new Date().toISOString(),
        ...customData
      };
      break;

    case 'task.completed':
      basePayload.data = {
        task_id: 'test-task-123',
        title: 'Test Task',
        completed_by: userId || 'test-user-123',
        completed_at: new Date().toISOString(),
        organization_id: organizationId || 'test-org-123',
        completion_notes: 'Task completed successfully during webhook test',
        ...customData
      };
      break;

    case 'project.created':
      basePayload.data = {
        project_id: 'test-project-123',
        name: 'Test Project',
        description: 'This is a test project created for webhook testing',
        status: 'active',
        created_by: userId || 'test-user-123',
        organization_id: organizationId || 'test-org-123',
        created_at: new Date().toISOString(),
        start_date: new Date().toISOString(),
        end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        ...customData
      };
      break;

    case 'organization.created':
      basePayload.data = {
        organization_id: organizationId || 'test-org-123',
        name: 'Test Organization',
        created_by: userId || 'test-user-123',
        created_at: new Date().toISOString(),
        subscription_plan: 'free',
        settings: {
          timezone: 'UTC',
          date_format: 'MM/DD/YYYY'
        },
        ...customData
      };
      break;

    case 'feature.enabled':
      basePayload.data = {
        feature_id: 'test-feature-123',
        feature_name: 'Test Feature',
        organization_id: organizationId || 'test-org-123',
        enabled_by: userId || 'test-user-123',
        enabled_at: new Date().toISOString(),
        configuration: {},
        ...customData
      };
      break;

    case 'webhook.test':
    default:
      basePayload.data = {
        message: 'This is a test webhook call from OrganizePrime',
        test: true,
        webhook_id: webhookId,
        test_timestamp: new Date().toISOString(),
        environment: 'test',
        ...customData
      };
      break;
  }

  return basePayload;
}

/**
 * Test a webhook and log the result
 */
export async function testWebhookWithLogging(
  webhookId: string,
  eventType: string = 'webhook.test',
  customPayload?: any,
  options: WebhookTestOptions = {}
): Promise<WebhookTestResult> {
  try {
    // Get webhook details
    const { data: webhook, error: webhookError } = await supabase
      .from('feature_webhooks')
      .select('*')
      .eq('id', webhookId)
      .single();

    if (webhookError || !webhook) {
      throw new Error(`Webhook not found: ${webhookError?.message}`);
    }

    // Create test payload
    const payload = createTestPayload(
      eventType,
      webhookId,
      undefined, // organization_id will be determined from context
      undefined, // user_id will be determined from context
      customPayload
    );

    // Test the webhook - use url column (after migration) or fallback to endpoint_url
    const webhookUrl = webhook.url || webhook.endpoint_url;
    if (!webhookUrl) {
      throw new Error('Webhook URL not found in database');
    }

    const result = await testWebhookEndpoint(
      webhookUrl,
      webhook.secret_key,
      payload,
      options
    );

    // Log the test result
    const logEntry = {
      webhook_id: webhookId,
      event_type: eventType,
      status: result.status,
      status_code: result.status_code,
      response_time_ms: result.response_time,
      error_message: result.error_message,
      payload_size: result.payload_size,
      retry_count: options.retryAttempts || 0,
      is_test: true,
      request_headers: result.request_headers,
      response_headers: result.response_headers,
      request_body: payload,
      response_body: result.response_body
    };

    const { error: logError } = await supabase
      .from('webhook_logs')
      .insert(logEntry);

    if (logError) {
      console.error('Failed to log webhook test:', logError);
    }

    return result;

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    // Log the error
    try {
      await supabase
        .from('webhook_logs')
        .insert({
          webhook_id: webhookId,
          event_type: eventType,
          status: 'failed',
          error_message: errorMessage,
          payload_size: 0,
          response_time_ms: 0,
          retry_count: 0,
          is_test: true
        });
    } catch (logError) {
      console.error('Failed to log webhook test error:', logError);
    }

    return {
      status: 'failed',
      response_time: 0,
      error_message: errorMessage,
      request_headers: {},
      payload_size: 0
    };
  }
}

/**
 * Validate webhook URL format
 */
export function validateWebhookUrl(url: string): { isValid: boolean; error?: string } {
  try {
    const parsedUrl = new URL(url);
    
    // Must be HTTP or HTTPS
    if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
      return { isValid: false, error: 'URL must use HTTP or HTTPS protocol' };
    }
    
    // Recommend HTTPS for production
    if (parsedUrl.protocol === 'http:' && !parsedUrl.hostname.includes('localhost') && !parsedUrl.hostname.includes('127.0.0.1')) {
      // This is a warning, not a blocking error
      console.warn('Warning: HTTP URLs are not recommended for production webhooks. Consider using HTTPS.');
    }
    
    // Check for valid hostname
    if (!parsedUrl.hostname) {
      return { isValid: false, error: 'URL must have a valid hostname' };
    }
    
    return { isValid: true };
  } catch (error) {
    return { isValid: false, error: 'Invalid URL format' };
  }
}

/**
 * Get webhook test history
 */
export async function getWebhookTestHistory(webhookId: string, limit = 50) {
  const { data, error } = await supabase
    .from('webhook_logs')
    .select('*')
    .eq('webhook_id', webhookId)
    .eq('is_test', true)
    .order('triggered_at', { ascending: false })
    .limit(limit);

  if (error) {
    throw error;
  }

  return data || [];
}