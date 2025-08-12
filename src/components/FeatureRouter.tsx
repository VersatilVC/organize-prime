import React, { Suspense } from 'react';
import { Routes, Route, useParams } from 'react-router-dom';
import { FeatureProvider, useFeatureContext } from '@/contexts/FeatureContext';
import { FeatureLayout } from './FeatureLayout';
import { AppLayout } from './layout/AppLayout';
import { useOrganizationFeatures } from '@/hooks/database/useOrganizationFeatures';
import NotFound from '@/pages/NotFound';
import { EmptyState } from '@/components/composition/EmptyState';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Loader2, AlertTriangle, Lock, Settings } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

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

function FeatureAccessCheck({ children, slug }: { children: React.ReactNode; slug: string }) {
  const { data: organizationFeatures = [], isLoading, error } = useOrganizationFeatures();

  console.log('🔐 FeatureAccessCheck: Checking access for slug:', slug, {
    organizationFeatures: organizationFeatures.map(f => ({ slug: f.feature_slug, enabled: f.is_enabled })),
    isLoading
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading feature...</p>
        </div>
      </div>
    );
  }

  if (error) {
    console.error('❌ FeatureAccessCheck: Error loading features:', error);
    return (
      <EmptyState
        icon={AlertTriangle}
        title="Error Loading Feature"
        description="We encountered an error while loading this feature. Please try again."
        action={{
          label: "Retry",
          onClick: () => window.location.reload()
        }}
      />
    );
  }

  const feature = organizationFeatures.find(f => f.feature_slug === slug);

  if (!feature) {
    console.log('🚫 FeatureAccessCheck: Feature not found or not enabled:', slug);
    return (
      <EmptyState
        icon={Lock}
        title="Feature Not Available"
        description={`The ${slug.replace('-', ' ')} feature is not enabled for your organization.`}
        action={{
          label: "Browse Features",
          onClick: () => window.location.href = "/features"
        }}
      />
    );
  }

  // For now, assume all enabled features are properly set up
  console.log('✅ FeatureAccessCheck: Feature access granted for:', slug);

  return <>{children}</>;
}

function FeatureRoutes() {
  const { slug } = useParams<FeatureRouteParams>();
  
  // Special handling for Knowledge Base app
  if (slug === 'knowledge-base') {
    return (
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
        <KBApp />
      </Suspense>
    );
  }

  return (
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
  );
}

export function FeatureRouter() {
  const { slug } = useParams<FeatureRouteParams>();

  console.log('🔍 FeatureRouter: Component mounted, URL params:', { slug, allParams: useParams(), pathname: window.location.pathname });

  if (!slug) {
    console.log('❌ FeatureRouter: No slug in URL params, showing NotFound');
    return <NotFound />;
  }

  console.log('✅ FeatureRouter: Rendering with slug:', slug);

  return (
    <AppLayout>
      <FeatureAccessCheck slug={slug}>
        <FeatureRoutes />
      </FeatureAccessCheck>
    </AppLayout>
  );
}