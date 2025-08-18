import * as React from 'react';

interface PerformanceMetrics {
  renderTime: number;
  memoryUsage?: number;
  componentCount: number;
  timestamp: number;
}

interface PerformanceConfig {
  enabled?: boolean;
  enableMemoryTracking?: boolean;
  maxMetrics?: number;
  slowRenderThreshold?: number;
  throttleMs?: number;
}

const DEFAULT_CONFIG: Required<PerformanceConfig> = {
  enabled: import.meta.env.DEV && import.meta.env.VITE_ENABLE_PERFORMANCE_MONITORING !== 'false',
  enableMemoryTracking: import.meta.env.DEV,
  maxMetrics: 50, // Reduced from 100 to lower memory usage
  slowRenderThreshold: 16.67, // 60fps threshold
  throttleMs: 100, // Throttle measurements to every 100ms
};

/**
 * Optimized performance monitoring hook with safeguards against infinite re-renders
 * and reduced overhead for development
 */
export function usePerformanceMonitor(
  componentName: string, 
  config: PerformanceConfig = {}
) {
  const finalConfig = React.useMemo(() => ({ ...DEFAULT_CONFIG, ...config }), [config]);
  
  // Early return if monitoring is disabled
  if (!finalConfig.enabled) {
    return React.useMemo(() => ({
      metrics: [],
      averageRenderTime: 0,
      renderCount: 0,
      startMeasurement: () => {},
      endMeasurement: () => {},
    }), []);
  }

  const renderCountRef = React.useRef(0);
  const metricsRef = React.useRef<PerformanceMetrics[]>([]);
  const lastMeasurementRef = React.useRef(0);
  const measurementInProgressRef = React.useRef(false);

  // Throttled measurement function to prevent excessive calls
  const measureRender = React.useCallback(() => {
    const now = performance.now();
    
    // Throttle measurements to prevent excessive overhead
    if (now - lastMeasurementRef.current < finalConfig.throttleMs) {
      return;
    }
    
    // Prevent overlapping measurements
    if (measurementInProgressRef.current) {
      return;
    }
    
    measurementInProgressRef.current = true;
    lastMeasurementRef.current = now;
    
    // Use setTimeout to measure after render
    setTimeout(() => {
      try {
        const renderTime = performance.now() - now;
        renderCountRef.current++;

        const metrics: PerformanceMetrics = {
          renderTime,
          componentCount: renderCountRef.current,
          timestamp: Date.now(),
        };

        // Add memory usage if enabled and available
        if (finalConfig.enableMemoryTracking && 'memory' in performance) {
          try {
            metrics.memoryUsage = (performance as any).memory?.usedJSHeapSize;
          } catch {
            // Silent failure for memory access
          }
        }

        metricsRef.current.push(metrics);

        // Keep only recent measurements
        if (metricsRef.current.length > finalConfig.maxMetrics) {
          metricsRef.current = metricsRef.current.slice(-finalConfig.maxMetrics);
        }

        // Log performance warnings only for significant slowdowns
        if (renderTime > finalConfig.slowRenderThreshold) {
          console.warn(`⚠️ Slow render in ${componentName}: ${renderTime.toFixed(2)}ms`);
        }
      } catch (error) {
        // Silent failure to prevent monitoring from breaking the app
        console.debug('Performance measurement failed:', error);
      } finally {
        measurementInProgressRef.current = false;
      }
    }, 0);
  }, [componentName, finalConfig]);

  // Measure only on actual re-renders, not on every effect run
  React.useEffect(() => {
    measureRender();
  });

  return React.useMemo(() => ({
    metrics: metricsRef.current,
    averageRenderTime: metricsRef.current.length > 0 
      ? metricsRef.current.reduce((sum, m) => sum + m.renderTime, 0) / metricsRef.current.length 
      : 0,
    renderCount: renderCountRef.current,
    startMeasurement: () => {}, // Legacy API compatibility
    endMeasurement: () => {}, // Legacy API compatibility
  }), []);
}

/**
 * Optimized memory management hook that doesn't interfere with normal operation
 */
export function useMemoryOptimization(options: {
  enabled?: boolean;
  cleanupThreshold?: number;
  cleanupInterval?: number;
} = {}) {
  const {
    enabled = import.meta.env.DEV && import.meta.env.VITE_ENABLE_MEMORY_OPTIMIZATION !== 'false',
    cleanupThreshold = 20, // Increased threshold
    cleanupInterval = 10 * 60 * 1000, // 10 minutes instead of 5
  } = options;

  const cleanupFunctionsRef = React.useRef<(() => void)[]>([]);
  const lastCleanupRef = React.useRef(0);

  const addCleanupFunction = React.useCallback((fn: () => void) => {
    if (!enabled) return;
    
    try {
      cleanupFunctionsRef.current.push(fn);
    } catch (error) {
      // Silent failure to prevent breaking normal operation
      console.debug('Failed to add cleanup function:', error);
    }
  }, [enabled]);

  const forceCleanup = React.useCallback(() => {
    if (!enabled) return;
    
    const now = Date.now();
    // Prevent too frequent cleanups
    if (now - lastCleanupRef.current < 30000) { // 30 seconds minimum between cleanups
      return;
    }
    
    lastCleanupRef.current = now;
    const cleanupFunctions = [...cleanupFunctionsRef.current];
    cleanupFunctionsRef.current = [];
    
    // Run cleanup functions safely
    cleanupFunctions.forEach((fn, index) => {
      try {
        fn();
      } catch (error) {
        console.debug(`Cleanup function ${index} failed:`, error);
      }
    });
    
    // Suggest garbage collection only in development
    if (import.meta.env.DEV && 'gc' in window) {
      try {
        (window as any).gc();
      } catch {
        // Silent failure
      }
    }
  }, [enabled]);

  // Cleanup on unmount
  React.useEffect(() => {
    if (!enabled) return;
    
    return () => {
      try {
        forceCleanup();
      } catch (error) {
        // Silent cleanup failure
        console.debug('Unmount cleanup failed:', error);
      }
    };
  }, [forceCleanup, enabled]);

  // Periodic cleanup with configurable interval
  React.useEffect(() => {
    if (!enabled) return;
    
    const interval = setInterval(() => {
      try {
        if (cleanupFunctionsRef.current.length > cleanupThreshold) {
          forceCleanup();
        }
      } catch (error) {
        console.debug('Periodic cleanup failed:', error);
      }
    }, cleanupInterval);

    return () => {
      try {
        clearInterval(interval);
      } catch {
        // Silent failure
      }
    };
  }, [forceCleanup, enabled, cleanupThreshold, cleanupInterval]);

  return React.useMemo(() => ({
    addCleanupFunction,
    forceCleanup,
    cleanupCount: cleanupFunctionsRef.current.length,
    enabled,
  }), [addCleanupFunction, forceCleanup, enabled]);
}

/**
 * Optimized bundle performance monitoring with throttling and error handling
 */
export function useBundlePerformance(options: {
  enabled?: boolean;
  slowResourceThreshold?: number;
  logPerformanceMetrics?: boolean;
} = {}) {
  const {
    enabled = import.meta.env.DEV && import.meta.env.VITE_ENABLE_BUNDLE_MONITORING !== 'false',
    slowResourceThreshold = 2000, // Increased to 2 seconds to reduce noise
    logPerformanceMetrics = import.meta.env.DEV,
  } = options;

  React.useEffect(() => {
    if (!enabled) return;
    
    let observer: PerformanceObserver | null = null;
    
    try {
      // Measure initial bundle load time with error handling
      if ('performance' in window && 'getEntriesByType' in performance) {
        const measureBundlePerformance = () => {
          try {
            const navigationEntries = performance.getEntriesByType('navigation') as PerformanceNavigationTiming[];
            
            if (navigationEntries.length > 0) {
              const entry = navigationEntries[0];
              
              // Validate metrics before logging
              const loadTime = entry.loadEventEnd - entry.navigationStart;
              const domContentLoaded = entry.domContentLoadedEventEnd - entry.navigationStart;
              
              if (loadTime > 0 && !isNaN(loadTime) && logPerformanceMetrics) {
                console.log('📊 Bundle Performance:', {
                  totalLoadTime: `${loadTime.toFixed(2)}ms`,
                  domContentLoaded: `${domContentLoaded.toFixed(2)}ms`,
                  timeToInteractive: `${(entry.loadEventEnd - entry.fetchStart).toFixed(2)}ms`,
                });
              }
            }
          } catch (error) {
            console.debug('Bundle performance measurement failed:', error);
          }
        };
        
        // Delay measurement to ensure navigation timing is available
        setTimeout(measureBundlePerformance, 1000);
      }

      // Monitor resource loading with throttling
      if ('PerformanceObserver' in window) {
        const reportedResources = new Set<string>();
        
        observer = new PerformanceObserver((list) => {
          try {
            list.getEntries().forEach((entry) => {
              if (entry.entryType === 'resource' && entry.name.includes('.js')) {
                const resourceEntry = entry as PerformanceResourceTiming;
                const loadTime = resourceEntry.responseEnd - resourceEntry.fetchStart;
                
                // Only report each slow resource once
                if (loadTime > slowResourceThreshold && !reportedResources.has(entry.name)) {
                  reportedResources.add(entry.name);
                  console.warn(`🐌 Slow resource load: ${entry.name.split('/').pop()} took ${loadTime.toFixed(2)}ms`);
                }
              }
            });
          } catch (error) {
            console.debug('Resource performance monitoring failed:', error);
          }
        });

        try {
          observer.observe({ entryTypes: ['resource'] });
        } catch (error) {
          console.debug('Failed to start performance observer:', error);
          observer = null;
        }
      }
    } catch (error) {
      console.debug('Bundle performance monitoring setup failed:', error);
    }

    return () => {
      try {
        observer?.disconnect();
      } catch (error) {
        console.debug('Failed to disconnect performance observer:', error);
      }
    };
  }, [enabled, slowResourceThreshold, logPerformanceMetrics]);
}