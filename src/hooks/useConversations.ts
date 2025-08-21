import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { SimpleChatService, type Conversation } from '@/services/SimpleChatService';
import { useAuth } from '@/auth/AuthProvider';

export function useConversations() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const queryKey = ['conversations', user?.id];

  const query = useQuery({
    queryKey,
    queryFn: () => SimpleChatService.getConversations(),
    enabled: !!user,
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });

  // Real-time subscription for conversation updates
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel(`conversations-${user.id}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'kb_conversations',
        filter: `user_id=eq.${user.id}`
      }, (payload) => {
        console.log('Real-time conversation update:', payload);
        
        // Invalidate and refetch conversations
        queryClient.invalidateQueries({ queryKey });
      })
      .subscribe((status) => {
        console.log('Conversations subscription status:', status);
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, queryClient]);

  return {
    conversations: query.data || [],
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  };
}