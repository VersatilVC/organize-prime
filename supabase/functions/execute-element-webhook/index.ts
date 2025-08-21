/**
 * Enhanced Element Webhook Execution Edge Function
 * 
 * This function provides a complete replacement for the feature-centric webhook system
 * with element-level webhook assignment, comprehensive security, logging, and error handling.
 */

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.53.0";
// CORS headers for cross-origin requests
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-environment",
};

// Import our modular components
import { WebhookExecutor } from "./webhook-executor.ts";
import { SecurityValidator } from "./security-validator.ts";
import { LoggingService } from "./logging-service.ts";
import { ErrorHandler } from "./error-handler.ts";
import {
  ElementWebhookRequest,
  WebhookExecutionResult,
  ErrorType,
  ExecutionStatus
} from "./types.ts";

serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const startTime = performance.now();

  // Get environment variables
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

  // Validate environment
  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing required environment variables');
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Server configuration error',
        requestId
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }

  // Initialize services
  const logger = new LoggingService(supabaseUrl, supabaseServiceKey, requestId);
  const errorHandler = new ErrorHandler(supabaseUrl, supabaseServiceKey, logger, requestId);
  const securityValidator = new SecurityValidator(supabaseUrl, supabaseServiceKey, requestId);
  const webhookExecutor = new WebhookExecutor(supabaseUrl, supabaseServiceKey, requestId);

  logger.info('Element webhook execution request received', {
    method: req.method,
    url: req.url,
    requestId
  });

  try {
    // 1. Validate HTTP method
    if (req.method !== 'POST') {
      const error = errorHandler.createError(
        ErrorType.CLIENT_BAD_REQUEST,
        `Method ${req.method} not allowed. Use POST.`
      );
      
      return createErrorResponse(error, 405, requestId, logger);
    }

    // 2. Parse and validate request body
    let requestBody: ElementWebhookRequest;
    try {
      requestBody = await req.json();
    } catch (parseError) {
      const error = errorHandler.createError(
        ErrorType.VALIDATION_PAYLOAD_INVALID,
        'Invalid JSON in request body'
      );
      
      return createErrorResponse(error, 400, requestId, logger);
    }

    // 3. Validate request structure
    const validationError = validateRequestStructure(requestBody);
    if (validationError) {
      const error = errorHandler.createError(
        ErrorType.VALIDATION_PAYLOAD_INVALID,
        validationError
      );
      
      return createErrorResponse(error, 400, requestId, logger);
    }

    logger.info('Request validation passed', {
      organizationId: requestBody.organizationId,
      featureSlug: requestBody.featureSlug,
      elementId: requestBody.elementId,
      eventType: requestBody.eventType
    });

    // 4. Get webhook configuration
    const webhookConfig = await fetchWebhookConfiguration(
      supabaseUrl,
      supabaseServiceKey,
      requestBody
    );

    if (!webhookConfig) {
      const error = errorHandler.createError(
        ErrorType.WEBHOOK_NOT_FOUND,
        `No active webhook found for element ${requestBody.elementId} in ${requestBody.featureSlug}/${requestBody.pagePath}`
      );
      
      return createErrorResponse(error, 404, requestId, logger);
    }

    // 5. Security validation
    const securityResult = await securityValidator.validateSecurity(requestBody, webhookConfig);
    if (!securityResult.valid) {
      logger.warn('Security validation failed', {
        error: securityResult.error?.message,
        type: securityResult.error?.type
      });
      
      return createErrorResponse(
        securityResult.error!, 
        getStatusCodeFromErrorType(securityResult.error!.type), 
        requestId, 
        logger
      );
    }

    logger.info('Security validation passed');

    // 6. Execute webhook with retry logic
    const executionId = `exec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Log execution start
    await logger.logExecutionStart(requestBody, webhookConfig, executionId);

    let result: WebhookExecutionResult;
    let attemptNumber = 1;
    const maxAttempts = webhookConfig.retryCount + 1;

    while (attemptNumber <= maxAttempts) {
      try {
        logger.info(`Webhook execution attempt ${attemptNumber}/${maxAttempts}`, {
          executionId,
          webhookId: webhookConfig.id
        });

        // Execute the webhook
        result = await webhookExecutor.executeWebhook(requestBody);
        
        if (result.success) {
          // Success - log and return
          await logger.logExecutionComplete(executionId, result, webhookConfig, requestBody);
          
          logger.info('Webhook execution completed successfully', {
            executionId,
            responseTime: result.responseTime,
            statusCode: result.statusCode
          });

          await logger.finalize();

          return new Response(
            JSON.stringify({
              success: true,
              executionId,
              webhookId: result.webhookId,
              statusCode: result.statusCode,
              responseTime: result.responseTime,
              requestId,
              metadata: result.metadata
            }),
            {
              status: 200,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            }
          );
        } else {
          // Execution failed - handle error
          const errorResponse = await errorHandler.handleExecutionError(
            result.error!,
            requestBody,
            webhookConfig,
            executionId,
            attemptNumber
          );

          if (errorResponse.shouldRetry && attemptNumber < maxAttempts) {
            logger.info(`Retrying webhook execution after ${errorResponse.retryDelay}ms`, {
              executionId,
              attemptNumber,
              retryDelay: errorResponse.retryDelay
            });

            // Wait before retry
            if (errorResponse.retryDelay) {
              await new Promise(resolve => setTimeout(resolve, errorResponse.retryDelay));
            }

            attemptNumber++;
            continue;
          } else {
            // No more retries or not retryable
            await logger.logExecutionComplete(executionId, result, webhookConfig, requestBody);
            
            logger.error('Webhook execution failed after all attempts', {
              executionId,
              totalAttempts: attemptNumber,
              finalError: result.error?.message
            });

            await logger.finalize();

            return createErrorResponse(
              result.error!,
              getStatusCodeFromErrorType(result.error!.type),
              requestId,
              logger
            );
          }
        }
      } catch (executionError) {
        // Unexpected error during execution
        const normalizedError = errorHandler.createError(
          ErrorType.SYSTEM_CONFIGURATION_ERROR,
          `Execution attempt ${attemptNumber} failed: ${executionError.message}`
        );

        const errorResponse = await errorHandler.handleExecutionError(
          normalizedError,
          requestBody,
          webhookConfig,
          executionId,
          attemptNumber
        );

        if (errorResponse.shouldRetry && attemptNumber < maxAttempts) {
          logger.warn(`Execution attempt ${attemptNumber} failed, retrying`, {
            error: executionError.message,
            retryDelay: errorResponse.retryDelay
          });

          if (errorResponse.retryDelay) {
            await new Promise(resolve => setTimeout(resolve, errorResponse.retryDelay));
          }

          attemptNumber++;
          continue;
        } else {
          // Final failure
          await logger.logExecutionError(executionId, normalizedError, webhookConfig, requestBody);
          
          logger.error('Webhook execution failed with unrecoverable error', {
            executionId,
            error: executionError.message
          });

          await logger.finalize();

          return createErrorResponse(normalizedError, 500, requestId, logger);
        }
      }
    }

    // This should never be reached, but just in case
    throw new Error('Unexpected execution flow');

  } catch (globalError) {
    // Handle any unexpected errors
    logger.error('Global error in webhook execution', {
      error: globalError.message,
      stack: globalError.stack
    });

    const error = errorHandler.createError(
      ErrorType.SYSTEM_CONFIGURATION_ERROR,
      `Unexpected error: ${globalError.message}`
    );

    await logger.finalize();

    return createErrorResponse(error, 500, requestId, logger);
  }
});

/**
 * Helper functions
 */

function validateRequestStructure(body: any): string | null {
  const required = [
    'organizationId',
    'featureSlug', 
    'pagePath',
    'elementId',
    'eventType',
    'userContext',
    'payload'
  ];

  for (const field of required) {
    if (!body[field]) {
      return `Missing required field: ${field}`;
    }
  }

  if (!body.userContext.userId) {
    return 'Missing userContext.userId';
  }

  if (!['click', 'submit', 'trigger', 'test'].includes(body.eventType)) {
    return `Invalid eventType: ${body.eventType}`;
  }

  return null;
}

async function fetchWebhookConfiguration(
  supabaseUrl: string,
  supabaseKey: string,
  request: ElementWebhookRequest
): Promise<any> {
  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    const { data, error } = await supabase
      .from('element_registry')
      .select(`
        id,
        organization_id,
        feature_slug,
        page_path,
        element_signature,
        webhook_url,
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
      .eq('element_signature', request.elementId)
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
      elementId: data.element_signature,
      endpointUrl: data.webhook_url,
      httpMethod: data.http_method || 'POST',
      payloadTemplate: data.payload_template || {},
      headers: data.headers || {},
      timeoutSeconds: Math.min(data.timeout_seconds || 30, 300),
      retryCount: Math.min(data.retry_count || 3, 10),
      rateLimitPerMinute: data.rate_limit_per_minute || 60,
      isActive: data.is_active,
      createdAt: data.created_at,
      updatedAt: data.updated_at
    };
  } catch (error) {
    console.error('Failed to fetch webhook configuration:', error);
    return null;
  }
}

function getStatusCodeFromErrorType(errorType: ErrorType): number {
  switch (errorType) {
    case ErrorType.VALIDATION_PAYLOAD_INVALID:
    case ErrorType.VALIDATION_URL_INVALID:
    case ErrorType.CLIENT_BAD_REQUEST:
      return 400;
    
    case ErrorType.AUTH_INVALID_CREDENTIALS:
    case ErrorType.AUTH_INSUFFICIENT_PERMISSIONS:
      return 401;
    
    case ErrorType.WEBHOOK_NOT_FOUND:
    case ErrorType.CLIENT_NOT_FOUND:
      return 404;
    
    case ErrorType.CLIENT_PAYLOAD_TOO_LARGE:
      return 413;
    
    case ErrorType.RATE_LIMIT_EXCEEDED:
    case ErrorType.SERVER_RATE_LIMITED:
      return 429;
    
    case ErrorType.SERVER_INTERNAL_ERROR:
    case ErrorType.SYSTEM_DATABASE_ERROR:
    case ErrorType.SYSTEM_CONFIGURATION_ERROR:
    case ErrorType.SYSTEM_OVERLOADED:
      return 500;
    
    case ErrorType.NETWORK_TIMEOUT:
      return 504;
    
    default:
      return 500;
  }
}

function createErrorResponse(
  error: any, 
  statusCode: number, 
  requestId: string, 
  logger: LoggingService
): Response {
  const responseBody = {
    success: false,
    error: {
      type: error.type,
      message: error.message,
      retryable: error.retryable,
      suggestedAction: error.suggestedAction
    },
    requestId,
    timestamp: new Date().toISOString()
  };

  logger.error('Returning error response', {
    statusCode,
    errorType: error.type,
    errorMessage: error.message
  });

  return new Response(
    JSON.stringify(responseBody),
    {
      status: statusCode,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    }
  );
}