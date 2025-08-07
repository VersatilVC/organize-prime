// Export all shared components
export { AppLayout, useAppContext, withAppPermissions, useAppPermissions } from './components/AppLayout';
export { AppDashboard } from './components/AppDashboard';
export { AppSettings } from './components/AppSettings';
export { 
  AppNavigation, 
  AppSidebarNavigation, 
  AppTopNavigation, 
  AppBreadcrumbNavigation 
} from './components/AppNavigation';
export { AppRouter, EnhancedFeatureRouter, useAppRegistry } from './components/AppRouter';

// Export all shared hooks
export { useAppConfig, useInstalledApps, useAppInstallationStatus } from './hooks/useAppConfig';
export { useAppNavigation, useNavigationItem, useIsNavigationItemActive } from './hooks/useAppNavigation';
export { 
  useN8NIntegration, 
  useWebhookConfig, 
  useWebhookAnalytics, 
  useCommonWebhooks 
} from './hooks/useN8NIntegration';

// Export all shared services
export { AppConfigService } from './services/AppConfigService';
export { N8NWebhookService } from './services/N8NWebhookService';
export { AppAnalyticsService } from './services/AppAnalyticsService';

// Export all shared types
export type {
  AppModule,
  AppRoute,
  NavigationItem,
  AppSettingsSchema,
  SettingsSection,
  SettingsField,
  AppConfiguration,
  AppContext,
  AppModuleProps,
  AppHooks,
  N8NWebhookConfig,
  AppAnalyticsEvent,
  MarketplaceAppDetails,
  AppInstallationStatus,
} from './types/AppTypes';

// Export error classes
export {
  AppConfigurationError,
  AppPermissionError,
  N8NWebhookError,
} from './types/AppTypes';

// Utility function to create a basic app module
export function createAppModule(config: {
  id: string;
  name: string;
  slug: string;
  version: string;
  component: React.ComponentType<any>;
  routes?: any[];
  navigation?: any[];
  permissions?: string[];
  settings?: any;
}): AppModule {
  return {
    routes: [],
    navigation: [],
    permissions: [],
    settings: { sections: [], version: '1.0.0' },
    ...config,
  };
}

// Utility function to create settings schema
export function createSettingsSchema(sections: any[]): any {
  return {
    sections,
    version: '1.0.0',
  };
}

// Utility function to create navigation items
export function createNavigationItem(config: {
  id: string;
  label: string;
  path: string;
  icon?: string;
  permissions?: string[];
  children?: any[];
  order?: number;
}): NavigationItem {
  return {
    children: [],
    permissions: [],
    order: 0,
    ...config,
  };
}