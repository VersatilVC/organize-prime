/**
 * Type definitions for the enhanced element webhook execution system
 */

// =====================================================
// CORE REQUEST/RESPONSE INTERFACES
// =====================================================

export interface ElementWebhookRequest {
  // Element identification
  organizationId: string;
  featureSlug: string;
  pagePath: string;
  elementId: string;
  
  // Execution context
  eventType: 'click' | 'submit' | 'trigger' | 'test';
  userContext: {
    userId: string;
    role: string;
    sessionId?: string;
    ipAddress?: string;
    userAgent?: string;
  };
  
  // Payload data
  payload: Record<string, any>;
  templateVariables?: Record<string, any>;
  
  // Execution options
  options?: {
    timeout?: number;
    retryCount?: number;
    priority?: 'low' | 'normal' | 'high';
    bypassRateLimit?: boolean;
  };
}

export interface WebhookExecutionResult {
  success: boolean;
  executionId: string;
  webhookId: string;
  statusCode: number;
  responseTime: number;
  responseBody?: any;
  error?: ExecutionError;
  metadata: ExecutionMetadata;
}

export interface ExecutionError {
  type: ErrorType;
  message: string;
  details?: any;
  retryable: boolean;
  suggestedAction?: string;
}

export interface ExecutionMetadata {
  attempts: number;
  totalDuration: number;
  networkLatency: number;
  processingTime: number;
  queueTime: number;
  memoryUsage?: number;
  timestamp: string;
}

// =====================================================
// WEBHOOK CONFIGURATION INTERFACES
// =====================================================

export interface WebhookConfiguration {
  id: string;
  organizationId: string;
  featureSlug: string;
  pagePath: string;
  elementId: string;
  
  // Webhook settings
  endpointUrl: string;
  httpMethod: HttpMethod;
  payloadTemplate: Record<string, any>;
  headers: Record<string, string>;
  
  // Execution settings
  timeoutSeconds: number;
  retryCount: number;
  rateLimitPerMinute: number;
  
  // Authentication
  authConfig?: AuthenticationConfig;
  
  // Security settings
  securityConfig?: SecurityConfig;
  
  // Status and metadata
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AuthenticationConfig {
  type: AuthenticationType;
  credentials: AuthCredentials;
  placement: 'header' | 'query' | 'body';
  customHeaders?: Record<string, string>;
}

export interface AuthCredentials {
  apiKey?: string;
  bearerToken?: string;
  username?: string;
  password?: string;
  clientId?: string;
  clientSecret?: string;
  signingKey?: string;
  customFields?: Record<string, string>;
}

export interface SecurityConfig {
  enableSigning: boolean;
  signingAlgorithm?: 'hmac-sha256' | 'hmac-sha512';
  allowedIpRanges?: string[];
  blockedDomains?: string[];
  validateSsl: boolean;
  enableGeoBlocking: boolean;
  allowedCountries?: string[];
}

// =====================================================
// ENUMS AND CONSTANTS
// =====================================================

export enum HttpMethod {
  GET = 'GET',
  POST = 'POST',
  PUT = 'PUT',
  DELETE = 'DELETE',
  PATCH = 'PATCH'
}

export enum AuthenticationType {
  NONE = 'none',
  API_KEY = 'api_key',
  BEARER_TOKEN = 'bearer_token',
  BASIC_AUTH = 'basic_auth',
  OAUTH2 = 'oauth2',
  HMAC_SIGNATURE = 'hmac_signature',
  CUSTOM = 'custom'
}

export enum ErrorType {
  // Network errors
  NETWORK_TIMEOUT = 'network_timeout',
  NETWORK_UNREACHABLE = 'network_unreachable',
  CONNECTION_REFUSED = 'connection_refused',
  DNS_RESOLUTION_FAILED = 'dns_resolution_failed',
  
  // Authentication errors
  AUTH_INVALID_CREDENTIALS = 'auth_invalid_credentials',
  AUTH_EXPIRED_TOKEN = 'auth_expired_token',
  AUTH_INSUFFICIENT_PERMISSIONS = 'auth_insufficient_permissions',
  AUTH_MISSING_CREDENTIALS = 'auth_missing_credentials',
  
  // Server errors
  SERVER_INTERNAL_ERROR = 'server_internal_error',
  SERVER_RATE_LIMITED = 'server_rate_limited',
  SERVER_MAINTENANCE = 'server_maintenance',
  SERVER_OVERLOADED = 'server_overloaded',
  
  // Client errors
  CLIENT_BAD_REQUEST = 'client_bad_request',
  CLIENT_NOT_FOUND = 'client_not_found',
  CLIENT_VALIDATION_ERROR = 'client_validation_error',
  CLIENT_PAYLOAD_TOO_LARGE = 'client_payload_too_large',
  
  // System errors
  SYSTEM_OVERLOADED = 'system_overloaded',
  SYSTEM_CONFIGURATION_ERROR = 'system_configuration_error',
  SYSTEM_DATABASE_ERROR = 'system_database_error',
  WEBHOOK_NOT_FOUND = 'webhook_not_found',
  WEBHOOK_DISABLED = 'webhook_disabled',
  RATE_LIMIT_EXCEEDED = 'rate_limit_exceeded',
  
  // Validation errors
  VALIDATION_PAYLOAD_INVALID = 'validation_payload_invalid',
  VALIDATION_URL_INVALID = 'validation_url_invalid',
  VALIDATION_TEMPLATE_ERROR = 'validation_template_error'
}

export enum ExecutionStatus {
  SUCCESS = 'success',
  FAILURE = 'failure',
  TIMEOUT = 'timeout',
  RATE_LIMITED = 'rate_limited',
  UNAUTHORIZED = 'unauthorized',
  CONFIGURATION_ERROR = 'configuration_error'
}

// =====================================================
// LOGGING AND MONITORING INTERFACES
// =====================================================

export interface ExecutionLog {
  // Execution metadata
  executionId: string;
  webhookId: string;
  organizationId: string;
  userId: string;
  
  // Element context
  featureSlug: string;
  pagePath: string;
  elementId: string;
  eventType: string;
  
  // Request details
  request: {
    method: string;
    url: string;
    headers: Record<string, string>;
    payloadSize: number;
    templateVariables: Record<string, any>;
  };
  
  // Response details
  response?: {
    statusCode: number;
    headers: Record<string, string>;
    bodySize: number;
    contentType: string;
  };
  
  // Performance metrics
  performance: {
    responseTime: number;
    networkLatency: number;
    processingTime: number;
    queueTime: number;
    memoryUsage: number;
  };
  
  // Error information
  error?: {
    type: ErrorType;
    message: string;
    stackTrace?: string;
    context: Record<string, any>;
  };
  
  // Audit trail
  audit: {
    timestamp: string;
    source: string;
    userAgent: string;
    ipAddress: string;
    sessionId: string;
    executionEnvironment: string;
  };
  
  // Status and metadata
  status: ExecutionStatus;
  retryAttempt: number;
  totalAttempts: number;
}

export interface PerformanceMetrics {
  webhookId: string;
  organizationId: string;
  
  // Success/failure rates
  totalExecutions: number;
  successfulExecutions: number;
  failedExecutions: number;
  successRate: number;
  
  // Performance statistics
  averageResponseTime: number;
  medianResponseTime: number;
  p95ResponseTime: number;
  p99ResponseTime: number;
  
  // Error analysis
  errorsByType: Record<ErrorType, number>;
  mostCommonError: ErrorType | null;
  
  // Time-based metrics
  executionsLast24h: number;
  executionsLastHour: number;
  lastExecutionTime: string;
  
  // Resource utilization
  averageMemoryUsage: number;
  averageNetworkLatency: number;
  averageProcessingTime: number;
}

// =====================================================
// RATE LIMITING INTERFACES
// =====================================================

export interface RateLimitConfig {
  // Per-webhook limits
  webhookLimits: {
    perMinute: number;
    perHour: number;
    perDay: number;
    burstAllowance: number;
  };
  
  // Per-user limits
  userLimits: {
    perMinute: number;
    perHour: number;
    perDay: number;
    dailyQuota: number;
  };
  
  // Organization limits
  orgLimits: {
    perMinute: number;
    perHour: number;
    perDay: number;
    monthlyQuota: number;
  };
  
  // Global system limits
  globalLimits: {
    perSecond: number;
    perMinute: number;
    concurrentExecutions: number;
    maxQueueSize: number;
  };
}

export interface RateLimitStatus {
  allowed: boolean;
  limitType: 'webhook' | 'user' | 'organization' | 'global';
  currentCount: number;
  limitValue: number;
  windowStart: string;
  windowEnd: string;
  retryAfter?: number;
}

// =====================================================
// UTILITY INTERFACES
// =====================================================

export interface PayloadTemplateContext {
  user: {
    id: string;
    email: string;
    role: string;
    organization: string;
  };
  organization: {
    id: string;
    name: string;
    slug: string;
    settings: Record<string, any>;
  };
  element: {
    id: string;
    type: string;
    page: string;
    feature: string;
  };
  event: {
    type: string;
    timestamp: string;
    sessionId: string;
  };
  payload: Record<string, any>;
  system: {
    timestamp: string;
    environment: string;
    version: string;
  };
}

export interface WebhookTestResult {
  success: boolean;
  responseTime: number;
  statusCode: number;
  responseBody: any;
  error?: string;
  validationErrors?: string[];
  performanceScore: number;
  recommendations?: string[];
}

// =====================================================
// CONFIGURATION CONSTANTS
// =====================================================

export const DEFAULT_TIMEOUT_SECONDS = 30;
export const MAX_TIMEOUT_SECONDS = 300;
export const DEFAULT_RETRY_COUNT = 3;
export const MAX_RETRY_COUNT = 10;
export const MAX_PAYLOAD_SIZE = 50 * 1024 * 1024; // 50MB
export const MAX_RESPONSE_SIZE = 100 * 1024 * 1024; // 100MB
export const DEFAULT_RATE_LIMIT = 60; // per minute

export const RETRY_DELAYS = [1000, 2000, 4000, 8000, 16000]; // Exponential backoff in ms

export const HTTP_STATUS_CODES = {
  SUCCESS_RANGE: { min: 200, max: 299 },
  CLIENT_ERROR_RANGE: { min: 400, max: 499 },
  SERVER_ERROR_RANGE: { min: 500, max: 599 }
} as const;