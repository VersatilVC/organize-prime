import { useQuery, useMutation, UseQueryOptions, UseMutationOptions } from '@tanstack/react-query';
import { withRetry, cacheManager, getConnectionStatus } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useCallback } from 'react';

export interface ResilientQueryOptions<T> extends Omit<UseQueryOptions<T>, 'queryFn'> {
  queryFn: () => Promise<T>;
  cacheKey?: string;
  fallbackData?: T;
  offlineMessage?: string;
  retryCount?: number;
  showErrorToast?: boolean;
}

export interface ResilientMutationOptions<TData, TVariables> extends Omit<UseMutationOptions<TData, Error, TVariables>, 'mutationFn'> {
  mutationFn: (variables: TVariables) => Promise<TData>;
  retryCount?: number;
  showErrorToast?: boolean;
  successMessage?: string;
}

/**
 * Enhanced useQuery with retry logic, caching, and offline support
 */
export function useResilientQuery<T>(options: ResilientQueryOptions<T>) {
  const { toast } = useToast();
  const {
    queryFn,
    cacheKey,
    fallbackData,
    offlineMessage = 'Using cached data due to connection issues',
    retryCount = 3,
    showErrorToast = true,
    ...queryOptions
  } = options;

  const enhancedQueryFn = useCallback(async (): Promise<T> => {
    // Check connection status
    const connectionStatus = getConnectionStatus();
    
    // If we're offline or having connection issues, try cache first
    if (!connectionStatus.isConnected && cacheKey) {
      const cachedData = cacheManager.get(cacheKey);
      if (cachedData) {
        if (import.meta.env.DEV) {
          console.log(`📱 Using cached data for ${cacheKey}`);
        }
        
        if (offlineMessage && toast) {
          toast({
            title: "Offline Mode",
            description: offlineMessage,
            variant: "default",
          });
        }
        
        return cachedData;
      }
    }

    try {
      // Execute query with retry logic
      const result = await withRetry(queryFn, retryCount);
      
      // Cache successful results
      if (cacheKey) {
        cacheManager.set(cacheKey, result);
      }
      
      return result;
    } catch (error) {
      // Try to use cached data as fallback
      if (cacheKey) {
        const cachedData = cacheManager.get(cacheKey);
        if (cachedData) {
          if (import.meta.env.DEV) {
            console.warn(`⚠️ Query failed, using cached data for ${cacheKey}:`, error);
          }
          
          if (showErrorToast && toast) {
            toast({
              title: "Connection Issue",
              description: "Using cached data. Some information may be outdated.",
              variant: "default",
            });
          }
          
          return cachedData;
        }
      }
      
      // Use fallback data if available
      if (fallbackData !== undefined) {
        if (showErrorToast && toast) {
          toast({
            title: "Data Unavailable",
            description: "Using default data due to connection issues.",
            variant: "destructive",
          });
        }
        return fallbackData;
      }
      
      // Show error toast if enabled
      if (showErrorToast && toast) {
        toast({
          title: "Database Error",
          description: error instanceof Error ? error.message : "An unexpected error occurred",
          variant: "destructive",
        });
      }
      
      throw error;
    }
  }, [queryFn, cacheKey, fallbackData, offlineMessage, retryCount, showErrorToast, toast]);

  return useQuery({
    ...queryOptions,
    queryFn: enhancedQueryFn,
    // Set reasonable defaults for resilient queries
    staleTime: queryOptions.staleTime ?? 5 * 60 * 1000, // 5 minutes
    gcTime: queryOptions.gcTime ?? 30 * 60 * 1000, // 30 minutes
    refetchOnWindowFocus: queryOptions.refetchOnWindowFocus ?? false,
    retry: (failureCount, error) => {
      // Don't retry client errors
      if (error && 'status' in error) {
        const status = (error as any).status;
        if (status >= 400 && status < 500) {
          return false;
        }
      }
      return failureCount < retryCount;
    },
    retryDelay: (attemptIndex) => Math.min(1000 * Math.pow(2, attemptIndex), 30000),
  });
}

/**
 * Enhanced useMutation with retry logic and error handling
 */
export function useResilientMutation<TData, TVariables>(
  options: ResilientMutationOptions<TData, TVariables>
) {
  const { toast } = useToast();
  const {
    mutationFn,
    retryCount = 1,
    showErrorToast = true,
    successMessage,
    ...mutationOptions
  } = options;

  const enhancedMutationFn = useCallback(async (variables: TVariables): Promise<TData> => {
    try {
      const result = await withRetry(() => mutationFn(variables), retryCount);
      
      // Show success message if provided
      if (successMessage && toast) {
        toast({
          title: "Success",
          description: successMessage,
          variant: "default",
        });
      }
      
      return result;
    } catch (error) {
      if (showErrorToast && toast) {
        toast({
          title: "Operation Failed",
          description: error instanceof Error ? error.message : "An unexpected error occurred",
          variant: "destructive",
        });
      }
      throw error;
    }
  }, [mutationFn, retryCount, showErrorToast, successMessage, toast]);

  return useMutation({
    ...mutationOptions,
    mutationFn: enhancedMutationFn,
  });
}

/**
 * Hook to get connection status and health
 */
export function useConnectionStatus() {
  return useResilientQuery({
    queryKey: ['connection-status'],
    queryFn: () => getConnectionStatus(),
    refetchInterval: 30000, // Check every 30 seconds
    staleTime: 10000, // 10 seconds
    cacheKey: 'connection-status',
    showErrorToast: false,
  });
}

/**
 * Hook to clear cache for specific patterns
 */
export function useCacheManager() {
  return {
    clearCache: (pattern?: string) => cacheManager.clear(pattern),
    clearAll: () => cacheManager.clear(),
    setCache: (key: string, data: unknown, ttl?: number) => cacheManager.set(key, data, ttl),
    getCache: (key: string) => cacheManager.get(key),
  };
}