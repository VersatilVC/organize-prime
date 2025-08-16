import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/auth/AuthProvider';
import { useOptimizedUserRole } from '@/hooks/database/useOptimizedUserRole';
import { LoadingScreen } from '@/components/ui/loading-screen';
import { useStableLoading } from '@/hooks/useLoadingState';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: 'user' | 'admin' | 'super_admin';
}

export function ProtectedRoute({ children, requiredRole = 'user' }: ProtectedRouteProps) {
  const { user, loading: authLoading } = useAuth();
  const { role, loading: roleLoading } = useOptimizedUserRole();
  const location = useLocation();

  // Use stable loading to prevent flashing
  const isLoading = authLoading || roleLoading;
  const stableLoading = useStableLoading(isLoading, 300); // Minimum 300ms loading

  if (stableLoading) {
    return <LoadingScreen message="Verifying access..." />;
  }

  // Reduced logging to prevent flashing
  // logger.debug('Auth state resolved');

  if (!user) {
    return <Navigate to="/auth" state={{ from: location }} replace />;
  }

  // Check role permissions
  const hasPermission = () => {
    switch (requiredRole) {
      case 'super_admin':
        return role === 'super_admin';
      case 'admin':
        return role === 'admin' || role === 'super_admin';
      case 'user':
      default:
        return true; // All authenticated users can access user-level routes
    }
  };

  if (!hasPermission()) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}