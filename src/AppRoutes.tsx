import * as React from 'react';
import { Routes, Route } from 'react-router-dom';
import { AuthGuard, GuestGuard } from '@/components/auth/AuthGuard';
import { ErrorBoundary } from '@/components/ui/error-boundary';
import { AppLayout } from '@/components/layout/AppLayout';

// Lazy load components for optimal bundle splitting
const Index = React.lazy(() => import('@/pages/Index'));
const AuthPage = React.lazy(() => import('@/auth/pages/AuthPage').then(module => ({ default: module.AuthPage })));
const Dashboard = React.lazy(() => import('@/pages/Dashboard'));
const Users = React.lazy(() => import('@/pages/Users'));
const Organizations = React.lazy(() => import('@/pages/Organizations'));
const ProfileSettings = React.lazy(() => import('@/pages/ProfileSettings'));
const CompanySettings = React.lazy(() => import('@/pages/CompanySettings'));
const SystemSettings = React.lazy(() => import('@/pages/SystemSettings'));
const Feedback = React.lazy(() => import('@/pages/Feedback'));
const MyFeedback = React.lazy(() => import('@/pages/MyFeedback'));
const Notifications = React.lazy(() => import('@/pages/Notifications'));
const Billing = React.lazy(() => import('@/pages/Billing'));
const Help = React.lazy(() => import('@/pages/Help'));
const FeedbackManagement = React.lazy(() => import('@/pages/admin/FeedbackManagement'));
const NotFound = React.lazy(() => import('@/pages/NotFound'));

// Loading fallback component
const RouteLoadingFallback: React.FC = () => (
  <div className="flex items-center justify-center min-h-screen">
    <div className="flex flex-col items-center space-y-4">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      <p className="text-sm text-muted-foreground">Loading...</p>
    </div>
  </div>
);

// Layout loading fallback for protected routes
const LayoutLoadingFallback: React.FC = () => (
  <div className="flex-1 p-6">
    <div className="space-y-4 w-full max-w-4xl">
      <div className="h-8 w-64 animate-pulse rounded-md bg-muted" />
      <div className="h-4 w-96 animate-pulse rounded-md bg-muted" />
      <div className="h-64 w-full animate-pulse rounded-lg bg-muted" />
    </div>
  </div>
);

export function AppRoutes() {
  return (
    <ErrorBoundary>
      <Routes>
        {/* Public routes - no layout */}
        <Route 
          path="/" 
          element={
            <React.Suspense fallback={<RouteLoadingFallback />}>
              <Index />
            </React.Suspense>
          } 
        />
        
        <Route 
          path="/auth" 
          element={
            <React.Suspense fallback={<RouteLoadingFallback />}>
              <GuestGuard>
                <AuthPage />
              </GuestGuard>
            </React.Suspense>
          } 
        />

        {/* Protected routes with layout */}
        <Route 
          path="/dashboard" 
          element={
            <AuthGuard>
              <AppLayout>
                <React.Suspense fallback={<LayoutLoadingFallback />}>
                  <Dashboard />
                </React.Suspense>
              </AppLayout>
            </AuthGuard>
          } 
        />

        <Route 
          path="/users" 
          element={
            <AuthGuard>
              <AppLayout>
                <React.Suspense fallback={<LayoutLoadingFallback />}>
                  <Users />
                </React.Suspense>
              </AppLayout>
            </AuthGuard>
          } 
        />

        <Route 
          path="/organizations" 
          element={
            <AuthGuard>
              <AppLayout>
                <React.Suspense fallback={<LayoutLoadingFallback />}>
                  <Organizations />
                </React.Suspense>
              </AppLayout>
            </AuthGuard>
          } 
        />

        <Route 
          path="/settings/profile" 
          element={
            <AuthGuard>
              <AppLayout>
                <React.Suspense fallback={<LayoutLoadingFallback />}>
                  <ProfileSettings />
                </React.Suspense>
              </AppLayout>
            </AuthGuard>
          } 
        />

        <Route 
          path="/settings/company" 
          element={
            <AuthGuard>
              <AppLayout>
                <React.Suspense fallback={<LayoutLoadingFallback />}>
                  <CompanySettings />
                </React.Suspense>
              </AppLayout>
            </AuthGuard>
          } 
        />

        <Route 
          path="/settings/system" 
          element={
            <AuthGuard>
              <AppLayout>
                <React.Suspense fallback={<LayoutLoadingFallback />}>
                  <SystemSettings />
                </React.Suspense>
              </AppLayout>
            </AuthGuard>
          } 
        />

        <Route 
          path="/feedback" 
          element={
            <AuthGuard>
              <AppLayout>
                <React.Suspense fallback={<LayoutLoadingFallback />}>
                  <Feedback />
                </React.Suspense>
              </AppLayout>
            </AuthGuard>
          } 
        />

        <Route 
          path="/feedback/my" 
          element={
            <AuthGuard>
              <AppLayout>
                <React.Suspense fallback={<LayoutLoadingFallback />}>
                  <MyFeedback />
                </React.Suspense>
              </AppLayout>
            </AuthGuard>
          } 
        />

        <Route 
          path="/admin/feedback" 
          element={
            <AuthGuard>
              <AppLayout>
                <React.Suspense fallback={<LayoutLoadingFallback />}>
                  <FeedbackManagement />
                </React.Suspense>
              </AppLayout>
            </AuthGuard>
          } 
        />

        <Route 
          path="/notifications" 
          element={
            <AuthGuard>
              <AppLayout>
                <React.Suspense fallback={<LayoutLoadingFallback />}>
                  <Notifications />
                </React.Suspense>
              </AppLayout>
            </AuthGuard>
          } 
        />

        <Route 
          path="/billing" 
          element={
            <AuthGuard>
              <AppLayout>
                <React.Suspense fallback={<LayoutLoadingFallback />}>
                  <Billing />
                </React.Suspense>
              </AppLayout>
            </AuthGuard>
          } 
        />

        <Route 
          path="/help" 
          element={
            <AuthGuard>
              <AppLayout>
                <React.Suspense fallback={<LayoutLoadingFallback />}>
                  <Help />
                </React.Suspense>
              </AppLayout>
            </AuthGuard>
          } 
        />

        {/* Catch all route */}
        <Route 
          path="*" 
          element={
            <React.Suspense fallback={<RouteLoadingFallback />}>
              <NotFound />
            </React.Suspense>
          } 
        />
      </Routes>
    </ErrorBoundary>
  );
}