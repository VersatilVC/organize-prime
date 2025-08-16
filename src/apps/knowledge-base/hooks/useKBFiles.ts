import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useOrganizationData } from '@/contexts/OrganizationContext';

export function useKBFiles() {
  const { currentOrganization } = useOrganizationData();
  const orgId = currentOrganization?.id ?? null;
  const queryClient = useQueryClient();

  const query = useQuery<any[]>({
    queryKey: ['kb.files', orgId],
    enabled: !!orgId,
    staleTime: 10_000,
    gcTime: 60_000,
    queryFn: async (): Promise<any[]> => {
      const { data, error } = await (supabase as any)
        .from('kb_files')
        .select('*')
        .eq('organization_id', orgId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data ?? [];
    }
  });

  // Set up real-time subscription for kb_files changes
  useEffect(() => {
    if (!orgId) return;

    const channel = supabase
      .channel(`kb_files_${orgId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'kb_files',
        filter: `organization_id=eq.${orgId}`
      }, (payload) => {
        console.log('KB Files real-time update:', payload);
        
        // Invalidate and refetch the query when files change
        queryClient.invalidateQueries({
          queryKey: ['kb.files', orgId]
        });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [orgId, queryClient]);

  return query;
}
