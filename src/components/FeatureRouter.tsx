import React, { Suspense } from 'react';
import { Routes, Route, useParams } from 'react-router-dom';
import { FeatureProvider, useFeatureContext } from '@/contexts/FeatureContext';
import { FeatureLayout } from './FeatureLayout';
import { AppLayout } from './layout/AppLayout';
import { AppLayout as SharedAppLayout } from '@/apps/shared/components/AppLayout';
import { useAppInstallations } from '@/hooks/database/useMarketplaceApps';
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

// Lazy load app pages
const AppDashboard = React.lazy(() => import('@/pages/apps/AppDashboard'));
const AppSettings = React.lazy(() => import('@/pages/apps/AppSettings'));

interface FeatureRouteParams extends Record<string, string> {
  slug: string;
}

function FeatureAccessCheck({ children }: { children: React.ReactNode }) {
  const { feature, isLoading, hasAccess } = useFeatureContext();

  console.log('🔍 FeatureAccessCheck:', {
    feature: feature ? { slug: feature.slug, isInstalled: feature.isInstalled } : null,
    isLoading,
    hasAccess
  });

  if (isLoading) {
    console.log('⏳ FeatureAccessCheck: Still loading...');
    return (
      <div className="flex flex-col space-y-6 p-6">
        <div className="space-y-4">
          <Skeleton className="h-4 w-96" />
          <div className="flex items-center space-x-4">
            <Skeleton className="h-12 w-12 rounded-lg" />
            <div className="space-y-2">
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-4 w-64" />
            </div>
          </div>
          <Skeleton className="h-10 w-full" />
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
      </div>
    );
  }

  if (!feature) {
    console.log('❌ FeatureAccessCheck: No feature found, showing 404');
    return <NotFound />;
  }

  if (!feature.isInstalled) {
    return (
      <div className="flex items-center justify-center min-h-[400px] p-6">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 p-3 rounded-full bg-orange-100 w-fit">
              <Package className="h-6 w-6 text-orange-600" />
            </div>
            <CardTitle>Feature Not Installed</CardTitle>
            <CardDescription>
              The "{feature.displayName}" feature is not installed for your organization.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-sm text-muted-foreground">
              Install this feature from the marketplace to access its functionality.
            </p>
            <Button asChild>
              <Link to="/marketplace">
                Go to Marketplace
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!hasAccess) {
    return (
      <div className="flex items-center justify-center min-h-[400px] p-6">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 p-3 rounded-full bg-red-100 w-fit">
              <Lock className="h-6 w-6 text-red-600" />
            </div>
            <CardTitle>Access Denied</CardTitle>
            <CardDescription>
              You don't have permission to access the "{feature.displayName}" feature.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-sm text-muted-foreground">
              Contact your organization administrator to request access to this feature.
            </p>
            <Button variant="outline" asChild>
              <Link to="/">
                Return to Dashboard
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return <>{children}</>;
}

function FeatureRoutes() {
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

// Enhanced router that supports both features and marketplace apps
export function EnhancedFeatureRouter() {
  const params = useParams();
  const { slug } = params as { slug?: string };
  const { data: appInstallations = [] } = useAppInstallations();

  console.log('🔍 EnhancedFeatureRouter: Component mounted, URL params:', { slug, allParams: params, pathname: window.location.pathname });

  if (!slug) {
    console.log('❌ EnhancedFeatureRouter: No slug in URL params, showing NotFound');
    return <NotFound />;
  }

  // Check if this is a marketplace app
  const appInstallation = appInstallations.find(
    installation => installation.marketplace_apps.slug === slug
  );

  if (appInstallation) {
    console.log('✅ EnhancedFeatureRouter: Found marketplace app installation:', appInstallation.marketplace_apps.name);
    
    return (
      <SharedAppLayout
        appId={appInstallation.app_id}
        appName={appInstallation.marketplace_apps.name}
        permissions={[]}
      >
        <Suspense fallback={
          <div className="space-y-4">
            <div className="h-8 bg-muted rounded w-48"></div>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              <div className="h-32 bg-muted rounded"></div>
              <div className="h-32 bg-muted rounded"></div>
              <div className="h-32 bg-muted rounded"></div>
            </div>
          </div>
        }>
          <Routes>
            <Route path="" element={<AppDashboard />} />
            <Route path="dashboard" element={<AppDashboard />} />
            <Route path="settings" element={<AppSettings />} />
            <Route path="*" element={<AppDashboard />} />
          </Routes>
        </Suspense>
      </SharedAppLayout>
    );
  }

  console.log('✅ EnhancedFeatureRouter: Rendering traditional feature with slug:', slug);

  // Fall back to traditional feature routing
  return (
    <AppLayout>
      <FeatureProvider slug={slug}>
        <FeatureAccessCheck>
          <FeatureRoutes />
        </FeatureAccessCheck>
      </FeatureProvider>
    </AppLayout>
  );
}

// Keep original for backward compatibility
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
      <FeatureProvider slug={slug}>
        <FeatureAccessCheck>
          <FeatureRoutes />
        </FeatureAccessCheck>
      </FeatureProvider>
    </AppLayout>
  );
}