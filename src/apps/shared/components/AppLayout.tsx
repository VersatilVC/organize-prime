import React, { createContext, useContext, useEffect, ReactNode } from 'react';
import { useParams, useLocation } from 'react-router-dom';
import { AppContext, AppPermissionError } from '../types/AppTypes';
import { useAppConfig } from '../hooks/useAppConfig';
import { useAppNavigation } from '../hooks/useAppNavigation';
import { AppAnalyticsService } from '../services/AppAnalyticsService';
import { useOrganizationData } from '@/contexts/OrganizationContext';
import { useAuth } from '@/contexts/AuthContext';
import { AppLayout as BaseAppLayout } from '@/components/layout/AppLayout';
import { Breadcrumbs } from '@/components/Breadcrumbs';
import { PageLoadingSpinner } from '@/components/LoadingSkeletons';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';

// App context for child components
const AppContextProvider = createContext<AppContext | null>(null);

export interface AppLayoutProps {
  children: ReactNode;
  appId: string;
  appName?: string;
  permissions?: string[];
  requiresConfiguration?: boolean;
  showBreadcrumbs?: boolean;
}

export function AppLayout({
  children,
  appId,
  appName,
  permissions = [],
  requiresConfiguration = false,
  showBreadcrumbs = true,
}: AppLayoutProps) {
  const params = useParams();
  const location = useLocation();
  const { currentOrganization } = useOrganizationData();
  const { user } = useAuth();

  const appSlug = params.slug || '';
  const organizationId = currentOrganization?.id || '';
  const userId = user?.id || '';

  // Get app configuration
  const { 
    configuration, 
    isLoading: configLoading, 
    error: configError,
    updateConfiguration,
    isInstalled 
  } = useAppConfig({ appId });

  // Get app navigation
  const { breadcrumbs, isNavigationLoading } = useAppNavigation({ appId });

  // Track page view
  useEffect(() => {
    if (appId && organizationId && userId && !configLoading) {
      AppAnalyticsService.trackPageView(
        appId,
        organizationId,
        userId,
        location.pathname,
        document.title
      );
    }
  }, [appId, organizationId, userId, location.pathname, configLoading]);

  // Track app errors
  useEffect(() => {
    if (configError && organizationId && userId) {
      AppAnalyticsService.trackError(
        appId,
        organizationId,
        userId,
        configError,
        { context: 'app_layout_config_error' }
      );
    }
  }, [configError, appId, organizationId, userId]);

  // Create app context
  const appContext: AppContext | null = React.useMemo(() => {
    if (!configuration || !organizationId || !userId) {
      return null;
    }

    return {
      appId,
      appSlug,
      appName: appName || configuration.appId,
      organizationId,
      configuration,
      permissions,
      updateConfiguration: async (updates) => {
        await updateConfiguration(updates);
      },
      trackEvent: async (event, data) => {
        await AppAnalyticsService.trackEvent(
          appId,
          organizationId,
          userId,
          event,
          'app_interaction',
          data
        );
      },
    };
  }, [
    configuration,
    organizationId,
    userId,
    appId,
    appSlug,
    appName,
    permissions,
    updateConfiguration
  ]);

  // Loading state
  if (configLoading || isNavigationLoading) {
    return (
      <BaseAppLayout>
        <PageLoadingSpinner />
      </BaseAppLayout>
    );
  }

  // Error states
  if (configError) {
    return (
      <BaseAppLayout>
        <div className="p-6">
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Failed to load app configuration: {configError.message}
            </AlertDescription>
          </Alert>
          <div className="mt-4">
            <Button asChild variant="outline">
              <Link to="/marketplace">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Marketplace
              </Link>
            </Button>
          </div>
        </div>
      </BaseAppLayout>
    );
  }

  // App not installed
  if (!isInstalled) {
    return (
      <BaseAppLayout>
        <div className="p-6">
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              This app is not installed in your organization. Please install it from the marketplace first.
            </AlertDescription>
          </Alert>
          <div className="mt-4">
            <Button asChild>
              <Link to="/marketplace">
                Go to Marketplace
              </Link>
            </Button>
          </div>
        </div>
      </BaseAppLayout>
    );
  }

  // App not configured (if configuration is required)
  if (requiresConfiguration && (!configuration?.settings || Object.keys(configuration.settings).length === 0)) {
    return (
      <BaseAppLayout>
        <div className="p-6">
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              This app requires configuration before it can be used. Please contact your administrator.
            </AlertDescription>
          </Alert>
          <div className="mt-4">
            <Button asChild variant="outline">
              <Link to={`/features/${appSlug}/settings`}>
                Configure App
              </Link>
            </Button>
          </div>
        </div>
      </BaseAppLayout>
    );
  }

  // Permission check
  if (permissions.length > 0) {
    // TODO: Implement actual permission checking
    // For now, we'll assume the user has permissions if the app is installed
    // This should be enhanced with actual permission checking logic
  }

  return (
    <BaseAppLayout>
      <div className="flex-1 flex flex-col overflow-hidden">
        {showBreadcrumbs && breadcrumbs.length > 0 && (
          <div className="border-b border-border px-6 py-3">
            <div className="text-sm breadcrumbs">
              {breadcrumbs.map((crumb, index) => (
                <span key={index}>
                  {index > 0 && <span className="mx-2">/</span>}
                  {crumb.path ? (
                    <Link to={crumb.path} className="text-primary hover:underline">{crumb.label}</Link>
                  ) : (
                    <span className="font-medium">{crumb.label}</span>
                  )}
                </span>
              ))}
            </div>
          </div>
        )}
        
        <div className="flex-1 overflow-auto">
          {appContext ? (
            <AppContextProvider.Provider value={appContext}>
              {children}
            </AppContextProvider.Provider>
          ) : (
            <div className="p-6">
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  Unable to initialize app context. Please try refreshing the page.
                </AlertDescription>
              </Alert>
            </div>
          )}
        </div>
      </div>
    </BaseAppLayout>
  );
}

// Hook to access app context
export function useAppContext(): AppContext {
  const context = useContext(AppContextProvider);
  
  if (!context) {
    throw new Error('useAppContext must be used within an AppLayout component');
  }
  
  return context;
}

// HOC for components that require specific permissions
export function withAppPermissions<P extends object>(
  Component: React.ComponentType<P>,
  requiredPermissions: string[]
) {
  return function WrappedComponent(props: P) {
    const appContext = useAppContext();
    
    // Check if user has required permissions
    const hasPermissions = requiredPermissions.every(permission => 
      appContext.permissions.includes(permission)
    );
    
    if (!hasPermissions) {
      return (
        <div className="p-6">
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              You don't have permission to access this feature. Required permissions: {requiredPermissions.join(', ')}
            </AlertDescription>
          </Alert>
        </div>
      );
    }
    
    return <Component {...props} />;
  };
}

// Hook for permission checking
export function useAppPermissions() {
  const appContext = useAppContext();
  
  const hasPermission = React.useCallback((permission: string) => {
    return appContext.permissions.includes(permission);
  }, [appContext.permissions]);
  
  const hasAllPermissions = React.useCallback((permissions: string[]) => {
    return permissions.every(permission => appContext.permissions.includes(permission));
  }, [appContext.permissions]);
  
  const hasAnyPermission = React.useCallback((permissions: string[]) => {
    return permissions.some(permission => appContext.permissions.includes(permission));
  }, [appContext.permissions]);
  
  const requirePermission = React.useCallback((permission: string) => {
    if (!hasPermission(permission)) {
      throw new AppPermissionError(`Permission required: ${permission}`, permission);
    }
  }, [hasPermission]);
  
  return {
    permissions: appContext.permissions,
    hasPermission,
    hasAllPermissions,
    hasAnyPermission,
    requirePermission,
  };
}