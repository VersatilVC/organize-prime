import { useEffect } from 'react';

export class PerformanceMonitor {
  private static instance: PerformanceMonitor;
  
  static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor();
    }
    return PerformanceMonitor.instance;
  }

  // Track page load performance
  trackPageLoad(pageName: string): void {
    if (typeof window === 'undefined') return;

    const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
    
    const metrics = {
      page: pageName,
      loadTime: navigation.loadEventEnd - navigation.loadEventStart,
      domContentLoaded: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
      firstPaint: this.getFirstPaint(),
      firstContentfulPaint: this.getFirstContentfulPaint(),
      timestamp: Date.now(),
    };

    this.sendMetrics('page_load', metrics);
  }

  // Track component render performance
  trackComponentRender(componentName: string, renderTime: number): void {
    if (renderTime > 16) { // Only track slow renders (>16ms = <60fps)
      this.sendMetrics('slow_render', {
        component: componentName,
        renderTime,
        timestamp: Date.now(),
      });
    }
  }

  // Track user interactions
  trackInteraction(action: string, element: string, duration?: number): void {
    this.sendMetrics('user_interaction', {
      action,
      element,
      duration,
      timestamp: Date.now(),
    });
  }

  // Track bundle loading times
  trackBundleLoad(bundleName: string, loadTime: number): void {
    this.sendMetrics('bundle_load', {
      bundle: bundleName,
      loadTime,
      timestamp: Date.now(),
    });
  }

  private getFirstPaint(): number {
    const paintTiming = performance.getEntriesByType('paint');
    const firstPaint = paintTiming.find(entry => entry.name === 'first-paint');
    return firstPaint ? firstPaint.startTime : 0;
  }

  private getFirstContentfulPaint(): number {
    const paintTiming = performance.getEntriesByType('paint');
    const fcp = paintTiming.find(entry => entry.name === 'first-contentful-paint');
    return fcp ? fcp.startTime : 0;
  }

  // Get web vitals
  async getWebVitals(): Promise<{
    lcp: number;
    fid: number;
    cls: number;
  }> {
    const lcp = await this.getLargestContentfulPaint();
    const fid = await this.getFirstInputDelay();
    const cls = await this.getCumulativeLayoutShift();
    
    return { lcp, fid, cls };
  }

  private getLargestContentfulPaint(): Promise<number> {
    return new Promise((resolve) => {
      if ('PerformanceObserver' in window) {
        const observer = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          const lastEntry = entries[entries.length - 1];
          resolve(lastEntry.startTime);
          observer.disconnect();
        });
        observer.observe({ entryTypes: ['largest-contentful-paint'] });
        
        // Timeout after 10 seconds
        setTimeout(() => {
          observer.disconnect();
          resolve(0);
        }, 10000);
      } else {
        resolve(0);
      }
    });
  }

  private getFirstInputDelay(): Promise<number> {
    return new Promise((resolve) => {
      if ('PerformanceObserver' in window) {
        const observer = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          const firstEntry = entries[0] as any;
          resolve(firstEntry.processingStart - firstEntry.startTime);
          observer.disconnect();
        });
        observer.observe({ entryTypes: ['first-input'] });
        
        // Timeout after 10 seconds
        setTimeout(() => {
          observer.disconnect();
          resolve(0);
        }, 10000);
      } else {
        resolve(0);
      }
    });
  }

  private getCumulativeLayoutShift(): Promise<number> {
    return new Promise((resolve) => {
      if ('PerformanceObserver' in window) {
        let clsValue = 0;
        const observer = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            // @ts-ignore - layout-shift entries have these properties
            if (!entry.hadRecentInput) {
              // @ts-ignore
              clsValue += entry.value;
            }
          }
        });
        observer.observe({ entryTypes: ['layout-shift'] });
        
        // Resolve after 5 seconds
        setTimeout(() => {
          observer.disconnect();
          resolve(clsValue);
        }, 5000);
      } else {
        resolve(0);
      }
    });
  }

  private sendMetrics(type: string, data: any): void {
    // In development, log to console
    if (import.meta.env.DEV) {
      console.log(`Performance metric [${type}]:`, data);
    }
    
    // In production, send to analytics service
    if (import.meta.env.PROD) {
      // Example: Send to your analytics service
      // analytics.track(`performance_${type}`, data);
      
      // Store in localStorage for debugging
      const existingMetrics = JSON.parse(localStorage.getItem('performance_metrics') || '[]');
      existingMetrics.push({ type, data, timestamp: Date.now() });
      
      // Keep only last 100 metrics
      if (existingMetrics.length > 100) {
        existingMetrics.splice(0, existingMetrics.length - 100);
      }
      
      localStorage.setItem('performance_metrics', JSON.stringify(existingMetrics));
    }
  }
}

// Hook for component performance tracking
export const usePerformanceTracking = (componentName: string) => {
  const performanceMonitor = PerformanceMonitor.getInstance();
  
  useEffect(() => {
    const startTime = performance.now();
    
    return () => {
      const endTime = performance.now();
      const renderTime = endTime - startTime;
      performanceMonitor.trackComponentRender(componentName, renderTime);
    };
  }, [componentName]);

  return {
    trackInteraction: (action: string, element: string) => {
      const startTime = performance.now();
      return () => {
        const duration = performance.now() - startTime;
        performanceMonitor.trackInteraction(action, element, duration);
      };
    },
    trackPageLoad: (pageName: string) => {
      performanceMonitor.trackPageLoad(pageName);
    }
  };
};

// Hook for tracking page performance
export const usePagePerformance = (pageName: string) => {
  useEffect(() => {
    const performanceMonitor = PerformanceMonitor.getInstance();
    
    // Track page load after a short delay to ensure all resources are loaded
    const timer = setTimeout(() => {
      performanceMonitor.trackPageLoad(pageName);
    }, 100);
    
    // Track web vitals after page load
    const vitalTimer = setTimeout(async () => {
      const vitals = await performanceMonitor.getWebVitals();
      performanceMonitor['sendMetrics']('web_vitals', {
        page: pageName,
        ...vitals
      });
    }, 2000);
    
    return () => {
      clearTimeout(timer);
      clearTimeout(vitalTimer);
    };
  }, [pageName]);
};
