import { useToast } from "@/hooks/use-toast";
import { ServiceError, ValidationError, BusinessLogicError } from '@/services';

// Error Handler Service
export class ErrorHandler {
  private static instance: ErrorHandler;
  
  static getInstance(): ErrorHandler {
    if (!ErrorHandler.instance) {
      ErrorHandler.instance = new ErrorHandler();
    }
    return ErrorHandler.instance;
  }

  handleError(error: any, context?: string): void {
    console.error(`Error${context ? ` in ${context}` : ''}:`, error);

    // Show user-friendly message
    const userMessage = this.getUserFriendlyMessage(error);
    
    // Use global toast notification
    if (typeof window !== 'undefined') {
      // Dispatch custom event for toast
      window.dispatchEvent(new CustomEvent('show-error-toast', {
        detail: {
          title: "Something went wrong",
          description: userMessage,
          variant: "destructive"
        }
      }));
    }
  }

  getUserFriendlyMessage(error: any): string {
    if (error instanceof ValidationError) {
      return "Please check your input and try again.";
    }
    
    if (error instanceof BusinessLogicError) {
      return error.message;
    }
    
    if (error instanceof ServiceError) {
      return "Unable to complete the request. Please try again.";
    }
    
    // Supabase specific errors
    if (error?.code === 'PGRST301') {
      return "Access denied. You don't have permission to perform this action.";
    }
    
    if (error?.code === 'PGRST116') {
      return "The requested item was not found.";
    }
    
    if (error?.code === '23505') {
      return "This item already exists.";
    }
    
    if (error?.code === '23503') {
      return "Cannot complete this action due to related data.";
    }
    
    // Network errors
    if (error?.message?.includes('fetch')) {
      return "Network error. Please check your connection and try again.";
    }
    
    if (error?.message?.includes('timeout')) {
      return "Request timed out. Please try again.";
    }
    
    // Auth errors
    if (error?.message?.includes('JWT')) {
      return "Session expired. Please sign in again.";
    }
    
    // Generic fallback
    if (error?.message) {
      return error.message;
    }
    
    return "An unexpected error occurred. Please try again.";
  }

  // Method to check if error should trigger logout
  shouldLogout(error: any): boolean {
    return error?.message?.includes('JWT') || 
           error?.message?.includes('Invalid token') ||
           error?.code === 'auth/invalid-token';
  }

  // Method to check if error is temporary (should retry)
  isTemporaryError(error: any): boolean {
    return error?.message?.includes('network') ||
           error?.message?.includes('timeout') ||
           error?.code === 'ECONNRESET';
  }
}

// Error boundary hook
export const useErrorHandler = () => {
  const { toast } = useToast();
  const errorHandler = ErrorHandler.getInstance();
  
  const handleError = (error: any, context?: string) => {
    console.error(`Error${context ? ` in ${context}` : ''}:`, error);
    
    const userMessage = errorHandler.getUserFriendlyMessage(error);
    
    toast({
      title: "Something went wrong",
      description: userMessage,
      variant: "destructive"
    });
  };
  
  return {
    handleError,
    withErrorHandling: <T extends any[], R>(
      fn: (...args: T) => Promise<R>,
      context?: string
    ) => {
      return async (...args: T): Promise<R | undefined> => {
        try {
          return await fn(...args);
        } catch (error) {
          handleError(error, context);
          return undefined;
        }
      };
    },
    withAsyncErrorHandling: <T extends any[], R>(
      fn: (...args: T) => Promise<R>,
      context?: string,
      onError?: (error: any) => void
    ) => {
      return async (...args: T): Promise<R | null> => {
        try {
          return await fn(...args);
        } catch (error) {
          handleError(error, context);
          onError?.(error);
          return null;
        }
      };
    }
  };
};

// Retry utility with exponential backoff
export const withRetry = async <T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> => {
  let lastError: any;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      
      // Don't retry on certain errors
      if (error instanceof ValidationError || 
          error instanceof BusinessLogicError ||
          !ErrorHandler.getInstance().isTemporaryError(error)) {
        throw error;
      }
      
      // If this was the last attempt, throw the error
      if (attempt === maxRetries) {
        throw error;
      }
      
      // Wait before retrying with exponential backoff
      const delay = baseDelay * Math.pow(2, attempt);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError;
};

// Global error handler setup for unhandled promises
export const setupGlobalErrorHandling = () => {
  if (typeof window !== 'undefined') {
    window.addEventListener('unhandledrejection', (event) => {
      console.error('Unhandled promise rejection:', event.reason);
      ErrorHandler.getInstance().handleError(event.reason, 'Unhandled Promise');
      event.preventDefault();
    });

    window.addEventListener('error', (event) => {
      console.error('Global error:', event.error);
      ErrorHandler.getInstance().handleError(event.error, 'Global Error');
    });
  }
};

export const errorHandler = ErrorHandler.getInstance();