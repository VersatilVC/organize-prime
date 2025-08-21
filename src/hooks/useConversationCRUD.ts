import { useMutation, useQueryClient } from '@tanstack/react-query';
import { SimpleChatService } from '@/services/SimpleChatService';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/auth/AuthProvider';

export function useConversationCRUD() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();

  const conversationsQueryKey = ['conversations', user?.id];

  const createConversation = useMutation({
    mutationFn: (title: string) => SimpleChatService.createConversation(title),
    onSuccess: (conversationId) => {
      queryClient.invalidateQueries({ queryKey: conversationsQueryKey });
      toast({
        title: 'Conversation Created',
        description: 'New conversation has been created successfully.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Creation Failed',
        description: error instanceof Error ? error.message : 'Failed to create conversation.',
        variant: 'destructive',
      });
    },
  });

  const updateConversation = useMutation({
    mutationFn: ({ id, title }: { id: string; title: string }) => 
      SimpleChatService.updateConversation(id, title),
    onMutate: async ({ id, title }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: conversationsQueryKey });

      // Snapshot previous value
      const previousConversations = queryClient.getQueryData(conversationsQueryKey);

      // Optimistically update
      queryClient.setQueryData(conversationsQueryKey, (old: any) => {
        if (!old) return old;
        return old.map((conv: any) => 
          conv.id === id ? { ...conv, title, updated_at: new Date().toISOString() } : conv
        );
      });

      return { previousConversations };
    },
    onError: (error, variables, context) => {
      // Revert optimistic update
      if (context?.previousConversations) {
        queryClient.setQueryData(conversationsQueryKey, context.previousConversations);
      }
      
      toast({
        title: 'Update Failed',
        description: error instanceof Error ? error.message : 'Failed to update conversation.',
        variant: 'destructive',
      });
    },
    onSuccess: () => {
      toast({
        title: 'Conversation Updated',
        description: 'Conversation title has been updated successfully.',
      });
    },
  });

  const deleteConversation = useMutation({
    mutationFn: (id: string) => SimpleChatService.deleteConversation(id),
    onMutate: async (id) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: conversationsQueryKey });

      // Snapshot previous value
      const previousConversations = queryClient.getQueryData(conversationsQueryKey);

      // Optimistically remove from list
      queryClient.setQueryData(conversationsQueryKey, (old: any) => {
        if (!old) return old;
        return old.filter((conv: any) => conv.id !== id);
      });

      return { previousConversations };
    },
    onError: (error, variables, context) => {
      // Revert optimistic update
      if (context?.previousConversations) {
        queryClient.setQueryData(conversationsQueryKey, context.previousConversations);
      }
      
      toast({
        title: 'Delete Failed',
        description: error instanceof Error ? error.message : 'Failed to delete conversation.',
        variant: 'destructive',
      });
    },
    onSuccess: () => {
      toast({
        title: 'Conversation Deleted',
        description: 'Conversation and all its messages have been deleted.',
      });
    },
  });

  const archiveConversation = useMutation({
    mutationFn: (id: string) => SimpleChatService.archiveConversation(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: conversationsQueryKey });
      toast({
        title: 'Conversation Archived',
        description: 'Conversation has been archived successfully.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Archive Failed',
        description: error instanceof Error ? error.message : 'Failed to archive conversation.',
        variant: 'destructive',
      });
    },
  });

  return {
    createConversation,
    updateConversation,
    deleteConversation,
    archiveConversation,
    isCreating: createConversation.isPending,
    isUpdating: updateConversation.isPending,
    isDeleting: deleteConversation.isPending,
    isArchiving: archiveConversation.isPending,
  };
}