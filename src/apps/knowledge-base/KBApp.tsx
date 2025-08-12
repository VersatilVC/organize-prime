import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { KBLayout } from './components/KBLayout';
import KBDashboard from './pages/KBDashboard';
import KBDatabases from './pages/KBDatabases';
import KBFiles from './pages/KBFiles';
import KBChat from './pages/KBChat';
import KBAnalytics from './pages/KBAnalytics';
import KBSettings from './pages/KBSettings';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { KB_ROUTES } from './config/routes';
import { KBAuthorizeRoute } from './components/shared/KBAuthorizeRoute';

const COMPONENT_MAP: Record<string, React.ReactNode> = {
  KBDashboard: <KBDashboard />,
  KBDatabases: <KBDatabases />,
  KBFiles: <KBFiles />,
  KBChat: <KBChat />,
  KBAnalytics: <KBAnalytics />,
  KBSettings: <KBSettings />,
};

export default function KBApp() {
  return (
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
        </Routes>
      </ErrorBoundary>
    </KBLayout>
  );
}

