import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { AuthGuard, GuestGuard } from '@/components/auth/AuthGuard';
import { ErrorBoundary } from '@/components/ui/error-boundary';

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
        {/* Public routes */}
        <Route path="/" element={<Index />} />
        
        <Route 
          path="/auth" 
          element={
            <GuestGuard>
              <AuthPage />
            </GuestGuard>
          } 
        />

        {/* Protected routes */}
        <Route 
          path="/dashboard" 
          element={
            <AuthGuard>
              <Dashboard />
            </AuthGuard>
          } 
        />

        <Route 
          path="/users" 
          element={
            <AuthGuard>
              <Users />
            </AuthGuard>
          } 
        />

        <Route 
          path="/organizations" 
          element={
            <AuthGuard>
              <Organizations />
            </AuthGuard>
          } 
        />

        <Route 
          path="/profile-settings" 
          element={
            <AuthGuard>
              <ProfileSettings />
            </AuthGuard>
          } 
        />

        <Route 
          path="/company-settings" 
          element={
            <AuthGuard>
              <CompanySettings />
            </AuthGuard>
          } 
        />

        <Route 
          path="/system-settings" 
          element={
            <AuthGuard>
              <SystemSettings />
            </AuthGuard>
          } 
        />

        <Route 
          path="/feedback" 
          element={
            <AuthGuard>
              <Feedback />
            </AuthGuard>
          } 
        />

        {/* Catch all route */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </ErrorBoundary>
  );
}