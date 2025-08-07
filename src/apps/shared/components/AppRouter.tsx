import React, { Suspense, lazy, useMemo } from 'react';
import { Routes, Route, Navigate, useParams } from 'react-router-dom';
import { AppModule, AppRoute } from '../types/AppTypes';
import { AppLayout } from './AppLayout';
import { AppDashboard } from './AppDashboard';
import { AppSettings } from './AppSettings';
import { LoadingSkeletons } from '@/components/LoadingSkeletons';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle } from 'lucide-react';
import { useAppConfig } from '../hooks/useAppConfig';
import { useMarketplaceApps } from '@/hooks/database/useMarketplaceApps';

// App registry - this would be populated dynamically in a real implementation
const APP_REGISTRY: Record<string, () => Promise<{ default: AppModule }>> = {
  // Example apps - these would be dynamically loaded
  // 'crm': () => import('@/apps/crm/CRMModule'),
  // 'inventory': () => import('@/apps/inventory/InventoryModule'),
  // Add more apps as they're developed
};

export interface AppRouterProps {
  basePath?: string;
  fallbackComponent?: React.ComponentType;
}

export function AppRouter({ basePath = '/features', fallbackComponent }: AppRouterProps) {
  const params = useParams();
  const appSlug = params.slug;

  const { data: marketplaceApps, isLoading: appsLoading } = useMarketplaceApps();

  // Find the app in marketplace
  const marketplaceApp = useMemo(() => {
    if (!marketplaceApps || !appSlug) return null;
    return marketplaceApps.find(app => app.slug === appSlug);
  }, [marketplaceApps, appSlug]);

  // Get app configuration
  const { isInstalled, isLoading: configLoading } = useAppConfig({ 
    appId: marketplaceApp?.id || '',
    autoTrackUsage: false // Don't track usage for router-level operations
  });

  // Loading state
  if (appsLoading || configLoading) {
    return (
      <div className="p-6">
        <LoadingSkeletons.Header />
        <LoadingSkeletons.Content />
      </div>
    );
  }

  // App not found in marketplace
  if (!marketplaceApp) {
    return (
      <div className="p-6">
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            App "{appSlug}" not found in marketplace. Please check the URL or contact your administrator.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  // App not installed
  if (!isInstalled) {
    return (
      <div className="p-6">
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            App "{marketplaceApp.name}" is not installed in your organization. 
            Please install it from the marketplace first.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <AppLayout
      appId={marketplaceApp.id}
      appName={marketplaceApp.name}
      permissions={marketplaceApp.required_permissions || []}
    >
      <ErrorBoundary>
        <Suspense fallback={<LoadingSkeletons.Content />}>
          <Routes>
            {/* Default dashboard route */}
            <Route
              path="/"
              element={
                <DefaultAppDashboard 
                  appId={marketplaceApp.id}
                  appName={marketplaceApp.name}
                  appDescription={marketplaceApp.description}
                />
              }
            />
            
            {/* Settings route */}
            <Route
              path="/settings"
              element={
                <DefaultAppSettings 
                  appId={marketplaceApp.id}
                  appName={marketplaceApp.name}
                  settingsSchema={marketplaceApp.settings_schema}
                />
              }
            />

            {/* Dynamic app module routes */}
            <Route
              path="/*"
              element={
                <DynamicAppModule 
                  appSlug={appSlug!}
                  marketplaceApp={marketplaceApp}
                  fallbackComponent={fallbackComponent}
                />
              }
            />
          </Routes>
        </Suspense>
      </ErrorBoundary>
    </AppLayout>
  );
}

// Default dashboard component for apps
function DefaultAppDashboard({ 
  appId, 
  appName, 
  appDescription 
}: { 
  appId: string; 
  appName: string; 
  appDescription: string;
}) {
  return (
    <AppDashboard
      title={`${appName} Dashboard`}
      description={appDescription}
      showAnalytics={true}
      showQuickActions={true}
    >
      <div className="text-center py-12">
        <h3 className="text-lg font-semibold mb-2">Welcome to {appName}</h3>
        <p className="text-muted-foreground">
          This app is ready to use. Explore the features using the navigation menu.
        </p>
      </div>
    </AppDashboard>
  );
}

// Default settings component for apps
function DefaultAppSettings({ 
  appId, 
  appName, 
  settingsSchema 
}: { 
  appId: string; 
  appName: string; 
  settingsSchema: any;
}) {
  if (!settingsSchema || !settingsSchema.sections || settingsSchema.sections.length === 0) {
    return (
      <div className="p-6">
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            No settings configuration available for this app.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <AppSettings
      schema={settingsSchema}
      title={`${appName} Settings`}
      showWebhookConfig={true}
    />
  );
}

// Dynamic app module loader
function DynamicAppModule({ 
  appSlug, 
  marketplaceApp,
  fallbackComponent: FallbackComponent
}: { 
  appSlug: string; 
  marketplaceApp: any;
  fallbackComponent?: React.ComponentType;
}) {
  // Try to load the app module dynamically
  const AppModule = useMemo(() => {
    const moduleLoader = APP_REGISTRY[appSlug];
    
    if (moduleLoader) {
      return lazy(moduleLoader);
    }
    
    return null;
  }, [appSlug]);

  // If app module exists, render it
  if (AppModule) {
    return (
      <Suspense fallback={<LoadingSkeletons.Content />}>
        <AppModule />
      </Suspense>
    );
  }

  // If fallback component provided, use it
  if (FallbackComponent) {
    return <FallbackComponent />;
  }

  // Default fallback for apps without custom modules
  return (
    <div className="p-6">
      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          Custom module for "{marketplaceApp.name}" is not yet available. 
          This app is configured and ready, but additional development is needed 
          to provide custom functionality.
        </AlertDescription>
      </Alert>
      
      <div className="mt-6 space-y-4">
        <h3 className="text-lg font-semibold">Available Features:</h3>
        <ul className="list-disc list-inside space-y-2 text-sm text-muted-foreground">
          <li>App configuration and settings management</li>
          <li>Usage analytics and monitoring</li>
          <li>N8N webhook integration</li>
          <li>Organization-level access control</li>
        </ul>
      </div>
    </div>
  );
}

// Hook for registering app modules dynamically
export function useAppRegistry() {
  const registerApp = React.useCallback((slug: string, moduleLoader: () => Promise<{ default: AppModule }>) => {
    APP_REGISTRY[slug] = moduleLoader;
  }, []);

  const unregisterApp = React.useCallback((slug: string) => {
    delete APP_REGISTRY[slug];
  }, []);

  const getRegisteredApps = React.useCallback(() => {
    return Object.keys(APP_REGISTRY);
  }, []);

  return {
    registerApp,
    unregisterApp,
    getRegisteredApps,
  };
}

// Enhanced FeatureRouter that includes app routing
export function EnhancedFeatureRouter() {
  return (
    <Routes>
      {/* App routes */}
      <Route path="/:slug/*" element={<AppRouter />} />
      
      {/* Fallback */}
      <Route path="*" element={<Navigate to="/marketplace" replace />} />
    </Routes>
  );
}