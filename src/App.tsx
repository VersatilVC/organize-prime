import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { OrganizationProvider } from "@/contexts/OrganizationContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";
import Organizations from "./pages/Organizations";
import Users from "./pages/Users";
import InviteAcceptance from "./pages/InviteAcceptance";
import CompanySettings from "./pages/CompanySettings";
import Billing from "./pages/Billing";
import Marketplace from "./pages/Marketplace";
import FeedbackManagement from "./pages/admin/FeedbackManagement";
import ProfileSettings from "./pages/ProfileSettings";
import SystemSettings from "./pages/SystemSettings";
import Feedback from "./pages/Feedback";
import FeedbackDetail from "./pages/FeedbackDetail";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <AuthProvider>
        <OrganizationProvider>
          <BrowserRouter>
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
          </BrowserRouter>
        </OrganizationProvider>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
