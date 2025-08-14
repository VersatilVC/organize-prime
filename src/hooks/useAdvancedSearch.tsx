import { useState, useEffect, useCallback, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { debounce } from 'lodash';

interface SearchResult {
  id: string;
  type: 'user' | 'organization' | 'feedback';
  title: string;
  content: string;
  created_at: string;
}

interface SearchFilters {
  type?: string[];
}

interface SearchHistory {
  query: string;
  timestamp: Date;
  results_count: number;
}

export function useAdvancedSearch() {
  const [query, setQuery] = useState('');
  const [filters, setFilters] = useState<SearchFilters>({});
  const [searchHistory, setSearchHistory] = useState<SearchHistory[]>([]);

  // Load search history from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('search-history');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setSearchHistory(parsed.map((item: any) => ({
          ...item,
          timestamp: new Date(item.timestamp)
        })));
      } catch (error) {
        console.error('Failed to parse search history:', error);
      }
    }
  }, []);

  // Save search history to localStorage
  const saveSearchHistory = useCallback((newQuery: string, resultsCount: number) => {
    if (!newQuery.trim()) return;
    
    const newEntry: SearchHistory = {
      query: newQuery,
      timestamp: new Date(),
      results_count: resultsCount
    };
    
    const updated = [newEntry, ...searchHistory.filter(h => h.query !== newQuery)]
      .slice(0, 50);
    
    setSearchHistory(updated);
    localStorage.setItem('search-history', JSON.stringify(updated));
  }, [searchHistory]);

  // Simple search function
  const performSearch = useCallback(async (searchQuery: string, searchFilters: SearchFilters) => {
    if (!searchQuery.trim()) return [];

    const results: SearchResult[] = [];

    try {
      // Search organizations only
      if (!searchFilters.type || searchFilters.type.includes('organization')) {
        const { data: orgs } = await supabase
          .from('organizations')
          .select('id, name, created_at')
          .ilike('name', `%${searchQuery}%`)
          .limit(10);

        if (orgs) {
          results.push(...orgs.map(org => ({
            id: org.id,
            type: 'organization' as const,
            title: org.name,
            content: 'Organization',
            created_at: org.created_at
          })));
        }
      }

      return results;
    } catch (error) {
      console.error('Search error:', error);
      return [];
    }
  }, []);

  // Debounced search query
  const { data: searchResults, isLoading } = useQuery({
    queryKey: ['advanced-search', query, filters],
    queryFn: () => performSearch(query, filters),
    enabled: query.length >= 2,
    staleTime: 30 * 1000,
  });

  // Debounced search function
  const debouncedSearch = useMemo(
    () => debounce((newQuery: string) => {
      setQuery(newQuery);
      if (newQuery.length >= 2) {
        setTimeout(() => {
          if (searchResults) {
            saveSearchHistory(newQuery, searchResults.length);
          }
        }, 500);
      }
    }, 300),
    [searchResults, saveSearchHistory]
  );

  const clearHistory = useCallback(() => {
    setSearchHistory([]);
    localStorage.removeItem('search-history');
  }, []);

  const removeFromHistory = useCallback((queryToRemove: string) => {
    const updated = searchHistory.filter(h => h.query !== queryToRemove);
    setSearchHistory(updated);
    localStorage.setItem('search-history', JSON.stringify(updated));
  }, [searchHistory]);

  return {
    query,
    searchResults: searchResults || [],
    isLoading,
    error: null,
    filters,
    searchHistory,
    setQuery: debouncedSearch,
    setFilters,
    clearHistory,
    removeFromHistory,
    performSearch
  };
}