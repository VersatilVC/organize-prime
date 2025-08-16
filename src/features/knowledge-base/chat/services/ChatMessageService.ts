import { supabase } from '@/integrations/supabase/client';

export interface MessageSource {
  document_name: string;
  chunk_text: string;
  confidence_score: number;
  file_id: string;
}

export interface ChatMessage {
  id: string;
  conversation_id: string;
  organization_id: string;
  message_type: 'user' | 'assistant' | 'system';
  content: string;
  sources: MessageSource[];
  metadata: {
    model?: string;
    tokens_used?: number;
    processing_time?: number;
    temperature?: number;
    [key: string]: any;
  };
  processing_status: 'pending' | 'processing' | 'completed' | 'error';
  error_message?: string;
  created_at: string;
}

export interface SendMessageParams {
  conversationId: string;
  content: string;
  messageType?: 'user' | 'system';
  metadata?: Record<string, any>;
}

export interface SendChatParams {
  conversationId: string;
  message: string;
  selectedKbIds?: string[];
  modelConfig?: {
    model: string;
    temperature: number;
  };
}

export class ChatMessageService {
  /**
   * Get all messages for a conversation
   */
  static async getConversationMessages(conversationId: string): Promise<ChatMessage[]> {
    try {
      const { data, error } = await supabase
        .from('kb_messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error fetching messages:', error);
        throw new Error(`Failed to fetch messages: ${error.message}`);
      }

      return (data || []).map(this.mapMessageFromDB);
    } catch (error) {
      console.error('ChatMessageService.getConversationMessages error:', error);
      throw error;
    }
  }

  /**
   * Add a message to a conversation
   */
  static async addMessage(params: SendMessageParams): Promise<string> {
    try {
      const { data, error } = await supabase.rpc('add_kb_message', {
        conv_id: params.conversationId,
        msg_type: params.messageType || 'user',
        msg_content: params.content,
        msg_sources: [],
        msg_metadata: params.metadata || {},
        status: 'completed'
      });

      if (error) {
        console.error('Error adding message:', error);
        throw new Error(`Failed to add message: ${error.message}`);
      }

      if (!data) {
        throw new Error('No message ID returned from database');
      }

      console.log(`✅ Added message to conversation: ${params.conversationId}`);
      return data as string;
    } catch (error) {
      console.error('ChatMessageService.addMessage error:', error);
      throw error;
    }
  }

  /**
   * Send a chat message and trigger AI processing
   */
  static async sendChatMessage(params: SendChatParams): Promise<string> {
    try {
      // First, add the user message
      const userMessageId = await this.addMessage({
        conversationId: params.conversationId,
        content: params.message,
        messageType: 'user',
        metadata: {
          timestamp: new Date().toISOString()
        }
      });

      // Create a placeholder assistant message
      const assistantMessageId = await this.addMessage({
        conversationId: params.conversationId,
        content: '',
        messageType: 'assistant',
        metadata: {
          model: params.modelConfig?.model || 'gpt-4',
          temperature: params.modelConfig?.temperature || 0.7,
          processing_started_at: new Date().toISOString()
        }
      });

      // Update assistant message to processing status
      await this.updateMessageStatus(assistantMessageId, 'processing');

      // Trigger N8N webhook for AI processing
      try {
        const webhookPayload = {
          event_type: 'chat_message_sent',
          conversation_id: params.conversationId,
          message_id: assistantMessageId,
          user_message: params.message,
          selected_kb_ids: params.selectedKbIds || [],
          model_config: params.modelConfig || { model: 'gpt-4', temperature: 0.7 },
          timestamp: new Date().toISOString()
        };

        // Get organization info for webhook
        const { data: conversation, error: convError } = await supabase
          .from('kb_conversations')
          .select('organization_id, kb_ids')
          .eq('id', params.conversationId)
          .single();

        if (convError) {
          throw new Error(`Failed to get conversation details: ${convError.message}`);
        }

        // Call the webhook processing edge function
        const { data: webhookResult, error: webhookError } = await supabase.functions.invoke(
          'exec-n8n-webhook',
          {
            body: {
              webhookUrl: `${process.env.N8N_BASE_URL || ''}/webhook/kb-chat-processing`,
              method: 'POST',
              payload: webhookPayload,
              organizationId: conversation.organization_id,
              webhookId: 'kb-chat-processing'
            }
          }
        );

        if (webhookError) {
          console.warn('Webhook processing failed:', webhookError);
          await this.updateMessage(assistantMessageId, {
            content: 'Sorry, I encountered an error processing your message. Please try again.',
            processing_status: 'error',
            error_message: 'Webhook processing failed'
          });
        }

        console.log('✅ Chat message sent and processing triggered');
      } catch (webhookError) {
        console.warn('Webhook processing failed:', webhookError);
        await this.updateMessage(assistantMessageId, {
          content: 'Sorry, I encountered an error processing your message. Please try again.',
          processing_status: 'error',
          error_message: webhookError instanceof Error ? webhookError.message : 'Unknown error'
        });
      }

      return userMessageId;
    } catch (error) {
      console.error('ChatMessageService.sendChatMessage error:', error);
      throw error;
    }
  }

  /**
   * Update message status
   */
  static async updateMessageStatus(
    messageId: string,
    status: 'pending' | 'processing' | 'completed' | 'error',
    errorMessage?: string
  ): Promise<void> {
    try {
      const updateData: any = {
        processing_status: status,
        updated_at: new Date().toISOString()
      };

      if (errorMessage) {
        updateData.error_message = errorMessage;
      }

      const { error } = await supabase
        .from('kb_messages')
        .update(updateData)
        .eq('id', messageId);

      if (error) {
        console.error('Error updating message status:', error);
        throw new Error(`Failed to update message status: ${error.message}`);
      }
    } catch (error) {
      console.error('ChatMessageService.updateMessageStatus error:', error);
      throw error;
    }
  }

  /**
   * Update message content and metadata
   */
  static async updateMessage(
    messageId: string,
    updates: {
      content?: string;
      sources?: MessageSource[];
      metadata?: Record<string, any>;
      processing_status?: 'pending' | 'processing' | 'completed' | 'error';
      error_message?: string;
    }
  ): Promise<void> {
    try {
      const updateData: any = {
        ...updates,
        updated_at: new Date().toISOString()
      };

      const { error } = await supabase
        .from('kb_messages')
        .update(updateData)
        .eq('id', messageId);

      if (error) {
        console.error('Error updating message:', error);
        throw new Error(`Failed to update message: ${error.message}`);
      }
    } catch (error) {
      console.error('ChatMessageService.updateMessage error:', error);
      throw error;
    }
  }

  /**
   * Delete a message
   */
  static async deleteMessage(messageId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('kb_messages')
        .delete()
        .eq('id', messageId);

      if (error) {
        console.error('Error deleting message:', error);
        throw new Error(`Failed to delete message: ${error.message}`);
      }

      console.log(`✅ Deleted message: ${messageId}`);
    } catch (error) {
      console.error('ChatMessageService.deleteMessage error:', error);
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
    modelConfig?: { model: string; temperature: number }
  ): Promise<void> {
    try {
      // Update message to processing status
      await this.updateMessage(messageId, {
        content: '',
        processing_status: 'processing',
        error_message: undefined,
        metadata: {
          model: modelConfig?.model || 'gpt-4',
          temperature: modelConfig?.temperature || 0.7,
          regenerated_at: new Date().toISOString()
        }
      });

      // Trigger regeneration via webhook (similar to sendChatMessage)
      const webhookPayload = {
        event_type: 'chat_regenerate_response',
        conversation_id: conversationId,
        message_id: messageId,
        original_prompt: originalPrompt,
        model_config: modelConfig || { model: 'gpt-4', temperature: 0.7 },
        timestamp: new Date().toISOString()
      };

      // Call webhook for regeneration
      const { error: webhookError } = await supabase.functions.invoke(
        'exec-n8n-webhook',
        {
          body: {
            webhookUrl: `${process.env.N8N_BASE_URL || ''}/webhook/kb-chat-processing`,
            method: 'POST',
            payload: webhookPayload,
            webhookId: 'kb-chat-regenerate'
          }
        }
      );

      if (webhookError) {
        await this.updateMessage(messageId, {
          content: 'Sorry, I could not regenerate the response. Please try again.',
          processing_status: 'error',
          error_message: 'Regeneration webhook failed'
        });
      }
    } catch (error) {
      console.error('ChatMessageService.regenerateResponse error:', error);
      throw error;
    }
  }

  /**
   * Map database message to ChatMessage interface
   */
  private static mapMessageFromDB(dbMessage: any): ChatMessage {
    return {
      id: dbMessage.id,
      conversation_id: dbMessage.conversation_id,
      organization_id: dbMessage.organization_id,
      message_type: dbMessage.message_type,
      content: dbMessage.content || '',
      sources: Array.isArray(dbMessage.sources) ? dbMessage.sources : [],
      metadata: dbMessage.metadata || {},
      processing_status: dbMessage.processing_status || 'completed',
      error_message: dbMessage.error_message,
      created_at: dbMessage.created_at
    };
  }
}