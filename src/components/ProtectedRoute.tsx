import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useUserRole } from '@/hooks/useUserRole';
import { Skeleton } from '@/components/ui/skeleton';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: 'user' | 'admin' | 'super_admin';
}

export function ProtectedRoute({ children, requiredRole = 'user' }: ProtectedRouteProps) {
  const { user, loading: authLoading } = useAuth();
  const { role, loading: roleLoading } = useUserRole();
  const location = useLocation();

  // Debug logging to understand authentication state
  React.useEffect(() => {
    console.log('ProtectedRoute state:', {
      user: !!user,
      authLoading,
      roleLoading,
      role,
      pathname: location.pathname,
      requiredRole
    });
  }, [user, authLoading, roleLoading, role, location.pathname, requiredRole]);

  if (authLoading || roleLoading) {
    console.log('ProtectedRoute: Still loading auth state');
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="space-y-4 w-full max-w-md">
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-8 w-3/4" />
          <Skeleton className="h-8 w-1/2" />
        </div>
      </div>
    );
  }

  if (!user) {
    console.log('ProtectedRoute: No user found, redirecting to auth');
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