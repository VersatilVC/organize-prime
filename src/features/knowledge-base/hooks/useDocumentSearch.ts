import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganization } from '@/contexts/OrganizationContext';
import { useAuth } from '@/auth/AuthProvider';
import { KBDocument, KBSearch, DocumentSearchResult } from '../types/knowledgeBaseTypes';

export function useDocumentSearch() {
  const [searchQuery, setSearchQuery] = useState('');
  const { currentOrganization } = useOrganization();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const searchDocuments = useQuery({
    queryKey: ['document-search', currentOrganization?.id, searchQuery],
    queryFn: async (): Promise<DocumentSearchResult[]> => {
      if (!currentOrganization?.id || !searchQuery.trim()) return [];

      // Simple text search for now - can be enhanced with vector search later
      const { data, error } = await supabase
        .from('kb_documents')
        .select('*')
        .eq('organization_id', currentOrganization.id)
        .or(`title.ilike.%${searchQuery}%,content.ilike.%${searchQuery}%`)
        .limit(20);

      if (error) throw error;

      // Transform results with basic relevance scoring
      const results: DocumentSearchResult[] = (data || []).map(doc => {
        const titleMatch = doc.title.toLowerCase().includes(searchQuery.toLowerCase());
        const contentMatch = doc.content.toLowerCase().includes(searchQuery.toLowerCase());
        
        // Simple relevance scoring
        let relevance_score = 0;
        if (titleMatch) relevance_score += 0.8;
        if (contentMatch) relevance_score += 0.6;
        
        // Extract highlights
        const highlights: string[] = [];
        const queryLower = searchQuery.toLowerCase();
        const contentLower = doc.content.toLowerCase();
        
        if (contentMatch) {
          const index = contentLower.indexOf(queryLower);
          if (index !== -1) {
            const start = Math.max(0, index - 50);
            const end = Math.min(doc.content.length, index + searchQuery.length + 50);
            highlights.push('...' + doc.content.substring(start, end) + '...');
          }
        }

        return {
          document: doc,
          relevance_score,
          highlights: highlights.slice(0, 2), // Limit highlights
        };
      });

      // Sort by relevance
      return results.sort((a, b) => b.relevance_score - a.relevance_score);
    },
    enabled: !!currentOrganization?.id && searchQuery.trim().length > 0,
    staleTime: 30 * 1000,
  });

  const saveSearch = useMutation({
    mutationFn: async (query: string) => {
      if (!currentOrganization?.id || !user?.id) return;

      const { data, error } = await supabase
        .from('kb_searches')
        .insert({
          organization_id: currentOrganization.id,
          user_id: user.id,
          query,
          results_count: searchDocuments.data?.length || 0,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['search-history'] });
    },
  });

  const searchHistory = useQuery({
    queryKey: ['search-history', currentOrganization?.id, user?.id],
    queryFn: async (): Promise<KBSearch[]> => {
      if (!currentOrganization?.id || !user?.id) return [];

      const { data, error } = await supabase
        .from('kb_searches')
        .select('*')
        .eq('organization_id', currentOrganization.id)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      return data || [];
    },
    enabled: !!currentOrganization?.id && !!user?.id,
    staleTime: 60 * 1000,
  });

  return {
    searchQuery,
    setSearchQuery,
    searchResults: searchDocuments.data || [],
    isSearching: searchDocuments.isLoading,
    searchError: searchDocuments.error,
    saveSearch: saveSearch.mutate,
    isSavingSearch: saveSearch.isPending,
    searchHistory: searchHistory.data || [],
  };
}