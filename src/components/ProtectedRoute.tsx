import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/auth/AuthProvider';
import { useOptimizedUserRole } from '@/hooks/database/useOptimizedUserRole';
import { Skeleton } from '@/components/ui/skeleton';
import { logger } from '@/lib/secure-logger';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: 'user' | 'admin' | 'super_admin';
}

export function ProtectedRoute({ children, requiredRole = 'user' }: ProtectedRouteProps) {
  const { user, loading: authLoading } = useAuth();
  const { role, loading: roleLoading } = useOptimizedUserRole();
  const location = useLocation();

  // Add timeout to prevent infinite loading
  const [timeoutReached, setTimeoutReached] = React.useState(false);
  
  React.useEffect(() => {
    const timer = setTimeout(() => {
      logger.warn('Loading timeout reached');
      setTimeoutReached(true);
    }, 5000); // 5 second timeout
    
    return () => clearTimeout(timer);
  }, []);

  if ((authLoading || roleLoading) && !timeoutReached) {
    logger.debug('Auth state loading');
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

  logger.debug('Auth state resolved');

  if (!user) {
    logger.debug('Redirecting to auth - no user');
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