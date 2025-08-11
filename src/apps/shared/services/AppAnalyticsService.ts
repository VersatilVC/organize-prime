import { AppAnalyticsEvent } from '../types/AppTypes';

export class AppAnalyticsService {
  private static sessionId: string | null = null;
  private static readonly SESSION_DURATION = 30 * 60 * 1000; // 30 minutes

  /**
   * Initialize or get current session ID
   */
  private static getSessionId(): string {
    if (!this.sessionId) {
      this.sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // Clear session after duration
      setTimeout(() => {
        this.sessionId = null;
      }, this.SESSION_DURATION);
    }
    
    return this.sessionId;
  }

  /**
   * Track app usage event
   */
  static async trackEvent(
    appId: string,
    organizationId: string,
    userId: string,
    eventType: string,
    eventCategory: string,
    eventData?: Record<string, any>
  ): Promise<void> {
    try {
      // TODO: Remove marketplace analytics - replaced with new feature system
      console.log('Analytics event would be tracked:', {
        appId,
        organizationId,
        userId,
        eventType,
        eventCategory,
        eventData,
        sessionId: this.getSessionId()
      });

      // Marketplace analytics functionality removed - tables don't exist
      // await supabase.from('marketplace_app_analytics').insert({...});
    } catch (error) {
      console.error('Failed to track app event:', error);
      // Don't throw error - analytics shouldn't break the main flow
    }
  }

  /**
   * Track page view
   */
  static async trackPageView(
    appId: string,
    organizationId: string,
    userId: string,
    pagePath: string,
    pageTitle?: string
  ): Promise<void> {
    await this.trackEvent(
      appId,
      organizationId,
      userId,
      'page_view',
      'navigation',
      {
        page_path: pagePath,
        page_title: pageTitle,
        user_agent: navigator.userAgent,
        referrer: document.referrer
      }
    );
  }

  /**
   * Track feature usage
   */
  static async trackFeatureUsage(
    appId: string,
    organizationId: string,
    userId: string,
    featureName: string,
    action: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    await this.trackEvent(
      appId,
      organizationId,
      userId,
      'feature_usage',
      'engagement',
      {
        feature_name: featureName,
        action,
        ...metadata
      }
    );
  }

  /**
   * Track user action
   */
  static async trackUserAction(
    appId: string,
    organizationId: string,
    userId: string,
    action: string,
    targetType: string,
    targetId?: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    await this.trackEvent(
      appId,
      organizationId,
      userId,
      'user_action',
      'interaction',
      {
        action,
        target_type: targetType,
        target_id: targetId,
        ...metadata
      }
    );
  }

  /**
   * Track error
   */
  static async trackError(
    appId: string,
    organizationId: string,
    userId: string,
    error: Error,
    context?: Record<string, any>
  ): Promise<void> {
    await this.trackEvent(
      appId,
      organizationId,
      userId,
      'error',
      'system',
      {
        error_name: error.name,
        error_message: error.message,
        error_stack: error.stack,
        ...context
      }
    );
  }

  /**
   * Track performance metric
   */
  static async trackPerformance(
    appId: string,
    organizationId: string,
    userId: string,
    metric: string,
    value: number,
    unit: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    await this.trackEvent(
      appId,
      organizationId,
      userId,
      'performance',
      'metrics',
      {
        metric,
        value,
        unit,
        timestamp: Date.now(),
        ...metadata
      }
    );
  }

  /**
   * Get app analytics summary
   */
  static async getAppAnalytics(
    appId: string,
    organizationId: string,
    startDate: string,
    endDate: string
  ): Promise<{
    pageViews: number;
    uniqueUsers: number;
    sessions: number;
    featureUsage: Record<string, number>;
    errors: number;
    averageSessionDuration: number;
  }> {
    try {
      // TODO: Remove marketplace analytics - replaced with new feature system
      console.log('App analytics requested for:', { appId, organizationId, startDate, endDate });

      // Return mock data since marketplace tables don't exist
      return {
        pageViews: 0,
        uniqueUsers: 0,
        sessions: 0,
        featureUsage: {},
        errors: 0,
        averageSessionDuration: 0
      };

      // Marketplace analytics functionality removed - tables don't exist
      // const { data, error } = await supabase.from('marketplace_app_analytics')...
    } catch (error) {
      console.error('Failed to get app analytics:', error);
      return {
        pageViews: 0,
        uniqueUsers: 0,
        sessions: 0,
        featureUsage: {},
        errors: 0,
        averageSessionDuration: 0
      };
    }
  }

  /**
   * Track app installation
   */
  static async trackInstallation(
    appId: string,
    organizationId: string,
    userId: string,
    version: string
  ): Promise<void> {
    await this.trackEvent(
      appId,
      organizationId,
      userId,
      'app_installed',
      'lifecycle',
      {
        app_version: version,
        installation_timestamp: new Date().toISOString()
      }
    );
  }

  /**
   * Track app uninstallation
   */
  static async trackUninstallation(
    appId: string,
    organizationId: string,
    userId: string,
    reason?: string
  ): Promise<void> {
    await this.trackEvent(
      appId,
      organizationId,
      userId,
      'app_uninstalled',
      'lifecycle',
      {
        uninstall_reason: reason,
        uninstallation_timestamp: new Date().toISOString()
      }
    );
  }
}