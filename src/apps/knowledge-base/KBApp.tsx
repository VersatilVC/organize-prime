import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { KBLayout } from './components/KBLayout';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { KBAuthorizeRoute } from './components/shared/KBAuthorizeRoute';
import { useFeatureRoutes } from '@/hooks/useFeatureRoutes';
import { getComponent } from '@/apps/shared/utils/componentRegistry';
import { useFeatureSync } from '@/hooks/useFeatureSync';

// Dynamic route component that renders based on database configuration
function DynamicRoute({ route }: { route: any }) {
  console.log('🔍 DynamicRoute: Rendering route:', route);
  const Component = getComponent(route.component);
  const isAdminRoute = route.permissions?.includes('admin');
  
  console.log('🔍 DynamicRoute: Got component:', Component.name || 'Anonymous');
  console.log('🔍 DynamicRoute: Is admin route:', isAdminRoute);
  console.log('🔍 DynamicRoute: Route permissions:', route.permissions);
  
  const element = React.createElement(Component);
  
  const wrapped = (
    <KBAuthorizeRoute permissions={route.permissions || []} component={route.component}>
      {element}
    </KBAuthorizeRoute>
  );

  return isAdminRoute ? (
    <ProtectedRoute requiredRole="admin">{wrapped}</ProtectedRoute>
  ) : (
    wrapped
  );
}

export default function KBApp() {
  const { routes, isLoading } = useFeatureRoutes('knowledge-base');
  
  console.log('🔍 KBApp: Routes loaded:', routes);
  console.log('🔍 KBApp: Is loading:', isLoading);
  
  // Auto-sync feature pages if they don't exist
  useFeatureSync();
  
  // Find default route for redirect - normalize route paths
  const defaultRoute = React.useMemo(() => {
    const defaultPageRoute = routes.find(r => r.isDefault);
    console.log('🔍 KBApp: Default page route:', defaultPageRoute);
    if (defaultPageRoute) {
      // Handle both /apps/ and /features/ prefixes and normalize
      let normalizedRoute = defaultPageRoute.path;
      if (normalizedRoute.startsWith('/apps/knowledge-base/')) {
        normalizedRoute = normalizedRoute.replace('/apps/knowledge-base/', '');
      } else if (normalizedRoute.startsWith('/features/knowledge-base/')) {
        normalizedRoute = normalizedRoute.replace('/features/knowledge-base/', '');
      } else if (normalizedRoute.startsWith('/knowledge-base/')) {
        normalizedRoute = normalizedRoute.replace('/knowledge-base/', '');
      }
      console.log('🔍 KBApp: Normalized default route:', normalizedRoute);
      return normalizedRoute;
    }
    const fallbackRoute = routes.length > 0 ? 
      routes[0].path.replace(/^\/(apps|features)\/knowledge-base\//, '') : 'dashboard';
    console.log('🔍 KBApp: Using fallback route:', fallbackRoute);
    return fallbackRoute;
  }, [routes]);

  if (isLoading) {
    return (
      <AppLayout>
        <KBLayout>
          <div className="flex items-center justify-center h-64">
            <div className="text-muted-foreground">Loading...</div>
          </div>
        </KBLayout>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <KBLayout>
        <ErrorBoundary>
          <Routes>
            <Route path="" element={<Navigate to={defaultRoute} replace />} />
            {routes.map((route) => {
              // Handle both /apps/ and /features/ prefixes and normalize to local route path
              let routePath = route.path;
              if (routePath.startsWith('/apps/knowledge-base/')) {
                routePath = routePath.replace('/apps/knowledge-base/', '');
              } else if (routePath.startsWith('/features/knowledge-base/')) {
                routePath = routePath.replace('/features/knowledge-base/', '');
              } else if (routePath.startsWith('/knowledge-base/')) {
                routePath = routePath.replace('/knowledge-base/', '');
              }
              console.log('🔍 KBApp: Creating route:', { originalPath: route.path, routePath, title: route.title });
              return (
                <Route
                  key={route.path}
                  path={routePath}
                  element={<DynamicRoute route={route} />}
                />
              );
            })}
          </Routes>
        </ErrorBoundary>
      </KBLayout>
    </AppLayout>
  );
}

