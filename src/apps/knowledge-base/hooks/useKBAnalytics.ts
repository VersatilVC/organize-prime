import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganizationData } from '@/contexts/OrganizationContext';

interface KBAnalytics {
  total_files: number;
  total_conversations: number;
  processing_files: number;
  storage_used: number;
  last_activity: string | null;
}

export function useKBAnalytics() {
  const { currentOrganization } = useOrganizationData();
  const orgId = currentOrganization?.id ?? null;

  return useQuery({
    queryKey: ['kb.analytics', orgId],
    enabled: !!orgId,
    staleTime: 30_000,
    gcTime: 300_000,
    queryFn: async (): Promise<KBAnalytics> => {
      const { data, error } = await supabase.rpc('get_kb_analytics', { org_id: orgId });
      if (error) throw error;
      return data as KBAnalytics;
    }
  });
}
