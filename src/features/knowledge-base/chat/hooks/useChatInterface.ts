import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useOrganization } from '@/contexts/OrganizationContext';
import { ChatMessageService, type ChatMessage, type SendChatParams } from '../services/ChatMessageService';
import { useToast } from '@/hooks/use-toast';

// Query keys for messages
export const messageQueryKeys = {
  all: ['messages'] as const,
  conversation: (conversationId: string) => [...messageQueryKeys.all, 'conversation', conversationId] as const,
};

/**
 * Hook for managing chat interface and real-time messaging
 */
export function useChatInterface(conversationId: string) {
  const { currentOrganization } = useOrganization();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const scrollRef = useRef<HTMLDivElement>(null);
  const orgId = currentOrganization?.id;

  // Fetch messages for conversation
  const messagesQuery = useQuery({
    queryKey: messageQueryKeys.conversation(conversationId),
    queryFn: () => ChatMessageService.getConversationMessages(conversationId),
    enabled: !!conversationId && !!orgId,
    staleTime: 30 * 1000, // 30 seconds
    gcTime: 5 * 60 * 1000, // 5 minutes
  });

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: (params: SendChatParams) => ChatMessageService.sendChatMessage(params),
    onMutate: async ({ message: messageContent, modelConfig }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({
        queryKey: messageQueryKeys.conversation(conversationId)
      });

      // Snapshot previous messages
      const previousMessages = queryClient.getQueryData<ChatMessage[]>(
        messageQueryKeys.conversation(conversationId)
      );

      // Optimistically add user message
      const optimisticUserMessage: ChatMessage = {
        id: `temp-user-${Date.now()}`,
        conversation_id: conversationId,
        organization_id: orgId!,
        message_type: 'user',
        content: messageContent,
        sources: [],
        metadata: {
          timestamp: new Date().toISOString()
        },
        processing_status: 'completed',
        created_at: new Date().toISOString()
      };

      // Optimistically add assistant placeholder
      const optimisticAssistantMessage: ChatMessage = {
        id: `temp-assistant-${Date.now()}`,
        conversation_id: conversationId,
        organization_id: orgId!,
        message_type: 'assistant',
        content: '',
        sources: [],
        metadata: {
          model: modelConfig?.model || 'gpt-4',
          temperature: modelConfig?.temperature || 0.7,
          processing_started_at: new Date().toISOString()
        },
        processing_status: 'processing',
        created_at: new Date().toISOString()
      };

      if (previousMessages) {
        queryClient.setQueryData<ChatMessage[]>(
          messageQueryKeys.conversation(conversationId),
          [...previousMessages, optimisticUserMessage, optimisticAssistantMessage]
        );
      }

      // Auto-scroll to bottom
      setTimeout(() => {
        scrollToBottom();
      }, 100);

      return { previousMessages };
    },
    onError: (error, variables, context) => {
      // Revert optimistic update
      if (context?.previousMessages) {
        queryClient.setQueryData(
          messageQueryKeys.conversation(conversationId),
          context.previousMessages
        );
      }
      
      console.error('Failed to send message:', error);
      toast({
        title: 'Send Failed',
        description: error instanceof Error ? error.message : 'Failed to send message.',
        variant: 'destructive',
      });
    },
    onSuccess: () => {
      // Refetch to get real message IDs
      queryClient.invalidateQueries({
        queryKey: messageQueryKeys.conversation(conversationId)
      });
    },
  });

  // Regenerate response mutation
  const regenerateResponseMutation = useMutation({
    mutationFn: ({ messageId, originalPrompt, modelConfig }: {
      messageId: string;
      originalPrompt: string;
      modelConfig?: { model: string; temperature: number };
    }) => ChatMessageService.regenerateResponse(conversationId, messageId, originalPrompt, modelConfig),
    onMutate: async ({ messageId }) => {
      // Update message to processing status optimistically
      const previousMessages = queryClient.getQueryData<ChatMessage[]>(
        messageQueryKeys.conversation(conversationId)
      );

      if (previousMessages) {
        const updatedMessages = previousMessages.map(msg =>
          msg.id === messageId
            ? { ...msg, content: '', processing_status: 'processing' as const, error_message: undefined }
            : msg
        );
        queryClient.setQueryData(
          messageQueryKeys.conversation(conversationId),
          updatedMessages
        );
      }

      return { previousMessages };
    },
    onError: (error, variables, context) => {
      if (context?.previousMessages) {
        queryClient.setQueryData(
          messageQueryKeys.conversation(conversationId),
          context.previousMessages
        );
      }
      
      toast({
        title: 'Regeneration Failed',
        description: error instanceof Error ? error.message : 'Failed to regenerate response.',
        variant: 'destructive',
      });
    },
    onSuccess: () => {
      toast({
        title: 'Response Regenerated',
        description: 'New response is being generated.',
      });
    },
  });

  // Message reaction mutation
  const messageReactionMutation = useMutation({
    mutationFn: async ({ messageId, reaction }: { messageId: string; reaction: 'up' | 'down' }) => {
      // This would typically send feedback to analytics or improve the model
      console.log(`Message ${messageId} rated: ${reaction}`);
      
      // For now, just show a toast
      return { messageId, reaction };
    },
    onSuccess: ({ reaction }) => {
      toast({
        title: 'Feedback Recorded',
        description: `Thank you for your ${reaction === 'up' ? 'positive' : 'constructive'} feedback!`,
      });
    },
  });

  // Real-time subscription for message updates
  useEffect(() => {
    if (!conversationId || !orgId) return;

    const channel = supabase
      .channel(`chat_messages_${conversationId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'kb_messages',
        filter: `conversation_id=eq.${conversationId}`
      }, (payload) => {
        console.log('Message real-time update:', payload);
        
        // Invalidate messages query to refetch
        queryClient.invalidateQueries({
          queryKey: messageQueryKeys.conversation(conversationId)
        });

        // Auto-scroll to bottom for new messages or when processing completes
        if (payload.eventType === 'INSERT' || 
            (payload.eventType === 'UPDATE' && payload.new?.processing_status === 'completed')) {
          setTimeout(() => {
            scrollToBottom();
          }, 100);
        }
      })
      // Listen for webhook response broadcasts
      .on('broadcast', { event: 'message_updated' }, (payload) => {
        console.log('Webhook message update:', payload);
        
        // Optimistically update the message in cache
        const messageId = payload.payload.message_id;
        const previousMessages = queryClient.getQueryData<ChatMessage[]>(
          messageQueryKeys.conversation(conversationId)
        );

        if (previousMessages && messageId) {
          const updatedMessages = previousMessages.map(msg =>
            msg.id === messageId
              ? {
                  ...msg,
                  content: payload.payload.content || msg.content,
                  processing_status: payload.payload.status || msg.processing_status,
                  error_message: payload.payload.error || undefined,
                  updated_at: new Date().toISOString()
                }
              : msg
          );
          
          queryClient.setQueryData(
            messageQueryKeys.conversation(conversationId),
            updatedMessages
          );

          // Auto-scroll when processing completes
          if (payload.payload.status === 'completed') {
            setTimeout(() => {
              scrollToBottom();
            }, 100);
          }
        }

        // Also invalidate to ensure fresh data
        queryClient.invalidateQueries({
          queryKey: messageQueryKeys.conversation(conversationId)
        });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId, orgId, queryClient]);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (messagesQuery.data && messagesQuery.data.length > 0) {
      setTimeout(() => {
        scrollToBottom();
      }, 100);
    }
  }, [messagesQuery.data?.length]);

  const scrollToBottom = useCallback(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, []);

  const sendMessage = useCallback(
    (message: string, selectedKbIds?: string[], modelConfig?: { model: string; temperature: number }) => {
      if (!message.trim()) return;

      sendMessageMutation.mutate({
        conversationId,
        message: message.trim(),
        selectedKbIds,
        modelConfig,
      });
    },
    [conversationId, sendMessageMutation]
  );

  const regenerateResponse = useCallback(
    (messageId: string, originalPrompt: string, modelConfig?: { model: string; temperature: number }) => {
      regenerateResponseMutation.mutate({
        messageId,
        originalPrompt,
        modelConfig,
      });
    },
    [regenerateResponseMutation]
  );

  const handleMessageReaction = useCallback(
    (messageId: string, reaction: 'up' | 'down') => {
      messageReactionMutation.mutate({ messageId, reaction });
    },
    [messageReactionMutation]
  );

  const isProcessing = sendMessageMutation.isPending || regenerateResponseMutation.isPending;
  const hasProcessingMessage = messagesQuery.data?.some(msg => 
    msg.processing_status === 'processing' || msg.processing_status === 'pending'
  ) || false;

  return {
    // Data
    messages: messagesQuery.data || [],
    isLoadingMessages: messagesQuery.isLoading,
    messagesError: messagesQuery.error,
    
    // Actions
    sendMessage,
    regenerateResponse,
    handleMessageReaction,
    
    // State
    isProcessing: isProcessing || hasProcessingMessage,
    isSendingMessage: sendMessageMutation.isPending,
    isRegenerating: regenerateResponseMutation.isPending,
    
    // Scroll ref for auto-scrolling
    scrollRef,
    scrollToBottom,
    
    // Refetch function
    refetchMessages: messagesQuery.refetch,
  };
}

/**
 * Hook for managing conversation export
 */
export function useConversationExport() {
  const { toast } = useToast();

  const quickExportJSON = useCallback(async (messages: ChatMessage[], title: string) => {
    try {
      const exportData = {
        title,
        exported_at: new Date().toISOString(),
        message_count: messages.length,
        messages: messages.map(msg => ({
          type: msg.message_type,
          content: msg.content,
          timestamp: msg.created_at,
          sources: msg.sources,
          metadata: msg.metadata
        }))
      };

      const blob = new Blob([JSON.stringify(exportData, null, 2)], {
        type: 'application/json'
      });

      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `chat-${title.replace(/[^a-zA-Z0-9]/g, '-')}-${Date.now()}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast({
        title: 'Conversation Exported',
        description: 'Your conversation has been downloaded as a JSON file.',
      });
    } catch (error) {
      console.error('Export failed:', error);
      toast({
        title: 'Export Failed',
        description: 'Failed to export conversation.',
        variant: 'destructive',
      });
    }
  }, [toast]);

  return { 
    exportConversation: quickExportJSON, // Keep backward compatibility
    quickExportJSON 
  };
}