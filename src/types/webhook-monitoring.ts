// Phase 4.2: Real-Time Webhook Monitoring Types
// Enhanced TypeScript definitions for webhook execution tracking and performance metrics

export interface WebhookExecution {
  id: string;
  organization_id: string;
  webhook_id: string;
  element_id: string;
  execution_type: 'manual_test' | 'automatic_trigger' | 'scheduled' | 'preview_test';
  
  // Request details
  request_url: string;
  request_method: string;
  request_headers: Record<string, any>;
  request_payload: Record<string, any>;
  request_size_bytes: number;
  
  // Response details
  response_status_code?: number;
  response_headers: Record<string, any>;
  response_body?: Record<string, any>;
  response_size_bytes: number;
  
  // Performance metrics
  execution_started_at: string;
  execution_completed_at?: string;
  response_time_ms?: number;
  dns_lookup_time_ms: number;
  tcp_connect_time_ms: number;
  ssl_handshake_time_ms: number;
  
  // Status and error handling
  status: 'pending' | 'executing' | 'success' | 'error' | 'timeout' | 'cancelled';
  success: boolean;
  error_message?: string;
  error_code?: string;
  retry_count: number;
  
  // Testing context
  test_scenario?: string;
  test_data_source?: 'generated' | 'user_provided' | 'recorded' | 'template';
  triggered_by?: string;
  
  // Performance analysis
  performance_rating?: 'excellent' | 'good' | 'fair' | 'poor' | 'critical';
  performance_notes?: string;
  
  created_at: string;
  updated_at: string;
}

export interface WebhookPerformanceMetrics {
  id: string;
  organization_id: string;
  webhook_id: string;
  element_id: string;
  
  // Time window
  metric_window_start: string;
  metric_window_end: string;
  metric_window_duration_minutes: number;
  
  // Execution statistics
  total_executions: number;
  successful_executions: number;
  failed_executions: number;
  timeout_executions: number;
  cancelled_executions: number;
  
  // Performance statistics
  avg_response_time_ms: number;
  min_response_time_ms: number;
  max_response_time_ms: number;
  p50_response_time_ms: number;
  p95_response_time_ms: number;
  p99_response_time_ms: number;
  
  // Success rate metrics
  success_rate_percentage: number;
  availability_percentage: number;
  error_rate_percentage: number;
  
  // Data transfer metrics
  total_bytes_sent: number;
  total_bytes_received: number;
  avg_request_size_bytes: number;
  avg_response_size_bytes: number;
  
  // Error analysis
  most_common_error_code?: string;
  most_common_error_message?: string;
  error_distribution: Record<string, number>;
  
  // Performance trends
  performance_trend: 'improving' | 'stable' | 'declining' | 'volatile' | 'insufficient_data';
  performance_score: number; // 0-10 scale
  
  created_at: string;
  updated_at: string;
}

export interface WebhookAlert {
  id: string;
  organization_id: string;
  webhook_id: string;
  element_id?: string;
  
  // Alert configuration
  alert_name: string;
  alert_type: 'performance' | 'availability' | 'error_rate' | 'response_time' | 'custom';
  is_enabled: boolean;
  
  // Threshold configuration
  threshold_metric: string;
  threshold_operator: '>' | '<' | '>=' | '<=' | '=' | '!=';
  threshold_value: number;
  threshold_duration_minutes: number;
  
  // Notification settings
  notification_channels: string[];
  notification_frequency: 'immediate' | 'hourly' | 'daily' | 'once';
  cooldown_period_minutes: number;
  
  // Alert state
  current_status: 'ok' | 'warning' | 'critical' | 'unknown';
  last_triggered_at?: string;
  last_resolved_at?: string;
  trigger_count: number;
  
  // Configuration
  alert_description?: string;
  remediation_steps?: string;
  
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface WebhookRelationship {
  id: string;
  organization_id: string;
  
  // Source webhook
  source_webhook_id: string;
  source_element_id: string;
  
  // Target webhook
  target_webhook_id: string;
  target_element_id: string;
  
  // Relationship details
  relationship_type: 'triggers' | 'data_flow' | 'dependency' | 'conditional' | 'sequence';
  relationship_direction: 'one_way' | 'bidirectional';
  
  // Data mapping
  data_mapping: Record<string, any>;
  transformation_rules: Record<string, any>;
  
  // Conditions
  trigger_conditions: Record<string, any>;
  execution_order: number;
  
  // Status
  is_active: boolean;
  last_executed_at?: string;
  execution_count: number;
  
  created_at: string;
  updated_at: string;
}

export interface WebhookTestTemplate {
  id: string;
  organization_id: string;
  
  // Template details
  template_name: string;
  template_description?: string;
  template_category: string;
  
  // Test configuration
  test_scenario: string;
  test_data: Record<string, any>;
  expected_responses: any[];
  validation_rules: Record<string, any>;
  
  // Performance expectations
  expected_response_time_ms?: number;
  expected_status_codes: number[];
  
  // Template metadata
  is_public: boolean;
  usage_count: number;
  
  created_by?: string;
  created_at: string;
  updated_at: string;
}

// Real-time webhook status response from database function
export interface WebhookRealtimeStatus {
  webhook_id: string;
  element_id: string;
  webhook_name: string;
  endpoint_url: string;
  method: string;
  webhook_status: string;
  
  latest_execution?: {
    execution_id: string;
    status: string;
    success: boolean;
    response_time_ms?: number;
    response_status_code?: number;
    executed_at?: string;
    error_message?: string;
  };
  
  performance_metrics?: {
    success_rate: number;
    avg_response_time_ms: number;
    availability: number;
    performance_score: number;
    performance_trend: string;
    total_executions: number;
    last_updated: string;
  };
  
  active_alerts: Array<{
    alert_id: string;
    alert_name: string;
    alert_type: string;
    current_status: string;
    last_triggered_at?: string;
  }>;
  
  overall_health: 'healthy' | 'warning' | 'critical' | 'unknown';
  last_checked: string;
}

// Enhanced webhook test configuration
export interface WebhookTestConfiguration {
  webhook_id: string;
  element_id: string;
  test_type: 'quick' | 'comprehensive' | 'performance' | 'custom';
  
  // Test data configuration
  use_template?: string; // Template ID
  custom_payload?: Record<string, any>;
  data_generation_method: 'auto' | 'template' | 'custom' | 'recorded';
  
  // Performance test settings
  concurrent_requests?: number;
  duration_seconds?: number;
  ramp_up_time_seconds?: number;
  
  // Validation settings
  expected_status_codes: number[];
  expected_response_time_ms?: number;
  response_validation_rules: Array<{
    field_path: string;
    validation_type: 'exists' | 'equals' | 'contains' | 'matches' | 'type';
    expected_value?: any;
    regex_pattern?: string;
  }>;
  
  // Notification settings
  notify_on_completion: boolean;
  notify_on_failure: boolean;
  notification_channels: string[];
}

// Webhook testing results
export interface WebhookTestResult {
  test_id: string;
  webhook_id: string;
  element_id: string;
  test_configuration: WebhookTestConfiguration;
  
  // Test execution details
  started_at: string;
  completed_at?: string;
  duration_ms?: number;
  status: 'running' | 'completed' | 'failed' | 'cancelled';
  
  // Results
  total_requests: number;
  successful_requests: number;
  failed_requests: number;
  
  // Performance metrics
  avg_response_time_ms: number;
  min_response_time_ms: number;
  max_response_time_ms: number;
  requests_per_second: number;
  
  // Validation results
  validation_passed: boolean;
  validation_errors: Array<{
    rule: string;
    expected: any;
    actual: any;
    message: string;
  }>;
  
  // Error summary
  errors: Array<{
    error_code?: string;
    error_message: string;
    occurrences: number;
    first_occurred_at: string;
    last_occurred_at: string;
  }>;
  
  // Raw execution data
  executions: WebhookExecution[];
}

// Real-time monitoring state for Preview Mode
export interface RealtimeMonitoringState {
  isConnected: boolean;
  connectionError?: string;
  lastUpdate?: string;
  
  // Subscriptions
  subscriptions: Map<string, {
    webhook_id: string;
    element_id: string;
    subscription: any; // Supabase subscription
    last_status?: WebhookRealtimeStatus;
  }>;
  
  // Performance tracking
  metrics: Map<string, WebhookPerformanceMetrics>;
  executions: Map<string, WebhookExecution[]>; // Keyed by webhook_id
  alerts: Map<string, WebhookAlert[]>; // Keyed by webhook_id
  
  // Testing state
  activeTests: Map<string, WebhookTestResult>;
  testHistory: WebhookTestResult[];
}

// Events for real-time updates
export interface WebhookMonitoringEvents {
  execution_started: (execution: WebhookExecution) => void;
  execution_completed: (execution: WebhookExecution) => void;
  execution_failed: (execution: WebhookExecution) => void;
  
  metrics_updated: (metrics: WebhookPerformanceMetrics) => void;
  
  alert_triggered: (alert: WebhookAlert) => void;
  alert_resolved: (alert: WebhookAlert) => void;
  
  test_started: (test: WebhookTestResult) => void;
  test_completed: (test: WebhookTestResult) => void;
  test_progress: (test: WebhookTestResult) => void;
  
  connection_status_changed: (isConnected: boolean, error?: string) => void;
  subscription_error: (webhookId: string, error: string) => void;
}

// Filter and search options for monitoring data
export interface WebhookMonitoringFilters {
  webhook_ids?: string[];
  element_ids?: string[];
  
  // Status filters
  health_status?: ('healthy' | 'warning' | 'critical' | 'unknown')[];
  execution_status?: ('success' | 'error' | 'timeout' | 'cancelled')[];
  
  // Time range filters
  time_range?: {
    start: string;
    end: string;
  };
  
  // Performance filters
  min_performance_score?: number;
  max_response_time_ms?: number;
  min_success_rate?: number;
  
  // Alert filters
  has_active_alerts?: boolean;
  alert_types?: string[];
  
  // Sorting
  sort_by?: 'performance_score' | 'success_rate' | 'response_time' | 'last_execution' | 'name';
  sort_direction?: 'asc' | 'desc';
  
  // Pagination
  page?: number;
  page_size?: number;
}

export default {
  WebhookExecution,
  WebhookPerformanceMetrics,
  WebhookAlert,
  WebhookRelationship,
  WebhookTestTemplate,
  WebhookRealtimeStatus,
  WebhookTestConfiguration,
  WebhookTestResult,
  RealtimeMonitoringState,
  WebhookMonitoringEvents,
  WebhookMonitoringFilters
};