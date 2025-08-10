import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganizationData } from '@/contexts/OrganizationContext';

export function useKBData() {
  const { currentOrganization } = useOrganizationData();
  const orgId = currentOrganization?.id ?? null;

  const { data, isLoading } = useQuery({
    queryKey: ['kb.dashboard', orgId],
    enabled: !!orgId,
    staleTime: 30_000,
    gcTime: 300_000,
    queryFn: async () => {
      const { data, error } = await (supabase as any).rpc('get_kb_dashboard_stats', {
        org_id: orgId,
        user_id_param: (await supabase.auth.getUser()).data.user?.id ?? null,
        user_role: 'user'
      });
      if (error) throw error;
      return data as any;
    }
  });

  return { stats: data, isLoading };
}
