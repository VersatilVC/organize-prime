import { Routes, Route, Navigate } from 'react-router-dom';
import { Suspense, lazy } from 'react';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { PageLoadingSpinner } from '@/components/LoadingSkeletons';
import { PlaceholderPage } from '@/components/ui/placeholder-page';
import { FeatureRouter } from './components/FeatureRouter';
import { AppLayout } from '@/components/layout/AppLayout';

// Lazy load all page components for code splitting
const Index = lazy(() => import('./pages/Index'));
const Auth = lazy(() => import('./pages/Auth'));
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
  return (
    <Suspense fallback={<PageLoadingSpinner />}>
      <Routes>
        <Route path="/" element={<Index />} />
        <Route path="/auth" element={<Auth />} />
        <Route path="/invite/:token" element={<InviteAcceptance />} />
        
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
              <Organizations />
            </ProtectedRoute>
          } 
        />
        
        <Route 
          path="/users" 
          element={
            <ProtectedRoute requiredRole="admin">
              <Users />
            </ProtectedRoute>
          } 
        />
        
        {/* Management Routes */}
        <Route 
          path="/settings/company" 
          element={
            <ProtectedRoute requiredRole="admin">
              <CompanySettings />
            </ProtectedRoute>
          } 
        />
        
        <Route 
          path="/billing" 
          element={
            <ProtectedRoute requiredRole="admin">
              <Billing />
            </ProtectedRoute>
          } 
        />
        
        {/* Feature Routes */}
        <Route 
          path="/features/:slug/*" 
          element={
            <ProtectedRoute>
              <FeatureRouter />
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
              <FeedbackManagement />
            </ProtectedRoute>
          } 
        />
        
        <Route 
          path="/feedback/manage" 
          element={
            <ProtectedRoute requiredRole="super_admin">
              <FeedbackManagement />
            </ProtectedRoute>
          } 
        />
        
        {/* Settings Routes */}
        <Route 
          path="/settings/profile" 
          element={
            <ProtectedRoute>
              <ProfileSettings />
            </ProtectedRoute>
          } 
        />
        
        <Route 
          path="/settings/system" 
          element={
            <ProtectedRoute requiredRole="super_admin">
              <SystemSettings />
            </ProtectedRoute>
          } 
        />
        
        <Route 
          path="/feedback/my" 
          element={
            <ProtectedRoute>
              <MyFeedback />
            </ProtectedRoute>
          } 
        />
        
        <Route 
          path="/feedback/:id" 
          element={
            <ProtectedRoute>
              <FeedbackDetail />
            </ProtectedRoute>
          } 
        />
        
        <Route 
          path="/feedback" 
          element={
            <ProtectedRoute>
              <Feedback />
            </ProtectedRoute>
          } 
        />
        
        <Route 
          path="/notifications" 
          element={
            <ProtectedRoute>
              <Notifications />
            </ProtectedRoute>
          } 
        />
        
        <Route 
          path="/settings/notifications" 
          element={
            <ProtectedRoute requiredRole="admin">
              <NotificationManagement />
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
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
  );
}