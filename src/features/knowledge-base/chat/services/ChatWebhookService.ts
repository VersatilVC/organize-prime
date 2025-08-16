import { supabase } from '@/integrations/supabase/client';
import type { ChatMessage } from './ChatMessageService';

export interface ChatWebhookRequest {
  conversation_id: string;
  message_id: string;
  user_message: string;
  organization_id: string;
  user_id: string;
  kb_ids: string[];
  conversation_history: Array<{
    role: 'user' | 'assistant';
    content: string;
    timestamp: string;
  }>;
  model_config: {
    model: string;
    temperature: number;
    max_tokens?: number;
  };
  system_prompt?: string;
}

export interface ChatWebhookResponse {
  success: boolean;
  message_id: string;
  response?: string;
  sources?: Array<{
    document_name: string;
    chunk_text: string;
    confidence_score: number;
    file_id: string;
  }>;
  metadata?: {
    tokens_used: number;
    processing_time: number;
    model_used: string;
  };
  error?: string;
}

export interface WebhookConfig {
  id: string;
  name: string;
  endpoint_url: string;
  is_active: boolean;
  timeout_seconds: number;
  retry_attempts: number;
}

export interface WebhookLog {
  id: string;
  request_payload: any;
  response_payload: any;
  status_code: number;
  processing_time: number;
  error_message?: string;
  created_at: string;
}

export class ChatWebhookService {
  private static readonly WEBHOOK_TIMEOUT = 60000; // 60 seconds
  private static readonly MAX_CONTEXT_MESSAGES = 10;
  private static readonly MAX_RETRY_ATTEMPTS = 3;
  private static readonly BASE_RETRY_DELAY = 1000; // 1 second

  /**
   * Sleep for given milliseconds (for retry delays)
   */
  private static sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Calculate exponential backoff delay
   */
  private static getRetryDelay(attempt: number): number {
    return this.BASE_RETRY_DELAY * Math.pow(2, attempt - 1);
  }

  /**
   * Execute webhook request with retry logic
   */
  private static async executeWebhookWithRetry(
    webhookUrl: string,
    payload: any,
    organizationId: string,
    webhookId: string,
    maxAttempts: number = this.MAX_RETRY_ATTEMPTS
  ): Promise<any> {
    let lastError: Error;
    
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        console.log(`Webhook attempt ${attempt}/${maxAttempts} for ${webhookId}`);
        console.log(`🔗 Calling webhook URL: ${webhookUrl}`);
        console.log(`📦 Payload size: ${JSON.stringify(payload).length} bytes`);
        
        const { data: response, error } = await supabase.functions.invoke(
          'exec-n8n-webhook',
          {
            body: {
              webhookUrl,
              method: 'POST',
              payload,
              organizationId,
              webhookId: `${webhookId}-attempt-${attempt}`
            }
          }
        );

        if (error) {
          console.error(`❌ Edge Function error:`, error);
          throw new Error(`Webhook execution failed: ${error.message}`);
        }

        console.log(`📥 Edge Function response:`, response);

        if (!response?.success && attempt < maxAttempts) {
          console.error(`❌ Webhook response indicates failure:`, response);
          throw new Error(response?.error || 'Webhook processing failed');
        }

        console.log(`✅ Webhook succeeded on attempt ${attempt}`);
        return response;
        
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown webhook error');
        console.warn(`Webhook attempt ${attempt} failed:`, lastError.message);
        
        if (attempt < maxAttempts) {
          const delay = this.getRetryDelay(attempt);
          console.log(`Retrying in ${delay}ms...`);
          await this.sleep(delay);
        }
      }
    }
    
    throw new Error(`Webhook failed after ${maxAttempts} attempts. Last error: ${lastError.message}`);
  }

  /**
   * Get the active chat webhook configuration
   */
  static async getChatWebhookUrl(): Promise<string> {
    try {
      // Try to get chat webhook - check for the configured AI Chat webhook
      const webhookNames = ['AI Chat_1755359351213', 'ai-chat-query', 'kb-chat-processing', 'chat-processing'];
      let data = null;
      let error = null;
      
      for (const webhookName of webhookNames) {
        const result = await supabase
          .from('feature_webhooks')
          .select('endpoint_url, url, is_active, name, feature_id')
          .eq('name', webhookName)
          .eq('is_active', true)
          .single();
          
        if (!result.error && result.data) {
          data = result.data;
          console.log(`🔗 Found active chat webhook: ${webhookName}`);
          console.log(`🔗 Webhook URL: ${data.endpoint_url || data.url}`);
          break;
        } else if (result.error && !result.error.message.includes('No rows found')) {
          error = result.error;
        }
      }

      if (error && !data) {
        console.error('Error fetching chat webhook:', error);
        throw new Error(`Failed to get chat webhook: ${error.message}`);
      }

      if (!data) {
        throw new Error(`No active chat webhook found. Looking for: ${webhookNames.join(', ')}. Please ensure your AI Chat webhook is active in the Knowledge Base feature settings.`);
      }

      // Use endpoint_url or url field
      const webhookUrl = data.endpoint_url || data.url;
      if (!webhookUrl) {
        throw new Error('Webhook URL is not configured. Please set the endpoint URL in Admin → Webhook Management.');
      }

      // Ensure it's a full URL
      if (webhookUrl.startsWith('/')) {
        const baseUrl = import.meta.env.VITE_N8N_BASE_URL || process.env.N8N_BASE_URL;
        console.log(`🔧 Detected relative webhook URL: ${webhookUrl}`);
        console.log(`🔧 N8N Base URL from env: ${baseUrl}`);
        
        if (!baseUrl) {
          throw new Error(`Webhook URL is relative (${webhookUrl}) but N8N base URL is not configured. Please either:\n1. Set VITE_N8N_BASE_URL environment variable, or\n2. Use a full URL (https://...) in the webhook configuration`);
        }
        
        const fullUrl = `${baseUrl}${webhookUrl}`;
        console.log(`🔗 Constructed full webhook URL: ${fullUrl}`);
        return fullUrl;
      }

      console.log(`🔗 Using configured webhook URL: ${webhookUrl}`);
      return webhookUrl;
    } catch (error) {
      console.error('ChatWebhookService.getChatWebhookUrl error:', error);
      throw error;
    }
  }

  /**
   * Prepare conversation context for webhook
   */
  static prepareConversationContext(
    messages: ChatMessage[],
    maxMessages: number = this.MAX_CONTEXT_MESSAGES
  ): Array<{ role: 'user' | 'assistant'; content: string; timestamp: string }> {
    return messages
      .filter(m => m.message_type !== 'system' && m.content.trim())
      .filter(m => m.processing_status === 'completed') // Only include completed messages
      .slice(-maxMessages) // Get last N messages
      .map(m => ({
        role: m.message_type === 'user' ? 'user' : 'assistant',
        content: m.content,
        timestamp: m.created_at
      }));
  }

  /**
   * Send chat message to N8N webhook for processing
   */
  static async sendChatMessage(
    conversationId: string,
    messageId: string,
    userMessage: string,
    organizationId: string,
    userId: string,
    kbIds: string[],
    conversationHistory: ChatMessage[],
    modelConfig: {
      model: string;
      temperature: number;
      max_tokens?: number;
    },
    systemPrompt?: string
  ): Promise<void> {
    try {
      // Get webhook URL
      const webhookUrl = await this.getChatWebhookUrl();

      // Prepare context
      const context = this.prepareConversationContext(conversationHistory);

      // Prepare webhook request
      const webhookRequest: ChatWebhookRequest = {
        conversation_id: conversationId,
        message_id: messageId,
        user_message: userMessage,
        organization_id: organizationId,
        user_id: userId,
        kb_ids: kbIds,
        conversation_history: context,
        model_config: {
          model: modelConfig.model,
          temperature: modelConfig.temperature,
          max_tokens: modelConfig.max_tokens || 2000
        },
        system_prompt: systemPrompt
      };

      console.log('Sending chat message to webhook:', {
        webhook: webhookUrl,
        conversationId,
        messageId,
        kbCount: kbIds.length,
        contextMessages: context.length
      });

      // Update message status to processing
      await this.updateMessageStatus(messageId, 'processing');

      // Send webhook request with retry logic
      const response = await this.executeWebhookWithRetry(
        webhookUrl,
        webhookRequest,
        organizationId,
        'kb-chat-processing'
      );

      if (!response?.success) {
        console.error('Webhook response indicated failure:', response);
        await this.updateMessageStatus(
          messageId,
          'error',
          undefined,
          undefined,
          response?.error || 'Webhook processing failed'
        );
        throw new Error(response?.error || 'Webhook processing failed');
      }

      console.log('✅ Chat message sent to webhook successfully');

      // If we get an immediate response, update the message
      if (response.response) {
        await this.updateMessageWithResponse(messageId, response);
      }

    } catch (error) {
      console.error('ChatWebhookService.sendChatMessage error:', error);
      
      // Update message with error status
      await this.updateMessageStatus(
        messageId,
        'error',
        undefined,
        undefined,
        error instanceof Error ? error.message : 'Unknown error occurred'
      );
      
      throw error;
    }
  }

  /**
   * Update message status in database
   */
  private static async updateMessageStatus(
    messageId: string,
    status: 'pending' | 'processing' | 'completed' | 'error',
    content?: string,
    sources?: any[],
    errorMessage?: string
  ): Promise<void> {
    try {
      const updateData: any = {
        processing_status: status
        // updated_at will be automatically set by the database trigger
      };

      if (content !== undefined) {
        updateData.content = content;
      }

      if (sources !== undefined) {
        updateData.sources = sources;
      }

      if (errorMessage !== undefined) {
        updateData.error_message = errorMessage;
      }

      if (status === 'completed') {
        updateData.error_message = null; // Clear any previous errors
      }

      const { error } = await supabase
        .from('kb_messages')
        .update(updateData)
        .eq('id', messageId);

      if (error) {
        console.error('Error updating message status:', error);
        throw new Error(`Failed to update message status: ${error.message}`);
      }

      console.log(`✅ Updated message ${messageId} status to ${status}`);
    } catch (error) {
      console.error('ChatWebhookService.updateMessageStatus error:', error);
      throw error;
    }
  }

  /**
   * Update message with webhook response
   */
  private static async updateMessageWithResponse(
    messageId: string,
    response: ChatWebhookResponse
  ): Promise<void> {
    try {
      await this.updateMessageStatus(
        messageId,
        'completed',
        response.response || '',
        response.sources || [],
        undefined
      );

      // Update metadata if provided
      if (response.metadata) {
        const { error: metadataError } = await supabase
          .from('kb_messages')
          .update({
            metadata: response.metadata,
            updated_at: new Date().toISOString()
          })
          .eq('id', messageId);

        if (metadataError) {
          console.warn('Failed to update message metadata:', metadataError);
        }
      }

      console.log('✅ Updated message with webhook response');
    } catch (error) {
      console.error('ChatWebhookService.updateMessageWithResponse error:', error);
      throw error;
    }
  }

  /**
   * Regenerate assistant response
   */
  static async regenerateResponse(
    conversationId: string,
    messageId: string,
    originalPrompt: string,
    organizationId: string,
    userId: string,
    kbIds: string[],
    conversationHistory: ChatMessage[],
    modelConfig: {
      model: string;
      temperature: number;
      max_tokens?: number;
    }
  ): Promise<void> {
    try {
      // Get webhook URL
      const webhookUrl = await this.getChatWebhookUrl();

      // Prepare context (exclude the message being regenerated)
      const filteredHistory = conversationHistory.filter(m => m.id !== messageId);
      const context = this.prepareConversationContext(filteredHistory);

      // Prepare regeneration request
      const webhookRequest: ChatWebhookRequest = {
        conversation_id: conversationId,
        message_id: messageId,
        user_message: originalPrompt,
        organization_id: organizationId,
        user_id: userId,
        kb_ids: kbIds,
        conversation_history: context,
        model_config: {
          model: modelConfig.model,
          temperature: modelConfig.temperature,
          max_tokens: modelConfig.max_tokens || 2000
        }
      };

      console.log('Regenerating response via webhook:', {
        webhook: webhookUrl,
        conversationId,
        messageId
      });

      // Update message status to processing
      await this.updateMessageStatus(messageId, 'processing', '', []);

      // Send regeneration request with retry logic
      const response = await this.executeWebhookWithRetry(
        webhookUrl,
        {
          ...webhookRequest,
          event_type: 'regenerate_response'
        },
        organizationId,
        'kb-chat-regenerate'
      );

      if (!response?.success) {
        await this.updateMessageStatus(
          messageId,
          'error',
          undefined,
          undefined,
          response?.error || 'Regeneration processing failed'
        );
        throw new Error(response?.error || 'Regeneration processing failed');
      }

      console.log('✅ Response regeneration initiated successfully');

      // If we get an immediate response, update the message
      if (response.response) {
        await this.updateMessageWithResponse(messageId, response);
      }

    } catch (error) {
      console.error('ChatWebhookService.regenerateResponse error:', error);
      
      await this.updateMessageStatus(
        messageId,
        'error',
        undefined,
        undefined,
        error instanceof Error ? error.message : 'Regeneration failed'
      );
      
      throw error;
    }
  }

  /**
   * Test webhook connection
   */
  static async testWebhookConnection(): Promise<{ success: boolean; error?: string; responseTime?: number }> {
    try {
      const startTime = Date.now();
      const webhookUrl = await this.getChatWebhookUrl();

      const testPayload = {
        event_type: 'test_connection',
        timestamp: new Date().toISOString()
      };

      const { data: response, error } = await supabase.functions.invoke(
        'exec-n8n-webhook',
        {
          body: {
            webhookUrl: webhookUrl,
            method: 'POST',
            payload: testPayload,
            webhookId: 'kb-chat-test'
          }
        }
      );

      const responseTime = Date.now() - startTime;

      if (error) {
        return {
          success: false,
          error: error.message,
          responseTime
        };
      }

      return {
        success: true,
        responseTime
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Get webhook configuration
   */
  static async getWebhookConfig(): Promise<WebhookConfig | null> {
    try {
      const { data, error } = await supabase
        .from('feature_webhooks')
        .select('id, name, endpoint_url, is_active, timeout_seconds, retry_attempts')
        .eq('name', 'kb-chat-processing')
        .single();

      if (error) {
        console.error('Error fetching webhook config:', error);
        return null;
      }

      return data as WebhookConfig;
    } catch (error) {
      console.error('ChatWebhookService.getWebhookConfig error:', error);
      return null;
    }
  }

  /**
   * Update webhook configuration
   */
  static async updateWebhookConfig(config: Partial<WebhookConfig>): Promise<void> {
    try {
      const { error } = await supabase
        .from('feature_webhooks')
        .update({
          ...config,
          updated_at: new Date().toISOString()
        })
        .eq('name', 'kb-chat-processing');

      if (error) {
        console.error('Error updating webhook config:', error);
        throw new Error(`Failed to update webhook config: ${error.message}`);
      }

      console.log('✅ Webhook configuration updated successfully');
    } catch (error) {
      console.error('ChatWebhookService.updateWebhookConfig error:', error);
      throw error;
    }
  }
}