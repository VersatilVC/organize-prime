import * as React from 'react';
import { Routes, Route } from 'react-router-dom';
import { AuthGuard, GuestGuard } from '@/components/auth/AuthGuard';
import { ErrorBoundary } from '@/components/ui/error-boundary';
import { AppLayout } from '@/components/layout/AppLayout';

// Import components directly to avoid lazy loading issues
import Index from '@/pages/Index';
import { AuthPage } from '@/auth/pages/AuthPage';
import Dashboard from '@/pages/Dashboard';
import Users from '@/pages/Users';
import Organizations from '@/pages/Organizations';
import ProfileSettings from '@/pages/ProfileSettings';
import CompanySettings from '@/pages/CompanySettings';
import SystemSettings from '@/pages/SystemSettings';
import Feedback from '@/pages/Feedback';
import NotFound from '@/pages/NotFound';

export function AppRoutes() {
  return (
    <ErrorBoundary>
      <Routes>
        {/* Public routes - no layout */}
        <Route path="/" element={<Index />} />
        
        <Route 
          path="/auth" 
          element={
            <GuestGuard>
              <AuthPage />
            </GuestGuard>
          } 
        />

        {/* Protected routes with layout */}
        <Route 
          path="/dashboard" 
          element={
            <AuthGuard>
              <AppLayout>
                <Dashboard />
              </AppLayout>
            </AuthGuard>
          } 
        />

        <Route 
          path="/users" 
          element={
            <AuthGuard>
              <AppLayout>
                <Users />
              </AppLayout>
            </AuthGuard>
          } 
        />

        <Route 
          path="/organizations" 
          element={
            <AuthGuard>
              <AppLayout>
                <Organizations />
              </AppLayout>
            </AuthGuard>
          } 
        />

        <Route 
          path="/profile-settings" 
          element={
            <AuthGuard>
              <AppLayout>
                <ProfileSettings />
              </AppLayout>
            </AuthGuard>
          } 
        />

        <Route 
          path="/company-settings" 
          element={
            <AuthGuard>
              <AppLayout>
                <CompanySettings />
              </AppLayout>
            </AuthGuard>
          } 
        />

        <Route 
          path="/system-settings" 
          element={
            <AuthGuard>
              <AppLayout>
                <SystemSettings />
              </AppLayout>
            </AuthGuard>
          } 
        />

        <Route 
          path="/feedback" 
          element={
            <AuthGuard>
              <AppLayout>
                <Feedback />
              </AppLayout>
            </AuthGuard>
          } 
        />

        {/* Catch all route */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </ErrorBoundary>
  );
}