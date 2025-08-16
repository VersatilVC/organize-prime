import * as React from 'react';

// Safe React hook access with null checks
const safeUseEffect = React.useEffect || (() => {});
const safeUseRef = React.useRef || (() => ({ current: undefined }));
const safeUseCallback = React.useCallback || ((fn: any) => fn);

interface PerformanceMetrics {
  renderTime: number;
  memoryUsage?: number;
  componentCount: number;
  timestamp: number;
}

/**
 * Hook to monitor component performance and memory usage
 */
export function usePerformanceMonitor(componentName: string, enabled: boolean = process.env.NODE_ENV === 'development') {
  // Return early if React hooks are not available
  if (!React.useEffect || !React.useRef || !React.useCallback) {
    console.warn('React hooks not available - performance monitoring disabled');
    return {
      metrics: [],
      averageRenderTime: 0,
      renderCount: 0,
    };
  }

  const startTimeRef = safeUseRef<number>();
  const renderCountRef = safeUseRef(0);
  const metricsRef = safeUseRef<PerformanceMetrics[]>([]);

  // Start performance measurement
  const startMeasurement = safeUseCallback(() => {
    if (!enabled) return;
    startTimeRef.current = performance.now();
  }, [enabled]);

  // End performance measurement
  const endMeasurement = safeUseCallback(() => {
    if (!enabled || !startTimeRef.current) return;
    
    const renderTime = performance.now() - startTimeRef.current;
    renderCountRef.current++;

    const metrics: PerformanceMetrics = {
      renderTime,
      componentCount: renderCountRef.current,
      timestamp: Date.now(),
    };

    // Add memory usage if available
    if ('memory' in performance) {
      metrics.memoryUsage = (performance as any).memory.usedJSHeapSize;
    }

    metricsRef.current.push(metrics);

    // Keep only last 100 measurements
    if (metricsRef.current.length > 100) {
      metricsRef.current = metricsRef.current.slice(-100);
    }

    // Log performance warnings in development
    if (renderTime > 16.67) { // More than one frame (60fps)
      console.warn(`⚠️ Slow render in ${componentName}: ${renderTime.toFixed(2)}ms`);
    }

    startTimeRef.current = undefined;
  }, [enabled, componentName]);

  // Measure component mount time
  safeUseEffect(() => {
    startMeasurement();
    return endMeasurement;
  });

  // Measure each render
  safeUseEffect(() => {
    startMeasurement();
    endMeasurement();
  });

  return {
    metrics: metricsRef.current,
    averageRenderTime: metricsRef.current.length > 0 
      ? metricsRef.current.reduce((sum, m) => sum + m.renderTime, 0) / metricsRef.current.length 
      : 0,
    renderCount: renderCountRef.current,
  };
}

/**
 * Hook to cleanup memory leaks and optimize garbage collection
 */
export function useMemoryOptimization() {
  // Return early if React hooks are not available
  if (!React.useEffect || !React.useRef || !React.useCallback) {
    return {
      addCleanupFunction: () => {},
      forceCleanup: () => {},
      cleanupCount: 0,
    };
  }

  const cleanupFunctionsRef = safeUseRef<(() => void)[]>([]);

  const addCleanupFunction = safeUseCallback((fn: () => void) => {
    cleanupFunctionsRef.current.push(fn);
  }, []);

  const forceCleanup = safeUseCallback(() => {
    cleanupFunctionsRef.current.forEach(fn => {
      try {
        fn();
      } catch (error) {
        console.error('Error during cleanup:', error);
      }
    });
    cleanupFunctionsRef.current = [];
    
    // Suggest garbage collection if available
    if ('gc' in window) {
      (window as any).gc();
    }
  }, []);

  // Cleanup on unmount
  safeUseEffect(() => {
    return () => {
      forceCleanup();
    };
  }, [forceCleanup]);

  // Periodic cleanup every 5 minutes
  safeUseEffect(() => {
    const interval = setInterval(() => {
      if (cleanupFunctionsRef.current.length > 10) {
        forceCleanup();
      }
    }, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, [forceCleanup]);

  return {
    addCleanupFunction,
    forceCleanup,
    cleanupCount: cleanupFunctionsRef.current.length,
  };
}

/**
 * Hook to measure and optimize bundle loading performance
 */
export function useBundlePerformance() {
  // Return early if React hooks are not available
  if (!React.useEffect) {
    return;
  }

  safeUseEffect(() => {
    // Measure initial bundle load time
    if ('performance' in window && 'getEntriesByType' in performance) {
      const navigationEntries = performance.getEntriesByType('navigation') as PerformanceNavigationTiming[];
      
      if (navigationEntries.length > 0) {
        const entry = navigationEntries[0];
        
        // Only log if values are valid (not 0 or NaN)
        if (entry.loadEventEnd > 0 && entry.navigationStart > 0) {
          const loadTime = entry.loadEventEnd - entry.navigationStart;
          const domContentLoaded = entry.domContentLoadedEventEnd - entry.navigationStart;
          const timeToInteractive = entry.loadEventEnd - entry.fetchStart;
          
          if (loadTime > 0 && !isNaN(loadTime)) {
            console.log('📊 Bundle Performance:', {
              totalLoadTime: `${loadTime.toFixed(2)}ms`,
              domContentLoaded: `${domContentLoaded.toFixed(2)}ms`,
              timeToInteractive: `${timeToInteractive.toFixed(2)}ms`,
            });
          }
        }
      }
    }

    // Monitor resource loading
    if ('PerformanceObserver' in window) {
      const observer = new PerformanceObserver((list) => {
        list.getEntries().forEach((entry) => {
          if (entry.entryType === 'resource' && entry.name.includes('.js')) {
            const resourceEntry = entry as PerformanceResourceTiming;
            const loadTime = resourceEntry.responseEnd - resourceEntry.fetchStart;
            
            if (loadTime > 1000) { // More than 1 second
              console.warn(`🐌 Slow resource load: ${entry.name} took ${loadTime.toFixed(2)}ms`);
            }
          }
        });
      });

      observer.observe({ entryTypes: ['resource'] });

      return () => observer.disconnect();
    }
  }, []);
}