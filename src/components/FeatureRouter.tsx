import React, { Suspense, memo, useEffect } from 'react';
import { Routes, Route, useParams, useNavigate, useLocation } from 'react-router-dom';
import { usePerformanceMonitor } from '@/hooks/usePerformanceMonitor';
import { useStableLoading } from '@/hooks/useLoadingState';
import { FeatureProvider } from '@/contexts/FeatureContext';
import { FeatureLayout } from './FeatureLayout';
import { AppLayout } from './layout/AppLayout';
import { usePermissions } from '@/contexts/PermissionContext';
import NotFound from '@/pages/NotFound';
import { EmptyState } from '@/components/composition/EmptyState';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Loader2, AlertTriangle, Lock, Settings, RefreshCw, Home } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { logger } from '@/lib/secure-logger';
import { createLazyRoute } from '@/lib/lazy-import';
import { ErrorBoundary } from '@/components/ErrorBoundary';

// Enhanced lazy load feature pages with retry mechanism
const FeatureDashboard = createLazyRoute(() => import('@/pages/features/FeatureDashboard'));
const FeatureSettings = createLazyRoute(() => import('@/pages/features/FeatureSettings'));
const FeatureContent = createLazyRoute(() => import('@/pages/features/FeatureContent'));

// Enhanced lazy load Knowledge Base app for feature routing
const KBApp = createLazyRoute(() => import('@/apps/knowledge-base/KBApp'));

interface FeatureRouteParams extends Record<string, string> {
  slug: string;
}

const FeatureAccessCheck = memo(function FeatureAccessCheck({ children, slug }: { children: React.ReactNode; slug: string }) {
  const { hasFeatureAccess, isLoading, error, isOffline, availableFeatures } = usePermissions();
  const navigate = useNavigate();
  const location = useLocation();
  
  // Use stable loading to prevent flashing
  const stableLoading = useStableLoading(isLoading, 200);
  
  // Monitor performance of feature access check
  usePerformanceMonitor('FeatureAccessCheck');

  // Show stable loading state - prevents flashing on quick loads
  if (stableLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading feature permissions...</p>
        </div>
      </div>
    );
  }

  // Handle permission errors with helpful fallbacks
  if (error && !isOffline) {
    return (
      <div className="flex items-center justify-center min-h-[400px] p-4">
        <Alert variant="destructive" className="max-w-md">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription className="space-y-4">
            <div>
              <h3 className="font-semibold mb-2">Permission Check Failed</h3>
              <p className="text-sm">Unable to verify feature access. Please try again.</p>
            </div>
            <div className="flex gap-2">
              <Button onClick={() => window.location.reload()} size="sm">
                <RefreshCw className="h-4 w-4 mr-2" />
                Retry
              </Button>
              <Button variant="outline" onClick={() => navigate('/dashboard')} size="sm">
                <Home className="h-4 w-4 mr-2" />
                Go Home
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  // Check feature access
  const hasAccess = hasFeatureAccess(slug);

  // Handle offline mode with limited access
  if (isOffline && !hasAccess) {
    return (
      <div className="flex items-center justify-center min-h-[400px] p-4">
        <Alert className="max-w-md">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription className="space-y-4">
            <div>
              <h3 className="font-semibold mb-2">Feature Unavailable Offline</h3>
              <p className="text-sm">
                The {slug.replace('-', ' ')} feature requires an internet connection. 
                Please check your connection and try again.
              </p>
            </div>
            <div className="flex gap-2">
              <Button onClick={() => window.location.reload()} size="sm">
                <RefreshCw className="h-4 w-4 mr-2" />
                Retry Connection
              </Button>
              <Button variant="outline" onClick={() => navigate('/dashboard')} size="sm">
                <Home className="h-4 w-4 mr-2" />
                Go Home
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  // No access to feature
  if (!hasAccess) {
    return (
      <div className="flex items-center justify-center min-h-[400px] p-4">
        <Alert className="max-w-md">
          <Lock className="h-4 w-4" />
          <AlertDescription className="space-y-4">
            <div>
              <h3 className="font-semibold mb-2">Feature Not Available</h3>
              <p className="text-sm text-muted-foreground">
                The {slug.replace('-', ' ')} feature is not enabled for your organization.
              </p>
              {availableFeatures.length > 0 && (
                <p className="text-sm text-muted-foreground mt-2">
                  Available features: {availableFeatures.slice(0, 3).join(', ')}
                  {availableFeatures.length > 3 && '...'}
                </p>
              )}
            </div>
            <div className="flex gap-2">
              <Button onClick={() => navigate('/dashboard')} size="sm">
                <Home className="h-4 w-4 mr-2" />
                Go to Dashboard
              </Button>
              <Button variant="outline" onClick={() => navigate('/organizations')} size="sm">
                <Settings className="h-4 w-4 mr-2" />
                Manage Features
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  // Feature access granted - render immediately
  return <>{children}</>;
});

const FeatureRoutes = memo(function FeatureRoutes() {
  const { slug } = useParams<FeatureRouteParams>();
  const navigate = useNavigate();
  const location = useLocation();
  
  // Monitor performance of feature routes
  usePerformanceMonitor('FeatureRoutes');
  
  // Handle invalid or missing slug
  if (!slug) {
    return (
      <div className="flex items-center justify-center min-h-[400px] p-4">
        <Alert variant="destructive" className="max-w-md">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription className="space-y-4">
            <div>
              <h3 className="font-semibold mb-2">Invalid Feature Route</h3>
              <p className="text-sm">No feature specified in the URL.</p>
            </div>
            <Button onClick={() => navigate('/dashboard')} className="w-full">
              <Home className="h-4 w-4 mr-2" />
              Go to Dashboard
            </Button>
          </AlertDescription>
        </Alert>
      </div>
    );
  }
  
  // Special handling for Knowledge Base app with error boundary
  if (slug === 'knowledge-base') {
    return (
      <ErrorBoundary
        fallback={({ error, resetError }) => (
          <div className="flex items-center justify-center min-h-[400px] p-4">
            <Alert variant="destructive" className="max-w-md">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription className="space-y-4">
                <div>
                  <h3 className="font-semibold mb-2">Knowledge Base Error</h3>
                  <p className="text-sm">Failed to load the Knowledge Base application.</p>
                </div>
                <div className="flex gap-2">
                  <Button onClick={resetError} size="sm">
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Try Again
                  </Button>
                  <Button variant="outline" onClick={() => navigate('/dashboard')} size="sm">
                    <Home className="h-4 w-4 mr-2" />
                    Go Home
                  </Button>
                </div>
              </AlertDescription>
            </Alert>
          </div>
        )}
      >
        <KBApp />
      </ErrorBoundary>
    );
  }

  return (
    <AppLayout>
      <ErrorBoundary
        fallback={({ error, resetError }) => (
          <div className="flex items-center justify-center min-h-[400px] p-4">
            <Alert variant="destructive" className="max-w-md">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription className="space-y-4">
                <div>
                  <h3 className="font-semibold mb-2">Feature Loading Error</h3>
                  <p className="text-sm">
                    Failed to load the {slug.replace('-', ' ')} feature.
                  </p>
                  {import.meta.env.DEV && (
                    <details className="text-xs bg-muted p-2 rounded mt-2">
                      <summary>Error Details</summary>
                      <pre className="mt-1 whitespace-pre-wrap break-words">
                        {error.message}
                      </pre>
                    </details>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button onClick={resetError} size="sm">
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Retry
                  </Button>
                  <Button variant="outline" onClick={() => navigate('/dashboard')} size="sm">
                    <Home className="h-4 w-4 mr-2" />
                    Go Home
                  </Button>
                </div>
              </AlertDescription>
            </Alert>
          </div>
        )}
      >
        <FeatureProvider slug={slug}>
          <FeatureLayout>
            <Suspense fallback={
              <div className="space-y-4 p-4">
                <div className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <Skeleton className="h-6 w-48" />
                </div>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  <Skeleton className="h-32" />
                  <Skeleton className="h-32" />
                  <Skeleton className="h-32" />
                </div>
              </div>
            }>
              <Routes>
                <Route path="" element={<FeatureDashboard />} />
                <Route path="dashboard" element={<FeatureDashboard />} />
                <Route path="settings" element={<FeatureSettings />} />
                <Route path="*" element={<FeatureContent />} />
              </Routes>
            </Suspense>
          </FeatureLayout>
        </FeatureProvider>
      </ErrorBoundary>
    </AppLayout>
  );
});

export const FeatureRouter = memo(function FeatureRouter() {
  const { slug } = useParams<FeatureRouteParams>();
  
  // Monitor performance of feature router
  usePerformanceMonitor('FeatureRouter');

  // logger.debug('FeatureRouter mounted', { component: 'FeatureRouter', feature: slug });

  if (!slug) {
    // logger.debug('No feature slug provided');
    return <NotFound />;
  }

  // logger.debug('Rendering feature router', { component: 'FeatureRouter', feature: slug });

  return (
    <FeatureAccessCheck slug={slug}>
      <FeatureRoutes />
    </FeatureAccessCheck>
  );
});