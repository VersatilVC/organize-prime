import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Suspense, lazy } from "react";
import { AuthProvider } from "@/contexts/AuthContext";
import { OrganizationProvider } from "@/contexts/OrganizationContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { createOptimizedQueryClient } from "@/lib/query-client";
import { initializeCacheCleanup } from "@/lib/local-storage";
import { PageLoadingSpinner } from "@/components/LoadingSkeletons";

// Lazy load all page components for code splitting
const Index = lazy(() => import("./pages/Index"));
const Auth = lazy(() => import("./pages/Auth"));
const NotFound = lazy(() => import("./pages/NotFound"));
const Organizations = lazy(() => import("./pages/Organizations"));
const Users = lazy(() => import("./pages/Users"));
const InviteAcceptance = lazy(() => import("./pages/InviteAcceptance"));
const CompanySettings = lazy(() => import("./pages/CompanySettings"));
const Billing = lazy(() => import("./pages/Billing"));
const Marketplace = lazy(() => import("./pages/Marketplace"));
const FeedbackManagement = lazy(() => import("./pages/admin/FeedbackManagement"));
const ProfileSettings = lazy(() => import("./pages/ProfileSettings"));
const SystemSettings = lazy(() => import("./pages/SystemSettings"));
const Feedback = lazy(() => import("./pages/Feedback"));
const FeedbackDetail = lazy(() => import("./pages/FeedbackDetail"));
const MyFeedback = lazy(() => import("./pages/MyFeedback"));
const Notifications = lazy(() => import("./pages/Notifications"));
const NotificationManagement = lazy(() => import("./pages/NotificationManagement"));

// Initialize cache cleanup on app start
initializeCacheCleanup();

// Create optimized query client with smart caching
const queryClient = createOptimizedQueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <AuthProvider>
        <OrganizationProvider>
          <BrowserRouter>
            <Suspense fallback={<PageLoadingSpinner />}>
              <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/invite/:token" element={<InviteAcceptance />} />
              {/* Protected Routes */}
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
              <Route 
                path="/marketplace" 
                element={
                  <ProtectedRoute requiredRole="admin">
                    <Marketplace />
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
          </BrowserRouter>
        </OrganizationProvider>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
