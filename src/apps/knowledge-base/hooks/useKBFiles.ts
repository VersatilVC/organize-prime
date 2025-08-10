import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganizationData } from '@/contexts/OrganizationContext';

export function useKBFiles() {
  const { currentOrganization } = useOrganizationData();
  const orgId = currentOrganization?.id ?? null;

  return useQuery<any[]>({
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
}
