import { useState, useEffect, useCallback } from 'react';
import { searchCache, userPreferences } from '@/lib/local-storage';
import type { SearchCache } from '@/lib/local-storage';

interface UseSearchCacheOptions<T> {
  type: SearchCache['type'];
  searchFn: (query: string) => Promise<T>;
  enabled?: boolean;
  minQueryLength?: number;
}

export function useSearchCache<T = any>({
  type,
  searchFn,
  enabled = true,
  minQueryLength = 2,
}: UseSearchCacheOptions<T>) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recentQueries, setRecentQueries] = useState<string[]>([]);

  // Load recent queries on mount
  useEffect(() => {
    const recent = searchCache.getRecentQueries(type);
    setRecentQueries(recent);
  }, [type]);

  const search = useCallback(async (searchQuery: string) => {
    if (!enabled || searchQuery.length < minQueryLength) {
      setResults(null);
      return;
    }

    // Check cache first
    const cached = searchCache.get(searchQuery, type);
    if (cached) {
      setResults(cached.results as T);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const searchResults = await searchFn(searchQuery);
      
      // Cache the results
      searchCache.set({
        query: searchQuery,
        results: searchResults as any,
        timestamp: Date.now(),
        type,
      });

      // Add to recent searches
      userPreferences.addRecentSearch(searchQuery);
      
      // Update recent queries state
      const updated = searchCache.getRecentQueries(type);
      setRecentQueries(updated);

      setResults(searchResults);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Search failed';
      setError(errorMessage);
      setResults(null);
    } finally {
      setLoading(false);
    }
  }, [enabled, minQueryLength, searchFn, type]);

  // Debounced search effect
  useEffect(() => {
    if (!query || query.length < minQueryLength) {
      setResults(null);
      return;
    }

    const timeoutId = setTimeout(() => {
      search(query);
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [query, search, minQueryLength]);

  const clearResults = useCallback(() => {
    setResults(null);
    setError(null);
    setQuery('');
  }, []);

  const clearCache = useCallback(() => {
    searchCache.clear();
    setRecentQueries([]);
  }, []);

  const removeFromCache = useCallback((searchQuery: string) => {
    searchCache.remove(searchQuery, type);
    const updated = searchCache.getRecentQueries(type);
    setRecentQueries(updated);
  }, [type]);

  return {
    query,
    setQuery,
    results,
    loading,
    error,
    recentQueries,
    search,
    clearResults,
    clearCache,
    removeFromCache,
  };
}

// Specialized hook for user search
export function useUserSearchCache(searchFn: (query: string) => Promise<any>) {
  return useSearchCache({
    type: 'users',
    searchFn,
    minQueryLength: 2,
  });
}

// Specialized hook for organization search
export function useOrganizationSearchCache(searchFn: (query: string) => Promise<any>) {
  return useSearchCache({
    type: 'organizations',
    searchFn,
    minQueryLength: 1,
  });
}

// Specialized hook for feedback search
export function useFeedbackSearchCache(searchFn: (query: string) => Promise<any>) {
  return useSearchCache({
    type: 'feedback',
    searchFn,
    minQueryLength: 2,
  });
}