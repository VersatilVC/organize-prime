/**
 * ElementWebhookTriggerService - Connects element webhook system with application events
 * Triggers element webhooks when specific events occur (like chat messages, form submissions, etc.)
 */

import { supabase } from '@/integrations/supabase/client';
import { WebhookExecutionService, ExecutionConfig } from './WebhookExecutionService';
import { ServiceConfig } from './base/BaseWebhookService';
import { WebhookExecutionRequest, ExecutionResult } from '../types/webhook';

interface ElementWebhook {
  id: string;
  element_id: string;
  organization_id: string;
  webhook_name: string;
  webhook_url: string;
  http_method: string;
  headers: Record<string, string>;
  payload_template: Record<string, any>;
  trigger_events: string[];
  is_enabled: boolean;
  timeout_seconds: number;
  retry_attempts: number;
}

interface ChatEventContext {
  conversationId: string;
  messageId: string;
  userMessage?: string;
  assistantResponse?: string;
  organizationId: string;
  userId: string;
  modelConfig?: {
    model: string;
    temperature: number;
  };
}

export class ElementWebhookTriggerService {
  private executionService: WebhookExecutionService;
  private organizationId: string;

  constructor(organizationId: string, supabaseAnonKey: string) {
    this.organizationId = organizationId;

    // Configure services
    const serviceConfig: ServiceConfig = {
      supabaseUrl: import.meta.env.VITE_SUPABASE_URL,
      supabaseAnonKey: import.meta.env.VITE_SUPABASE_ANON_KEY || supabaseAnonKey,
      organizationId,
      debug: import.meta.env.DEV
    };

    const executionConfig: ExecutionConfig = {
      edgeFunctionUrl: `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/execute-element-webhook`,
      maxConcurrentExecutions: 20,
      defaultTimeout: 30000,
      retryConfig: {
        maxRetries: 3,
        baseDelay: 1000,
        maxDelay: 8000
      }
    };

    this.executionService = new WebhookExecutionService(serviceConfig, executionConfig);
  }

  /**
   * Get all active element webhooks for a specific event type
   */
  async getElementWebhooksForEvent(
    eventType: 'chat_message_sent' | 'chat_response_received' | 'chat_session_started' | 'chat_regenerate_requested'
  ): Promise<ElementWebhook[]> {
    try {
      console.log(`🔍 Searching for element webhooks with org_id: ${this.organizationId}, event: ${eventType}`);
      
      const { data: webhooks, error } = await supabase
        .from('element_webhooks')
        .select('*')
        .eq('organization_id', this.organizationId)
        .eq('is_enabled', true)
        .contains('trigger_events', [eventType]); // Check if eventType is in the trigger_events array

      if (error) {
        console.error('Error fetching element webhooks:', error);
        return [];
      }

      console.log(`🔍 Found ${webhooks?.length || 0} element webhooks for event: ${eventType}`);
      
      if (webhooks && webhooks.length > 0) {
        webhooks.forEach((webhook, index) => {
          console.log(`📋 Webhook ${index + 1}: ${webhook.webhook_name} (${webhook.id})`);
          console.log(`   URL: ${webhook.webhook_url}`);
          console.log(`   Events: ${JSON.stringify(webhook.trigger_events)}`);
        });
      }

      return webhooks || [];
    } catch (error) {
      console.error('ElementWebhookTriggerService.getElementWebhooksForEvent error:', error);
      return [];
    }
  }

  /**
   * Trigger element webhooks for chat message events
   */
  async triggerChatMessageWebhooks(
    eventType: 'chat_message_sent' | 'chat_response_received' | 'chat_session_started' | 'chat_regenerate_requested',
    context: ChatEventContext
  ): Promise<ExecutionResult[]> {
    try {
      console.log(`🎯 Triggering element webhooks for ${eventType}...`);
      console.log(`🏢 Organization ID: ${this.organizationId}`);

      // Get relevant webhooks for the event type
      const webhooks = await this.getElementWebhooksForEvent(eventType);

      if (webhooks.length === 0) {
        console.log('📭 No element webhooks found for chat events');
        return [];
      }

      console.log(`🔗 Found ${webhooks.length} element webhooks to trigger`);

      // Prepare webhook execution requests
      const executionPromises = webhooks.map(webhook => this.executeElementWebhook(webhook, eventType, context));

      // Execute all webhooks concurrently
      const results = await Promise.allSettled(executionPromises);

      // Process results
      const executionResults: ExecutionResult[] = [];
      results.forEach((result, index) => {
        const webhook = webhooks[index];
        
        if (result.status === 'fulfilled') {
          executionResults.push(result.value);
          console.log(`✅ Element webhook ${webhook.id} executed successfully`);
        } else {
          console.error(`❌ Element webhook ${webhook.id} failed:`, result.reason);
          
          // Create error result
          executionResults.push({
            success: false,
            executionId: `failed-${webhook.id}-${Date.now()}`,
            webhookId: webhook.id,
            responseTime: 0,
            error: {
              type: 'EXECUTION_ERROR',
              message: result.reason?.message || 'Element webhook execution failed',
              details: { webhook, originalError: result.reason },
              retryable: true,
              suggestedAction: 'Check webhook configuration and network connectivity'
            },
            metadata: {
              attempts: 1,
              networkLatency: 0,
              processingTime: 0,
              queueTime: 0
            }
          });
        }
      });

      console.log(`🎯 Completed element webhook execution: ${executionResults.filter(r => r.success).length}/${executionResults.length} successful`);
      
      return executionResults;
    } catch (error) {
      console.error('ElementWebhookTriggerService.triggerChatMessageWebhooks error:', error);
      return [];
    }
  }

  /**
   * Execute a single element webhook
   */
  private async executeElementWebhook(
    webhook: ElementWebhook,
    eventType: string,
    context: ChatEventContext
  ): Promise<ExecutionResult> {
    try {
      // Build payload from template and context
      const payload = this.buildWebhookPayload(webhook.payload_template, eventType, context);

      console.log(`🚀 Executing element webhook: ${webhook.webhook_name} (${webhook.id}) for ${eventType}`);
      console.log(`🔗 Webhook URL: ${webhook.webhook_url}`);
      console.log(`📦 Payload:`, payload);

      // For now, make a direct HTTP call to test the integration
      // Later we can use the edge function for more advanced features
      const startTime = Date.now();
      
      try {
        const response = await fetch(webhook.webhook_url, {
          method: webhook.http_method || 'POST',
          headers: {
            'Content-Type': 'application/json',
            'User-Agent': 'OrganizePrime-ElementWebhook/1.0',
            'X-Event-Type': eventType,
            'X-Organization-ID': context.organizationId,
            'X-Conversation-ID': context.conversationId,
            'X-Message-ID': context.messageId,
            ...webhook.headers
          },
          body: JSON.stringify(payload)
        });

        const responseTime = Date.now() - startTime;
        const responseText = await response.text();
        
        let responseBody: any = responseText;
        try {
          responseBody = JSON.parse(responseText);
        } catch {
          // Keep as text if JSON parsing fails
        }

        console.log(`📊 Element webhook ${webhook.id} result: ${response.ok ? 'SUCCESS' : 'FAILED'} (${response.status}) in ${responseTime}ms`);
        if (!response.ok) {
          console.log(`❌ Response:`, responseBody);
        }

        const result: ExecutionResult = {
          success: response.ok,
          executionId: `direct-${Date.now()}`,
          webhookId: webhook.id,
          statusCode: response.status,
          responseTime,
          responseBody: response.ok ? responseBody : undefined,
          error: response.ok ? undefined : {
            type: 'HTTP_ERROR',
            message: `HTTP ${response.status}: ${responseText}`,
            details: { statusCode: response.status, responseBody },
            retryable: response.status >= 500,
            suggestedAction: 'Check webhook endpoint and configuration'
          },
          metadata: {
            attempts: 1,
            networkLatency: responseTime,
            processingTime: 0,
            queueTime: 0
          }
        };

        return result;
      } catch (networkError) {
        const responseTime = Date.now() - startTime;
        console.error(`❌ Network error calling webhook ${webhook.id}:`, networkError);
        
        return {
          success: false,
          executionId: `direct-error-${Date.now()}`,
          webhookId: webhook.id,
          responseTime,
          error: {
            type: 'NETWORK_ERROR',
            message: networkError.message || 'Network request failed',
            details: { originalError: networkError },
            retryable: true,
            suggestedAction: 'Check network connectivity and webhook URL'
          },
          metadata: {
            attempts: 1,
            networkLatency: responseTime,
            processingTime: 0,
            queueTime: 0
          }
        };
      }
    } catch (error) {
      console.error(`ElementWebhookTriggerService.executeElementWebhook error for ${webhook.id}:`, error);
      throw error;
    }
  }

  /**
   * Build webhook payload from template and context
   */
  private buildWebhookPayload(
    template: Record<string, any>,
    eventType: string,
    context: ChatEventContext
  ): Record<string, any> {
    const basePayload = {
      event_type: eventType,
      timestamp: new Date().toISOString(),
      organization_id: context.organizationId,
      user_id: context.userId,
      conversation_id: context.conversationId,
      message_id: context.messageId,
    };

    // Add context-specific data
    if (context.userMessage) {
      basePayload.user_message = context.userMessage;
    }

    if (context.assistantResponse) {
      basePayload.assistant_response = context.assistantResponse;
    }

    if (context.modelConfig) {
      basePayload.model_config = context.modelConfig;
    }

    // Merge with template (template values override base payload)
    const finalPayload = { ...basePayload, ...template };

    // Process template variables (simple string replacement)
    return this.processTemplateVariables(finalPayload, context);
  }

  /**
   * Process template variables in payload
   */
  private processTemplateVariables(
    payload: Record<string, any>,
    context: ChatEventContext
  ): Record<string, any> {
    const templateVars: Record<string, string> = {
      '{{conversation_id}}': context.conversationId,
      '{{message_id}}': context.messageId,
      '{{user_id}}': context.userId,
      '{{organization_id}}': context.organizationId,
      '{{timestamp}}': new Date().toISOString(),
      '{{user_message}}': context.userMessage || '',
      '{{assistant_response}}': context.assistantResponse || '',
      '{{model}}': context.modelConfig?.model || '',
      '{{temperature}}': String(context.modelConfig?.temperature || 0.7)
    };

    // Convert payload to string, replace variables, and parse back
    let payloadStr = JSON.stringify(payload);
    
    Object.entries(templateVars).forEach(([placeholder, value]) => {
      payloadStr = payloadStr.replace(new RegExp(placeholder, 'g'), value);
    });

    try {
      return JSON.parse(payloadStr);
    } catch (error) {
      console.warn('Failed to parse template variables, using original payload:', error);
      return payload;
    }
  }

  /**
   * Test element webhook connectivity
   */
  async testElementWebhook(webhookId: string): Promise<ExecutionResult> {
    try {
      const { data: webhook, error } = await supabase
        .from('element_registry')
        .select('*')
        .eq('id', webhookId)
        .eq('organization_id', this.organizationId)
        .single();

      if (error || !webhook) {
        throw new Error(`Webhook not found: ${webhookId}`);
      }

      // Create test context
      const testContext: ChatEventContext = {
        conversationId: 'test-conversation',
        messageId: 'test-message',
        userMessage: 'Test message from element webhook system',
        organizationId: this.organizationId,
        userId: 'test-user',
        modelConfig: { model: 'test-model', temperature: 0.7 }
      };

      return await this.executeElementWebhook(webhook, 'chat_message_sent', testContext);
    } catch (error) {
      console.error('ElementWebhookTriggerService.testElementWebhook error:', error);
      throw error;
    }
  }

  /**
   * Cleanup resources
   */
  dispose(): void {
    this.executionService.dispose();
  }
}