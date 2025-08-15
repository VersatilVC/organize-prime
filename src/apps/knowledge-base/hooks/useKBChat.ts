import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/auth/AuthProvider';
import { useOrganizationData } from '@/contexts/OrganizationContext';
import { useToast } from '@/hooks/use-toast';

export interface ChatMessage {
  id: string;
  conversation_id: string;
  message_type: 'user' | 'assistant';
  content: string;
  sources?: any[];
  confidence_score?: number;
  response_time_ms?: number;
  created_at: string;
}

export interface ChatConversation {
  id: string;
  organization_id: string;
  user_id: string;
  kb_config_id?: string;
  title?: string;
  model: string;
  temperature: number;
  max_tokens: number;
  message_count: number;
  total_tokens_used: number;
  last_message_at?: string;
  created_at: string;
  updated_at: string;
}

export function useKBConversations() {
  const { user } = useAuth();
  const { currentOrganization } = useOrganizationData();

  return useQuery({
    queryKey: ['kb-conversations', currentOrganization?.id],
    queryFn: async () => {
      if (!currentOrganization?.id) return [];

      const { data, error } = await supabase
        .from('kb_conversations')
        .select('*')
        .eq('organization_id', currentOrganization.id)
        .order('last_message_at', { ascending: false, nullsFirst: false })
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as ChatConversation[];
    },
    enabled: !!currentOrganization?.id,
    staleTime: 30000, // 30 seconds
    gcTime: 300000, // 5 minutes
  });
}

export function useKBMessages(conversationId?: string) {
  return useQuery({
    queryKey: ['kb-messages', conversationId],
    queryFn: async () => {
      if (!conversationId) return [];

      const { data, error } = await supabase
        .from('kb_messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return data as ChatMessage[];
    },
    enabled: !!conversationId,
    staleTime: 10000, // 10 seconds
    gcTime: 300000, // 5 minutes
  });
}

export function useCreateConversation() {
  const { user } = useAuth();
  const { currentOrganization } = useOrganizationData();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      title?: string;
      kb_config_id?: string;
      model?: string;
      temperature?: number;
      max_tokens?: number;
    }) => {
      if (!user?.id || !currentOrganization?.id) {
        throw new Error('User or organization not found');
      }

      const { data, error } = await supabase
        .from('kb_conversations')
        .insert({
          organization_id: currentOrganization.id,
          user_id: user.id,
          title: params.title || 'New Conversation',
          kb_config_id: params.kb_config_id,
          model: params.model || 'gpt-4',
          temperature: params.temperature || 0.7,
          max_tokens: params.max_tokens || 2000,
        })
        .select()
        .single();

      if (error) throw error;
      return data as ChatConversation;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kb-conversations'] });
      toast({
        title: 'Conversation Created',
        description: 'New conversation started successfully',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to create conversation',
        variant: 'destructive',
      });
    },
  });
}

export function useSendMessage() {
  const { user } = useAuth();
  const { currentOrganization } = useOrganizationData();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      conversationId: string;
      content: string;
      message_type: 'user' | 'assistant';
      sources?: any[];
      confidence_score?: number;
      response_time_ms?: number;
    }) => {
      if (!user?.id || !currentOrganization?.id) {
        throw new Error('User or organization not found');
      }

      const { data, error } = await supabase
        .from('kb_messages')
        .insert({
          conversation_id: params.conversationId,
          organization_id: currentOrganization.id,
          message_type: params.message_type,
          content: params.content,
          sources: params.sources || [],
          confidence_score: params.confidence_score,
          response_time_ms: params.response_time_ms,
        })
        .select()
        .single();

      if (error) throw error;

      // Update conversation metadata - use separate query to increment message count
      if (params.message_type === 'user') {
        // Get current count and increment
        const { data: conversation } = await supabase
          .from('kb_conversations')
          .select('message_count')
          .eq('id', params.conversationId)
          .single();

        if (conversation) {
          await supabase
            .from('kb_conversations')
            .update({
              message_count: (conversation.message_count || 0) + 1,
              last_message_at: new Date().toISOString(),
            })
            .eq('id', params.conversationId);
        }
      }

      return data as ChatMessage;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['kb-messages', variables.conversationId] });
      queryClient.invalidateQueries({ queryKey: ['kb-conversations'] });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to send message',
        variant: 'destructive',
      });
    },
  });
}

export function useKBChat() {
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const [inputValue, setInputValue] = useState('');

  const { data: conversations, isLoading: conversationsLoading } = useKBConversations();
  const { data: messages, isLoading: messagesLoading } = useKBMessages(currentConversationId || undefined);
  const createConversation = useCreateConversation();
  const sendMessage = useSendMessage();

  const startNewConversation = useCallback(async () => {
    try {
      const conversation = await createConversation.mutateAsync({
        title: 'New Conversation',
      });
      setCurrentConversationId(conversation.id);
    } catch (error) {
      console.error('Failed to create conversation:', error);
    }
  }, [createConversation]);

  const sendUserMessage = useCallback(async (content: string) => {
    if (!currentConversationId || !content.trim()) return;

    try {
      // Send user message
      await sendMessage.mutateAsync({
        conversationId: currentConversationId,
        content: content.trim(),
        message_type: 'user',
      });

      // TODO: Call AI webhook for response
      // For now, just simulate an AI response
      setTimeout(async () => {
        await sendMessage.mutateAsync({
          conversationId: currentConversationId,
          content: 'This is a placeholder AI response. The AI integration will be implemented next.',
          message_type: 'assistant',
          sources: [],
          confidence_score: 0.85,
          response_time_ms: 1500,
        });
      }, 1000);

      setInputValue('');
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  }, [currentConversationId, sendMessage]);

  return {
    conversations: conversations || [],
    currentConversationId,
    setCurrentConversationId,
    messages: messages || [],
    inputValue,
    setInputValue,
    isLoading: conversationsLoading || messagesLoading,
    isSending: sendMessage.isPending,
    startNewConversation,
    sendUserMessage,
  };
}