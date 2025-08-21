// Phase 4.2: Real-Time Webhook Monitoring Service
// Handles Supabase realtime subscriptions and webhook status monitoring

import { supabase } from '@/integrations/supabase/client';
import type { 
  WebhookExecution, 
  WebhookPerformanceMetrics, 
  WebhookAlert,
  WebhookRealtimeStatus,
  RealtimeMonitoringState,
  WebhookMonitoringEvents,
  WebhookMonitoringFilters
} from '@/types/webhook-monitoring';
// Browser-compatible EventEmitter implementation
class BrowserEventEmitter {
  private events: Map<string, Function[]> = new Map();

  on(event: string, listener: Function): this {
    if (!this.events.has(event)) {
      this.events.set(event, []);
    }
    this.events.get(event)!.push(listener);
    return this;
  }

  off(event: string, listener: Function): this {
    const listeners = this.events.get(event);
    if (listeners) {
      const index = listeners.indexOf(listener);
      if (index !== -1) {
        listeners.splice(index, 1);
      }
    }
    return this;
  }

  emit(event: string, ...args: any[]): boolean {
    const listeners = this.events.get(event);
    if (listeners) {
      listeners.forEach(listener => listener(...args));
      return true;
    }
    return false;
  }

  removeAllListeners(event?: string): this {
    if (event) {
      this.events.delete(event);
    } else {
      this.events.clear();
    }
    return this;
  }
}

export class RealtimeMonitoringService extends BrowserEventEmitter {
  private state: RealtimeMonitoringState;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000; // Start with 1 second
  private healthCheckInterval?: NodeJS.Timeout;
  private cleanupInterval?: NodeJS.Timeout;

  constructor() {
    super();
    this.state = {
      isConnected: false,
      subscriptions: new Map(),
      metrics: new Map(),
      executions: new Map(),
      alerts: new Map(),
      activeTests: new Map(),
      testHistory: []
    };

    // Set up periodic cleanup and health checks
    this.startHealthCheck();
    this.startCleanup();
  }

  // ===== CONNECTION MANAGEMENT =====

  async connect(): Promise<boolean> {
    try {
      // Test connection with a simple query
      const { error } = await supabase
        .from('webhook_executions')
        .select('id')
        .limit(1);

      if (error) {
        throw error;
      }

      this.state.isConnected = true;
      this.state.connectionError = undefined;
      this.state.lastUpdate = new Date().toISOString();
      this.reconnectAttempts = 0;

      this.emit('connection_status_changed', true);
      return true;
    } catch (error) {
      console.error('RealtimeMonitoringService connection failed:', error);
      this.state.isConnected = false;
      this.state.connectionError = error instanceof Error ? error.message : 'Unknown connection error';
      
      this.emit('connection_status_changed', false, this.state.connectionError);
      return false;
    }
  }

  async disconnect(): Promise<void> {
    // Unsubscribe from all subscriptions
    for (const [key, subscription] of this.state.subscriptions) {
      try {
        await subscription.subscription?.unsubscribe();
      } catch (error) {
        console.warn(`Failed to unsubscribe from ${key}:`, error);
      }
    }

    this.state.subscriptions.clear();
    this.state.isConnected = false;
    
    // Clear intervals
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }

    this.emit('connection_status_changed', false);
  }

  // ===== WEBHOOK MONITORING =====

  async subscribeToWebhook(webhookId: string, elementId: string): Promise<boolean> {
    const subscriptionKey = `${webhookId}-${elementId}`;
    
    // Check if already subscribed
    if (this.state.subscriptions.has(subscriptionKey)) {
      return true;
    }

    try {
      // Subscribe to webhook executions
      const executionSubscription = supabase
        .channel(`webhook-executions-${subscriptionKey}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'webhook_executions',
            filter: `webhook_id=eq.${webhookId} AND element_id=eq.${elementId}`
          },
          (payload) => this.handleExecutionChange(payload)
        )
        .subscribe();

      // Subscribe to performance metrics
      const metricsSubscription = supabase
        .channel(`webhook-metrics-${subscriptionKey}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'webhook_performance_metrics',
            filter: `webhook_id=eq.${webhookId} AND element_id=eq.${elementId}`
          },
          (payload) => this.handleMetricsChange(payload)
        )
        .subscribe();

      // Subscribe to alerts
      const alertsSubscription = supabase
        .channel(`webhook-alerts-${subscriptionKey}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'webhook_alerts',
            filter: `webhook_id=eq.${webhookId} AND element_id=eq.${elementId}`
          },
          (payload) => this.handleAlertsChange(payload)
        )
        .subscribe();

      // Store subscription info
      this.state.subscriptions.set(subscriptionKey, {
        webhook_id: webhookId,
        element_id: elementId,
        subscription: {
          executions: executionSubscription,
          metrics: metricsSubscription,
          alerts: alertsSubscription
        }
      });

      // Load initial data
      await this.loadInitialData(webhookId, elementId);

      return true;
    } catch (error) {
      console.error(`Failed to subscribe to webhook ${subscriptionKey}:`, error);
      this.emit('subscription_error', webhookId, error instanceof Error ? error.message : 'Subscription failed');
      return false;
    }
  }

  async unsubscribeFromWebhook(webhookId: string, elementId: string): Promise<void> {
    const subscriptionKey = `${webhookId}-${elementId}`;
    const subscription = this.state.subscriptions.get(subscriptionKey);

    if (subscription) {
      try {
        await subscription.subscription.executions?.unsubscribe();
        await subscription.subscription.metrics?.unsubscribe();
        await subscription.subscription.alerts?.unsubscribe();
      } catch (error) {
        console.warn(`Error unsubscribing from ${subscriptionKey}:`, error);
      }

      this.state.subscriptions.delete(subscriptionKey);
      this.state.executions.delete(webhookId);
      this.state.metrics.delete(subscriptionKey);
      this.state.alerts.delete(webhookId);
    }
  }

  // ===== DATA HANDLERS =====

  private handleExecutionChange(payload: any): void {
    const execution: WebhookExecution = payload.new || payload.old;
    if (!execution) return;

    const executionKey = execution.webhook_id;
    const currentExecutions = this.state.executions.get(executionKey) || [];

    switch (payload.eventType) {
      case 'INSERT':
        currentExecutions.unshift(execution);
        // Keep only the last 50 executions per webhook
        if (currentExecutions.length > 50) {
          currentExecutions.splice(50);
        }
        this.state.executions.set(executionKey, currentExecutions);
        this.emit('execution_started', execution);
        break;

      case 'UPDATE':
        const index = currentExecutions.findIndex(e => e.id === execution.id);
        if (index >= 0) {
          currentExecutions[index] = execution;
          this.state.executions.set(executionKey, currentExecutions);
          
          if (execution.status === 'success') {
            this.emit('execution_completed', execution);
          } else if (execution.status === 'error') {
            this.emit('execution_failed', execution);
          }
        }
        break;

      case 'DELETE':
        const deleteIndex = currentExecutions.findIndex(e => e.id === execution.id);
        if (deleteIndex >= 0) {
          currentExecutions.splice(deleteIndex, 1);
          this.state.executions.set(executionKey, currentExecutions);
        }
        break;
    }

    this.state.lastUpdate = new Date().toISOString();
  }

  private handleMetricsChange(payload: any): void {
    const metrics: WebhookPerformanceMetrics = payload.new || payload.old;
    if (!metrics) return;

    const metricsKey = `${metrics.webhook_id}-${metrics.element_id}`;

    switch (payload.eventType) {
      case 'INSERT':
      case 'UPDATE':
        this.state.metrics.set(metricsKey, metrics);
        this.emit('metrics_updated', metrics);
        break;

      case 'DELETE':
        this.state.metrics.delete(metricsKey);
        break;
    }

    this.state.lastUpdate = new Date().toISOString();
  }

  private handleAlertsChange(payload: any): void {
    const alert: WebhookAlert = payload.new || payload.old;
    if (!alert) return;

    const alertKey = alert.webhook_id;
    const currentAlerts = this.state.alerts.get(alertKey) || [];

    switch (payload.eventType) {
      case 'INSERT':
        currentAlerts.push(alert);
        this.state.alerts.set(alertKey, currentAlerts);
        if (alert.current_status !== 'ok') {
          this.emit('alert_triggered', alert);
        }
        break;

      case 'UPDATE':
        const index = currentAlerts.findIndex(a => a.id === alert.id);
        if (index >= 0) {
          const oldAlert = currentAlerts[index];
          currentAlerts[index] = alert;
          this.state.alerts.set(alertKey, currentAlerts);
          
          // Check for status changes
          if (oldAlert.current_status !== 'ok' && alert.current_status === 'ok') {
            this.emit('alert_resolved', alert);
          } else if (oldAlert.current_status === 'ok' && alert.current_status !== 'ok') {
            this.emit('alert_triggered', alert);
          }
        }
        break;

      case 'DELETE':
        const deleteIndex = currentAlerts.findIndex(a => a.id === alert.id);
        if (deleteIndex >= 0) {
          currentAlerts.splice(deleteIndex, 1);
          this.state.alerts.set(alertKey, currentAlerts);
        }
        break;
    }

    this.state.lastUpdate = new Date().toISOString();
  }

  // ===== DATA LOADING =====

  private async loadInitialData(webhookId: string, elementId: string): Promise<void> {
    try {
      // Load recent executions
      const { data: executions } = await supabase
        .from('webhook_executions')
        .select('*')
        .eq('webhook_id', webhookId)
        .eq('element_id', elementId)
        .order('execution_started_at', { ascending: false })
        .limit(50);

      if (executions) {
        this.state.executions.set(webhookId, executions);
      }

      // Load latest metrics
      const { data: metrics } = await supabase
        .from('webhook_performance_metrics')
        .select('*')
        .eq('webhook_id', webhookId)
        .eq('element_id', elementId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (metrics) {
        this.state.metrics.set(`${webhookId}-${elementId}`, metrics);
      }

      // Load active alerts
      const { data: alerts } = await supabase
        .from('webhook_alerts')
        .select('*')
        .eq('webhook_id', webhookId)
        .eq('element_id', elementId)
        .eq('is_enabled', true);

      if (alerts) {
        this.state.alerts.set(webhookId, alerts);
      }
    } catch (error) {
      console.error(`Failed to load initial data for webhook ${webhookId}:`, error);
    }
  }

  // ===== STATUS QUERIES =====

  async getWebhookStatus(webhookId: string, elementId: string): Promise<WebhookRealtimeStatus | null> {
    try {
      const { data, error } = await supabase.rpc('get_webhook_realtime_status', {
        p_organization_id: await this.getCurrentOrganizationId(),
        p_webhook_id: webhookId,
        p_element_id: elementId
      });

      if (error) throw error;
      return data?.[0] || null;
    } catch (error) {
      console.error(`Failed to get webhook status for ${webhookId}:`, error);
      return null;
    }
  }

  async getAllWebhookStatuses(filters?: WebhookMonitoringFilters): Promise<WebhookRealtimeStatus[]> {
    try {
      const { data, error } = await supabase.rpc('get_webhook_realtime_status', {
        p_organization_id: await this.getCurrentOrganizationId()
      });

      if (error) throw error;
      
      let results = data || [];

      // Apply filters
      if (filters) {
        if (filters.webhook_ids?.length) {
          results = results.filter(status => filters.webhook_ids!.includes(status.webhook_id));
        }
        
        if (filters.health_status?.length) {
          results = results.filter(status => filters.health_status!.includes(status.overall_health));
        }
        
        if (filters.min_performance_score !== undefined) {
          results = results.filter(status => 
            status.performance_metrics?.performance_score >= filters.min_performance_score!
          );
        }
        
        // Add more filter logic as needed
      }

      return results;
    } catch (error) {
      console.error('Failed to get all webhook statuses:', error);
      return [];
    }
  }

  // ===== UTILITY METHODS =====

  private async getCurrentOrganizationId(): Promise<string> {
    // This should be implemented to get the current organization ID
    // For now, return a placeholder
    return 'current-org-id';
  }

  private startHealthCheck(): void {
    this.healthCheckInterval = setInterval(async () => {
      if (!this.state.isConnected) {
        // Attempt to reconnect
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
          this.reconnectAttempts++;
          console.log(`Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);
          
          const connected = await this.connect();
          if (!connected) {
            // Exponential backoff
            this.reconnectDelay = Math.min(this.reconnectDelay * 2, 30000);
            setTimeout(() => {}, this.reconnectDelay);
          }
        }
      }
    }, 30000); // Check every 30 seconds
  }

  private startCleanup(): void {
    this.cleanupInterval = setInterval(() => {
      // Clean up old execution data
      const cutoffTime = new Date(Date.now() - 24 * 60 * 60 * 1000); // 24 hours ago
      
      for (const [webhookId, executions] of this.state.executions) {
        const filteredExecutions = executions.filter(
          exec => new Date(exec.created_at) > cutoffTime
        );
        
        if (filteredExecutions.length !== executions.length) {
          this.state.executions.set(webhookId, filteredExecutions);
        }
      }
    }, 60 * 60 * 1000); // Run every hour
  }

  // ===== STATE GETTERS =====

  getState(): Readonly<RealtimeMonitoringState> {
    return { ...this.state };
  }

  getWebhookExecutions(webhookId: string): WebhookExecution[] {
    return this.state.executions.get(webhookId) || [];
  }

  getWebhookMetrics(webhookId: string, elementId: string): WebhookPerformanceMetrics | undefined {
    return this.state.metrics.get(`${webhookId}-${elementId}`);
  }

  getWebhookAlerts(webhookId: string): WebhookAlert[] {
    return this.state.alerts.get(webhookId) || [];
  }

  isSubscribed(webhookId: string, elementId: string): boolean {
    return this.state.subscriptions.has(`${webhookId}-${elementId}`);
  }
}

// Singleton instance
export const realtimeMonitoringService = new RealtimeMonitoringService();