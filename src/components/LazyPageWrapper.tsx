// Wrapper for lazy-loaded pages with optimized loading states
import React, { Suspense } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { useChunkLoadingOptimization } from '@/hooks/useChunkLoadingOptimization';
import { ErrorBoundary } from '@/components/ErrorBoundary';

interface LazyPageWrapperProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  name: string;
}

export function LazyPageWrapper({ children, fallback, name }: LazyPageWrapperProps) {
  useChunkLoadingOptimization();
  
  const defaultFallback = (
    <div className="container mx-auto p-6 space-y-6">
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
      </div>
    </div>
  );

  const errorFallback = () => (
    <div className="container mx-auto p-6">
      <div className="text-center py-12">
        <h2 className="text-lg font-semibold text-foreground mb-2">
          Failed to load {name}
        </h2>
        <p className="text-muted-foreground mb-4">
          There was an error loading this page. Please try refreshing.
        </p>
        <button 
          onClick={() => window.location.reload()}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
        >
          Refresh Page
        </button>
      </div>
    </div>
  );

  return (
    <ErrorBoundary fallback={errorFallback}>
      <Suspense fallback={fallback || defaultFallback}>
        {children}
      </Suspense>
    </ErrorBoundary>
  );
}

// HOC for creating lazy page components
export function createLazyPage(
  importFn: () => Promise<{ default: React.ComponentType<any> }>,
  name: string,
  fallback?: React.ReactNode
) {
  const LazyComponent = React.lazy(importFn);
  
  return function LazyPage(props: any) {
    return (
      <LazyPageWrapper name={name} fallback={fallback}>
        <LazyComponent {...props} />
      </LazyPageWrapper>
    );
  };
}