import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useOrganization } from '@/contexts/OrganizationContext';
import { ChatSessionService, type ChatSession } from '../services/ChatSessionService';
import { useToast } from '@/hooks/use-toast';

// Query keys factory
export const chatQueryKeys = {
  all: ['chat'] as const,
  conversations: (orgId: string) => [...chatQueryKeys.all, 'conversations', orgId] as const,
  conversation: (id: string) => [...chatQueryKeys.all, 'conversation', id] as const,
  search: (orgId: string, term: string) => [...chatQueryKeys.conversations(orgId), 'search', term] as const,
  filter: (orgId: string, kbIds: string[]) => [...chatQueryKeys.conversations(orgId), 'filter', kbIds] as const,
};

/**
 * Hook for managing chat sessions with real-time updates
 */
export function useChatSessions() {
  const { currentOrganization } = useOrganization();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const orgId = currentOrganization?.id;

  // Fetch user's conversations
  const conversationsQuery = useQuery({
    queryKey: chatQueryKeys.conversations(orgId || ''),
    queryFn: () => {
      console.log('🔍 Fetching conversations for org:', orgId);
      return ChatSessionService.getUserConversations(orgId!);
    },
    enabled: !!orgId,
    staleTime: 10 * 1000, // 10 seconds (reduced for testing)
    gcTime: 2 * 60 * 1000, // 2 minutes
    refetchOnWindowFocus: true, // Refetch when window gains focus
  });

  // Create new conversation mutation
  const createConversationMutation = useMutation({
    mutationFn: ({ title, kbIds }: { title?: string; kbIds?: string[] }) =>
      ChatSessionService.createConversation(title, kbIds, orgId),
    onSuccess: (conversationId) => {
      console.log('🎉 Conversation created successfully:', conversationId);
      console.log('🔄 Invalidating queries for org:', orgId);
      
      // Immediately invalidate and refetch
      queryClient.invalidateQueries({
        queryKey: chatQueryKeys.conversations(orgId || '')
      });
      
      // Also refetch immediately
      setTimeout(() => {
        console.log('🔄 Force refetching conversations...');
        queryClient.refetchQueries({
          queryKey: chatQueryKeys.conversations(orgId || '')
        });
      }, 50);
      
      toast({
        title: 'Chat Created',
        description: 'New chat session created successfully.',
      });
      
      return conversationId;
    },
    onError: (error) => {
      console.error('Failed to create conversation:', error);
      toast({
        title: 'Creation Failed',
        description: error instanceof Error ? error.message : 'Failed to create chat session.',
        variant: 'destructive',
      });
    },
  });

  // Update conversation title mutation
  const updateTitleMutation = useMutation({
    mutationFn: ({ conversationId, title }: { conversationId: string; title: string }) =>
      ChatSessionService.updateConversationTitle(conversationId, title),
    onMutate: async ({ conversationId, title }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({
        queryKey: chatQueryKeys.conversations(orgId || '')
      });

      // Snapshot previous value
      const previousConversations = queryClient.getQueryData<ChatSession[]>(
        chatQueryKeys.conversations(orgId || '')
      );

      // Optimistically update
      if (previousConversations) {
        queryClient.setQueryData<ChatSession[]>(
          chatQueryKeys.conversations(orgId || ''),
          previousConversations.map(conv =>
            conv.id === conversationId
              ? { ...conv, title, updated_at: new Date().toISOString() }
              : conv
          )
        );
      }

      return { previousConversations };
    },
    onError: (error, variables, context) => {
      // Revert optimistic update
      if (context?.previousConversations) {
        queryClient.setQueryData(
          chatQueryKeys.conversations(orgId || ''),
          context.previousConversations
        );
      }
      
      console.error('Failed to update conversation title:', error);
      toast({
        title: 'Update Failed',
        description: error instanceof Error ? error.message : 'Failed to update chat title.',
        variant: 'destructive',
      });
    },
    onSuccess: (_, { conversationId }) => {
      // Also invalidate the specific conversation query
      queryClient.invalidateQueries({
        queryKey: chatQueryKeys.conversation(conversationId)
      });
      
      toast({
        title: 'Title Updated',
        description: 'Chat title updated successfully.',
      });
    },
    onSettled: () => {
      // Always refetch after error or success
      queryClient.invalidateQueries({
        queryKey: chatQueryKeys.conversations(orgId || '')
      });
    },
  });

  // Delete conversation mutation
  const deleteConversationMutation = useMutation({
    mutationFn: (conversationId: string) =>
      ChatSessionService.deleteConversation(conversationId),
    onMutate: async (conversationId) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({
        queryKey: chatQueryKeys.conversations(orgId || '')
      });

      // Snapshot previous value
      const previousConversations = queryClient.getQueryData<ChatSession[]>(
        chatQueryKeys.conversations(orgId || '')
      );

      // Optimistically remove from list
      if (previousConversations) {
        queryClient.setQueryData<ChatSession[]>(
          chatQueryKeys.conversations(orgId || ''),
          previousConversations.filter(conv => conv.id !== conversationId)
        );
      }

      return { previousConversations };
    },
    onError: (error, variables, context) => {
      // Revert optimistic update
      if (context?.previousConversations) {
        queryClient.setQueryData(
          chatQueryKeys.conversations(orgId || ''),
          context.previousConversations
        );
      }
      
      console.error('Failed to delete conversation:', error);
      toast({
        title: 'Deletion Failed',
        description: error instanceof Error ? error.message : 'Failed to delete chat session.',
        variant: 'destructive',
      });
    },
    onSuccess: () => {
      toast({
        title: 'Chat Deleted',
        description: 'Chat session deleted successfully.',
      });
    },
    onSettled: () => {
      // Always refetch after error or success
      queryClient.invalidateQueries({
        queryKey: chatQueryKeys.conversations(orgId || '')
      });
    },
  });

  // Real-time subscription for conversation updates
  useEffect(() => {
    if (!orgId) return;

    const channel = supabase
      .channel(`chat_conversations_${orgId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'kb_conversations',
        filter: `organization_id=eq.${orgId}`
      }, (payload) => {
        console.log('Chat conversation real-time update:', payload);
        
        // Invalidate conversations query to refetch
        queryClient.invalidateQueries({
          queryKey: chatQueryKeys.conversations(orgId)
        });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [orgId, queryClient]);

  // Wrapper function for createConversation that handles callbacks properly
  const createConversationWrapper = (
    params: { title?: string; kbIds?: string[] },
    callbacks?: {
      onSuccess?: (conversationId: string) => void;
      onError?: (error: Error) => void;
    }
  ) => {
    console.log('🚀 Creating conversation with params:', params);
    createConversationMutation.mutate(params, {
      onSuccess: (conversationId) => {
        console.log('✅ Conversation created, calling success callback:', conversationId);
        callbacks?.onSuccess?.(conversationId);
      },
      onError: (error) => {
        console.error('❌ Conversation creation failed:', error);
        callbacks?.onError?.(error instanceof Error ? error : new Error('Unknown error'));
      }
    });
  };

  return {
    // Data
    conversations: conversationsQuery.data || [],
    isLoading: conversationsQuery.isLoading,
    error: conversationsQuery.error,
    
    // Actions
    createConversation: createConversationWrapper,
    updateTitle: updateTitleMutation.mutate,
    deleteConversation: deleteConversationMutation.mutate,
    
    // Loading states
    isCreating: createConversationMutation.isPending,
    isUpdatingTitle: updateTitleMutation.isPending,
    isDeleting: deleteConversationMutation.isPending,
    
    // Refetch function
    refetch: conversationsQuery.refetch,
  };
}

/**
 * Hook for managing active session
 */
export function useActiveSession(sessionId?: string) {
  const { currentOrganization } = useOrganization();
  const orgId = currentOrganization?.id;

  const sessionQuery = useQuery({
    queryKey: chatQueryKeys.conversation(sessionId || ''),
    queryFn: () => ChatSessionService.getConversationDetails(sessionId!),
    enabled: !!sessionId && !!orgId,
    staleTime: 2 * 60 * 1000, // 2 minutes
    retry: (failureCount, error) => {
      // Don't retry if conversation not found
      if (error instanceof Error && error.message.includes('not found')) {
        return false;
      }
      return failureCount < 2;
    }
  });

  return {
    session: sessionQuery.data,
    isLoading: sessionQuery.isLoading,
    error: sessionQuery.error,
    refetch: sessionQuery.refetch,
  };
}

/**
 * Hook for searching conversations
 */
export function useSearchConversations(searchTerm: string) {
  const { currentOrganization } = useOrganization();
  const orgId = currentOrganization?.id;

  return useQuery({
    queryKey: chatQueryKeys.search(orgId || '', searchTerm),
    queryFn: () => ChatSessionService.searchConversations(orgId!, searchTerm),
    enabled: !!orgId && searchTerm.trim().length > 0,
    staleTime: 30 * 1000, // 30 seconds
  });
}

/**
 * Hook for filtering conversations by knowledge base
 */
export function useFilterConversationsByKB(kbIds: string[]) {
  const { currentOrganization } = useOrganization();
  const orgId = currentOrganization?.id;

  return useQuery({
    queryKey: chatQueryKeys.filter(orgId || '', kbIds),
    queryFn: () => ChatSessionService.getConversationsByKB(orgId!, kbIds),
    enabled: !!orgId && kbIds.length > 0,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}