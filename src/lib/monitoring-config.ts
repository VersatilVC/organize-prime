/**
 * Centralized configuration for performance monitoring and error handling
 * Environment-aware settings with safe defaults
 */

interface MonitoringConfig {
  performance: {
    enabled: boolean;
    enableMemoryTracking: boolean;
    slowRenderThreshold: number;
    maxMetrics: number;
    throttleMs: number;
  };
  memory: {
    enabled: boolean;
    cleanupThreshold: number;
    cleanupInterval: number;
  };
  bundle: {
    enabled: boolean;
    slowResourceThreshold: number;
    logPerformanceMetrics: boolean;
  };
  errorReporting: {
    enabled: boolean;
    maxQueueSize: number;
    batchTimeout: number;
    enableConsoleOverride: boolean;
  };
  logging: {
    enableSecureLogger: boolean;
    enableDevLogger: boolean;
    enableProductionErrors: boolean;
  };
}

// Get environment-aware configuration
function createMonitoringConfig(): MonitoringConfig {
  const isDev = import.meta.env?.DEV ?? false;
  const isProd = import.meta.env?.PROD ?? true;
  
  return {
    performance: {
      enabled: isDev && import.meta.env?.VITE_ENABLE_PERFORMANCE_MONITORING !== 'false',
      enableMemoryTracking: isDev && import.meta.env?.VITE_ENABLE_MEMORY_TRACKING !== 'false',
      slowRenderThreshold: isDev ? 16.67 : 50, // Stricter in dev
      maxMetrics: isDev ? 100 : 50, // More metrics in dev
      throttleMs: isDev ? 50 : 200, // Less throttling in dev
    },
    memory: {
      enabled: import.meta.env?.VITE_ENABLE_MEMORY_OPTIMIZATION !== 'false',
      cleanupThreshold: isDev ? 10 : 20,
      cleanupInterval: isDev ? 5 * 60 * 1000 : 10 * 60 * 1000, // 5min dev, 10min prod
    },
    bundle: {
      enabled: import.meta.env?.VITE_ENABLE_BUNDLE_MONITORING !== 'false',
      slowResourceThreshold: isDev ? 1000 : 3000, // 1s dev, 3s prod
      logPerformanceMetrics: isDev,
    },
    errorReporting: {
      enabled: import.meta.env?.VITE_ENABLE_ERROR_REPORTING !== 'false',
      maxQueueSize: isDev ? 200 : 100,
      batchTimeout: isDev ? 2000 : 5000, // Faster processing in dev
      enableConsoleOverride: isDev && import.meta.env?.VITE_ENABLE_CONSOLE_OVERRIDE !== 'false',
    },
    logging: {
      enableSecureLogger: true,
      enableDevLogger: isDev,
      enableProductionErrors: isProd,
    },
  };
}

export const monitoringConfig = createMonitoringConfig();

// Environment detection utilities
export const environment = {
  isDevelopment: import.meta.env?.DEV ?? false,
  isProduction: import.meta.env?.PROD ?? true,
  isTest: import.meta.env?.NODE_ENV === 'test',
  
  // Feature flags
  features: {
    performanceMonitoring: monitoringConfig.performance.enabled,
    memoryOptimization: monitoringConfig.memory.enabled,
    bundleMonitoring: monitoringConfig.bundle.enabled,
    errorReporting: monitoringConfig.errorReporting.enabled,
    consoleOverride: monitoringConfig.errorReporting.enableConsoleOverride,
  },
  
  // Thresholds
  thresholds: {
    slowRender: monitoringConfig.performance.slowRenderThreshold,
    slowResource: monitoringConfig.bundle.slowResourceThreshold,
    memoryCleanup: monitoringConfig.memory.cleanupThreshold,
  },
};

// Export configuration for use in hooks and components
export default monitoringConfig;