import { supabase } from '@/integrations/supabase/client';

export interface ChatMessage {
  id: string;
  conversation_id: string;
  organization_id: string;
  message_type: 'user' | 'assistant';
  content: string;
  processing_status: 'pending' | 'processing' | 'completed' | 'error';
  error_message?: string;
  created_at: string;
}

export interface Conversation {
  id: string;
  organization_id: string;
  user_id: string;
  title: string;
  model: string;
  temperature: number;
  max_tokens: number;
  message_count: number;
  total_tokens_used: number;
  last_message_at: string | null;
  last_activity_at: string;
  message_preview: string | null;
  created_by_name: string | null;
  is_archived: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export class SimpleChatService {
  private static readonly N8N_WEBHOOK_URL = 'https://versatil.app.n8n.cloud/webhook/6a5522f4-d105-4240-930f-5343dc7bbf4a';

  /**
   * Get messages for a conversation
   */
  static async getMessages(conversationId: string): Promise<ChatMessage[]> {
    const { data, error } = await supabase
      .from('kb_messages')
      .select('id, conversation_id, organization_id, message_type, content, processing_status, error_message, created_at')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });

    if (error) throw new Error(`Failed to fetch messages: ${error.message}`);
    return data || [];
  }

  /**
   * Send a message and trigger N8N workflow
   */
  static async sendMessage(conversationId: string, message: string): Promise<void> {
    console.log('🚀 SimpleChatService.sendMessage called with:', { conversationId, message });
    
    try {
      // Get conversation details
      console.log('📋 Fetching conversation details...');
      const { data: conversation, error: convError } = await supabase
        .from('kb_conversations')
        .select('organization_id, user_id')
        .eq('id', conversationId)
        .single();

      if (convError) throw new Error(`Failed to get conversation: ${convError.message}`);
      console.log('✅ Conversation found:', conversation);

      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) throw new Error('User not authenticated');
      console.log('✅ User authenticated:', user.id);

      // Save user message to database
      console.log('💾 Saving user message...');
      const { data: userMessage, error: userMsgError } = await supabase
        .from('kb_messages')
        .insert({
          conversation_id: conversationId,
          organization_id: conversation.organization_id,
          message_type: 'user',
          content: message,
          processing_status: 'completed',
          sources: [],
          metadata: { timestamp: new Date().toISOString() }
        })
        .select()
        .single();

      if (userMsgError) {
        console.error('❌ Failed to save user message:', userMsgError);
        throw new Error(`Failed to save user message: ${userMsgError.message}`);
      }
      console.log('✅ User message saved:', userMessage);

      // Create pending assistant message
      console.log('🤖 Creating assistant message...');
      const { data: assistantMessage, error: assistantMsgError } = await supabase
        .from('kb_messages')
        .insert({
          conversation_id: conversationId,
          organization_id: conversation.organization_id,
          message_type: 'assistant',
          content: '',
          processing_status: 'processing',
          sources: [],
          metadata: { started_at: new Date().toISOString() }
        })
        .select()
        .single();

      if (assistantMsgError) {
        console.error('❌ Failed to create assistant message:', assistantMsgError);
        throw new Error(`Failed to create assistant message: ${assistantMsgError.message}`);
      }
      console.log('✅ Assistant message created:', assistantMessage);

      // Call N8N webhook through exec-n8n-webhook edge function
      console.log('🔐 Getting auth session...');
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !session?.access_token) {
        console.error('❌ No auth session:', sessionError);
        throw new Error('No authentication token available');
      }
      console.log('✅ Auth session obtained');

      const webhookPayload = {
        event_type: 'chat_message_sent',
        timestamp: new Date().toISOString(),
        organization_id: conversation.organization_id,
        user_id: user.id,
        conversation_id: conversationId,
        message_id: userMessage.id,
        user_message: message,
        model_config: {
          model: 'gpt-4',
          temperature: 0.7
        }
      };

      console.log('🚀 Calling N8N webhook via edge function');
      console.log('📦 Payload:', webhookPayload);

      // Use the edge function to call N8N with proper headers
      const edgeFunctionUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/exec-n8n-webhook`;
      
      const response = await fetch(edgeFunctionUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          webhookUrl: this.N8N_WEBHOOK_URL,
          method: 'POST',
          payload: { body: webhookPayload },
          organizationId: conversation.organization_id,
          webhookId: 'kb-chat-ai'
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Edge function error:', errorText);
        
        // Update assistant message with error
        await supabase
          .from('kb_messages')
          .update({
            content: 'Sorry, I encountered an error processing your message. Please try again.',
            processing_status: 'error',
            error_message: `Webhook call failed: ${response.status}`,
            metadata: { 
              error_at: new Date().toISOString(),
              error_details: errorText
            }
          })
          .eq('id', assistantMessage.id);
        
        throw new Error(`N8N webhook failed: ${response.status} ${response.statusText}`);
      }

      const responseData = await response.json();
      console.log('✅ N8N webhook response:', responseData);

      // The edge function should have updated the assistant message already
      // But if not, we can handle it here
      if (responseData.success && responseData.data) {
        console.log('N8N response processed by edge function');
      }

    } catch (error) {
      console.error('SimpleChatService.sendMessage error:', error);
      throw error;
    }
  }

  /**
   * Fix a stuck processing message
   */
  static async fixStuckMessage(messageId: string): Promise<void> {
    const { error } = await supabase
      .from('kb_messages')
      .update({
        processing_status: 'completed',
        content: 'Sorry, there was an issue processing this message.',
        metadata: {
          fixed_at: new Date().toISOString(),
          fix_reason: 'stuck_processing_cleanup'
        }
      })
      .eq('id', messageId)
      .eq('processing_status', 'processing');

    if (error) {
      console.error('Failed to fix stuck message:', error);
      throw error;
    }
  }

  /**
   * Get conversations for current user
   */
  static async getConversations(): Promise<Conversation[]> {
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from('kb_conversations')
      .select(`
        id, organization_id, user_id, title, model, temperature, max_tokens,
        message_count, total_tokens_used, last_message_at, last_activity_at,
        message_preview, created_by_name, is_archived, is_active, created_at, updated_at
      `)
      .eq('user_id', user.id)
      .eq('is_active', true)
      .eq('is_archived', false)
      .order('last_activity_at', { ascending: false });

    if (error) throw new Error(`Failed to fetch conversations: ${error.message}`);
    return data || [];
  }

  /**
   * Get a single conversation by ID
   */
  static async getConversation(conversationId: string): Promise<Conversation | null> {
    const { data, error } = await supabase
      .from('kb_conversations')
      .select(`
        id, organization_id, user_id, title, model, temperature, max_tokens,
        message_count, total_tokens_used, last_message_at, last_activity_at,
        message_preview, created_by_name, is_archived, is_active, created_at, updated_at
      `)
      .eq('id', conversationId)
      .eq('is_active', true)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null; // No rows found
      throw new Error(`Failed to fetch conversation: ${error.message}`);
    }
    return data;
  }

  /**
   * Create a new conversation
   */
  static async createConversation(title: string, customGreeting?: string): Promise<string> {
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) throw new Error('User not authenticated');

    // Get current organization and user profile
    const [membershipResult, profileResult] = await Promise.all([
      supabase
        .from('memberships')
        .select('organization_id')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .limit(1)
        .single(),
      supabase
        .from('profiles')
        .select('full_name')
        .eq('id', user.id)
        .single()
    ]);

    if (membershipResult.error || !membershipResult.data) {
      throw new Error('No active organization membership found');
    }

    const { data: conversation, error } = await supabase
      .from('kb_conversations')
      .insert({
        organization_id: membershipResult.data.organization_id,
        user_id: user.id,
        title,
        model: 'gpt-4',
        temperature: 0.7,
        max_tokens: 2000,
        created_by_name: profileResult.data?.full_name || 'Unknown User',
        last_activity_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) throw new Error(`Failed to create conversation: ${error.message}`);

    // If custom greeting provided, insert it as first assistant message
    if (customGreeting && customGreeting.trim()) {
      try {
        await supabase
          .from('kb_messages')
          .insert({
            conversation_id: conversation.id,
            organization_id: membershipResult.data.organization_id,
            message_type: 'assistant',
            content: customGreeting.trim(),
            processing_status: 'completed',
            sources: [],
            metadata: { 
              is_greeting: true,
              timestamp: new Date().toISOString() 
            }
          });
        
        console.log('✅ Custom greeting message inserted for conversation:', conversation.id);
      } catch (greetingError) {
        // Don't fail conversation creation if greeting fails
        console.warn('⚠️ Failed to insert custom greeting:', greetingError);
      }
    }

    return conversation.id;
  }

  /**
   * Update conversation title
   */
  static async updateConversation(conversationId: string, title: string): Promise<void> {
    const { error } = await supabase
      .from('kb_conversations')
      .update({ 
        title,
        updated_at: new Date().toISOString()
      })
      .eq('id', conversationId);

    if (error) throw new Error(`Failed to update conversation: ${error.message}`);
  }

  /**
   * Delete conversation (messages will be auto-deleted via cascade)
   */
  static async deleteConversation(conversationId: string): Promise<void> {
    const { error } = await supabase
      .from('kb_conversations')
      .delete()
      .eq('id', conversationId);

    if (error) throw new Error(`Failed to delete conversation: ${error.message}`);
  }

  /**
   * Archive conversation instead of deleting
   */
  static async archiveConversation(conversationId: string): Promise<void> {
    const { error } = await supabase
      .from('kb_conversations')
      .update({ 
        is_archived: true,
        updated_at: new Date().toISOString()
      })
      .eq('id', conversationId);

    if (error) throw new Error(`Failed to archive conversation: ${error.message}`);
  }

  /**
   * Search conversations by title or content
   */
  static async searchConversations(query: string): Promise<Conversation[]> {
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from('kb_conversations')
      .select(`
        id, organization_id, user_id, title, model, temperature, max_tokens,
        message_count, total_tokens_used, last_message_at, last_activity_at,
        message_preview, created_by_name, is_archived, is_active, created_at, updated_at
      `)
      .eq('user_id', user.id)
      .eq('is_active', true)
      .eq('is_archived', false)
      .or(`title.ilike.%${query}%,message_preview.ilike.%${query}%`)
      .order('last_activity_at', { ascending: false });

    if (error) throw new Error(`Failed to search conversations: ${error.message}`);
    return data || [];
  }
}