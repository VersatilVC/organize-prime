/**
 * Core webhook execution engine with advanced payload processing
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.53.0";
import {
  ElementWebhookRequest,
  WebhookConfiguration,
  WebhookExecutionResult,
  ExecutionError,
  ExecutionMetadata,
  ErrorType,
  ExecutionStatus,
  HttpMethod,
  PayloadTemplateContext,
  DEFAULT_TIMEOUT_SECONDS,
  MAX_TIMEOUT_SECONDS,
  MAX_PAYLOAD_SIZE,
  RETRY_DELAYS
} from "./types.ts";

export class WebhookExecutor {
  private supabase: any;
  private requestId: string;

  constructor(supabaseUrl: string, supabaseKey: string, requestId: string) {
    this.supabase = createClient(supabaseUrl, supabaseKey);
    this.requestId = requestId;
  }

  /**
   * Main execution method for element webhooks
   */
  async executeWebhook(request: ElementWebhookRequest): Promise<WebhookExecutionResult> {
    const startTime = performance.now();
    const executionId = this.generateExecutionId();

    try {
      // 1. Validate request
      this.validateRequest(request);

      // 2. Fetch webhook configuration
      const webhookConfig = await this.fetchWebhookConfiguration(request);
      
      if (!webhookConfig) {
        throw this.createError(ErrorType.WEBHOOK_NOT_FOUND, 
          `No active webhook found for element ${request.elementId} in ${request.featureSlug}/${request.pagePath}`);
      }

      // 3. Check if webhook is active
      if (!webhookConfig.isActive) {
        throw this.createError(ErrorType.WEBHOOK_DISABLED, 
          `Webhook ${webhookConfig.id} is currently disabled`);
      }

      // 4. Process payload with template engine
      const processedPayload = await this.processPayloadTemplate(
        webhookConfig.payloadTemplate,
        request,
        webhookConfig
      );

      // 5. Prepare HTTP request
      const httpRequest = await this.prepareHttpRequest(
        webhookConfig,
        processedPayload,
        request
      );

      // 6. Execute HTTP request with retry logic
      const httpResponse = await this.executeHttpRequest(
        httpRequest,
        webhookConfig,
        executionId
      );

      // 7. Process response
      const result = await this.processResponse(
        httpResponse,
        webhookConfig,
        executionId,
        startTime
      );

      // 8. Update webhook statistics
      await this.updateWebhookStatistics(
        webhookConfig.id,
        Math.round(performance.now() - startTime),
        true
      );

      return result;

    } catch (error) {
      // Handle execution error
      const executionError = this.normalizeError(error);
      const responseTime = Math.round(performance.now() - startTime);
      
      // Update failure statistics
      if (request.organizationId && request.elementId) {
        await this.updateWebhookStatistics('unknown', responseTime, false);
      }

      return {
        success: false,
        executionId,
        webhookId: 'unknown',
        statusCode: 0,
        responseTime,
        error: executionError,
        metadata: {
          attempts: 1,
          totalDuration: responseTime,
          networkLatency: 0,
          processingTime: responseTime,
          queueTime: 0,
          timestamp: new Date().toISOString()
        }
      };
    }
  }

  /**
   * Validate incoming request parameters
   */
  private validateRequest(request: ElementWebhookRequest): void {
    if (!request.organizationId) {
      throw this.createError(ErrorType.VALIDATION_PAYLOAD_INVALID, 'Organization ID is required');
    }
    
    if (!request.featureSlug) {
      throw this.createError(ErrorType.VALIDATION_PAYLOAD_INVALID, 'Feature slug is required');
    }
    
    if (!request.pagePath) {
      throw this.createError(ErrorType.VALIDATION_PAYLOAD_INVALID, 'Page path is required');
    }
    
    if (!request.elementId) {
      throw this.createError(ErrorType.VALIDATION_PAYLOAD_INVALID, 'Element ID is required');
    }
    
    if (!request.userContext?.userId) {
      throw this.createError(ErrorType.VALIDATION_PAYLOAD_INVALID, 'User context is required');
    }

    // Validate payload size
    const payloadSize = new TextEncoder().encode(JSON.stringify(request.payload)).length;
    if (payloadSize > MAX_PAYLOAD_SIZE) {
      throw this.createError(
        ErrorType.CLIENT_PAYLOAD_TOO_LARGE,
        `Payload size ${payloadSize} exceeds maximum ${MAX_PAYLOAD_SIZE} bytes`
      );
    }
  }

  /**
   * Fetch webhook configuration from database
   */
  private async fetchWebhookConfiguration(request: ElementWebhookRequest): Promise<WebhookConfiguration | null> {
    try {
      const { data, error } = await this.supabase
        .from('element_webhooks')
        .select(`
          id,
          organization_id,
          feature_slug,
          page_path,
          element_id,
          endpoint_url,
          http_method,
          payload_template,
          headers,
          timeout_seconds,
          retry_count,
          rate_limit_per_minute,
          is_active,
          created_at,
          updated_at
        `)
        .eq('organization_id', request.organizationId)
        .eq('feature_slug', request.featureSlug)
        .eq('page_path', request.pagePath)
        .eq('element_id', request.elementId)
        .eq('is_active', true)
        .single();

      if (error) {
        console.error('Database error fetching webhook config:', error);
        return null;
      }

      return {
        id: data.id,
        organizationId: data.organization_id,
        featureSlug: data.feature_slug,
        pagePath: data.page_path,
        elementId: data.element_id,
        endpointUrl: data.endpoint_url,
        httpMethod: data.http_method as HttpMethod,
        payloadTemplate: data.payload_template || {},
        headers: data.headers || {},
        timeoutSeconds: Math.min(data.timeout_seconds || DEFAULT_TIMEOUT_SECONDS, MAX_TIMEOUT_SECONDS),
        retryCount: Math.min(data.retry_count || 3, 10),
        rateLimitPerMinute: data.rate_limit_per_minute || 60,
        isActive: data.is_active,
        createdAt: data.created_at,
        updatedAt: data.updated_at
      };
    } catch (error) {
      console.error('Failed to fetch webhook configuration:', error);
      throw this.createError(ErrorType.SYSTEM_DATABASE_ERROR, 'Failed to fetch webhook configuration');
    }
  }

  /**
   * Process payload template with variable substitution
   */
  private async processPayloadTemplate(
    template: Record<string, any>,
    request: ElementWebhookRequest,
    config: WebhookConfiguration
  ): Promise<Record<string, any>> {
    try {
      // Build template context
      const context = await this.buildTemplateContext(request, config);
      
      // Process template recursively
      const processedPayload = this.processTemplateRecursive(template, context);
      
      // Merge with request payload
      const finalPayload = {
        ...processedPayload,
        ...request.payload,
        // Always include metadata
        _metadata: {
          executionId: this.generateExecutionId(),
          timestamp: new Date().toISOString(),
          source: 'organize-prime-webhook-system',
          version: '2.0.0',
          elementContext: {
            featureSlug: request.featureSlug,
            pagePath: request.pagePath,
            elementId: request.elementId,
            eventType: request.eventType
          }
        }
      };

      return finalPayload;
    } catch (error) {
      console.error('Template processing error:', error);
      throw this.createError(
        ErrorType.VALIDATION_TEMPLATE_ERROR,
        `Template processing failed: ${error.message}`
      );
    }
  }

  /**
   * Build template context with all available variables
   */
  private async buildTemplateContext(
    request: ElementWebhookRequest,
    config: WebhookConfiguration
  ): Promise<PayloadTemplateContext> {
    // Fetch user and organization details
    const [userDetails, orgDetails] = await Promise.all([
      this.fetchUserDetails(request.userContext.userId),
      this.fetchOrganizationDetails(request.organizationId)
    ]);

    return {
      user: {
        id: request.userContext.userId,
        email: userDetails?.email || '',
        role: request.userContext.role,
        organization: request.organizationId
      },
      organization: {
        id: request.organizationId,
        name: orgDetails?.name || '',
        slug: orgDetails?.slug || '',
        settings: orgDetails?.settings || {}
      },
      element: {
        id: request.elementId,
        type: 'unknown', // Will be enriched from page_elements_registry
        page: request.pagePath,
        feature: request.featureSlug
      },
      event: {
        type: request.eventType,
        timestamp: new Date().toISOString(),
        sessionId: request.userContext.sessionId || ''
      },
      payload: request.payload,
      system: {
        timestamp: new Date().toISOString(),
        environment: 'production',
        version: '2.0.0'
      }
    };
  }

  /**
   * Recursively process template with variable substitution
   */
  private processTemplateRecursive(obj: any, context: PayloadTemplateContext): any {
    if (typeof obj === 'string') {
      return this.substituteVariables(obj, context);
    } else if (Array.isArray(obj)) {
      return obj.map(item => this.processTemplateRecursive(item, context));
    } else if (obj !== null && typeof obj === 'object') {
      const result: any = {};
      for (const [key, value] of Object.entries(obj)) {
        result[key] = this.processTemplateRecursive(value, context);
      }
      return result;
    }
    return obj;
  }

  /**
   * Substitute template variables in string
   */
  private substituteVariables(template: string, context: PayloadTemplateContext): any {
    // Handle basic variable substitution {{variable.path}}
    let result = template.replace(/\{\{([^}]+)\}\}/g, (match, path) => {
      const value = this.getNestedValue(context, path.trim());
      
      // Handle special functions
      if (path.trim() === 'now()') {
        return new Date().toISOString();
      } else if (path.trim() === 'uuid()') {
        return crypto.randomUUID();
      } else if (path.trim() === 'timestamp()') {
        return Date.now().toString();
      }
      
      return value !== undefined ? String(value) : match;
    });

    // Try to parse as JSON if it looks like a JSON value
    if (result.startsWith('{') || result.startsWith('[') || result === 'true' || result === 'false' || !isNaN(Number(result))) {
      try {
        return JSON.parse(result);
      } catch {
        // If parsing fails, return as string
      }
    }

    return result;
  }

  /**
   * Get nested value from object using dot notation
   */
  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }

  /**
   * Prepare HTTP request with headers and authentication
   */
  private async prepareHttpRequest(
    config: WebhookConfiguration,
    payload: Record<string, any>,
    request: ElementWebhookRequest
  ) {
    // Validate URL
    if (!this.isValidUrl(config.endpointUrl)) {
      throw this.createError(ErrorType.VALIDATION_URL_INVALID, `Invalid webhook URL: ${config.endpointUrl}`);
    }

    // Prepare headers
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'User-Agent': 'OrganizePrime-Webhook/2.0',
      'X-Request-ID': this.requestId,
      'X-Organization-ID': request.organizationId,
      'X-Feature-Slug': request.featureSlug,
      'X-Element-ID': request.elementId,
      'X-Event-Type': request.eventType,
      'X-Timestamp': new Date().toISOString(),
      ...config.headers
    };

    // Add authentication headers if configured
    if (config.authConfig) {
      this.addAuthenticationHeaders(headers, config.authConfig);
    }

    return {
      url: config.endpointUrl,
      method: config.httpMethod,
      headers,
      body: JSON.stringify(payload),
      timeout: config.timeoutSeconds * 1000
    };
  }

  /**
   * Execute HTTP request with retry logic
   */
  private async executeHttpRequest(
    httpRequest: any,
    config: WebhookConfiguration,
    executionId: string
  ) {
    let lastError: Error | null = null;
    let attempt = 0;
    const maxAttempts = config.retryCount + 1;

    while (attempt < maxAttempts) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), httpRequest.timeout);

        const response = await fetch(httpRequest.url, {
          method: httpRequest.method,
          headers: httpRequest.headers,
          body: httpRequest.method !== 'GET' ? httpRequest.body : undefined,
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        // Check if response indicates a retryable error
        if (!response.ok) {
          const isRetryable = this.isRetryableStatusCode(response.status);
          
          if (!isRetryable || attempt === maxAttempts - 1) {
            // Non-retryable error or last attempt
            const errorBody = await response.text().catch(() => 'Unable to read response body');
            throw this.createError(
              this.getErrorTypeFromStatusCode(response.status),
              `HTTP ${response.status}: ${errorBody}`,
              { statusCode: response.status, responseBody: errorBody }
            );
          }
          
          // Retryable error - continue to retry logic
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        return response;
      } catch (error) {
        lastError = error as Error;
        attempt++;

        // Handle abort/timeout specifically
        if (error.name === 'AbortError') {
          throw this.createError(ErrorType.NETWORK_TIMEOUT, `Request timed out after ${httpRequest.timeout}ms`);
        }

        // If this was the last attempt, throw the error
        if (attempt >= maxAttempts) {
          throw this.createError(
            ErrorType.NETWORK_UNREACHABLE,
            `Failed after ${maxAttempts} attempts: ${lastError?.message}`,
            { attempts: maxAttempts, lastError: lastError?.message }
          );
        }

        // Wait before retry with exponential backoff
        const delay = RETRY_DELAYS[Math.min(attempt - 1, RETRY_DELAYS.length - 1)];
        await this.sleep(delay);
      }
    }

    // This should never be reached, but just in case
    throw lastError || new Error('Unknown execution error');
  }

  /**
   * Process HTTP response and create execution result
   */
  private async processResponse(
    response: Response,
    config: WebhookConfiguration,
    executionId: string,
    startTime: number
  ): Promise<WebhookExecutionResult> {
    const responseTime = Math.round(performance.now() - startTime);
    
    try {
      // Read response body
      const responseText = await response.text();
      let responseBody: any = responseText;

      // Try to parse as JSON
      const contentType = response.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        try {
          responseBody = JSON.parse(responseText);
        } catch {
          // Keep as text if JSON parsing fails
        }
      }

      return {
        success: true,
        executionId,
        webhookId: config.id,
        statusCode: response.status,
        responseTime,
        responseBody,
        metadata: {
          attempts: 1, // TODO: Track actual attempts
          totalDuration: responseTime,
          networkLatency: responseTime * 0.7, // Estimate
          processingTime: responseTime * 0.3, // Estimate
          queueTime: 0,
          timestamp: new Date().toISOString()
        }
      };
    } catch (error) {
      throw this.createError(
        ErrorType.SERVER_INTERNAL_ERROR,
        `Failed to process response: ${error.message}`
      );
    }
  }

  /**
   * Helper methods
   */
  
  private generateExecutionId(): string {
    return `exec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private isValidUrl(url: string): boolean {
    try {
      const urlObj = new URL(url);
      return urlObj.protocol === 'https:';
    } catch {
      return false;
    }
  }

  private isRetryableStatusCode(statusCode: number): boolean {
    // Retry on 5xx errors and some 4xx errors
    return statusCode >= 500 || statusCode === 429 || statusCode === 408;
  }

  private getErrorTypeFromStatusCode(statusCode: number): ErrorType {
    if (statusCode >= 500) return ErrorType.SERVER_INTERNAL_ERROR;
    if (statusCode === 429) return ErrorType.SERVER_RATE_LIMITED;
    if (statusCode === 408) return ErrorType.NETWORK_TIMEOUT;
    if (statusCode === 401 || statusCode === 403) return ErrorType.AUTH_INVALID_CREDENTIALS;
    if (statusCode === 404) return ErrorType.CLIENT_NOT_FOUND;
    return ErrorType.CLIENT_BAD_REQUEST;
  }

  private createError(type: ErrorType, message: string, details?: any): ExecutionError {
    return {
      type,
      message,
      details,
      retryable: this.isRetryableError(type),
      suggestedAction: this.getSuggestedAction(type)
    };
  }

  private isRetryableError(errorType: ErrorType): boolean {
    const retryableErrors = [
      ErrorType.NETWORK_TIMEOUT,
      ErrorType.NETWORK_UNREACHABLE,
      ErrorType.SERVER_INTERNAL_ERROR,
      ErrorType.SERVER_OVERLOADED,
      ErrorType.SERVER_RATE_LIMITED
    ];
    return retryableErrors.includes(errorType);
  }

  private getSuggestedAction(errorType: ErrorType): string {
    const suggestions: Record<ErrorType, string> = {
      [ErrorType.NETWORK_TIMEOUT]: 'Check webhook endpoint availability and increase timeout',
      [ErrorType.AUTH_INVALID_CREDENTIALS]: 'Verify webhook authentication configuration',
      [ErrorType.WEBHOOK_NOT_FOUND]: 'Configure webhook for this element',
      [ErrorType.WEBHOOK_DISABLED]: 'Enable webhook in system settings',
      [ErrorType.RATE_LIMIT_EXCEEDED]: 'Reduce webhook frequency or increase rate limits',
      [ErrorType.VALIDATION_URL_INVALID]: 'Update webhook URL to use HTTPS',
      [ErrorType.CLIENT_PAYLOAD_TOO_LARGE]: 'Reduce payload size or increase limits'
    } as any;

    return suggestions[errorType] || 'Check webhook configuration and try again';
  }

  private normalizeError(error: any): ExecutionError {
    if (error.type && error.message) {
      return error as ExecutionError;
    }

    return this.createError(
      ErrorType.SYSTEM_CONFIGURATION_ERROR,
      error.message || 'Unknown error occurred'
    );
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private addAuthenticationHeaders(headers: Record<string, string>, authConfig: any): void {
    // TODO: Implement authentication header generation
    // This will be implemented in the security phase
  }

  private async fetchUserDetails(userId: string): Promise<any> {
    try {
      const { data } = await this.supabase
        .from('profiles')
        .select('full_name, username')
        .eq('id', userId)
        .single();
      return data;
    } catch {
      return null;
    }
  }

  private async fetchOrganizationDetails(orgId: string): Promise<any> {
    try {
      const { data } = await this.supabase
        .from('organizations')
        .select('name, slug, settings')
        .eq('id', orgId)
        .single();
      return data;
    } catch {
      return null;
    }
  }

  private async updateWebhookStatistics(
    webhookId: string,
    executionTime: number,
    success: boolean
  ): Promise<void> {
    try {
      await this.supabase.rpc('update_webhook_stats', {
        p_webhook_id: webhookId,
        p_execution_time_ms: executionTime,
        p_success: success
      });
    } catch (error) {
      console.error('Failed to update webhook statistics:', error);
      // Don't throw - statistics update failure shouldn't fail the execution
    }
  }
}