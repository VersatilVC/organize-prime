/**
 * Comprehensive type definitions for the Visual Button-Level Webhook System
 * Replaces feature-centric webhook types with element-specific interfaces
 */

// Core webhook configuration
export interface ElementWebhook {
  id: string;
  organizationId: string;
  featureSlug: string;
  pagePath: string;
  elementId: string;
  
  // Webhook configuration
  endpointUrl: string;
  httpMethod: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  payloadTemplate: Record<string, any>;
  headers: Record<string, string>;
  
  // Execution settings
  timeoutSeconds: number;
  retryCount: number;
  rateLimitPerMinute: number;
  
  // Status and metadata
  isActive: boolean;
  healthStatus: 'healthy' | 'degraded' | 'unreachable' | 'unknown';
  lastHealthCheck?: string;
  disabledUntil?: string;
  disableReason?: string;
  
  // Audit fields
  createdBy: string;
  updatedBy: string;
  createdAt: string;
  updatedAt: string;
  
  // Statistics
  totalExecutions: number;
  successfulExecutions: number;
  failedExecutions: number;
  averageResponseTime: number;
  lastExecutedAt?: string;
}

// Create webhook request
export interface CreateElementWebhookRequest {
  featureSlug: string;
  pagePath: string;
  elementId: string;
  elementType?: string; // Optional - defaults to 'button'
  displayName?: string; // Optional - auto-generated if not provided
  endpointUrl: string;
  httpMethod: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  payloadTemplate?: Record<string, any>;
  headers?: Record<string, string>;
  timeoutSeconds?: number;
  retryCount?: number;
  rateLimitPerMinute?: number;
  isActive?: boolean;
}

// Update webhook request
export interface UpdateElementWebhookRequest {
  endpointUrl?: string;
  httpMethod?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  payloadTemplate?: Record<string, any>;
  headers?: Record<string, string>;
  timeoutSeconds?: number;
  retryCount?: number;
  rateLimitPerMinute?: number;
  isActive?: boolean;
}

// Bulk operations
export interface BulkUpdateRequest {
  id: string;
  updates: UpdateElementWebhookRequest;
}

export interface BulkCreateResponse {
  successful: ElementWebhook[];
  failed: Array<{
    request: CreateElementWebhookRequest;
    error: string;
  }>;
}

// Search and filtering
export interface WebhookSearchFilters {
  featureSlug?: string;
  pagePath?: string;
  elementId?: string;
  isActive?: boolean;
  healthStatus?: ElementWebhook['healthStatus'];
  endpointDomain?: string;
  createdBy?: string;
  createdAfter?: string;
  createdBefore?: string;
  hasRecentFailures?: boolean;
  search?: string; // General text search
}

export interface PaginatedWebhooks {
  webhooks: ElementWebhook[];
  totalCount: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  currentPage: number;
  totalPages: number;
}

// Element discovery types
export interface DiscoveredElement {
  elementId: string;
  elementType: 'button' | 'form' | 'link' | 'input' | 'select' | 'div' | 'span' | 'other';
  tagName: string;
  textContent?: string;
  attributes: Record<string, string>;
  cssSelector: string;
  xpath: string;
  boundingRect: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  isVisible: boolean;
  isInteractable: boolean;
  parentElementId?: string;
  childElementIds: string[];
  discoveredAt: string;
  fingerprint: string; // For change detection
}

export interface PageElement {
  id: string;
  organizationId: string;
  featureSlug: string;
  pagePath: string;
  elementId: string;
  elementType: DiscoveredElement['elementType'];
  displayName: string;
  description?: string;
  cssSelector: string;
  xpath: string;
  attributes: Record<string, string>;
  isStable: boolean; // True if element hasn't changed across scans
  lastSeenAt: string;
  registeredAt: string;
  registeredBy: string;
  hasActiveWebhook: boolean;
  webhookCount: number;
}

export interface ElementRegistration {
  featureSlug: string;
  pagePath: string;
  elementId: string;
  displayName: string;
  description?: string;
  elementType: DiscoveredElement['elementType'];
  cssSelector: string;
  xpath: string;
  attributes: Record<string, string>;
}

export interface ElementUpdate {
  displayName?: string;
  description?: string;
  cssSelector?: string;
  xpath?: string;
  attributes?: Record<string, string>;
}

// Discovery session management
export interface DiscoverySession {
  id: string;
  featureSlug: string;
  status: 'active' | 'paused' | 'completed' | 'cancelled';
  startedAt: string;
  completedAt?: string;
  elementsDiscovered: number;
  pagesScanned: string[];
  currentPage?: string;
  settings: {
    autoApprove: boolean;
    minInteractionTime: number;
    excludeSelectors: string[];
    includeHidden: boolean;
  };
}

export interface DiscoveryStatus {
  session: DiscoverySession;
  recentElements: DiscoveredElement[];
  statistics: {
    totalElements: number;
    newElements: number;
    changedElements: number;
    stableElements: number;
  };
}

export interface ElementChanges {
  featureSlug: string;
  pagePath: string;
  added: DiscoveredElement[];
  removed: string[]; // Element IDs
  modified: Array<{
    elementId: string;
    changes: {
      field: string;
      oldValue: any;
      newValue: any;
    }[];
  }>;
  unchanged: string[];
  scanTimestamp: string;
}

export interface WebhookSuggestion {
  elementId: string;
  confidence: number; // 0-1 score
  suggestedEndpoint: string;
  suggestedMethod: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  reasoning: string[];
  payloadTemplate: Record<string, any>;
  priority: 'low' | 'medium' | 'high';
}

// Webhook execution types
export interface WebhookExecutionRequest {
  webhookId?: string; // Optional - can execute by element coordinates
  featureSlug: string;
  pagePath: string;
  elementId: string;
  eventType: 'click' | 'submit' | 'trigger' | 'test';
  payload: Record<string, any>;
  userContext: {
    userId: string;
    role: string;
    sessionId?: string;
    userAgent?: string;
    ipAddress?: string;
  };
  templateVariables?: Record<string, any>;
  overrides?: {
    endpointUrl?: string;
    headers?: Record<string, string>;
    timeoutSeconds?: number;
  };
}

export interface ExecutionResult {
  success: boolean;
  executionId: string;
  webhookId: string;
  statusCode?: number;
  responseTime: number;
  responseBody?: any;
  error?: ExecutionError;
  metadata: {
    attempts: number;
    networkLatency: number;
    processingTime: number;
    queueTime: number;
    memoryUsage?: number;
  };
}

export interface ExecutionHandle {
  executionId: string;
  status: ExecutionStatus;
  getResult(): Promise<ExecutionResult>;
  cancel(): Promise<boolean>;
}

export interface BatchExecutionResult {
  requestId: string;
  successful: ExecutionResult[];
  failed: Array<{
    request: WebhookExecutionRequest;
    error: ExecutionError;
  }>;
  statistics: {
    totalRequests: number;
    successfulExecutions: number;
    failedExecutions: number;
    averageResponseTime: number;
    totalExecutionTime: number;
  };
}

// Execution monitoring
export enum ExecutionStatus {
  PENDING = 'pending',
  QUEUED = 'queued',
  EXECUTING = 'executing',
  SUCCESS = 'success',
  FAILURE = 'failure',
  TIMEOUT = 'timeout',
  CANCELLED = 'cancelled',
  RETRYING = 'retrying',
  RATE_LIMITED = 'rate_limited',
  UNAUTHORIZED = 'unauthorized',
  CONFIGURATION_ERROR = 'configuration_error'
}

export interface ExecutionLog {
  id: string;
  executionId: string;
  webhookId: string;
  organizationId: string;
  userId: string;
  featureSlug: string;
  pagePath: string;
  elementId: string;
  eventType: string;
  status: ExecutionStatus;
  statusCode?: number;
  responseTime?: number;
  errorDetails?: {
    type: string;
    message: string;
    context: Record<string, any>;
    retryable: boolean;
    suggestedAction: string;
  };
  executionContext: {
    requestId: string;
    userAgent?: string;
    ipAddress?: string;
    sessionId?: string;
  };
  requestDetails: {
    method: string;
    url: string;
    payloadSize: number;
    templateVariables: Record<string, any>;
  };
  responseDetails?: {
    statusCode: number;
    bodySize: number;
    contentType: string;
  };
  performanceMetrics: {
    responseTime: number;
    networkLatency: number;
    processingTime: number;
    queueTime: number;
    memoryUsage: number;
  };
  startedAt: string;
  completedAt?: string;
}

export interface PaginatedExecutions {
  executions: ExecutionLog[];
  totalCount: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  currentPage: number;
  totalPages: number;
}

export interface FailedExecution {
  executionLog: ExecutionLog;
  retryAttempts: number;
  lastRetryAt?: string;
  nextRetryAt?: string;
  isRetryable: boolean;
  escalationLevel: 'low' | 'medium' | 'high' | 'critical';
}

// Performance and health monitoring
export interface ExecutionMetrics {
  webhookId: string;
  timeRange: TimeRange;
  totalExecutions: number;
  successfulExecutions: number;
  failedExecutions: number;
  successRate: number;
  averageResponseTime: number;
  medianResponseTime: number;
  p95ResponseTime: number;
  p99ResponseTime: number;
  errorsByType: Record<string, number>;
  executionsByHour: Array<{
    hour: string;
    executions: number;
    successRate: number;
    averageResponseTime: number;
  }>;
  topErrors: Array<{
    errorType: string;
    errorMessage: string;
    count: number;
    percentage: number;
  }>;
}

export interface PerformanceAnalytics {
  webhookId: string;
  overallHealth: 'excellent' | 'good' | 'poor' | 'critical';
  healthScore: number; // 0-100
  trends: {
    responseTime: 'improving' | 'stable' | 'degrading';
    successRate: 'improving' | 'stable' | 'degrading';
    errorRate: 'improving' | 'stable' | 'degrading';
  };
  recommendations: Array<{
    type: 'performance' | 'reliability' | 'configuration';
    priority: 'low' | 'medium' | 'high' | 'critical';
    title: string;
    description: string;
    actionRequired: boolean;
  }>;
  benchmarks: {
    industryAverageResponseTime: number;
    industryAverageSuccessRate: number;
    performancePercentile: number; // How this webhook compares to others
  };
}

export interface WebhookHealthStatus {
  webhookId: string;
  status: 'healthy' | 'degraded' | 'unhealthy' | 'unknown';
  lastChecked: string;
  uptime: number; // Percentage over last 24 hours
  issues: Array<{
    type: 'connectivity' | 'performance' | 'errors' | 'configuration';
    severity: 'low' | 'medium' | 'high' | 'critical';
    description: string;
    detectedAt: string;
    resolvedAt?: string;
  }>;
  metrics: {
    averageResponseTime: number;
    successRate: number;
    lastSuccessfulExecution?: string;
    consecutiveFailures: number;
  };
}

export interface SystemHealthOverview {
  overallStatus: 'operational' | 'degraded' | 'major_outage';
  activeWebhooks: number;
  healthyWebhooks: number;
  degradedWebhooks: number;
  unhealthyWebhooks: number;
  totalExecutionsToday: number;
  successRateToday: number;
  averageResponseTimeToday: number;
  activeAlerts: number;
  criticalAlerts: number;
  systemLoad: number; // 0-100 percentage
  components: Array<{
    name: string;
    status: 'operational' | 'degraded' | 'outage';
    responseTime?: number;
    uptime: number;
  }>;
}

export interface PerformanceAlert {
  id: string;
  webhookId?: string;
  organizationId: string;
  alertType: 'slow_response' | 'high_error_rate' | 'high_volume' | 'connectivity_issue' | 'system_overload';
  severity: 'info' | 'warning' | 'critical';
  title: string;
  description: string;
  thresholdValue: number;
  currentValue: number;
  detectedAt: string;
  acknowledgedAt?: string;
  resolvedAt?: string;
  acknowledgedBy?: string;
  autoResolved: boolean;
  actions: Array<{
    type: 'manual' | 'automatic';
    description: string;
    completed: boolean;
    completedAt?: string;
  }>;
}

// Time range utilities
export interface TimeRange {
  start: string; // ISO timestamp
  end: string; // ISO timestamp
  preset?: '1h' | '6h' | '24h' | '7d' | '30d' | 'custom';
}

// Validation and testing
export interface ValidationResult {
  valid: boolean;
  errors: Array<{
    field: string;
    message: string;
    code: string;
  }>;
  warnings: Array<{
    field: string;
    message: string;
    code: string;
  }>;
}

export interface ConnectivityTestResult {
  success: boolean;
  responseTime: number;
  statusCode?: number;
  error?: string;
  endpointReachable: boolean;
  sslValid: boolean;
  dnsResolvable: boolean;
  certificateExpiry?: string;
  redirectChain: string[];
  recommendations: string[];
  testedAt: string;
}

// Error types
export interface ExecutionError {
  type: string;
  message: string;
  details: Record<string, any>;
  retryable: boolean;
  suggestedAction: string;
}

// Pagination utilities
export interface PaginationOptions {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

// Real-time event types
export interface ExecutionEvent {
  type: 'execution_started' | 'execution_completed' | 'execution_failed' | 'execution_retry';
  executionId: string;
  webhookId: string;
  timestamp: string;
  data: Record<string, any>;
}

// Hook-specific types for React integration
export interface WebhookManagementHook {
  webhook: ElementWebhook | null;
  isLoading: boolean;
  error: Error | null;
  
  // Actions
  createWebhook: (config: CreateElementWebhookRequest) => Promise<ElementWebhook>;
  updateWebhook: (updates: UpdateElementWebhookRequest) => Promise<ElementWebhook>;
  deleteWebhook: () => Promise<boolean>;
  testWebhook: () => Promise<ConnectivityTestResult>;
  
  // Real-time data
  recentExecutions: ExecutionLog[];
  healthStatus: WebhookHealthStatus;
  performanceMetrics: ExecutionMetrics;
}

export interface WebhookEditorHook {
  webhook: ElementWebhook | null;
  isEditing: boolean;
  isDirty: boolean;
  isValid: boolean;
  
  // Form state
  formData: Partial<CreateElementWebhookRequest>;
  validationErrors: ValidationResult;
  
  // Actions
  updateField: (field: string, value: any) => void;
  validateForm: () => Promise<ValidationResult>;
  saveWebhook: () => Promise<ElementWebhook>;
  resetForm: () => void;
  testConfiguration: () => Promise<ConnectivityTestResult>;
}

export interface WebhookTestingHook {
  isRunning: boolean;
  testResults: ConnectivityTestResult[];
  currentTest?: string;
  
  // Actions
  runConnectivityTest: () => Promise<ConnectivityTestResult>;
  runPerformanceTest: () => Promise<PerformanceAnalytics>;
  runIntegrationTest: (payload: Record<string, any>) => Promise<ExecutionResult>;
  
  // History
  testHistory: Array<{
    testType: string;
    result: any;
    timestamp: string;
  }>;
}

// Context types for element-based operations
export interface ElementContext {
  featureSlug: string;
  pagePath: string;
  elementId: string;
}