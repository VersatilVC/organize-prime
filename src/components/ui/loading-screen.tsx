import React from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';

interface LoadingScreenProps {
  message?: string;
  progress?: number;
  showProgress?: boolean;
  minimal?: boolean;
}

export function LoadingScreen({ 
  message = 'Loading...', 
  progress, 
  showProgress = false,
  minimal = false 
}: LoadingScreenProps) {
  if (minimal) {
    return (
      <div className="flex items-center justify-center p-4">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
        <span className="ml-2 text-sm text-muted-foreground">{message}</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="w-full max-w-md space-y-4 p-6">
        <div className="text-center space-y-2">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent mx-auto"></div>
          <h2 className="text-lg font-semibold">{message}</h2>
        </div>
        
        {showProgress && typeof progress === 'number' && (
          <div className="space-y-2">
            <Progress value={progress} className="w-full" />
            <p className="text-sm text-muted-foreground text-center">
              {Math.round(progress)}% complete
            </p>
          </div>
        )}
        
        <div className="space-y-3">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
        </div>
      </div>
    </div>
  );
}

// Layout-aware loading component
export function LayoutLoadingScreen({ message = 'Loading content...' }: { message?: string }) {
  return (
    <div className="flex-1 p-6">
      <div className="space-y-4 w-full max-w-4xl">
        <div className="flex items-center space-x-2 mb-6">
          <div className="animate-spin rounded-full h-5 w-5 border-2 border-primary border-t-transparent"></div>
          <span className="text-sm text-muted-foreground">{message}</span>
        </div>
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-96" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
      </div>
    </div>
  );
}