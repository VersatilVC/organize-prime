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
  const Component = getComponent(route.component);
  const isAdminRoute = route.permissions?.includes('admin');
  
  const element = React.createElement(Component);
  
  const wrapped = (
    <KBAuthorizeRoute permissions={route.permissions || []}>
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
  
  // Auto-sync feature pages if they don't exist
  useFeatureSync();
  
  // Find default route for redirect
  const defaultRoute = routes.find(r => r.isDefault)?.path.replace('/apps/knowledge-base/', '') || 'dashboard';

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
            {routes.map((route) => (
              <Route
                key={route.path}
                path={route.path.replace('/apps/knowledge-base/', '')}
                element={<DynamicRoute route={route} />}
              />
            ))}
          </Routes>
        </ErrorBoundary>
      </KBLayout>
    </AppLayout>
  );
}

