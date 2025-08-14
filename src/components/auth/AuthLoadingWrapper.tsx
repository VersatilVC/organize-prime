import React, { Suspense } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { FastAppLayout } from '@/components/layout/FastAppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';

interface AuthLoadingWrapperProps {
  children: React.ReactNode;
  requireAuth?: boolean;
  showAppLayout?: boolean;
}

// Optimized wrapper that shows immediate loading state
export function AuthLoadingWrapper({ 
  children, 
  requireAuth = false, 
  showAppLayout = false 
}: AuthLoadingWrapperProps) {
  const { loading, user } = useAuth();

  // Show immediate loading state without blank screen
  if (loading) {
    if (showAppLayout) {
      return <FastAppLayout showSkeleton={true} />;
    }

    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="w-full max-w-md">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl text-center">Loading...</CardTitle>
          </CardHeader>
          <CardContent className="flex justify-center">
            <Loader2 className="h-8 w-8 animate-spin" />
          </CardContent>
        </Card>
      </div>
    );
  }

  // If auth is required but user isn't authenticated, redirect will be handled by ProtectedRoute
  if (requireAuth && !user) {
    return null;
  }

  return (
    <Suspense fallback={
      showAppLayout ? 
        <FastAppLayout showSkeleton={true} /> : 
        <div className="min-h-screen flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
    }>
      {children}
    </Suspense>
  );
}