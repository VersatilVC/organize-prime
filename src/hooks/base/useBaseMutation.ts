// Base mutation hook for consistent mutation handling
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useErrorHandler } from '@/lib/error-handling';
import { useToast } from '@/hooks/use-toast';

// Base mutation options interface
export interface BaseMutationOptions<TData, TVariables> {
  mutationFn: (variables: TVariables) => Promise<TData>;
  onSuccess?: (data: TData, variables: TVariables) => void;
  onError?: (error: Error, variables: TVariables) => void;
  onSettled?: (data: TData | undefined, error: Error | null, variables: TVariables) => void;
  invalidateQueries?: string[][]; // Query keys to invalidate on success
  optimisticUpdate?: {
    queryKey: string[];
    updater: (oldData: any, variables: TVariables) => any;
  };
  successMessage?: string | ((data: TData, variables: TVariables) => string);
  errorMessage?: string | ((error: Error, variables: TVariables) => string);
  context?: string; // For error handling context
  retry?: boolean | number;
  retryDelay?: number;
}

// Base mutation result interface
export interface BaseMutationResult<TData, TVariables> {
  mutate: (variables: TVariables) => void;
  mutateAsync: (variables: TVariables) => Promise<TData>;
  data: TData | undefined;
  error: Error | null;
  isError: boolean;
  isIdle: boolean;
  isLoading: boolean;
  isPending: boolean;
  isSuccess: boolean;
  failureCount: number;
  failureReason: Error | null;
  reset: () => void;
  status: 'idle' | 'pending' | 'error' | 'success';
  submittedAt: number;
  variables: TVariables | undefined;
}

// Base mutation hook implementation
export const useBaseMutation = <TData, TVariables>(
  options: BaseMutationOptions<TData, TVariables>
): BaseMutationResult<TData, TVariables> => {
  const queryClient = useQueryClient();
  const { handleError } = useErrorHandler();
  const { toast } = useToast();

  const {
    mutationFn,
    onSuccess,
    onError,
    onSettled,
    invalidateQueries = [],
    optimisticUpdate,
    successMessage,
    errorMessage,
    context,
    retry = false,
    retryDelay = 1000
  } = options;

  const mutation = useMutation({
    mutationFn,
    onMutate: async (variables: TVariables) => {
      // Cancel outgoing refetches
      if (optimisticUpdate) {
        await queryClient.cancelQueries({ queryKey: optimisticUpdate.queryKey });
        
        // Snapshot the previous value
        const previousData = queryClient.getQueryData(optimisticUpdate.queryKey);
        
        // Optimistically update
        queryClient.setQueryData(
          optimisticUpdate.queryKey,
          (old: any) => optimisticUpdate.updater(old, variables)
        );
        
        // Return context with the previous data
        return { previousData };
      }
    },
    onSuccess: async (data: TData, variables: TVariables, context: any) => {
      // Show success message
      if (successMessage) {
        const message = typeof successMessage === 'function' 
          ? successMessage(data, variables)
          : successMessage;
        
        toast({
          title: "Success",
          description: message,
          variant: "default"
        });
      }

      // Invalidate queries
      if (invalidateQueries.length > 0) {
        await Promise.all(
          invalidateQueries.map(queryKey => 
            queryClient.invalidateQueries({ queryKey })
          )
        );
      }

      // Call custom onSuccess
      onSuccess?.(data, variables);
    },
    onError: (error: Error, variables: TVariables, context: any) => {
      // Rollback optimistic update
      if (optimisticUpdate && context?.previousData !== undefined) {
        queryClient.setQueryData(optimisticUpdate.queryKey, context.previousData);
      }

      // Handle error
      if (errorMessage) {
        const message = typeof errorMessage === 'function'
          ? errorMessage(error, variables)
          : errorMessage;
        
        toast({
          title: "Error",
          description: message,
          variant: "destructive"
        });
      } else {
        handleError(error, context);
      }

      // Call custom onError
      onError?.(error, variables);
    },
    onSettled: (data: TData | undefined, error: Error | null, variables: TVariables, context: any) => {
      // Always refetch after error or success to ensure consistency
      if (optimisticUpdate) {
        queryClient.invalidateQueries({ queryKey: optimisticUpdate.queryKey });
      }

      // Call custom onSettled
      onSettled?.(data, error, variables);
    },
    retry,
    retryDelay
  });

  return {
    mutate: mutation.mutate,
    mutateAsync: mutation.mutateAsync,
    data: mutation.data,
    error: mutation.error as Error | null,
    isError: mutation.isError,
    isIdle: mutation.isIdle,
    isLoading: mutation.isPending, // For backward compatibility
    isPending: mutation.isPending,
    isSuccess: mutation.isSuccess,
    failureCount: mutation.failureCount,
    failureReason: mutation.failureReason as Error | null,
    reset: mutation.reset,
    status: mutation.status,
    submittedAt: mutation.submittedAt,
    variables: mutation.variables
  };
};