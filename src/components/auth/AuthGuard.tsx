import { ReactNode, useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/auth/AuthProvider';
import { useOrganization } from '@/contexts/OrganizationContext';
import { LoadingScreen } from '@/components/ui/loading-screen';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface AuthGuardProps {
  children: ReactNode;
  fallbackPath?: string;
  requireOrganization?: boolean;
  showOrgSelector?: boolean;
}

export function AuthGuard({ 
  children, 
  fallbackPath = '/auth',
  requireOrganization = true,
  showOrgSelector = true
}: AuthGuardProps) {
  const { user, loading, error } = useAuth();
  const { currentOrganization, organizations, loading: orgLoading, error: orgError, retryConnection } = useOrganization();
  const location = useLocation();

  // Show loading state while checking authentication
  if (loading) {
    return <LoadingScreen message="Checking authentication..." />;
  }

  // Handle authentication error
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Alert variant="destructive" className="max-w-md">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription className="space-y-4">
            <div>
              <h3 className="font-semibold mb-2">Authentication Error</h3>
              <p className="text-sm">Unable to verify your authentication status. Please try again.</p>
            </div>
            <Button onClick={() => window.location.reload()} className="w-full">
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry
            </Button>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  // Redirect to auth if not authenticated
  if (!user) {
    return <Navigate to={fallbackPath} state={{ from: location }} replace />;
  }

  // Handle organization loading and requirements (only for authenticated users)
  if (requireOrganization) {
    if (orgLoading) {
      return <LoadingScreen message="Loading organization..." />;
    }

    if (orgError && !currentOrganization && organizations.length === 0) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-background p-4">
          <Alert variant="destructive" className="max-w-md">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription className="space-y-4">
              <div>
                <h3 className="font-semibold mb-2">Organization Access Required</h3>
                <p className="text-sm">Unable to load your organization data. Please try again or contact support.</p>
              </div>
              <Button onClick={retryConnection} className="w-full">
                <RefreshCw className="h-4 w-4 mr-2" />
                Retry Connection
              </Button>
            </AlertDescription>
          </Alert>
        </div>
      );
    }

    // Show organization selector if no current organization but organizations exist
    if (!currentOrganization && organizations.length > 0 && showOrgSelector) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-background p-4">
          <Alert className="max-w-md">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <div className="space-y-4">
                <div>
                  <h3 className="font-semibold mb-2">Select Organization</h3>
                  <p className="text-sm text-muted-foreground">
                    Please select an organization to continue.
                  </p>
                </div>
                <Button onClick={() => window.location.href = '/organizations'} className="w-full">
                  Select Organization
                </Button>
              </div>
            </AlertDescription>
          </Alert>
        </div>
      );
    }

    // Show message if user has no organizations
    if (organizations.length === 0 && !orgLoading) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-background p-4">
          <Alert className="max-w-md">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <div className="space-y-4">
                <div>
                  <h3 className="font-semibold mb-2">No Organization Access</h3>
                  <p className="text-sm text-muted-foreground">
                    You don't have access to any organizations. Please contact your administrator for access.
                  </p>
                </div>
                <Button onClick={() => window.location.href = '/organizations'} className="w-full">
                  Check Organization Access
                </Button>
              </div>
            </AlertDescription>
          </Alert>
        </div>
      );
    }
  }

  return <>{children}</>;
}

// Inverse guard - redirect away if authenticated
export function GuestGuard({ children, fallbackPath = '/dashboard' }: AuthGuardProps) {
  const { user, loading, error } = useAuth();
  const location = useLocation();

  // Show loading state while checking authentication
  if (loading) {
    return <LoadingScreen message="Checking authentication..." />;
  }

  // Handle authentication error - still allow access to guest pages
  if (error) {
    console.warn('Authentication error in GuestGuard:', error);
    // Continue to render children for guest pages even if auth check fails
  }

  // Redirect to dashboard if already authenticated
  if (user) {
    // Check if there's a specific redirect location from the auth guard
    const from = location.state?.from?.pathname;
    const redirectTo = from && from !== '/auth' ? from : fallbackPath;
    return <Navigate to={redirectTo} replace />;
  }

  return <>{children}</>;
}

// Role-based guard for admin routes
interface RoleGuardProps extends AuthGuardProps {
  requiredRole?: 'admin' | 'super_admin';
  requireOrganization?: boolean;
}

export function RoleGuard({ 
  children, 
  requiredRole = 'admin',
  requireOrganization = true,
  fallbackPath = '/dashboard'
}: RoleGuardProps) {
  const { user, loading } = useAuth();
  const { currentOrganization } = useOrganization();
  const location = useLocation();

  // First check authentication
  if (loading) {
    return <LoadingScreen message="Checking permissions..." />;
  }

  if (!user) {
    return <Navigate to="/auth" state={{ from: location }} replace />;
  }

  // Check organization requirement
  if (requireOrganization && !currentOrganization) {
    return <Navigate to="/organizations" replace />;
  }

  // Note: Role checking would be implemented here with a role context/hook
  // For now, we'll assume all authenticated users have access
  // This would be enhanced with actual role checking logic

  return <>{children}</>;
}

// Permission-based guard for feature access
interface PermissionGuardProps extends AuthGuardProps {
  requiredPermission: string;
  feature?: string;
}

export function PermissionGuard({
  children,
  requiredPermission,
  feature,
  fallbackPath = '/dashboard'
}: PermissionGuardProps) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <LoadingScreen message="Checking permissions..." />;
  }

  if (!user) {
    return <Navigate to="/auth" state={{ from: location }} replace />;
  }

  // Note: Permission checking would be implemented here
  // This would integrate with the PermissionContext
  
  return <>{children}</>;
}