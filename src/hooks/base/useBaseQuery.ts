// Base hook for consistent query handling across the application
import React, { useRef, useEffect } from 'react';
import { useQuery, QueryKey } from '@tanstack/react-query';
import { useErrorHandler, ErrorSeverity } from '@/lib/error-handling';
import { getCacheConfig } from '@/config/app-config';

// Base query options interface
export interface BaseQueryOptions<T> {
  queryKey: QueryKey;
  queryFn: () => Promise<T>;
  enabled?: boolean;
  staleTime?: number;
  refetchInterval?: number;
  refetchOnWindowFocus?: boolean;
  retry?: boolean | number;
  retryDelay?: number | ((attemptIndex: number) => number);
  onSuccess?: (data: T) => void;
  onError?: (error: Error) => void;
  onSettled?: (data: T | undefined, error: Error | null) => void;
  select?: (data: T) => any;
  keepPreviousData?: boolean;
  suspense?: boolean;
  context?: string; // For error handling context
}

// Base query result interface
export interface BaseQueryResult<T> {
  data: T | undefined;
  isLoading: boolean;
  isError: boolean;
  isFetching: boolean;
  isStale: boolean;
  error: Error | null;
  refetch: () => Promise<any>;
  dataUpdatedAt: number;
  errorUpdatedAt: number;
  failureCount: number;
  isLoadingError: boolean;
  isRefetchError: boolean;
  isSuccess: boolean;
  status: 'pending' | 'error' | 'success';
}

// Base query hook implementation
export const useBaseQuery = <T>(options: BaseQueryOptions<T>): BaseQueryResult<T> => {
  const { handleError } = useErrorHandler();
  const cacheConfig = getCacheConfig();

  const {
    queryKey,
    queryFn,
    enabled = true,
    staleTime = cacheConfig.defaultStaleTime,
    refetchInterval,
    refetchOnWindowFocus = false,
    retry = 3,
    retryDelay = (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    onSuccess,
    onError,
    onSettled,
    select,
    keepPreviousData = false,
    suspense = false,
    context
  } = options;

  const query = useQuery({
    queryKey,
    queryFn: async () => {
      try {
        const result = await queryFn();
        onSuccess?.(result);
        return result;
      } catch (error) {
        const errorObj = error instanceof Error ? error : new Error('Unknown error');
        handleError(errorObj, context, ErrorSeverity.MEDIUM);
        onError?.(errorObj);
        throw errorObj;
      }
    },
    enabled,
    staleTime,
    refetchInterval,
    refetchOnWindowFocus,
    retry,
    retryDelay,
    select,
  });

  // Handle onSettled manually since it's not in React Query v5
  const prevDataRef = useRef(query.data);
  const prevErrorRef = useRef(query.error);
  
  useEffect(() => {
    if (prevDataRef.current !== query.data || prevErrorRef.current !== query.error) {
      onSettled?.(query.data, query.error as Error | null);
      prevDataRef.current = query.data;
      prevErrorRef.current = query.error;
    }
  }, [query.data, query.error, onSettled]);

  return {
    data: query.data,
    isLoading: query.isLoading,
    isError: query.isError,
    isFetching: query.isFetching,
    isStale: query.isStale,
    error: query.error as Error | null,
    refetch: query.refetch,
    dataUpdatedAt: query.dataUpdatedAt,
    errorUpdatedAt: query.errorUpdatedAt,
    failureCount: query.failureCount,
    isLoadingError: query.isLoadingError,
    isRefetchError: query.isRefetchError,
    isSuccess: query.isSuccess,
    status: query.status,
  };
};