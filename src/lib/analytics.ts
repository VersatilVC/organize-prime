import { useEffect } from 'react';

interface AnalyticsEvent {
  name: string;
  properties?: Record<string, any>;
  userId?: string;
  timestamp?: number;
}

interface PageView {
  path: string;
  title: string;
  userId?: string;
  timestamp?: number;
}

class AnalyticsService {
  private static instance: AnalyticsService;
  private events: AnalyticsEvent[] = [];
  private pageViews: PageView[] = [];
  private sessionId: string;
  private startTime: number;

  static getInstance(): AnalyticsService {
    if (!AnalyticsService.instance) {
      AnalyticsService.instance = new AnalyticsService();
    }
    return AnalyticsService.instance;
  }

  constructor() {
    this.sessionId = this.generateSessionId();
    this.startTime = Date.now();
    this.setupPerformanceTracking();
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private setupPerformanceTracking() {
    // Track page load performance
    window.addEventListener('load', () => {
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      this.trackEvent('page_load_performance', {
        loadTime: navigation.loadEventEnd - navigation.loadEventStart,
        domContentLoaded: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
        totalTime: navigation.loadEventEnd - navigation.fetchStart,
        sessionId: this.sessionId,
      });
    });

    // Track Core Web Vitals
    if ('PerformanceObserver' in window) {
      // First Contentful Paint (FCP)
      try {
        const fcpObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          entries.forEach((entry) => {
            this.trackEvent('web_vital_fcp', {
              value: entry.startTime,
              sessionId: this.sessionId,
            });
          });
        });
        fcpObserver.observe({ entryTypes: ['paint'] });
      } catch (e) {
        console.warn('FCP tracking not supported');
      }
    }
  }

  trackEvent(name: string, properties: Record<string, any> = {}, userId?: string) {
    const event: AnalyticsEvent = {
      name,
      properties: {
        ...properties,
        sessionId: this.sessionId,
        userAgent: navigator.userAgent,
        url: window.location.href,
        referrer: document.referrer,
      },
      userId,
      timestamp: Date.now(),
    };

    this.events.push(event);
    this.sendToAnalytics(event);

    // Keep only last 1000 events in memory
    if (this.events.length > 1000) {
      this.events = this.events.slice(-1000);
    }
  }

  trackPageView(path: string, title: string, userId?: string) {
    const pageView: PageView = {
      path,
      title,
      userId,
      timestamp: Date.now(),
    };

    this.pageViews.push(pageView);
    
    // Track as event too
    this.trackEvent('page_view', {
      path,
      title,
      sessionId: this.sessionId,
    }, userId);

    // Keep only last 100 page views in memory
    if (this.pageViews.length > 100) {
      this.pageViews = this.pageViews.slice(-100);
    }
  }

  trackUserAction(action: string, element?: string, properties: Record<string, any> = {}) {
    this.trackEvent('user_action', {
      action,
      element,
      ...properties,
    });
  }

  trackError(error: Error, context?: any) {
    this.trackEvent('error', {
      message: error.message,
      stack: error.stack,
      context,
      url: window.location.href,
    });
  }

  trackFeatureUsage(featureName: string, action: string, properties: Record<string, any> = {}) {
    this.trackEvent('feature_usage', {
      feature: featureName,
      action,
      ...properties,
    });
  }

  trackPerformanceMetric(metricName: string, value: number, unit: string = 'ms') {
    this.trackEvent('performance_metric', {
      metric: metricName,
      value,
      unit,
    });
  }

  trackConversion(conversionType: string, value?: number, properties: Record<string, any> = {}) {
    this.trackEvent('conversion', {
      type: conversionType,
      value,
      ...properties,
    });
  }

  private sendToAnalytics(event: AnalyticsEvent) {
    // In development, just log
    if (process.env.NODE_ENV === 'development') {
      console.log('Analytics Event:', event);
      return;
    }

    // In production, send to your analytics service
    try {
      // Replace with your analytics endpoint
      fetch('/api/analytics/events', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(event),
      }).catch(console.error);
    } catch (error) {
      console.error('Failed to send analytics event:', error);
    }
  }

  getSessionData() {
    return {
      sessionId: this.sessionId,
      startTime: this.startTime,
      duration: Date.now() - this.startTime,
      eventsCount: this.events.length,
      pageViewsCount: this.pageViews.length,
      events: this.events,
      pageViews: this.pageViews,
    };
  }

  exportData() {
    return {
      session: this.getSessionData(),
      userAgent: navigator.userAgent,
      language: navigator.language,
      platform: navigator.platform,
      cookieEnabled: navigator.cookieEnabled,
      onLine: navigator.onLine,
      screen: {
        width: screen.width,
        height: screen.height,
        colorDepth: screen.colorDepth,
      },
      viewport: {
        width: window.innerWidth,
        height: window.innerHeight,
      },
    };
  }
}

// Hooks for React components
export function useAnalytics() {
  const analytics = AnalyticsService.getInstance();

  return {
    trackEvent: analytics.trackEvent.bind(analytics),
    trackPageView: analytics.trackPageView.bind(analytics),
    trackUserAction: analytics.trackUserAction.bind(analytics),
    trackError: analytics.trackError.bind(analytics),
    trackFeatureUsage: analytics.trackFeatureUsage.bind(analytics),
    trackPerformanceMetric: analytics.trackPerformanceMetric.bind(analytics),
    trackConversion: analytics.trackConversion.bind(analytics),
  };
}

export function usePageTracking() {
  const { trackPageView } = useAnalytics();

  useEffect(() => {
    const handleRouteChange = () => {
      trackPageView(window.location.pathname, document.title);
    };

    // Track initial page view
    trackPageView(window.location.pathname, document.title);

    // Listen for route changes
    window.addEventListener('popstate', handleRouteChange);

    return () => {
      window.removeEventListener('popstate', handleRouteChange);
    };
  }, [trackPageView]);
}

export function useClickTracking(elementName?: string) {
  const { trackUserAction } = useAnalytics();

  const trackClick = (event: React.MouseEvent, customProperties?: Record<string, any>) => {
    const target = event.currentTarget as HTMLElement;
    const elementType = target.tagName.toLowerCase();
    const elementId = target.id;
    const elementClass = target.className;
    const elementText = target.textContent?.slice(0, 50); // First 50 chars

    trackUserAction('click', elementName || elementId || elementType, {
      elementType,
      elementId,
      elementClass,
      elementText,
      ...customProperties,
    });
  };

  return trackClick;
}

export function useFormTracking(formName: string) {
  const { trackUserAction } = useAnalytics();

  const trackFormStart = () => {
    trackUserAction('form_start', formName);
  };

  const trackFormSubmit = (success: boolean, errors?: string[]) => {
    trackUserAction('form_submit', formName, {
      success,
      errors,
    });
  };

  const trackFieldFocus = (fieldName: string) => {
    trackUserAction('field_focus', formName, { fieldName });
  };

  const trackFieldBlur = (fieldName: string, value?: any) => {
    trackUserAction('field_blur', formName, { 
      fieldName, 
      hasValue: !!value,
      valueLength: typeof value === 'string' ? value.length : undefined,
    });
  };

  return {
    trackFormStart,
    trackFormSubmit,
    trackFieldFocus,
    trackFieldBlur,
  };
}

// Export the service instance
export const analytics = AnalyticsService.getInstance();
