import { ReactNode } from 'react';

// Core app module interface
export interface AppModule {
  id: string;
  name: string;
  slug: string;
  version: string;
  routes: AppRoute[];
  navigation: NavigationItem[];
  permissions: string[];
  settings: AppSettingsSchema;
  hooks?: AppHooks;
  component: React.ComponentType<AppModuleProps>;
}

// App route definition
export interface AppRoute {
  path: string;
  component: React.ComponentType<any>;
  title: string;
  description?: string;
  permissions?: string[];
  exact?: boolean;
}

// Navigation item for app-specific navigation
export interface NavigationItem {
  id: string;
  label: string;
  path: string;
  icon?: string;
  permissions?: string[];
  children?: NavigationItem[];
  order?: number;
}

// App settings schema definition
export interface AppSettingsSchema {
  sections: SettingsSection[];
  version: string;
}

export interface SettingsSection {
  id: string;
  title: string;
  description?: string;
  fields: SettingsField[];
}

export interface SettingsField {
  key: string;
  label: string;
  type: 'text' | 'textarea' | 'select' | 'toggle' | 'number' | 'url' | 'email' | 'file';
  required?: boolean;
  default?: any;
  options?: { label: string; value: any }[];
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
    message?: string;
  };
  description?: string;
  placeholder?: string;
}

// App configuration from database
export interface AppConfiguration {
  id: string;
  appId: string;
  organizationId: string;
  settings: Record<string, any>;
  customNavigation: NavigationItem[];
  featureFlags: Record<string, boolean>;
  lastUsedAt?: string;
  status: 'active' | 'inactive' | 'pending';
}

// App context interface
export interface AppContext {
  appId: string;
  appSlug: string;
  appName: string;
  organizationId: string;
  configuration: AppConfiguration;
  permissions: string[];
  updateConfiguration: (settings: Partial<AppConfiguration>) => Promise<void>;
  trackEvent: (event: string, data?: Record<string, any>) => Promise<void>;
}

// App module props passed to each app component
export interface AppModuleProps {
  context: AppContext;
  children?: ReactNode;
}

// App hooks for lifecycle management
export interface AppHooks {
  onInstall?: (context: AppContext) => Promise<void>;
  onUninstall?: (context: AppContext) => Promise<void>;
  onConfigUpdate?: (context: AppContext, oldConfig: AppConfiguration) => Promise<void>;
  onActivate?: (context: AppContext) => Promise<void>;
  onDeactivate?: (context: AppContext) => Promise<void>;
}

// N8N webhook configuration
export interface N8NWebhookConfig {
  webhookId: string;
  url: string;
  method: 'POST' | 'GET' | 'PUT' | 'DELETE';
  headers?: Record<string, string>;
  authentication?: {
    type: 'bearer' | 'basic' | 'api_key';
    credentials: Record<string, string>;
  };
  retryConfig?: {
    maxRetries: number;
    retryDelay: number;
    exponentialBackoff: boolean;
  };
}

// App analytics event
export interface AppAnalyticsEvent {
  appId: string;
  organizationId: string;
  userId: string;
  eventType: string;
  eventCategory: string;
  eventData?: Record<string, any>;
  sessionId?: string;
  timestamp: string;
}

// App error types
export class AppConfigurationError extends Error {
  constructor(message: string, public appId: string, public organizationId: string) {
    super(message);
    this.name = 'AppConfigurationError';
  }
}

export class AppPermissionError extends Error {
  constructor(message: string, public requiredPermission: string) {
    super(message);
    this.name = 'AppPermissionError';
  }
}

export class N8NWebhookError extends Error {
  constructor(message: string, public webhookId: string, public statusCode?: number) {
    super(message);
    this.name = 'N8NWebhookError';
  }
}

// App installation status
export type AppInstallationStatus = 'active' | 'inactive' | 'pending' | 'error';

// App marketplace integration
export interface MarketplaceAppDetails {
  id: string;
  name: string;
  slug: string;
  description: string;
  version: string;
  category: string;
  iconName: string;
  isInstalled: boolean;
  installationStatus?: AppInstallationStatus;
  configSchema: AppSettingsSchema;
  navigationConfig: NavigationItem[];
  requiredPermissions: string[];
  n8nWebhooks?: N8NWebhookConfig[];
}