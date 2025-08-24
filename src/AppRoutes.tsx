import * as React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';

// Import existing auth components - using relative paths to avoid resolution issues
import { AuthGuard, GuestGuard } from './components/auth/AuthGuard';
import { AppLayout } from './components/layout/AppLayout';

// Simple lazy loading without complex retry logic
const Index = React.lazy(() => import('./pages/Index'));
const AuthPage = React.lazy(() => import('./auth/pages/AuthPage').then(m => ({ default: m.AuthPage })));
const Dashboard = React.lazy(() => import('./pages/Dashboard'));
const Users = React.lazy(() => import('./pages/Users'));
const Organizations = React.lazy(() => import('./pages/Organizations'));
const Feedback = React.lazy(() => import('./pages/Feedback'));
const MyFeedback = React.lazy(() => import('./pages/MyFeedback'));
const FeedbackManagement = React.lazy(() => import('./pages/admin/FeedbackManagement'));
const WebhookManagement = React.lazy(() => import('./pages/WebhookManagement'));
const AdminWebhookManagement = React.lazy(() => import('./pages/WebhookManagement'));
const Notifications = React.lazy(() => import('./pages/Notifications'));
const ProfileSettings = React.lazy(() => import('./pages/ProfileSettings'));
const CompanySettings = React.lazy(() => import('./pages/CompanySettings'));
const SystemSettings = React.lazy(() => import('./pages/SystemSettings'));
const Help = React.lazy(() => import('./pages/Help'));
const Billing = React.lazy(() => import('./pages/Billing'));

// Feature router for dynamic feature routing
const SimpleFeatureRouter = React.lazy(() => import('./components/SimpleFeatureRouter').then(m => ({ default: m.SimpleFeatureRouter })));

// Simple loading fallback
const LoadingFallback = () => (
  <div className="min-h-screen flex items-center justify-center">
    <div className="text-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
      <p className="text-gray-600">Loading...</p>
    </div>
  </div>
);

// Wrapper for protected pages with AppLayout
const ProtectedPage = ({ children }: { children: React.ReactNode }) => (
  <React.Suspense fallback={<LoadingFallback />}>
    <AuthGuard>
      <AppLayout>
        {children}
      </AppLayout>
    </AuthGuard>
  </React.Suspense>
);

export function AppRoutes() {
  return (
    <Routes>
      {/* Public home page with auth logic built-in */}
      <Route 
        path="/" 
        element={
          <React.Suspense fallback={<LoadingFallback />}>
            <Index />
          </React.Suspense>
        } 
      />
      
      {/* Auth routes - only accessible when not logged in */}
      <Route 
        path="/auth" 
        element={
          <React.Suspense fallback={<LoadingFallback />}>
            <GuestGuard>
              <AuthPage />
            </GuestGuard>
          </React.Suspense>
        } 
      />

      {/* Protected routes with sidebar */}
      <Route path="/dashboard" element={<ProtectedPage><Dashboard /></ProtectedPage>} />
      <Route path="/users" element={<ProtectedPage><Users /></ProtectedPage>} />
      <Route path="/organizations" element={<ProtectedPage><Organizations /></ProtectedPage>} />
      <Route path="/feedback" element={<ProtectedPage><Feedback /></ProtectedPage>} />
      <Route path="/feedback/my" element={<ProtectedPage><MyFeedback /></ProtectedPage>} />
      <Route path="/admin/feedback" element={<ProtectedPage><FeedbackManagement /></ProtectedPage>} />
      <Route path="/webhooks" element={<ProtectedPage><WebhookManagement /></ProtectedPage>} />
      <Route path="/admin/webhooks" element={<ProtectedPage><AdminWebhookManagement /></ProtectedPage>} />
      <Route path="/notifications" element={<ProtectedPage><Notifications /></ProtectedPage>} />
      <Route path="/settings/profile" element={<ProtectedPage><ProfileSettings /></ProtectedPage>} />
      <Route path="/settings/company" element={<ProtectedPage><CompanySettings /></ProtectedPage>} />
      <Route path="/settings/system" element={<ProtectedPage><SystemSettings /></ProtectedPage>} />
      <Route path="/help" element={<ProtectedPage><Help /></ProtectedPage>} />
      <Route path="/billing" element={<ProtectedPage><Billing /></ProtectedPage>} />

      {/* Feature routes - dynamic feature system */}
      <Route 
        path="/features/:slug/*" 
        element={
          <React.Suspense fallback={<LoadingFallback />}>
            <AuthGuard>
              <SimpleFeatureRouter />
            </AuthGuard>
          </React.Suspense>
        } 
      />

      {/* Legacy route redirects */}
      <Route path="/app" element={<Navigate to="/dashboard" replace />} />
      <Route path="/login" element={<Navigate to="/auth" replace />} />
      <Route path="/register" element={<Navigate to="/auth" replace />} />

      {/* Catch all route - redirect to home */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}