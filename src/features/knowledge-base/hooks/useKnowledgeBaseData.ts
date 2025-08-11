import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganization } from '@/contexts/OrganizationContext';
import { KBDocument, KBStats } from '../types/knowledgeBaseTypes';

export function useKnowledgeBaseData() {
  const { currentOrganization } = useOrganization();

  return useQuery({
    queryKey: ['knowledge-base-data', currentOrganization?.id],
    queryFn: async (): Promise<KBDocument[]> => {
      if (!currentOrganization?.id) return [];

      const { data, error } = await supabase
        .from('kb_documents')
        .select('*')
        .eq('organization_id', currentOrganization.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!currentOrganization?.id,
    staleTime: 30 * 1000, // 30 seconds
  });
}

export function useKnowledgeBaseStats() {
  const { currentOrganization } = useOrganization();

  return useQuery({
    queryKey: ['knowledge-base-stats', currentOrganization?.id],
    queryFn: async (): Promise<KBStats> => {
      if (!currentOrganization?.id) {
        return {
          total_documents: 0,
          processing_documents: 0,
          completed_documents: 0,
          error_documents: 0,
          total_searches: 0,
          avg_search_results: 0,
        };
      }

      // Get document stats
      const { data: documents, error: docsError } = await supabase
        .from('kb_documents')
        .select('processing_status')
        .eq('organization_id', currentOrganization.id);

      if (docsError) throw docsError;

      // Get search stats
      const { data: searches, error: searchError } = await supabase
        .from('kb_searches')
        .select('results_count')
        .eq('organization_id', currentOrganization.id);

      if (searchError) throw searchError;

      const stats: KBStats = {
        total_documents: documents?.length || 0,
        processing_documents: documents?.filter(d => d.processing_status === 'processing').length || 0,
        completed_documents: documents?.filter(d => d.processing_status === 'completed').length || 0,
        error_documents: documents?.filter(d => d.processing_status === 'error').length || 0,
        total_searches: searches?.length || 0,
        avg_search_results: searches?.length > 0 
          ? (searches.reduce((sum, s) => sum + s.results_count, 0) / searches.length) 
          : 0,
      };

      return stats;
    },
    enabled: !!currentOrganization?.id,
    staleTime: 60 * 1000, // 1 minute
  });
}

export function useRecentDocuments(limit = 5) {
  const { currentOrganization } = useOrganization();

  return useQuery({
    queryKey: ['recent-documents', currentOrganization?.id, limit],
    queryFn: async (): Promise<KBDocument[]> => {
      if (!currentOrganization?.id) return [];

      const { data, error } = await supabase
        .from('kb_documents')
        .select('*')
        .eq('organization_id', currentOrganization.id)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data || [];
    },
    enabled: !!currentOrganization?.id,
    staleTime: 30 * 1000,
  });
}