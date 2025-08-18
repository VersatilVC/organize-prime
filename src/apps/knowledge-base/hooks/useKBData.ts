import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganizationData } from '@/contexts/OrganizationContext';

interface KBDashboardStats {
  total_files: number;
  total_size: number;
  total_conversations: number;
  active_configurations: number;
  recent_files: Array<{
    id: string;
    file_name: string;
    created_at: string;
    processing_status: string;
  }>;
}

export function useKBData() {
  const { currentOrganization } = useOrganizationData();
  const orgId = currentOrganization?.id ?? null;

  const { data, isLoading } = useQuery({
    queryKey: ['kb.dashboard', orgId],
    enabled: !!orgId,
    staleTime: 30_000,
    gcTime: 300_000,
    queryFn: async (): Promise<KBDashboardStats> => {
      const { data, error } = await supabase.rpc('get_kb_dashboard_stats', {
        org_id: orgId,
        user_id_param: (await supabase.auth.getUser()).data.user?.id ?? null,
        user_role: 'user'
      });
      if (error) throw error;
      return data as KBDashboardStats;
    }
  });

  return { stats: data, isLoading };
}
