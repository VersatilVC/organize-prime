import { useSuspenseQuery as tanstackUseSuspenseQuery } from '@tanstack/react-query';
import type { UseSuspenseQueryOptions, UseSuspenseQueryResult } from '@tanstack/react-query';

/**
 * Enhanced suspense query hook with better error handling and performance
 */
export function useSuspenseQuery<TData, TError = Error>(
  options: UseSuspenseQueryOptions<TData, TError>
): UseSuspenseQueryResult<TData, TError> {
  return tanstackUseSuspenseQuery({
    ...options,
    // Enable background refetching while showing stale data
    staleTime: options.staleTime ?? 5 * 60 * 1000, // 5 minutes default
    // Keep previous data during refetch to prevent loading states
    placeholderData: (prev) => prev,
    // Retry logic
    retry: (failureCount, error: any) => {
      // Don't retry on client errors
      if (error?.status >= 400 && error?.status < 500) {
        return false;
      }
      return failureCount < 3;
    },
    // Exponential backoff
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
  });
}

/**
 * Enhanced mutation hook with optimistic updates
 */
export function useOptimisticMutation<TData, TError, TVariables, TContext>(
  options: {
    mutationFn: (variables: TVariables) => Promise<TData>;
    onMutate?: (variables: TVariables) => Promise<TContext> | TContext | void;
    onError?: (error: TError, variables: TVariables, context: TContext | undefined) => void;
    onSuccess?: (data: TData, variables: TVariables, context: TContext | undefined) => void;
    onSettled?: (data: TData | undefined, error: TError | null, variables: TVariables, context: TContext | undefined) => void;
  }
) {
  const { useMutation } = tanstackUseSuspenseQuery;
  // Implementation would go here - this is a placeholder for the pattern
  // In practice, you'd use @tanstack/react-query's useMutation with optimistic updates
}

/**
 * Prefetch hook for loading data before it's needed
 */
export function usePrefetch() {
  const { useQueryClient } = tanstackUseSuspenseQuery;
  // Implementation would use queryClient.prefetchQuery
  // This is a placeholder for the pattern
}