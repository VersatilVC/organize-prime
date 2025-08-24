import React from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { KBLayout } from './components/KBLayout';
import { KBPlaceholderPage } from './components/KBPlaceholderPage';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { KBAuthorizeRoute } from './components/shared/KBAuthorizeRoute';
import { useFeatureRoutes } from '@/hooks/useFeatureRoutes';
import { getComponent } from '@/apps/shared/utils/componentRegistry';
import { useFeatureSync } from '@/hooks/useFeatureSync';
import { logger } from '@/lib/secure-logger';

// Dynamic route component that renders based on database configuration
interface RouteConfig {
  component: string;
  permissions?: string[];
  path?: string;
  title?: string;
}

function DynamicRoute({ route }: { route: RouteConfig }) {
  console.log('🔍 DynamicRoute: Looking for component:', route.component);
  console.log('🔍 DynamicRoute: Route config:', route);
  const Component = getComponent(route.component);
  console.log('🔍 DynamicRoute: Got component:', Component);
  const isAdminRoute = route.permissions?.includes('admin') || route.permissions?.includes('super_admin');
  
  const element = React.createElement(Component);
  
  // Map route permissions to KB permissions
  const kbPermissions: Array<'can_upload' | 'can_chat' | 'can_create_kb' | 'can_manage_files' | 'can_view_analytics'> = [];
  
  if (route.permissions?.includes('admin') || route.permissions?.includes('super_admin')) {
    kbPermissions.push('can_manage_files', 'can_view_analytics', 'can_create_kb');
  }
  if (route.permissions?.includes('write')) {
    kbPermissions.push('can_upload');
  }
  // All users can chat if they have read access
  if (route.permissions?.includes('read')) {
    kbPermissions.push('can_chat');
  }
  
  const wrapped = (
    <KBAuthorizeRoute permissions={kbPermissions} component={route.component}>
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
  const location = useLocation();
  
  // Reduced logging to prevent flashing
  // logger.debug('KB App mounted', { 
  //   component: 'KBApp',
  //   action: 'mount'
  // });
  
  // Auto-sync feature pages if they don't exist
  useFeatureSync();
  
  // Find default route for redirect - normalize route paths
  const defaultRoute = React.useMemo(() => {
    const defaultPageRoute = routes.find(r => r.isDefault);
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
      return normalizedRoute;
    }
    const fallbackRoute = routes.length > 0 ? 
      routes[0].path.replace(/^\/(apps|features)\/knowledge-base\//, '') : 'dashboard';
    return fallbackRoute;
  }, [routes]);

  if (isLoading) {
    return (
      <AppLayout>
        <KBLayout>
          <div className="space-y-4">
            <div className="h-8 w-64 animate-pulse rounded-md bg-muted" />
            <div className="h-4 w-96 animate-pulse rounded-md bg-muted" />
            <div className="h-64 w-full animate-pulse rounded-lg bg-muted" />
          </div>
        </KBLayout>
      </AppLayout>
    );
  }

  // Check if current route is a chat route
  const isChatRoute = location.pathname.includes('/ai-chat') || 
                      location.pathname.includes('/chat') ||
                      location.pathname.includes('ai-chat') ||
                      location.pathname.includes('chat-settings');
  
  // Debug logging in development
  if (import.meta.env.DEV) {
    console.log('🔍 Route Debug:', {
      pathname: location.pathname,
      isChatRoute,
      routes: routes.map(r => ({ path: r.path, component: r.component }))
    });
  }

  // For chat routes, render without AppLayout wrapper
  if (isChatRoute) {
    return (
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
            return (
              <Route
                key={route.path}
                path={routePath}
                element={<DynamicRoute route={route} />}
              />
            );
          })}
          <Route path="*" element={
            <KBPlaceholderPage 
              component="Custom" 
              title="Page under construction" 
              description="This page is not available yet."
            />
          } />
        </Routes>
      </ErrorBoundary>
    );
  }

  // For non-chat routes, use the standard AppLayout wrapper
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
              return (
                <Route
                  key={route.path}
                  path={routePath}
                  element={<DynamicRoute route={route} />}
                />
              );
            })}
            <Route path="*" element={
              <KBPlaceholderPage 
                component="Custom" 
                title="Page under construction" 
                description="This page is not available yet."
              />
            } />
          </Routes>
        </ErrorBoundary>
      </KBLayout>
    </AppLayout>
  );
}

