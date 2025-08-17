import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/auth/AuthProvider';
import { useOrganization } from '@/contexts/OrganizationContext';
import { cacheConfig, queryKeys } from '@/lib/query-client';
import { useToast } from '@/hooks/use-toast';
import { useCallback } from 'react';

// ===== KNOWLEDGE BASE CHAT QUERY KEYS =====

const kbChatQueryKeys = {
  conversations: (orgId: string) => ['kb-conversations', orgId] as const,
  conversation: (conversationId: string) => ['kb-conversation', conversationId] as const,
  messages: (conversationId: string) => ['kb-messages', conversationId] as const,
  activeSession: (userId: string, orgId: string) => ['kb-active-session', userId, orgId] as const,
} as const;

// ===== TYPES =====

export interface KBConversation {
  id: string;
  organization_id: string;
  user_id: string;
  title: string;
  summary?: string;
  model?: string;
  temperature?: number;
  max_tokens?: number;
  message_count: number;
  total_tokens_used: number;
  last_message_at?: string;
  created_at: string;
  updated_at: string;
}

export interface KBMessage {
  id: string;
  conversation_id: string;
  organization_id: string;
  message_type: 'user' | 'assistant';
  content: string;
  sources?: any[];
  source_count: number;
  confidence_score?: number;
  model_used?: string;
  temperature_used?: number;
  tokens_used?: number;
  response_time_ms?: number;
  context_length?: number;
  metadata?: any;
  created_at: string;
}

interface CreateConversationParams {
  title: string;
  kbIds?: string[];
  model?: string;
  temperature?: number;
}

interface SendMessageParams {
  conversationId: string;
  content: string;
  kbIds?: string[];
  modelConfig?: {
    model: string;
    temperature: number;
  };
}

// ===== OPTIMIZED KB CONVERSATIONS HOOK =====

export function useOptimizedKBConversations() {
  const { user } = useAuth();
  const { currentOrganization } = useOrganization();

  return useQuery({
    queryKey: kbChatQueryKeys.conversations(currentOrganization?.id || ''),
    queryFn: async () => {
      if (!user?.id || !currentOrganization?.id) {
        throw new Error('User or organization not available');
      }

      const { data, error } = await supabase
        .from('kb_conversations')
        .select('*')
        .eq('organization_id', currentOrganization.id)
        .eq('user_id', user.id)
        .order('last_message_at', { ascending: false, nullsFirst: false })
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as KBConversation[];
    },
    enabled: !!(user?.id && currentOrganization?.id),
    ...cacheConfig.dynamic,
  });
}

// ===== OPTIMIZED KB MESSAGES HOOK =====

export function useOptimizedKBMessages(conversationId: string | null) {
  const { user } = useAuth();
  const { currentOrganization } = useOrganization();

  return useQuery({
    queryKey: kbChatQueryKeys.messages(conversationId || ''),
    queryFn: async () => {
      if (!conversationId || !user?.id || !currentOrganization?.id) {
        return [];
      }

      const { data, error } = await supabase
        .from('kb_messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .eq('organization_id', currentOrganization.id)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return data as KBMessage[];
    },
    enabled: !!(conversationId && user?.id && currentOrganization?.id),
    ...cacheConfig.realtime, // Messages need real-time updates
  });
}

// ===== ACTIVE SESSION HOOK =====

export function useOptimizedActiveSession(sessionId: string | null) {
  const { user } = useAuth();
  const { currentOrganization } = useOrganization();

  return useQuery({
    queryKey: kbChatQueryKeys.conversation(sessionId || ''),
    queryFn: async () => {
      if (!sessionId || !user?.id || !currentOrganization?.id) {
        return null;
      }

      const { data, error } = await supabase
        .from('kb_conversations')
        .select('*')
        .eq('id', sessionId)
        .eq('organization_id', currentOrganization.id)
        .eq('user_id', user.id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') return null; // Not found
        throw error;
      }
      return data as KBConversation;
    },
    enabled: !!(sessionId && user?.id && currentOrganization?.id),
    ...cacheConfig.dynamic,
  });
}

// ===== KB CHAT MUTATIONS =====

export function useOptimizedKBChatMutations() {
  const { user } = useAuth();
  const { currentOrganization } = useOrganization();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Create new conversation
  const createConversationMutation = useMutation({
    mutationFn: async (params: CreateConversationParams) => {
      if (!user?.id || !currentOrganization?.id) {
        throw new Error('User or organization not available');
      }

      const { data, error } = await supabase
        .from('kb_conversations')
        .insert({
          organization_id: currentOrganization.id,
          user_id: user.id,
          title: params.title,
          model: params.model || 'gpt-4',
          temperature: params.temperature || 0.7,
          message_count: 0,
          total_tokens_used: 0,
        })
        .select()
        .single();

      if (error) throw error;
      return data as KBConversation;
    },
    onSuccess: (data) => {
      // Invalidate conversations list
      queryClient.invalidateQueries({
        queryKey: kbChatQueryKeys.conversations(currentOrganization?.id || '')
      });
      
      // Set the new conversation in cache
      queryClient.setQueryData(
        kbChatQueryKeys.conversation(data.id),
        data
      );

      toast({
        title: "Success",
        description: "New conversation started",
      });
    },
    onError: (error) => {
      console.error('Failed to create conversation:', error);
      toast({
        title: "Error",
        description: "Failed to start new conversation",
        variant: "destructive",
      });
    },
  });

  // Send message with N8N webhook integration
  const sendMessageMutation = useMutation({
    mutationFn: async (params: SendMessageParams) => {
      if (!user?.id || !currentOrganization?.id) {
        throw new Error('User or organization not available');
      }

      const startTime = Date.now();

      // First, create the user message
      const { data: userMessage, error: userError } = await supabase
        .from('kb_messages')
        .insert({
          conversation_id: params.conversationId,
          organization_id: currentOrganization.id,
          message_type: 'user',
          content: params.content,
          source_count: 0,
        })
        .select()
        .single();

      if (userError) throw userError;

      // Update conversation last_message_at and message_count
      // First get current message count, then increment it
      const { data: currentConversation, error: fetchError } = await supabase
        .from('kb_conversations')
        .select('message_count')
        .eq('id', params.conversationId)
        .single();

      if (fetchError) throw fetchError;

      const { error: updateError } = await supabase
        .from('kb_conversations')
        .update({
          last_message_at: new Date().toISOString(),
          message_count: (currentConversation?.message_count || 0) + 1,
        })
        .eq('id', params.conversationId);

      if (updateError) throw updateError;

      try {
        // Get N8N webhook URL from database (knowledge-base feature, ai-chat webhook)
        const { data: webhookConfig, error: webhookConfigError } = await supabase
          .from('feature_webhooks')
          .select('endpoint_url, url')
          .eq('feature_slug', 'knowledge-base')
          .eq('name', 'ai-chat')
          .eq('is_active', true)
          .maybeSingle();

        if (webhookConfigError) {
          console.warn('Failed to get webhook config:', webhookConfigError);
        }

        // Use webhook URL from database or fallback to environment variable or default
        const webhookUrl = webhookConfig?.endpoint_url || 
                          webhookConfig?.url || 
                          import.meta.env.VITE_N8N_WEBHOOK_URL || 
                          'https://your-n8n-instance.com/webhook/ai-chat';
        
        // Direct N8N webhook call using fetch (avoiding Edge Function CORS issues)
        const webhookPayload = {
          message_id: userMessage.id,
          conversation_id: params.conversationId,
          user_message: params.content,
          kb_ids: params.kbIds || [],
          model_config: params.modelConfig || {
            model: 'gpt-4',
            temperature: 0.7
          },
          context: {
            user_id: user.id,
            organization_id: currentOrganization.id,
            conversation_history: [], // Could fetch recent messages here
          },
          timestamp: new Date().toISOString(),
          source: 'organize-prime-chat'
        };

        const response = await fetch(webhookUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'User-Agent': 'OrganizePrime-Chat/1.0',
            'X-Organization-ID': currentOrganization.id,
            'X-User-ID': user.id,
            'X-Conversation-ID': params.conversationId,
            'X-Message-ID': userMessage.id,
          },
          body: JSON.stringify(webhookPayload),
        });

        if (!response.ok) {
          throw new Error(`Webhook failed with status ${response.status}: ${response.statusText}`);
        }

        const webhookResponse = await response.json();

        const responseTime = Date.now() - startTime;

        // Create assistant message with AI response
        const { data: assistantMessage, error: assistantError } = await supabase
          .from('kb_messages')
          .insert({
            conversation_id: params.conversationId,
            organization_id: currentOrganization.id,
            message_type: 'assistant',
            content: webhookResponse?.response || webhookResponse?.message || webhookResponse?.content || 'I apologize, but I encountered an issue generating a response. Please try again.',
            sources: webhookResponse?.sources || [],
            source_count: (webhookResponse?.sources || []).length,
            confidence_score: webhookResponse?.confidence_score || webhookResponse?.confidence,
            model_used: params.modelConfig?.model || 'gpt-4',
            temperature_used: params.modelConfig?.temperature || 0.7,
            tokens_used: webhookResponse?.tokens_used || webhookResponse?.tokens || 0,
            response_time_ms: responseTime,
            metadata: webhookResponse?.metadata || { webhook_url: webhookUrl, direct_call: true },
          })
          .select()
          .single();

        if (assistantError) throw assistantError;

        return { userMessage, assistantMessage };

      } catch (webhookError) {
        console.error('N8N webhook failed, creating fallback response:', webhookError);
        
        // Create fallback assistant message if webhook fails
        const { data: assistantMessage, error: assistantError } = await supabase
          .from('kb_messages')
          .insert({
            conversation_id: params.conversationId,
            organization_id: currentOrganization.id,
            message_type: 'assistant',
            content: 'I apologize, but I\'m currently experiencing technical difficulties. Please try again in a moment.',
            source_count: 0,
            model_used: params.modelConfig?.model || 'gpt-4',
            temperature_used: params.modelConfig?.temperature || 0.7,
            tokens_used: 0,
            response_time_ms: Date.now() - startTime,
            metadata: { error: 'webhook_failed', error_message: (webhookError as Error).message },
          })
          .select()
          .single();

        if (assistantError) throw assistantError;

        return { userMessage, assistantMessage };
      }
    },
    onSuccess: (data, variables) => {
      // Invalidate messages for this conversation
      queryClient.invalidateQueries({
        queryKey: kbChatQueryKeys.messages(variables.conversationId)
      });

      // Invalidate conversations to update last_message_at
      queryClient.invalidateQueries({
        queryKey: kbChatQueryKeys.conversations(currentOrganization?.id || '')
      });
    },
    onError: (error) => {
      console.error('Failed to send message:', error);
      toast({
        title: "Error", 
        description: "Failed to send message",
        variant: "destructive",
      });
    },
  });

  // Update conversation title
  const updateTitleMutation = useMutation({
    mutationFn: async ({ conversationId, title }: { conversationId: string; title: string }) => {
      const { error } = await supabase
        .from('kb_conversations')
        .update({ title })
        .eq('id', conversationId)
        .eq('organization_id', currentOrganization?.id)
        .eq('user_id', user?.id);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      // Invalidate conversation data
      queryClient.invalidateQueries({
        queryKey: kbChatQueryKeys.conversation(variables.conversationId)
      });
      queryClient.invalidateQueries({
        queryKey: kbChatQueryKeys.conversations(currentOrganization?.id || '')
      });
    },
  });

  return {
    createConversation: useCallback(
      (params: CreateConversationParams, options?: { onSuccess?: (data: KBConversation) => void; onError?: (error: Error) => void }) => {
        createConversationMutation.mutate(params, options);
      },
      [createConversationMutation]
    ),
    sendMessage: useCallback(
      (params: SendMessageParams) => {
        sendMessageMutation.mutate(params);
      },
      [sendMessageMutation]
    ),
    updateTitle: useCallback(
      (params: { conversationId: string; title: string }) => {
        updateTitleMutation.mutate(params);
      },
      [updateTitleMutation]
    ),
    isCreating: createConversationMutation.isPending,
    isSending: sendMessageMutation.isPending,
    isUpdatingTitle: updateTitleMutation.isPending,
  };
}

// ===== BATCH INVALIDATION FOR KB CHAT =====

export function useOptimizedKBChatInvalidation() {
  const queryClient = useQueryClient();
  const { currentOrganization } = useOrganization();

  return {
    invalidateAllConversations: () => {
      queryClient.invalidateQueries({
        queryKey: kbChatQueryKeys.conversations(currentOrganization?.id || '')
      });
    },
    invalidateConversation: (conversationId: string) => {
      queryClient.invalidateQueries({
        queryKey: kbChatQueryKeys.conversation(conversationId)
      });
    },
    invalidateMessages: (conversationId: string) => {
      queryClient.invalidateQueries({
        queryKey: kbChatQueryKeys.messages(conversationId)
      });
    },
  };
}