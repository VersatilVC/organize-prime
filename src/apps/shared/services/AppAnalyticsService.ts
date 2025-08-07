import { supabase } from '@/integrations/supabase/client';
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
      const event: Omit<AppAnalyticsEvent, 'timestamp'> = {
        appId,
        organizationId,
        userId,
        eventType,
        eventCategory,
        eventData: eventData || {},
        sessionId: this.getSessionId()
      };

      await supabase
        .from('marketplace_app_analytics')
        .insert({
          app_id: event.appId,
          organization_id: event.organizationId,
          user_id: event.userId,
          event_type: event.eventType,
          event_category: event.eventCategory,
          event_data: event.eventData,
          session_id: event.sessionId
        });
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
      const { data, error } = await supabase
        .from('marketplace_app_analytics')
        .select('*')
        .eq('app_id', appId)
        .eq('organization_id', organizationId)
        .gte('created_at', startDate)
        .lte('created_at', endDate);

      if (error) throw error;

      const events = data || [];
      
      // Calculate metrics
      const pageViews = events.filter(e => e.event_type === 'page_view').length;
      const uniqueUsers = new Set(events.map(e => e.user_id)).size;
      const sessions = new Set(events.map(e => e.session_id).filter(Boolean)).size;
      const errors = events.filter(e => e.event_type === 'error').length;

      // Feature usage breakdown
      const featureUsage: Record<string, number> = {};
      events
        .filter(e => e.event_type === 'feature_usage')
        .forEach(e => {
          const eventData = e.event_data as any;
          const featureName = eventData?.feature_name;
          if (featureName) {
            featureUsage[featureName] = (featureUsage[featureName] || 0) + 1;
          }
        });

      // Calculate average session duration (simplified)
      const sessionEvents = events.filter(e => e.session_id);
      const sessionDurations: Record<string, { start: number; end: number }> = {};
      
      sessionEvents.forEach(e => {
        const sessionId = e.session_id!;
        const timestamp = new Date(e.created_at).getTime();
        
        if (!sessionDurations[sessionId]) {
          sessionDurations[sessionId] = { start: timestamp, end: timestamp };
        } else {
          sessionDurations[sessionId].start = Math.min(sessionDurations[sessionId].start, timestamp);
          sessionDurations[sessionId].end = Math.max(sessionDurations[sessionId].end, timestamp);
        }
      });

      const totalSessionDuration = Object.values(sessionDurations)
        .reduce((sum, { start, end }) => sum + (end - start), 0);
      
      const averageSessionDuration = sessions > 0 ? totalSessionDuration / sessions : 0;

      return {
        pageViews,
        uniqueUsers,
        sessions,
        featureUsage,
        errors,
        averageSessionDuration: Math.round(averageSessionDuration / 1000) // Convert to seconds
      };
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