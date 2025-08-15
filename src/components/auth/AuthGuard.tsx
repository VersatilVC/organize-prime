import { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/auth/AuthProvider';

interface AuthGuardProps {
  children: ReactNode;
  fallbackPath?: string;
}

export function AuthGuard({ children, fallbackPath = '/auth' }: AuthGuardProps) {
  const { user, loading } = useAuth();
  const location = useLocation();

  // Show loading state while checking authentication
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full"></div>
      </div>
    );
  }

  // Redirect to auth if not authenticated
  if (!user) {
    return <Navigate to={fallbackPath} state={{ from: location }} replace />;
  }

  return <>{children}</>;
}

// Inverse guard - redirect away if authenticated
export function GuestGuard({ children, fallbackPath = '/' }: AuthGuardProps) {
  const { user, loading } = useAuth();

  // Show loading state while checking authentication
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full"></div>
      </div>
    );
  }

  // Redirect to home if already authenticated
  if (user) {
    return <Navigate to={fallbackPath} replace />;
  }

  return <>{children}</>;
}