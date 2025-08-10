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

// Root component for the Knowledge Base app module
export default function KBApp() {
  return (
    <KBLayout>
      <Routes>
        <Route path="" element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<KBDashboard />} />
        <Route path="databases" element={<KBDatabases />} />
        <Route path="files" element={<KBFiles />} />
        <Route path="chat" element={<KBChat />} />
        <Route
          path="analytics"
          element={
            <ProtectedRoute requiredRole="admin">
              <KBAnalytics />
            </ProtectedRoute>
          }
        />
        <Route
          path="settings"
          element={
            <ProtectedRoute requiredRole="admin">
              <KBSettings />
            </ProtectedRoute>
          }
        />
      </Routes>
    </KBLayout>
  );
}
