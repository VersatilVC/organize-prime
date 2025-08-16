import { supabase } from '@/integrations/supabase/client';

export interface ChatSession {
  id: string;
  title: string;
  kb_ids: string[];
  message_count: number;
  updated_at: string;
  created_at: string;
  organization_id: string;
  user_id: string;
  system_prompt?: string;
  model_config: {
    model: string;
    temperature: number;
  };
  is_active: boolean;
}

export class ChatSessionService {
  /**
   * Get all conversations for a user in an organization
   */
  static async getUserConversations(organizationId: string): Promise<ChatSession[]> {
    try {
      const { data, error } = await supabase
        .from('kb_conversations')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('is_active', true)
        .order('updated_at', { ascending: false });

      if (error) {
        console.error('Error fetching conversations:', error);
        throw new Error(`Failed to fetch conversations: ${error.message}`);
      }

      return (data || []) as ChatSession[];
    } catch (error) {
      console.error('ChatSessionService.getUserConversations error:', error);
      throw error;
    }
  }

  /**
   * Create a new conversation
   */
  static async createConversation(
    title: string = 'New Chat',
    kbIds: string[] = [],
    organizationId?: string
  ): Promise<string> {
    try {
      // Call the database function to create conversation
      const { data, error } = await supabase.rpc('create_kb_conversation', {
        conv_title: title,
        selected_kb_ids: kbIds,
        org_id: organizationId || null
      });

      if (error) {
        console.error('Error creating conversation:', error);
        throw new Error(`Failed to create conversation: ${error.message}`);
      }

      if (!data) {
        throw new Error('No conversation ID returned from database');
      }

      console.log(`✅ Created new conversation: ${data}`);
      return data as string;
    } catch (error) {
      console.error('ChatSessionService.createConversation error:', error);
      throw error;
    }
  }

  /**
   * Update conversation title
   */
  static async updateConversationTitle(
    conversationId: string,
    title: string
  ): Promise<void> {
    try {
      // Validate title length
      if (!title.trim()) {
        throw new Error('Title cannot be empty');
      }
      if (title.length > 100) {
        throw new Error('Title cannot exceed 100 characters');
      }

      const { data, error } = await supabase.rpc('update_conversation_title', {
        conv_id: conversationId,
        new_title: title.trim()
      });

      if (error) {
        console.error('Error updating conversation title:', error);
        throw new Error(`Failed to update conversation title: ${error.message}`);
      }

      if (!data) {
        throw new Error('Conversation not found or access denied');
      }

      console.log(`✅ Updated conversation title: ${conversationId}`);
    } catch (error) {
      console.error('ChatSessionService.updateConversationTitle error:', error);
      throw error;
    }
  }

  /**
   * Delete conversation (soft delete)
   */
  static async deleteConversation(conversationId: string): Promise<void> {
    try {
      const { data, error } = await supabase.rpc('delete_kb_conversation', {
        conv_id: conversationId
      });

      if (error) {
        console.error('Error deleting conversation:', error);
        throw new Error(`Failed to delete conversation: ${error.message}`);
      }

      if (!data) {
        throw new Error('Conversation not found or access denied');
      }

      console.log(`✅ Deleted conversation: ${conversationId}`);
    } catch (error) {
      console.error('ChatSessionService.deleteConversation error:', error);
      throw error;
    }
  }

  /**
   * Get detailed conversation information
   */
  static async getConversationDetails(conversationId: string): Promise<ChatSession> {
    try {
      const { data, error } = await supabase
        .from('kb_conversations')
        .select('*')
        .eq('id', conversationId)
        .eq('is_active', true)
        .single();

      if (error) {
        console.error('Error fetching conversation details:', error);
        throw new Error(`Failed to fetch conversation details: ${error.message}`);
      }

      if (!data) {
        throw new Error('Conversation not found');
      }

      return data as ChatSession;
    } catch (error) {
      console.error('ChatSessionService.getConversationDetails error:', error);
      throw error;
    }
  }

  /**
   * Search conversations by title or content
   */
  static async searchConversations(
    organizationId: string,
    searchTerm: string
  ): Promise<ChatSession[]> {
    try {
      if (!searchTerm.trim()) {
        return this.getUserConversations(organizationId);
      }

      const { data, error } = await supabase
        .from('kb_conversations')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('is_active', true)
        .ilike('title', `%${searchTerm.trim()}%`)
        .order('updated_at', { ascending: false });

      if (error) {
        console.error('Error searching conversations:', error);
        throw new Error(`Failed to search conversations: ${error.message}`);
      }

      return (data || []) as ChatSession[];
    } catch (error) {
      console.error('ChatSessionService.searchConversations error:', error);
      throw error;
    }
  }

  /**
   * Filter conversations by knowledge base IDs
   */
  static async getConversationsByKB(
    organizationId: string,
    kbIds: string[]
  ): Promise<ChatSession[]> {
    try {
      if (kbIds.length === 0) {
        return this.getUserConversations(organizationId);
      }

      const { data, error } = await supabase
        .from('kb_conversations')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('is_active', true)
        .overlaps('kb_ids', kbIds)
        .order('updated_at', { ascending: false });

      if (error) {
        console.error('Error filtering conversations by KB:', error);
        throw new Error(`Failed to filter conversations: ${error.message}`);
      }

      return (data || []) as ChatSession[];
    } catch (error) {
      console.error('ChatSessionService.getConversationsByKB error:', error);
      throw error;
    }
  }
}