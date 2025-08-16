import React, { Suspense, memo } from 'react';
import { Routes, Route, useParams, useNavigate } from 'react-router-dom';
import { usePerformanceMonitor } from '@/hooks/usePerformanceMonitor';
import { useStableLoading } from '@/hooks/useLoadingState';
import { FeatureProvider } from '@/contexts/FeatureContext';
import { FeatureLayout } from './FeatureLayout';
import { AppLayout } from './layout/AppLayout';
import { usePermissions } from '@/contexts/PermissionContext';
import NotFound from '@/pages/NotFound';
import { EmptyState } from '@/components/composition/EmptyState';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Loader2, AlertTriangle, Lock, Settings } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { logger } from '@/lib/secure-logger';

// Lazy load feature pages
const FeatureDashboard = React.lazy(() => import('@/pages/features/FeatureDashboard'));
const FeatureSettings = React.lazy(() => import('@/pages/features/FeatureSettings'));
const FeatureContent = React.lazy(() => import('@/pages/features/FeatureContent'));

// Lazy load Knowledge Base app for feature routing
const KBApp = React.lazy(() => import('@/apps/knowledge-base/KBApp'));
// Lazy load Knowledge Base pages
const KnowledgeBaseDashboard = React.lazy(() => import('@/features/knowledge-base/pages/KnowledgeBaseDashboard'));
const KnowledgeBaseDocuments = React.lazy(() => import('@/features/knowledge-base/pages/KnowledgeBaseDocuments'));
const KnowledgeBaseSearch = React.lazy(() => import('@/features/knowledge-base/pages/KnowledgeBaseSearch'));
const KnowledgeBaseSettings = React.lazy(() => import('@/features/knowledge-base/pages/KnowledgeBaseSettings'));

interface FeatureRouteParams extends Record<string, string> {
  slug: string;
}

const FeatureAccessCheck = memo(function FeatureAccessCheck({ children, slug }: { children: React.ReactNode; slug: string }) {
  const { hasFeatureAccess, isLoading } = usePermissions();
  const navigate = useNavigate();
  
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
          <p className="text-muted-foreground">Loading feature...</p>
        </div>
      </div>
    );
  }

  // Use cached permission result - no database queries here
  const hasAccess = hasFeatureAccess(slug);

  if (!hasAccess) {
    return (
      <EmptyState
        icon={Lock}
        title="Feature Not Available"
        description={`The ${slug.replace('-', ' ')} feature is not enabled for your organization.`}
        action={{
          label: "Browse Features",
          onClick: () => navigate("/features")
        }}
      />
    );
  }

  // Feature access granted - render immediately
  return <>{children}</>;
});

const FeatureRoutes = memo(function FeatureRoutes() {
  const { slug } = useParams<FeatureRouteParams>();
  
  // Monitor performance of feature routes
  usePerformanceMonitor('FeatureRoutes');
  
  // logger.debug('FeatureRoutes mounted', { component: 'FeatureRoutes', feature: slug });
  
  // Special handling for Knowledge Base app
  if (slug === 'knowledge-base') {
    // logger.debug('Rendering Knowledge Base app', { component: 'FeatureRoutes' });
    // Remove redundant Suspense - KBApp handles its own loading states
    return <KBApp />;
  }

  return (
    <AppLayout>
      <FeatureProvider slug={slug}>
        <FeatureLayout>
          <Suspense fallback={
            <div className="space-y-4">
              <Skeleton className="h-8 w-48" />
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