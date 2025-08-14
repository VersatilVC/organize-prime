import { Routes, Route, Navigate } from 'react-router-dom';
import { Suspense, lazy } from 'react';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { PageLoadingSpinner } from '@/components/LoadingSkeletons';
import { PlaceholderPage } from '@/components/ui/placeholder-page';
import { FeatureRouter } from './components/FeatureRouter';
import { AppLayout } from '@/components/layout/AppLayout';
import { AuthGuard, GuestGuard } from '@/components/auth/AuthGuard';

// Optimized loading component for routes
const RouteLoadingSpinner = () => (
  <div className="min-h-screen flex items-center justify-center bg-background">
    <div className="flex flex-col items-center space-y-4">
      <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full"></div>
      <p className="text-sm text-muted-foreground">Loading page...</p>
    </div>
  </div>
);

// Lazy load all page components for code splitting
const Index = lazy(() => import('./pages/Index'));
const Auth = lazy(() => import('./pages/Auth'));
const AuthCallback = lazy(() => import('./pages/AuthCallback'));
const NotFound = lazy(() => import('./pages/NotFound'));
const Organizations = lazy(() => import('./pages/Organizations'));
const Users = lazy(() => import('./pages/Users'));
const InviteAcceptance = lazy(() => import('./pages/InviteAcceptance'));
const CompanySettings = lazy(() => import('./pages/CompanySettings'));
const Billing = lazy(() => import('./pages/Billing'));
const FeatureDetail = lazy(() => import('./pages/FeatureDetail'));
const FeedbackManagement = lazy(() => import('./pages/admin/FeedbackManagement'));
const ProfileSettings = lazy(() => import('./pages/ProfileSettings'));
const SystemSettings = lazy(() => import('./pages/SystemSettings'));
const Feedback = lazy(() => import('./pages/Feedback'));
const FeedbackDetail = lazy(() => import('./pages/FeedbackDetail'));
const MyFeedback = lazy(() => import('./pages/MyFeedback'));
const Notifications = lazy(() => import('./pages/Notifications'));
const NotificationManagement = lazy(() => import('./pages/NotificationManagement'));

// Redirect component for legacy knowledge base URLs
function KnowledgeBaseRedirect() {
  const currentPath = window.location.pathname;
  const newPath = currentPath.replace('/knowledge-base', '/features/knowledge-base');
  return <Navigate to={newPath} replace />;
}

// Debug component for feature routing
function FeatureDebugComponent() {
  console.log('🔍 App: Debug - Features route matched but no slug captured. URL:', window.location.pathname);
  return (
    <ProtectedRoute>
      <div>Feature routing debug - check console</div>
    </ProtectedRoute>
  );
}

export default function AppRoutes() {
  console.log('🛣️ APP_ROUTES: AppRoutes component rendering - current path:', window.location.pathname);
  
  return (
    <Routes>
        <Route path="/" element={
          <Suspense fallback={<RouteLoadingSpinner />}>
            <Index />
          </Suspense>
        } />
        
        <Route path="/auth" element={
          <GuestGuard>
            <Suspense fallback={<RouteLoadingSpinner />}>
              <Auth />
            </Suspense>
          </GuestGuard>
        } />
        
        <Route path="/auth/callback" element={
          <Suspense fallback={<RouteLoadingSpinner />}>
            <AuthCallback />
          </Suspense>
        } />
        
        <Route path="/invite/:token" element={
          <Suspense fallback={<RouteLoadingSpinner />}>
            <InviteAcceptance />
          </Suspense>
        } />
        
        {/* Protected Routes */}
        <Route 
          path="/dashboard" 
          element={
            <ProtectedRoute>
              <AppLayout>
                <PlaceholderPage title="Dashboard under construction" description="This page is not available yet." />
              </AppLayout>
            </ProtectedRoute>
          } 
        />
        
        <Route 
          path="/organizations" 
          element={
            <ProtectedRoute requiredRole="super_admin">
              <Suspense fallback={<RouteLoadingSpinner />}>
                <Organizations />
              </Suspense>
            </ProtectedRoute>
          } 
        />
        
        <Route 
          path="/users" 
          element={
            <ProtectedRoute requiredRole="admin">
              <Suspense fallback={<RouteLoadingSpinner />}>
                <Users />
              </Suspense>
            </ProtectedRoute>
          } 
        />
        
        {/* Management Routes */}
        <Route 
          path="/settings/company" 
          element={
            <ProtectedRoute requiredRole="admin">
              <Suspense fallback={<RouteLoadingSpinner />}>
                <CompanySettings />
              </Suspense>
            </ProtectedRoute>
          } 
        />
        
        <Route 
          path="/billing" 
          element={
            <ProtectedRoute requiredRole="admin">
              <Suspense fallback={<RouteLoadingSpinner />}>
                <Billing />
              </Suspense>
            </ProtectedRoute>
          } 
        />
        
        {/* Feature Routes */}
        <Route 
          path="/features/:slug/*" 
          element={
            <ProtectedRoute>
              <Suspense fallback={<RouteLoadingSpinner />}>
                <FeatureRouter />
              </Suspense>
            </ProtectedRoute>
          } 
        />
        
        {/* Debug route to verify feature routing */}
        <Route 
          path="/features/*" 
          element={<FeatureDebugComponent />} 
        />
        
        {/* Legacy Knowledge Base redirect */}
        <Route 
          path="/knowledge-base/*" 
          element={
            <ProtectedRoute>
              <KnowledgeBaseRedirect />
            </ProtectedRoute>
          } 
        />
        
        {/* System Admin Routes */}
        <Route 
          path="/admin/feedback" 
          element={
            <ProtectedRoute requiredRole="super_admin">
              <Suspense fallback={<RouteLoadingSpinner />}>
                <FeedbackManagement />
              </Suspense>
            </ProtectedRoute>
          } 
        />
        
        <Route 
          path="/feedback/manage" 
          element={
            <ProtectedRoute requiredRole="super_admin">
              <Suspense fallback={<RouteLoadingSpinner />}>
                <FeedbackManagement />
              </Suspense>
            </ProtectedRoute>
          } 
        />
        
        {/* Settings Routes */}
        <Route 
          path="/settings/profile" 
          element={
            <ProtectedRoute>
              <Suspense fallback={<RouteLoadingSpinner />}>
                <ProfileSettings />
              </Suspense>
            </ProtectedRoute>
          } 
        />
        
        <Route 
          path="/settings/system" 
          element={
            <ProtectedRoute requiredRole="super_admin">
              <Suspense fallback={<RouteLoadingSpinner />}>
                <SystemSettings />
              </Suspense>
            </ProtectedRoute>
          } 
        />
        
        <Route 
          path="/feedback/my" 
          element={
            <ProtectedRoute>
              <Suspense fallback={<RouteLoadingSpinner />}>
                <MyFeedback />
              </Suspense>
            </ProtectedRoute>
          } 
        />
        
        <Route 
          path="/feedback/:id" 
          element={
            <ProtectedRoute>
              <Suspense fallback={<RouteLoadingSpinner />}>
                <FeedbackDetail />
              </Suspense>
            </ProtectedRoute>
          } 
        />
        
        <Route 
          path="/feedback" 
          element={
            <ProtectedRoute>
              <Suspense fallback={<RouteLoadingSpinner />}>
                <Feedback />
              </Suspense>
            </ProtectedRoute>
          } 
        />
        
        <Route 
          path="/notifications" 
          element={
            <ProtectedRoute>
              <Suspense fallback={<RouteLoadingSpinner />}>
                <Notifications />
              </Suspense>
            </ProtectedRoute>
          } 
        />
        
        <Route 
          path="/settings/notifications" 
          element={
            <ProtectedRoute requiredRole="admin">
              <Suspense fallback={<RouteLoadingSpinner />}>
                <NotificationManagement />
              </Suspense>
            </ProtectedRoute>
          } 
        />
        
        <Route 
          path="/admin/*" 
          element={
            <ProtectedRoute requiredRole="super_admin">
              <div>System Admin (Coming Soon)</div>
            </ProtectedRoute>
          } 
        />
        
        {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
        <Route path="*" element={
          <Suspense fallback={<PageLoadingSpinner />}>
            <NotFound />
          </Suspense>
        } />
      </Routes>
  );
}
