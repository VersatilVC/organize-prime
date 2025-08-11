import React, { Suspense } from 'react';
import { Routes, Route, useParams } from 'react-router-dom';
import { FeatureProvider, useFeatureContext } from '@/contexts/FeatureContext';
import { FeatureLayout } from './FeatureLayout';
import { AppLayout } from './layout/AppLayout';
import { useOrganizationFeatures } from '@/hooks/database/useOrganizationFeatures';
import NotFound from '@/pages/NotFound';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { AlertTriangle, Lock, Package } from 'lucide-react';
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
  const { data: organizationFeatures = [], isLoading } = useOrganizationFeatures();

  console.log('🔐 FeatureAccessCheck: Checking access for slug:', slug, {
    organizationFeatures: organizationFeatures.map(f => ({ slug: f.system_feature.slug, enabled: f.is_enabled })),
    isLoading
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  const feature = organizationFeatures.find(f => f.system_feature.slug === slug);

  if (!feature) {
    console.log('🚫 FeatureAccessCheck: Feature not found or not enabled:', slug);
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Feature Not Available</h2>
          <p className="text-muted-foreground">The feature "{slug}" is not enabled for your organization.</p>
        </div>
      </div>
    );
  }

  if (feature.setup_status !== 'completed') {
    console.log('🚫 FeatureAccessCheck: Feature setup not completed:', slug, feature.setup_status);
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Feature Setup Required</h2>
          <p className="text-muted-foreground">
            The feature "{feature.system_feature.display_name}" is being set up for your organization.
          </p>
          {feature.setup_error && (
            <p className="text-destructive mt-2">Setup Error: {feature.setup_error}</p>
          )}
        </div>
      </div>
    );
  }

  console.log('✅ FeatureAccessCheck: Access granted for feature:', slug);
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