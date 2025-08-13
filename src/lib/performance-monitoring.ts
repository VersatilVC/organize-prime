import { useEffect, useRef, useCallback } from 'react';

interface PerformanceMetrics {
  componentName: string;
  renderTime: number;
  renderCount: number;
  timestamp: number;
  props?: any;
}

interface WebVitalsMetrics {
  name: string;
  value: number;
  rating: 'good' | 'needs-improvement' | 'poor';
  timestamp: number;
}

class PerformanceMonitor {
  private static instance: PerformanceMonitor;
  private metrics: PerformanceMetrics[] = [];
  private webVitals: WebVitalsMetrics[] = [];
  private observers: Map<string, PerformanceObserver> = new Map();

  static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor();
    }
    return PerformanceMonitor.instance;
  }

  constructor() {
    this.initializeWebVitalsMonitoring();
  }

  private initializeWebVitalsMonitoring() {
    // Monitor Largest Contentful Paint (LCP)
    if ('PerformanceObserver' in window) {
      try {
        const lcpObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          const lastEntry = entries[entries.length - 1] as any;
          
          this.recordWebVital({
            name: 'LCP',
            value: lastEntry.startTime,
            rating: lastEntry.startTime <= 2500 ? 'good' : 
                   lastEntry.startTime <= 4000 ? 'needs-improvement' : 'poor',
            timestamp: Date.now()
          });
        });
        
        lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });
        this.observers.set('lcp', lcpObserver);
      } catch (e) {
        console.warn('LCP observer not supported');
      }

      // Monitor First Input Delay (FID)
      try {
        const fidObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          entries.forEach((entry: any) => {
            this.recordWebVital({
              name: 'FID',
              value: entry.processingStart - entry.startTime,
              rating: entry.processingStart - entry.startTime <= 100 ? 'good' : 
                     entry.processingStart - entry.startTime <= 300 ? 'needs-improvement' : 'poor',
              timestamp: Date.now()
            });
          });
        });
        
        fidObserver.observe({ entryTypes: ['first-input'] });
        this.observers.set('fid', fidObserver);
      } catch (e) {
        console.warn('FID observer not supported');
      }

      // Monitor Cumulative Layout Shift (CLS)
      try {
        let clsValue = 0;
        const clsObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          entries.forEach((entry: any) => {
            if (!entry.hadRecentInput) {
              clsValue += entry.value;
            }
          });
          
          this.recordWebVital({
            name: 'CLS',
            value: clsValue,
            rating: clsValue <= 0.1 ? 'good' : 
                   clsValue <= 0.25 ? 'needs-improvement' : 'poor',
            timestamp: Date.now()
          });
        });
        
        clsObserver.observe({ entryTypes: ['layout-shift'] });
        this.observers.set('cls', clsObserver);
      } catch (e) {
        console.warn('CLS observer not supported');
      }
    }
  }

  recordComponentMetrics(metrics: PerformanceMetrics) {
    this.metrics.push(metrics);
    
    // Keep only last 1000 metrics to prevent memory leaks
    if (this.metrics.length > 1000) {
      this.metrics = this.metrics.slice(-1000);
    }

    // Alert on consistently slow components
    const recentMetrics = this.metrics.filter(m => 
      m.componentName === metrics.componentName && 
      Date.now() - m.timestamp < 60000 // Last minute
    );

    if (recentMetrics.length >= 5) {
      const avgRenderTime = recentMetrics.reduce((acc, m) => acc + m.renderTime, 0) / recentMetrics.length;
      if (avgRenderTime > 16) { // 60fps threshold
        console.warn(`Component ${metrics.componentName} is consistently slow (${avgRenderTime.toFixed(2)}ms average)`);
      }
    }
  }

  private recordWebVital(vital: WebVitalsMetrics) {
    this.webVitals.push(vital);
    
    if (vital.rating === 'poor') {
      console.warn(`Poor ${vital.name} score: ${vital.value}`);
    }
  }

  getComponentMetrics(componentName?: string): PerformanceMetrics[] {
    if (componentName) {
      return this.metrics.filter(m => m.componentName === componentName);
    }
    return this.metrics;
  }

  getWebVitals(): WebVitalsMetrics[] {
    return this.webVitals;
  }

  getSlowestComponents(limit: number = 10): Array<{component: string, avgTime: number, count: number}> {
    const componentStats = new Map<string, {totalTime: number, count: number}>();
    
    this.metrics.forEach(metric => {
      const existing = componentStats.get(metric.componentName) || {totalTime: 0, count: 0};
      componentStats.set(metric.componentName, {
        totalTime: existing.totalTime + metric.renderTime,
        count: existing.count + 1
      });
    });

    return Array.from(componentStats.entries())
      .map(([component, stats]) => ({
        component,
        avgTime: stats.totalTime / stats.count,
        count: stats.count
      }))
      .sort((a, b) => b.avgTime - a.avgTime)
      .slice(0, limit);
  }

  cleanup() {
    this.observers.forEach(observer => observer.disconnect());
    this.observers.clear();
    this.metrics = [];
    this.webVitals = [];
  }
}

// Hook for component performance monitoring
export function usePerformanceMonitoring(componentName: string, dependencies: any[] = []) {
  const renderStartTime = useRef<number>(0);
  const renderCount = useRef<number>(0);
  const monitor = PerformanceMonitor.getInstance();

  // Mark render start
  renderStartTime.current = performance.now();
  renderCount.current++;

  useEffect(() => {
    // Calculate render time
    const renderTime = performance.now() - renderStartTime.current;
    
    monitor.recordComponentMetrics({
      componentName,
      renderTime,
      renderCount: renderCount.current,
      timestamp: Date.now(),
      props: dependencies.length > 0 ? dependencies : undefined
    });
  });

  return {
    getRenderMetrics: () => monitor.getComponentMetrics(componentName),
    getSlowestComponents: () => monitor.getSlowestComponents(),
    getWebVitals: () => monitor.getWebVitals()
  };
}

// Hook for monitoring expensive operations
export function useOperationMonitoring() {
  const monitor = PerformanceMonitor.getInstance();

  const monitorOperation = useCallback(async <T>(
    operationName: string,
    operation: () => Promise<T>
  ): Promise<T> => {
    const startTime = performance.now();
    
    try {
      const result = await operation();
      const duration = performance.now() - startTime;
      
      // Log slow operations
      if (duration > 1000) { // 1 second threshold
        console.warn(`Slow operation detected: ${operationName} took ${duration.toFixed(2)}ms`);
      }
      
      return result;
    } catch (error) {
      const duration = performance.now() - startTime;
      console.error(`Operation ${operationName} failed after ${duration.toFixed(2)}ms:`, error);
      throw error;
    }
  }, []);

  return { monitorOperation };
}

// Hook for memory usage monitoring
export function useMemoryMonitoring() {
  const memoryUsage = useRef<number[]>([]);

  useEffect(() => {
    const checkMemory = () => {
      if ('memory' in performance) {
        const memory = (performance as any).memory;
        const usedMB = memory.usedJSHeapSize / 1024 / 1024;
        
        memoryUsage.current.push(usedMB);
        
        // Keep only last 60 measurements (5 minutes at 5s intervals)
        if (memoryUsage.current.length > 60) {
          memoryUsage.current = memoryUsage.current.slice(-60);
        }
        
        // Alert on high memory usage
        if (usedMB > 100) { // 100MB threshold
          console.warn(`High memory usage detected: ${usedMB.toFixed(2)}MB`);
        }
      }
    };

    // Check memory every 5 seconds
    const interval = setInterval(checkMemory, 5000);
    checkMemory(); // Initial check

    return () => clearInterval(interval);
  }, []);

  return {
    getCurrentMemoryUsage: () => {
      if ('memory' in performance) {
        const memory = (performance as any).memory;
        return {
          used: memory.usedJSHeapSize / 1024 / 1024,
          total: memory.totalJSHeapSize / 1024 / 1024,
          limit: memory.jsHeapSizeLimit / 1024 / 1024
        };
      }
      return null;
    },
    getMemoryHistory: () => memoryUsage.current
  };
}

// Performance dashboard hook
export function usePerformanceDashboard() {
  const monitor = PerformanceMonitor.getInstance();

  const getPerformanceReport = useCallback(() => {
    return {
      componentMetrics: monitor.getSlowestComponents(),
      webVitals: monitor.getWebVitals(),
      recentMetrics: monitor.getComponentMetrics().filter(m => 
        Date.now() - m.timestamp < 300000 // Last 5 minutes
      )
    };
  }, [monitor]);

  return { getPerformanceReport };
}
