import React from 'react';
import { Routes, Route, Navigate, useParams } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { KBLayout } from './components/KBLayout';
import KBDashboard from './pages/KBDashboard';
import KBDatabases from './pages/KBDatabases';
import KBFiles from './pages/KBFiles';
import KBChat from './pages/KBChat';
import KBAnalytics from './pages/KBAnalytics';
import KBSettings from './pages/KBSettings';
import { KBPlaceholderPage } from './components/KBPlaceholderPage';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { KB_ROUTES } from './config/routes';
import { KBAuthorizeRoute } from './components/shared/KBAuthorizeRoute';
import { useOrganizationFeatures } from '@/hooks/database/useOrganizationFeatures';

const COMPONENT_MAP: Record<string, React.ReactNode> = {
  KBDashboard: <KBDashboard />,
  KBDatabases: <KBDatabases />,
  KBFiles: <KBFiles />,
  KBChat: <KBChat />,
  KBAnalytics: <KBAnalytics />,
  KBSettings: <KBSettings />,
};

function DynamicKBPage() {
  const { '*': routePath } = useParams();
  
  // Extract the component and title from the route
  // For example: "knowledgebase-management" should map to Settings component
  const componentName = routePath?.includes('management') ? 'Settings' : 'Custom';
  const title = routePath?.split('-').map(word => 
    word.charAt(0).toUpperCase() + word.slice(1)
  ).join(' ') || 'Page';

  return (
    <KBPlaceholderPage
      component={componentName}
      title={title}
      description="This page is being developed. Please check back later or contact your administrator."
    />
  );
}

export default function KBApp() {
  const { data: features } = useOrganizationFeatures();
  const kbFeature = features?.find(f => f.system_feature.slug === 'knowledge-base');
  const navigationConfig = kbFeature?.system_feature.navigation_config;

  return (
    <AppLayout>
      <KBLayout>
        <ErrorBoundary>
        <Routes>
          <Route path="" element={<Navigate to="dashboard" replace />} />
          {KB_ROUTES.map((r) => {
            const element = COMPONENT_MAP[r.component];
            const isAdminRoute = (r.roles as readonly string[]).includes('admin') && !(r.roles as readonly string[]).includes('user');
            const wrapped = (
              <KBAuthorizeRoute permissions={r.permissions as any}>
                {element}
              </KBAuthorizeRoute>
            );
            return (
              <Route
                key={r.path}
                path={r.path.replace('/apps/knowledge-base/', '')}
                element={isAdminRoute ? (
                  <ProtectedRoute requiredRole="admin">{wrapped}</ProtectedRoute>
                ) : (
                  wrapped
                )}
              />
            );
          })}
          {/* Catch-all route for dynamic pages */}
          <Route 
            path="*" 
            element={
              <KBAuthorizeRoute permissions={['can_upload'] as any}>
                <DynamicKBPage />
              </KBAuthorizeRoute>
            } 
          />
        </Routes>
        </ErrorBoundary>
      </KBLayout>
    </AppLayout>
  );
}

