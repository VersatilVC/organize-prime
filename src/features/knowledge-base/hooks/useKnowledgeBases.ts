import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useEffectiveOrganization } from '@/hooks/useEffectiveOrganization';

export interface KnowledgeBase {
  id: string;
  organization_id: string;
  name: string;
  display_name: string;
  description?: string;
  embedding_model: string;
  chunk_size: number;
  chunk_overlap: number;
  file_count: number;
  total_vectors: number;
  is_default: boolean;
  is_premium: boolean;
  status: string;
  created_at: string;
  updated_at: string;
  created_by?: string;
  updated_by?: string;
  vector_table_name?: string;
  vector_function_name?: string;
  vector_table_id?: string;
}

export function useKnowledgeBases() {
  const { effectiveOrganizationId } = useEffectiveOrganization();

  return useQuery({
    queryKey: ['knowledge-bases', effectiveOrganizationId],
    queryFn: async (): Promise<KnowledgeBase[]> => {
      if (!effectiveOrganizationId) {
        return [];
      }

      const { data, error } = await supabase
        .from('kb_configurations')
        .select('*')
        .eq('organization_id', effectiveOrganizationId)
        .eq('status', 'active')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Failed to fetch knowledge bases:', error);
        throw new Error(`Failed to fetch knowledge bases: ${error.message}`);
      }

      return data || [];
    },
    enabled: !!effectiveOrganizationId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
  });
}

export function useKnowledgeBase(kbId: string) {
  const { effectiveOrganizationId } = useEffectiveOrganization();

  return useQuery({
    queryKey: ['knowledge-base', kbId, effectiveOrganizationId],
    queryFn: async (): Promise<KnowledgeBase | null> => {
      if (!effectiveOrganizationId || !kbId) {
        return null;
      }

      const { data, error } = await supabase
        .from('kb_configurations')
        .select('*')
        .eq('id', kbId)
        .eq('organization_id', effectiveOrganizationId)
        .single();

      if (error) {
        console.error('Failed to fetch knowledge base:', error);
        throw new Error(`Failed to fetch knowledge base: ${error.message}`);
      }

      return data;
    },
    enabled: !!effectiveOrganizationId && !!kbId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
  });
}