import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganizationData } from '@/contexts/OrganizationContext';

export function useKBAnalytics() {
  const { currentOrganization } = useOrganizationData();
  const orgId = currentOrganization?.id ?? null;

  return useQuery({
    queryKey: ['kb.analytics', orgId],
    enabled: !!orgId,
    staleTime: 30_000,
    gcTime: 300_000,
    queryFn: async () => {
      // Cast to any to avoid type mismatch with generated types not including KB RPC yet
      const { data, error } = await (supabase as any).rpc('get_kb_analytics', { org_id: orgId });
      if (error) throw error;
      return data as any;
    }
  });
}
