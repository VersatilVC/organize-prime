import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { SimpleChatService, type ChatMessage } from '@/services/SimpleChatService';
import { useToast } from '@/hooks/use-toast';

export function useSimpleChat(conversationId: string) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const scrollRef = useRef<HTMLDivElement>(null);

  // Define scrollToBottom function first
  const scrollToBottom = useCallback(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, []);

  // Query key for messages
  const queryKey = ['simple-chat-messages', conversationId];

  // Fetch messages
  const messagesQuery = useQuery({
    queryKey,
    queryFn: async () => {
      const messages = await SimpleChatService.getMessages(conversationId);
      
      // Check for messages stuck in processing for more than 2 minutes
      const now = new Date();
      const stuckMessages = messages.filter(msg => 
        msg.processing_status === 'processing' && 
        msg.message_type === 'assistant' &&
        new Date(msg.created_at).getTime() < now.getTime() - 2 * 60 * 1000
      );
      
      // Auto-fix stuck messages (best effort, don't block UI)
      if (stuckMessages.length > 0) {
        console.log(`🔧 Auto-fixing ${stuckMessages.length} stuck processing messages`);
        stuckMessages.forEach(async (msg) => {
          try {
            await SimpleChatService.fixStuckMessage(msg.id);
          } catch (error) {
            console.warn('Failed to auto-fix stuck message:', msg.id, error);
          }
        });
      }
      
      return messages;
    },
    enabled: !!conversationId && conversationId.trim() !== '',
    refetchInterval: (data) => {
      // If we have processing messages, poll more frequently
      const hasProcessingMessage = Array.isArray(data) && data.some(msg => 
        msg.processing_status === 'processing' &&
        // Only poll for recent processing messages (not stuck ones)
        new Date(msg.created_at).getTime() > Date.now() - 2 * 60 * 1000
      );
      return hasProcessingMessage ? 1000 : 5000; // 1s if processing, 5s otherwise
    },
  });

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: (message: string) => SimpleChatService.sendMessage(conversationId, message),
    onMutate: async (message: string) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey });

      // Snapshot the previous messages
      const previousMessages = queryClient.getQueryData<ChatMessage[]>(queryKey);

      // Optimistically add user message
      const optimisticUserMessage: ChatMessage = {
        id: `temp-user-${Date.now()}`,
        conversation_id: conversationId,
        organization_id: 'temp',
        message_type: 'user',
        content: message,
        processing_status: 'completed',
        created_at: new Date().toISOString()
      };

      // Optimistically add processing assistant message
      const optimisticAssistantMessage: ChatMessage = {
        id: `temp-assistant-${Date.now()}`,
        conversation_id: conversationId,
        organization_id: 'temp',
        message_type: 'assistant',
        content: '',
        processing_status: 'processing',
        created_at: new Date().toISOString()
      };

      if (previousMessages) {
        queryClient.setQueryData<ChatMessage[]>(
          queryKey,
          [...previousMessages, optimisticUserMessage, optimisticAssistantMessage]
        );
      }

      return { previousMessages };
    },
    onError: (error, variables, context) => {
      console.error('💥 Send message mutation failed:', error);
      
      // Revert optimistic update
      if (context?.previousMessages) {
        queryClient.setQueryData(queryKey, context.previousMessages);
      }
      
      toast({
        title: 'Send Failed',
        description: error instanceof Error ? error.message : 'Failed to send message.',
        variant: 'destructive',
      });
    },
    onSuccess: () => {
      // Refetch messages to get real data
      queryClient.invalidateQueries({ queryKey });
    },
  });

  // Real-time subscription for message updates
  useEffect(() => {
    if (!conversationId) return;

    const channel = supabase
      .channel(`simple-chat-${conversationId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'kb_messages',
        filter: `conversation_id=eq.${conversationId}`
      }, (payload) => {
        console.log('Real-time message update:', payload);
        
        // Invalidate and refetch messages
        queryClient.invalidateQueries({ queryKey });

        // Auto-scroll to bottom
        setTimeout(() => scrollToBottom(), 100);
      })
      .subscribe((status) => {
        console.log('Real-time subscription status:', status);
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId, queryClient, scrollToBottom]);

  // Auto-scroll when messages change
  useEffect(() => {
    if (messagesQuery.data && messagesQuery.data.length > 0) {
      setTimeout(() => scrollToBottom(), 100);
    }
  }, [messagesQuery.data, scrollToBottom]);

  const sendMessage = useCallback((message: string) => {
    if (!message.trim() || !conversationId || conversationId.trim() === '') {
      console.error('Cannot send message: invalid conversation ID');
      return;
    }
    sendMessageMutation.mutate(message.trim());
  }, [sendMessageMutation, conversationId]);

  return {
    messages: messagesQuery.data || [],
    isLoading: messagesQuery.isLoading,
    error: messagesQuery.error,
    sendMessage,
    isProcessing: sendMessageMutation.isPending,
    scrollRef,
    scrollToBottom,
  };
}