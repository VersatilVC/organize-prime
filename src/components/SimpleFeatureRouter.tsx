import React, { Suspense } from 'react';
import { Routes, Route, useParams, Navigate } from 'react-router-dom';
import { useFeatureConfig } from '@/hooks/useFeatureConfig';
import { usePermissions } from '@/contexts/PermissionContext';
import { useOrganization } from '@/contexts/OrganizationContext';
import { SimpleFeatureProvider, FeatureContextIsolation } from '@/contexts/SimpleFeatureContext';
import { SimpleFeatureNavigation } from '@/components/SimpleFeatureNavigation';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Loader2, AlertTriangle, Lock, Home } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { createLazyRoute } from '@/lib/lazy-import';
import { useStableLoading } from '@/hooks/useLoadingState';

// Feature components mapping
const featureComponents: Record<string, () => Promise<{ default: React.ComponentType }>> = {
  // Knowledge Base app - special case
  'knowledge-base': () => import('@/apps/knowledge-base/KBApp'),
  
  // Generic feature pages
  'dashboard': () => import('@/pages/features/FeatureDashboard'),
  'settings': () => import('@/pages/features/FeatureSettings'),
  'content': () => import('@/pages/features/FeatureContent'),
};

// Create lazy components
const LazyKBApp = createLazyRoute(() => import('@/apps/knowledge-base/KBApp'));
const LazyFeatureDashboard = createLazyRoute(() => import('@/pages/features/FeatureDashboard'));
const LazyFeatureSettings = createLazyRoute(() => import('@/pages/features/FeatureSettings'));
const LazyFeatureContent = createLazyRoute(() => import('@/pages/features/FeatureContent'));

// Knowledge Base specific components
const LazyManageKnowledgeBases = createLazyRoute(() => import('@/features/knowledge-base/pages/ManageKnowledgeBases'));
const LazyManageFiles = createLazyRoute(() => import('@/features/knowledge-base/pages/ManageFiles'));
const LazyChatPage = createLazyRoute(() => import('@/apps/knowledge-base/components/KBChat'));
// Temporarily make this non-lazy for debugging
const LazyAIChatSettings = React.lazy(() => import('@/apps/knowledge-base/pages/KnowledgeBaseAIChatSettings'));
// ChatSettingsPage removed - now using simple chat interface

interface FeatureRouteParams {
  slug: string;
}

// Component mapping for easier access
const componentMap: Record<string, React.ComponentType> = {
  'KBApp': LazyKBApp,
  'FeatureDashboard': LazyFeatureDashboard,
  'FeatureSettings': LazyFeatureSettings,
  'FeatureContent': LazyFeatureContent,
  // Knowledge Base specific components
  'ManageKnowledgeBases': LazyManageKnowledgeBases,
  'ManageFiles': LazyManageFiles,
  'Chat': LazyChatPage,
  'AIChatSettings': LazyAIChatSettings,
  // ChatSettings removed - now using simple chat interface
};

// Test component imports on load (development only)
if (import.meta.env.DEV) {
  console.log('🔍 Testing KB component imports...');
  
  // Test each lazy import
  const testImports = async () => {
    try {
      const manageKB = await import('@/features/knowledge-base/pages/ManageKnowledgeBases');
      console.log('✅ ManageKnowledgeBases import successful:', !!manageKB.default);
    } catch (error) {
      console.error('❌ ManageKnowledgeBases import failed:', error);
    }
    
    try {
      const manageFiles = await import('@/features/knowledge-base/pages/ManageFiles');
      console.log('✅ ManageFiles import successful:', !!manageFiles.default);
    } catch (error) {
      console.error('❌ ManageFiles import failed:', error);
    }
    
    try {
      const chat = await import('@/apps/knowledge-base/components/KBChat');
      console.log('✅ KBChat import successful:', !!chat.default);
    } catch (error) {
      console.error('❌ KBChat import failed:', error);
    }
  };
  
  testImports();
}

// Loading fallback for features
const FeatureLoadingState = () => (
  <div className="flex items-center justify-center min-h-[400px]">
    <div className="text-center space-y-4">
      <Loader2 className="h-8 w-8 animate-spin mx-auto" />
      <p className="text-muted-foreground">Loading feature...</p>
    </div>
  </div>
);

// Error fallback for features
const FeatureErrorState = ({ error, onRetry }: { error: string; onRetry: () => void }) => (
  <div className="flex items-center justify-center min-h-[400px] p-4">
    <Alert variant="destructive" className="max-w-md">
      <AlertTriangle className="h-4 w-4" />
      <AlertDescription className="space-y-4">
        <div>
          <h3 className="font-semibold mb-2">Feature Loading Error</h3>
          <p className="text-sm">{error}</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={onRetry} size="sm">
            Try Again
          </Button>
          <Button variant="outline" onClick={() => window.location.href = '/dashboard'} size="sm">
            <Home className="h-4 w-4 mr-2" />
            Go Home
          </Button>
        </div>
      </AlertDescription>
    </Alert>
  </div>
);

// Feature not found fallback
const FeatureNotFound = ({ slug }: { slug: string }) => (
  <div className="flex items-center justify-center min-h-[400px] p-4">
    <Alert className="max-w-md">
      <AlertTriangle className="h-4 w-4" />
      <AlertDescription className="space-y-4">
        <div>
          <h3 className="font-semibold mb-2">Feature Not Found</h3>
          <p className="text-sm text-muted-foreground">
            The feature "{slug}" is not available or has been disabled.
          </p>
        </div>
        <Button onClick={() => window.location.href = '/dashboard'} className="w-full">
          <Home className="h-4 w-4 mr-2" />
          Go to Dashboard
        </Button>
      </AlertDescription>
    </Alert>
  </div>
);

// Access denied fallback
const FeatureAccessDenied = ({ slug }: { slug: string }) => (
  <div className="flex items-center justify-center min-h-[400px] p-4">
    <Alert className="max-w-md">
      <Lock className="h-4 w-4" />
      <AlertDescription className="space-y-4">
        <div>
          <h3 className="font-semibold mb-2">Access Denied</h3>
          <p className="text-sm text-muted-foreground">
            You don't have permission to access the {slug.replace('-', ' ')} feature.
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => window.location.href = '/dashboard'} size="sm">
            <Home className="h-4 w-4 mr-2" />
            Go Home
          </Button>
          <Button variant="outline" onClick={() => window.location.href = '/organizations'} size="sm">
            Manage Access
          </Button>
        </div>
      </AlertDescription>
    </Alert>
  </div>
);

// ✅ Dynamic route generator from database config - Memoized for performance
const DynamicFeatureRoutes = React.memo(({ slug, featureConfig }: { slug: string; featureConfig: any }) => {
  // ✅ Reduced logging - only in development and only essential info
  if (import.meta.env.DEV) {
    console.log(`🔍 DynamicFeatureRoutes for ${slug}:`, {
      hasConfig: !!featureConfig,
      pagesCount: featureConfig?.feature_pages?.length || 0,
      currentURL: window.location.pathname
    });
  }
  
  // If no pages defined, use default routes
  if (!featureConfig.feature_pages || featureConfig.feature_pages.length === 0) {
    return (
      <Routes>
        <Route path="" element={<LazyFeatureDashboard />} />
        <Route path="dashboard" element={<LazyFeatureDashboard />} />
        <Route path="settings" element={<LazyFeatureSettings />} />
        <Route path="*" element={<LazyFeatureContent />} />
      </Routes>
    );
  }

  // Generate routes from database configuration
  return (
    <Routes>
      {featureConfig.feature_pages.map((page: any, index: number) => {
        // 🔧 FIX: Use page.route instead of page.path (database stores in 'route' field)
        let relativePath = page.route || page.path || '';
        
        // 🔧 GUARD: Ensure string and not empty
        if (!relativePath || typeof relativePath !== 'string') {
          console.warn('⚠️ Invalid route for page:', page);
          return null;
        }
        
        // Extract relative path - remove the /features/{slug}/ prefix since we're already mounted there
        if (relativePath.startsWith('/features/')) {
          // Extract just the last part after /features/{slug}/
          const pathParts = relativePath.split('/');
          relativePath = pathParts.slice(3).join('/'); // Skip '', 'features', '{slug}'
        }
        
        const Component = componentMap[page.component] || LazyFeatureContent;
        
        // ✅ Debug component mapping
        if (import.meta.env.DEV) {
          console.log('🔍 Component mapping debug:', {
            component: page.component,
            relativePath,
            hasMapping: !!componentMap[page.component],
            availableComponents: Object.keys(componentMap),
            willFallback: !componentMap[page.component]
          });
        }
        
        return (
          <Route
            key={`${page.route || page.path || page.id}-${index}`}
            path={relativePath}
            element={
              <ErrorBoundary fallback={<div className="p-4 text-red-600">Failed to load {page.component} component</div>}>
                <Suspense fallback={<FeatureLoadingState />}>
                  <Component />
                </Suspense>
              </ErrorBoundary>
            }
          />
        );
      }).filter(Boolean)}
      {/* Default dashboard route */}
      <Route path="" element={<Navigate to="/dashboard" replace />} />
      {/* Fallback route */}
      <Route path="*" element={<LazyFeatureContent />} />
    </Routes>
  );
});

// ✅ Add display name for better debugging
DynamicFeatureRoutes.displayName = 'DynamicFeatureRoutes';

// ✅ Main feature content component - Memoized for performance
const FeatureContent = React.memo(({ slug }: { slug: string }) => {
  const {
    data: featureConfig,
    isLoading: configLoading,
    error: configError,
    refetch,
  } = useFeatureConfig(slug);

  const { hasFeatureAccess, isLoading: permissionLoading } = usePermissions();
  const { loading: orgLoading } = useOrganization();

  // Use stable loading to prevent permission checking flash - minimum 400ms
  // Include organization loading to ensure permissions are properly loaded
  const isCurrentlyLoading = configLoading || permissionLoading || orgLoading;
  const stableLoading = useStableLoading(isCurrentlyLoading, 400);

  // Show stable loading state to prevent any access denied flash
  if (stableLoading) {
    return <FeatureLoadingState />;
  }

  // Feature not found in database
  if (!featureConfig) {
    return <FeatureNotFound slug={slug} />;
  }

  // Check permission ONLY after both config and permissions are loaded
  // BYPASS MECHANISM DISABLED PER USER REQUEST
  if (!hasFeatureAccess(slug)) {
    return <FeatureAccessDenied slug={slug} />;
  }

  // Handle config loading error
  if (configError) {
    return (
      <FeatureErrorState
        error={configError.message}
        onRetry={() => refetch()}
      />
    );
  }

  // Check if feature needs fullscreen layout - only explicit database config
  const isFullscreen = featureConfig.feature_pages?.some((page: any) => 
    page.layout === 'fullscreen'
  );

  const featureContent = (
    <FeatureContextIsolation>
      <SimpleFeatureProvider slug={slug}>
        <ErrorBoundary>
          <Suspense fallback={<FeatureLoadingState />}>
            <DynamicFeatureRoutes slug={slug} featureConfig={featureConfig} />
          </Suspense>
        </ErrorBoundary>
      </SimpleFeatureProvider>
    </FeatureContextIsolation>
  );

  // Render fullscreen features without AppLayout wrapper
  if (isFullscreen) {
    return featureContent;
  }

  // Regular features with AppLayout and navigation
  return (
    <AppLayout>
      <div className="p-6">
        <FeatureContextIsolation>
          <SimpleFeatureProvider slug={slug}>
            {/* Feature navigation */}
            <SimpleFeatureNavigation />

            {/* Feature content */}
            <ErrorBoundary>
              <Suspense fallback={<FeatureLoadingState />}>
                <DynamicFeatureRoutes slug={slug} featureConfig={featureConfig} />
              </Suspense>
            </ErrorBoundary>
          </SimpleFeatureProvider>
        </FeatureContextIsolation>
      </div>
    </AppLayout>
  );
});

// ✅ Add display name for better debugging
FeatureContent.displayName = 'FeatureContent';

// Simplified main FeatureRouter component
export function SimpleFeatureRouter() {
  const { slug } = useParams<FeatureRouteParams>();

  // Invalid slug
  if (!slug) {
    return <Navigate to="/dashboard" replace />;
  }

  return <FeatureContent slug={slug} />;
}