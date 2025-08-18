import { useEffect, useRef } from 'react';
import { debugSafeguards } from '@/lib/debug-safeguards';

interface PerformanceMetrics {
  renderTime: number;
  updateCount: number;
  lastUpdate: number;
  averageRenderTime: number;
}

const componentMetrics = new Map<string, PerformanceMetrics>();

/**
 * Performance monitoring hook for React components
 * Tracks render times, update frequency, and performance bottlenecks
 */
export function usePerformanceMonitoring(componentName: string, props?: any) {
  const renderStartTime = useRef<number>(0);
  const updateCount = useRef<number>(0);
  const renderTimes = useRef<number[]>([]);

  // Start timing the render
  renderStartTime.current = performance.now();

  useEffect(() => {
    // Calculate render time
    const renderTime = performance.now() - renderStartTime.current;
    updateCount.current += 1;

    // Track render times (keep last 10)
    renderTimes.current.push(renderTime);
    if (renderTimes.current.length > 10) {
      renderTimes.current.shift();
    }

    // Calculate average
    const averageRenderTime = renderTimes.current.reduce((sum, time) => sum + time, 0) / renderTimes.current.length;

    // Update metrics
    const metrics: PerformanceMetrics = {
      renderTime,
      updateCount: updateCount.current,
      lastUpdate: Date.now(),
      averageRenderTime
    };
    
    componentMetrics.set(componentName, metrics);

    // Track with debug safeguards
    debugSafeguards.trackRender(componentName, props);

    // Log performance warnings
    if (import.meta.env.DEV) {
      if (renderTime > 16) { // More than one frame at 60fps
        console.warn(`⚠️ Slow render detected: ${componentName} took ${renderTime.toFixed(2)}ms`, {
          props,
          renderTime,
          averageRenderTime: averageRenderTime.toFixed(2)
        });
      }

      if (updateCount.current > 10 && averageRenderTime > 10) {
        console.warn(`⚠️ Performance concern: ${componentName} has high average render time`, {
          averageRenderTime: averageRenderTime.toFixed(2),
          updateCount: updateCount.current,
          lastRenderTimes: renderTimes.current.map(t => t.toFixed(2))
        });
      }
    }
  });

  return {
    renderTime: renderStartTime.current,
    updateCount: updateCount.current,
    getMetrics: () => componentMetrics.get(componentName),
    getAllMetrics: () => Object.fromEntries(componentMetrics)
  };
}

/**
 * Hook to monitor React Query performance
 */
export function useQueryPerformanceMonitoring(queryKey: string[], queryFn: () => Promise<any>) {
  const queryStartTime = useRef<number>(0);
  const queryCount = useRef<number>(0);
  const queryTimes = useRef<number[]>([]);

  const wrappedQueryFn = async () => {
    queryStartTime.current = performance.now();
    queryCount.current += 1;

    try {
      const result = await queryFn();
      
      const queryTime = performance.now() - queryStartTime.current;
      queryTimes.current.push(queryTime);
      
      if (queryTimes.current.length > 5) {
        queryTimes.current.shift();
      }

      if (import.meta.env.DEV) {
        if (queryTime > 1000) { // Query took more than 1 second
          console.warn(`⚠️ Slow query detected: ${queryKey.join(':')} took ${queryTime.toFixed(2)}ms`);
        }

        // Track with debug safeguards
        debugSafeguards.trackHook(`query:${queryKey.join(':')}`, queryKey);
      }

      return result;
    } catch (error) {
      const queryTime = performance.now() - queryStartTime.current;
      console.error(`❌ Query failed: ${queryKey.join(':')} (${queryTime.toFixed(2)}ms)`, error);
      throw error;
    }
  };

  return wrappedQueryFn;
}

/**
 * Hook to monitor component lifecycle and detect memory leaks
 */
export function useLifecycleMonitoring(componentName: string) {
  const mountTime = useRef<number>(Date.now());
  const unmountCallbacks = useRef<(() => void)[]>([]);

  useEffect(() => {
    if (import.meta.env.DEV) {
      console.log(`🟢 Component mounted: ${componentName}`);
    }

    return () => {
      const lifespan = Date.now() - mountTime.current;
      
      if (import.meta.env.DEV) {
        console.log(`🔴 Component unmounted: ${componentName} (lived ${lifespan}ms)`);
        
        // Execute cleanup callbacks
        unmountCallbacks.current.forEach(callback => {
          try {
            callback();
          } catch (error) {
            console.error(`Error in cleanup callback for ${componentName}:`, error);
          }
        });
      }
    };
  }, [componentName]);

  const addCleanupCallback = (callback: () => void) => {
    unmountCallbacks.current.push(callback);
  };

  return { addCleanupCallback };
}

/**
 * Performance monitoring utility functions
 */
export const performanceMonitoring = {
  /**
   * Get all component performance metrics
   */
  getAllMetrics: () => Object.fromEntries(componentMetrics),

  /**
   * Get metrics for a specific component
   */
  getMetrics: (componentName: string) => componentMetrics.get(componentName),

  /**
   * Clear all metrics
   */
  clearMetrics: () => componentMetrics.clear(),

  /**
   * Generate performance report
   */
  generateReport: () => {
    const metrics = Object.fromEntries(componentMetrics);
    const report = {
      timestamp: new Date().toISOString(),
      totalComponents: componentMetrics.size,
      slowComponents: Object.entries(metrics)
        .filter(([_, m]) => m.averageRenderTime > 10)
        .map(([name, m]) => ({
          name,
          averageRenderTime: m.averageRenderTime.toFixed(2),
          updateCount: m.updateCount
        })),
      frequentlyUpdatingComponents: Object.entries(metrics)
        .filter(([_, m]) => m.updateCount > 10)
        .map(([name, m]) => ({
          name,
          updateCount: m.updateCount,
          averageRenderTime: m.averageRenderTime.toFixed(2)
        })),
      debugStats: debugSafeguards.getStats()
    };

    console.table(report.slowComponents);
    console.table(report.frequentlyUpdatingComponents);
    
    return report;
  },

  /**
   * Monitor page performance
   */
  monitorPagePerformance: () => {
    if (typeof window === 'undefined') return;

    // Monitor page load performance
    window.addEventListener('load', () => {
      setTimeout(() => {
        const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
        
        if (navigation && import.meta.env.DEV) {
          console.log('📊 Page Performance:', {
            domContentLoaded: Math.round(navigation.domContentLoadedEventEnd - navigation.fetchStart),
            loadComplete: Math.round(navigation.loadEventEnd - navigation.fetchStart),
            firstPaint: Math.round(performance.getEntriesByName('first-paint')[0]?.startTime || 0),
            firstContentfulPaint: Math.round(performance.getEntriesByName('first-contentful-paint')[0]?.startTime || 0)
          });
        }
      }, 0);
    });

    // Monitor largest contentful paint
    if ('LargestContentfulPaint' in window) {
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (import.meta.env.DEV) {
            console.log(`📊 Largest Contentful Paint: ${Math.round(entry.startTime)}ms`);
          }
        }
      }).observe({ entryTypes: ['largest-contentful-paint'] });
    }

    // Monitor cumulative layout shift
    let clsScore = 0;
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (!(entry as any).hadRecentInput) {
          clsScore += (entry as any).value;
        }
      }
      
      if (import.meta.env.DEV && clsScore > 0.1) {
        console.warn(`⚠️ High Cumulative Layout Shift: ${clsScore.toFixed(4)}`);
      }
    }).observe({ entryTypes: ['layout-shift'] });
  }
};

// Auto-start page performance monitoring (singleton pattern)
if (typeof window !== 'undefined' && import.meta.env.DEV) {
  // Prevent duplicate monitoring setup
  if (!(window as any).__performanceMonitoringActive) {
    performanceMonitoring.monitorPagePerformance();
    
    // Add global performance report function
    (window as any).__performanceReport = performanceMonitoring.generateReport;
    (window as any).__performanceMonitoringActive = true;
    console.log('📊 Performance monitoring active. Use window.__performanceReport() to get a report.');
  }
}