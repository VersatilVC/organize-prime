import * as React from 'react';
import { Routes, Route } from 'react-router-dom';
import { AuthGuard, GuestGuard } from '@/components/auth/AuthGuard';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { AppLayout } from '@/components/layout/AppLayout';
import { LoadingScreen, LayoutLoadingScreen } from '@/components/ui/loading-screen';
import { createLazyRoute, lazyImportNamed } from '@/lib/lazy-import';

// Enhanced lazy load components with retry mechanism
const Index = createLazyRoute(() => import('@/pages/Index'));
const AuthPage = lazyImportNamed(() => import('@/auth/pages/AuthPage'), 'AuthPage');
const Dashboard = createLazyRoute(() => import('@/pages/Dashboard'));
const Users = createLazyRoute(() => import('@/pages/Users'));
const Organizations = createLazyRoute(() => import('@/pages/Organizations'));
const ProfileSettings = createLazyRoute(() => import('@/pages/ProfileSettings'));
const CompanySettings = createLazyRoute(() => import('@/pages/CompanySettings'));
const SystemSettings = createLazyRoute(() => import('@/pages/SystemSettings'));
const Feedback = createLazyRoute(() => import('@/pages/Feedback'));
const MyFeedback = createLazyRoute(() => import('@/pages/MyFeedback'));
const Notifications = createLazyRoute(() => import('@/pages/Notifications'));
const Billing = createLazyRoute(() => import('@/pages/Billing'));
const Help = createLazyRoute(() => import('@/pages/Help'));
const FeedbackManagement = createLazyRoute(() => import('@/pages/admin/FeedbackManagement'));
const SimpleFeatureRouter = lazyImportNamed(() => import('@/components/SimpleFeatureRouter'), 'SimpleFeatureRouter');
const NotFound = createLazyRoute(() => import('@/pages/NotFound'));

// Use the new optimized loading components
const RouteLoadingFallback: React.FC = () => <LoadingScreen message="Loading page..." />;
const LayoutLoadingFallback: React.FC = () => <LayoutLoadingScreen />;

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

        {/* Feature routes - simplified dynamic feature system */}
        <Route 
          path="/features/:slug/*" 
          element={
            <AuthGuard>
              <React.Suspense fallback={<LayoutLoadingFallback />}>
                <SimpleFeatureRouter />
              </React.Suspense>
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