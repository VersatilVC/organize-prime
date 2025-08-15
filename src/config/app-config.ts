// Centralized configuration management
import { useState, useEffect } from 'react';

// Deep partial type for configuration overrides
type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

interface AppConfig {
  app: {
    name: string;
    version: string;
    environment: 'development' | 'staging' | 'production';
    debug: boolean;
  };
  supabase: {
    url: string;
    anonKey: string;
    serviceRoleKey?: string;
  };
  features: {
    enableNotifications: boolean;
    enableFileUploads: boolean;
    enableAnalytics: boolean;
    enableMFA: boolean;
    maxFileSize: number; // in bytes
    maxUsersPerOrg: number;
    maxOrganizationsPerUser: number;
    invitationExpiryDays: number;
  };
  ui: {
    itemsPerPage: number;
    debounceDelay: number;
    toastDuration: number;
    sidebarWidth: number;
    mobileBreakpoint: number;
    animationDuration: number;
    theme: {
      defaultMode: 'light' | 'dark' | 'system';
      enableCustomThemes: boolean;
    };
  };
  security: {
    maxLoginAttempts: number;
    loginLockoutDuration: number; // in minutes
    sessionTimeout: number; // in seconds
    refreshTokenDuration: number; // in seconds
    passwordMinLength: number;
    requireMFA: boolean;
    allowedImageTypes: string[];
    maxFileUploadSize: number; // in MB
    enableRateLimiting: boolean;
    rateLimitWindow: number; // in minutes
    rateLimitMax: number; // max requests per window
  };
  api: {
    baseURL: string;
    timeout: number;
    retryAttempts: number;
    retryDelay: number;
    enableRequestLogging: boolean;
  };
  cache: {
    defaultStaleTime: number; // in milliseconds
    defaultCacheTime: number; // in milliseconds
    backgroundRefetchInterval: number; // in milliseconds
    enablePersistentCache: boolean;
  };
  analytics: {
    enableTracking: boolean;
    enableErrorReporting: boolean;
    enablePerformanceMonitoring: boolean;
    sampleRate: number; // 0-1
  };
}

// Default configuration values
const defaultConfig: AppConfig = {
  app: {
    name: 'Organization Management Platform',
    version: '1.0.0',
    environment: 'development',
    debug: true,
  },
  supabase: {
    url: 'https://cjwgfoingscquolnfkhh.supabase.co',
    anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNqd2dmb2luZ3NjcXVvbG5ma2hoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM0Mjc4NjIsImV4cCI6MjA2OTAwMzg2Mn0.CC2mCYNcN0btKcHvt_Rc4dKkqV6LVGRN1z4DVo10oYo',
  },
  features: {
    enableNotifications: true,
    enableFileUploads: true,
    enableAnalytics: false,
    enableMFA: false,
    maxFileSize: 10 * 1024 * 1024, // 10MB
    maxUsersPerOrg: 1000,
    maxOrganizationsPerUser: 10,
    invitationExpiryDays: 7,
  },
  ui: {
    itemsPerPage: 10,
    debounceDelay: 300,
    toastDuration: 5000,
    sidebarWidth: 280,
    mobileBreakpoint: 768,
    animationDuration: 200,
    theme: {
      defaultMode: 'system',
      enableCustomThemes: true,
    },
  },
  security: {
    maxLoginAttempts: 5,
    loginLockoutDuration: 15,
    sessionTimeout: 3600, // 1 hour
    refreshTokenDuration: 604800, // 7 days
    passwordMinLength: 8,
    requireMFA: false,
    allowedImageTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
    maxFileUploadSize: 10, // 10MB
    enableRateLimiting: true,
    rateLimitWindow: 15, // 15 minutes
    rateLimitMax: 100, // 100 requests per 15 minutes
  },
  api: {
    baseURL: 'https://cjwgfoingscquolnfkhh.supabase.co',
    timeout: 30000, // 30 seconds
    retryAttempts: 3,
    retryDelay: 1000,
    enableRequestLogging: false,
  },
  cache: {
    defaultStaleTime: 5 * 60 * 1000, // 5 minutes
    defaultCacheTime: 10 * 60 * 1000, // 10 minutes
    backgroundRefetchInterval: 30 * 1000, // 30 seconds
    enablePersistentCache: true,
  },
  analytics: {
    enableTracking: false,
    enableErrorReporting: true,
    enablePerformanceMonitoring: false,
    sampleRate: 0.1, // 10% sampling
  },
};

// Environment-specific overrides
const getEnvironmentConfig = (): DeepPartial<AppConfig> => {
  const env = (import.meta.env.MODE || 'development') as AppConfig['app']['environment'];
  
  switch (env) {
    case 'production':
      return {
        app: {
          debug: false,
          environment: 'production',
        },
        security: {
          requireMFA: true,
          enableRateLimiting: true,
        },
        api: {
          enableRequestLogging: false,
        },
        analytics: {
          enableTracking: true,
          enableErrorReporting: true,
          enablePerformanceMonitoring: true,
          sampleRate: 1.0,
        },
      };
    
    case 'staging':
      return {
        app: {
          debug: true,
          environment: 'staging',
        },
        security: {
          requireMFA: false,
          enableRateLimiting: true,
        },
        analytics: {
          enableTracking: true,
          enableErrorReporting: true,
          enablePerformanceMonitoring: true,
          sampleRate: 0.5,
        },
      };
    
    case 'development':
    default:
      return {
        app: {
          debug: true,
          environment: 'development',
        },
        security: {
          requireMFA: false,
          enableRateLimiting: false,
        },
        api: {
          enableRequestLogging: true,
        },
        analytics: {
          enableTracking: false,
          enableErrorReporting: false,
          enablePerformanceMonitoring: false,
        },
      };
  }
};

// Deep merge utility
const deepMerge = <T>(target: T, source: DeepPartial<T>): T => {
  const result = { ...target };
  
  for (const key in source) {
    if (source[key] !== undefined) {
      if (typeof source[key] === 'object' && source[key] !== null && !Array.isArray(source[key])) {
        result[key] = deepMerge(
          result[key] as T[typeof key], 
          source[key] as DeepPartial<T[typeof key]>
        );
      } else {
        result[key] = source[key] as T[typeof key];
      }
    }
  }
  
  return result;
};

// Create final configuration
const envConfig = getEnvironmentConfig();
const config: AppConfig = deepMerge(defaultConfig, envConfig);

// Configuration validation
const validateConfig = (): void => {
  const errors: string[] = [];
  
  // Required fields validation
  if (!config.supabase.url) {
    errors.push('Missing Supabase URL');
  }
  
  if (!config.supabase.anonKey) {
    errors.push('Missing Supabase anonymous key');
  }
  
  // URL validation
  try {
    new URL(config.supabase.url);
  } catch {
    errors.push('Invalid Supabase URL format');
  }
  
  // Numeric validation
  if (config.security.sessionTimeout <= 0) {
    errors.push('Session timeout must be greater than 0');
  }
  
  if (config.features.maxFileSize <= 0) {
    errors.push('Max file size must be greater than 0');
  }
  
  if (config.ui.itemsPerPage <= 0) {
    errors.push('Items per page must be greater than 0');
  }
  
  // Throw error if validation fails
  if (errors.length > 0) {
    throw new Error(`Configuration validation failed:\n${errors.join('\n')}`);
  }
};

// Configuration utilities
export class ConfigManager {
  private static instance: ConfigManager;
  private config: AppConfig;
  private listeners: Map<string, ((value: unknown) => void)[]> = new Map();
  
  private constructor() {
    this.config = { ...config };
    validateConfig();
  }
  
  static getInstance(): ConfigManager {
    if (!ConfigManager.instance) {
      ConfigManager.instance = new ConfigManager();
    }
    return ConfigManager.instance;
  }
  
  // Get configuration value with dot notation support
  get<T = unknown>(path: string): T {
    return path.split('.').reduce((obj, key) => obj?.[key], this.config as Record<string, unknown>) as T;
  }
  
  // Set configuration value with dot notation support
  set(path: string, value: unknown): void {
    const keys = path.split('.');
    const lastKey = keys.pop()!;
    const target = keys.reduce((obj, key) => {
      if (!obj[key]) obj[key] = {};
      return obj[key];
    }, this.config as Record<string, unknown>);
    
    const oldValue = target[lastKey];
    target[lastKey] = value;
    
    // Notify listeners
    this.notifyListeners(path, value, oldValue);
  }
  
  // Subscribe to configuration changes
  subscribe(path: string, callback: (value: unknown) => void): () => void {
    if (!this.listeners.has(path)) {
      this.listeners.set(path, []);
    }
    
    this.listeners.get(path)!.push(callback);
    
    // Return unsubscribe function
    return () => {
      const listeners = this.listeners.get(path);
      if (listeners) {
        const index = listeners.indexOf(callback);
        if (index > -1) {
          listeners.splice(index, 1);
        }
      }
    };
  }
  
  // Notify configuration change listeners
  private notifyListeners(path: string, newValue: unknown, oldValue: unknown): void {
    const listeners = this.listeners.get(path);
    if (listeners) {
      listeners.forEach(callback => callback(newValue));
    }
  }
  
  // Get entire configuration
  getAll(): AppConfig {
    return { ...this.config };
  }
  
  // Update multiple configuration values
  update(updates: Partial<AppConfig>): void {
    this.config = deepMerge(this.config, updates);
    validateConfig();
  }
  
  // Feature flag helpers
  isFeatureEnabled(feature: keyof AppConfig['features']): boolean {
    return this.get(`features.${feature}`) === true;
  }
  
  // Environment helpers
  isDevelopment(): boolean {
    return this.config.app.environment === 'development';
  }
  
  isProduction(): boolean {
    return this.config.app.environment === 'production';
  }
  
  isStaging(): boolean {
    return this.config.app.environment === 'staging';
  }
  
  // Debug helper
  isDebugEnabled(): boolean {
    return this.config.app.debug;
  }
}

// Export the configuration instance
export const configManager = ConfigManager.getInstance();

// Export the raw configuration for direct access
export default config;

// Export common configuration getters as convenience functions
export const getConfig = () => configManager.getAll();
export const getAppConfig = () => config.app;
export const getSupabaseConfig = () => config.supabase;
export const getUIConfig = () => config.ui;
export const getSecurityConfig = () => config.security;
export const getFeaturesConfig = () => config.features;
export const getApiConfig = () => config.api;
export const getCacheConfig = () => config.cache;
export const getAnalyticsConfig = () => config.analytics;

// Feature flag helpers
export const isFeatureEnabled = (feature: keyof AppConfig['features']): boolean => {
  return configManager.isFeatureEnabled(feature);
};

// Environment helpers
export const isDevelopment = (): boolean => configManager.isDevelopment();
export const isProduction = (): boolean => configManager.isProduction();
export const isStaging = (): boolean => configManager.isStaging();
export const isDebugEnabled = (): boolean => configManager.isDebugEnabled();

// Configuration hook for React components
export const useConfig = <T = AppConfig>(path?: string): T => {
  const [value, setValue] = useState<T>(
    path ? configManager.get<T>(path) : configManager.getAll() as T
  );
  
  useEffect(() => {
    if (!path) return;
    
    const unsubscribe = configManager.subscribe(path, setValue);
    return unsubscribe;
  }, [path]);
  
  return value;
};

// Export types
export type { AppConfig };

// Initialize configuration validation on module load
try {
  validateConfig();
  
  if (isDebugEnabled()) {
    console.log('Configuration loaded successfully:', {
      environment: config.app.environment,
      features: Object.entries(config.features)
        .filter(([, enabled]) => enabled)
        .map(([feature]) => feature),
      debug: config.app.debug
    });
  }
} catch (error) {
  console.error('Configuration validation failed:', error);
  throw error;
}