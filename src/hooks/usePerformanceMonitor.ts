import { useEffect, useRef, useCallback } from 'react';

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
  const startTimeRef = useRef<number>();
  const renderCountRef = useRef(0);
  const metricsRef = useRef<PerformanceMetrics[]>([]);

  // Start performance measurement
  const startMeasurement = useCallback(() => {
    if (!enabled) return;
    startTimeRef.current = performance.now();
  }, [enabled]);

  // End performance measurement
  const endMeasurement = useCallback(() => {
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
  useEffect(() => {
    startMeasurement();
    return endMeasurement;
  });

  // Measure each render
  useEffect(() => {
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
  const cleanupFunctionsRef = useRef<(() => void)[]>([]);

  const addCleanupFunction = useCallback((fn: () => void) => {
    cleanupFunctionsRef.current.push(fn);
  }, []);

  const forceCleanup = useCallback(() => {
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
  useEffect(() => {
    return () => {
      forceCleanup();
    };
  }, [forceCleanup]);

  // Periodic cleanup every 5 minutes
  useEffect(() => {
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
  useEffect(() => {
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
  }, []);
}