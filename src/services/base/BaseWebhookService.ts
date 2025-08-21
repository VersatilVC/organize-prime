/**
 * Base service class providing common functionality for webhook services
 * Includes error handling, logging, rate limiting, and organization scoping
 */

import { SupabaseClient } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

export interface ServiceConfig {
  organizationId: string;
  enableLogging?: boolean;
  enableRateLimiting?: boolean;
  rateLimitConfig?: {
    maxRequests: number;
    windowMs: number;
  };
}

export interface ServiceError {
  code: string;
  message: string;
  details?: Record<string, any>;
  retryable?: boolean;
  statusCode?: number;
}

export interface RequestMetadata {
  requestId: string;
  timestamp: string;
  userId?: string;
  userAgent?: string;
  ipAddress?: string;
}

export abstract class BaseWebhookService {
  protected supabase: SupabaseClient;
  protected config: ServiceConfig;
  protected requestQueue: Map<string, Promise<any>> = new Map();
  protected rateLimitStore: Map<string, number[]> = new Map();

  constructor(config: ServiceConfig) {
    this.config = config;
    this.supabase = supabase; // Use shared singleton instance
    
    // Initialize rate limiting cleanup
    if (config.enableRateLimiting) {
      this.startRateLimitCleanup();
    }
  }

  /**
   * Execute a database operation with organization scoping and error handling
   */
  protected async executeWithContext<T>(
    operation: (supabase: SupabaseClient) => Promise<{ data: T | null; error: any }>,
    metadata?: RequestMetadata
  ): Promise<T> {
    const requestId = metadata?.requestId || this.generateRequestId();
    
    try {
      // Check rate limits
      if (this.config.enableRateLimiting) {
        await this.checkRateLimit(requestId);
      }

      // Log request start
      if (this.config.enableLogging) {
        this.logRequest('start', requestId, metadata);
      }

      // Execute operation with automatic retry
      const result = await this.executeWithRetry(() => operation(this.supabase));

      // Validate organization scoping
      if (result.data && this.hasOrganizationId(result.data)) {
        this.validateOrganizationAccess(result.data);
      }

      // Log success
      if (this.config.enableLogging) {
        this.logRequest('success', requestId, metadata, { resultCount: Array.isArray(result.data) ? result.data.length : 1 });
      }

      if (result.error) {
        throw this.createServiceError('DATABASE_ERROR', result.error.message, result.error);
      }

      return result.data as T;

    } catch (error) {
      // Log error
      if (this.config.enableLogging) {
        this.logRequest('error', requestId, metadata, { error: error.message });
      }

      throw this.normalizeError(error);
    }
  }

  /**
   * Execute operation with automatic retry logic
   */
  private async executeWithRetry<T>(
    operation: () => Promise<T>,
    maxRetries: number = 3,
    baseDelay: number = 1000
  ): Promise<T> {
    let lastError: Error;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;
        
        // Don't retry certain errors
        if (!this.isRetryableError(error)) {
          throw error;
        }

        // Don't retry on last attempt
        if (attempt === maxRetries) {
          throw error;
        }

        // Calculate delay with exponential backoff
        const delay = baseDelay * Math.pow(2, attempt) + Math.random() * 1000;
        await this.sleep(delay);
      }
    }

    throw lastError!;
  }

  /**
   * Rate limiting implementation
   */
  private async checkRateLimit(identifier: string): Promise<void> {
    if (!this.config.enableRateLimiting || !this.config.rateLimitConfig) {
      return;
    }

    const { maxRequests, windowMs } = this.config.rateLimitConfig;
    const now = Date.now();
    const windowStart = now - windowMs;

    // Get existing requests for this identifier
    const requests = this.rateLimitStore.get(identifier) || [];
    
    // Filter out old requests
    const recentRequests = requests.filter(timestamp => timestamp > windowStart);
    
    // Check if limit exceeded
    if (recentRequests.length >= maxRequests) {
      throw this.createServiceError(
        'RATE_LIMIT_EXCEEDED',
        `Rate limit exceeded: ${maxRequests} requests per ${windowMs}ms`,
        { 
          limit: maxRequests,
          window: windowMs,
          currentCount: recentRequests.length,
          resetTime: Math.min(...recentRequests) + windowMs
        }
      );
    }

    // Add current request
    recentRequests.push(now);
    this.rateLimitStore.set(identifier, recentRequests);
  }

  /**
   * Validate organization access for returned data
   */
  private validateOrganizationAccess(data: any): void {
    if (Array.isArray(data)) {
      data.forEach(item => this.validateSingleItemAccess(item));
    } else {
      this.validateSingleItemAccess(data);
    }
  }

  private validateSingleItemAccess(item: any): void {
    if (item && typeof item === 'object' && 'organization_id' in item) {
      if (item.organization_id !== this.config.organizationId) {
        throw this.createServiceError(
          'UNAUTHORIZED_ACCESS',
          'Attempted to access data from different organization',
          { 
            expectedOrgId: this.config.organizationId,
            actualOrgId: item.organization_id
          }
        );
      }
    }
  }

  /**
   * Error normalization and classification
   */
  private normalizeError(error: any): ServiceError {
    if (error.code && error.message) {
      // Already a ServiceError
      return error;
    }

    if (error.message?.includes('rate limit')) {
      return this.createServiceError('RATE_LIMIT_EXCEEDED', error.message, error);
    }

    if (error.message?.includes('unauthorized') || error.message?.includes('permission')) {
      return this.createServiceError('UNAUTHORIZED', error.message, error);
    }

    if (error.message?.includes('not found')) {
      return this.createServiceError('NOT_FOUND', error.message, error);
    }

    if (error.message?.includes('network') || error.message?.includes('fetch')) {
      return this.createServiceError('NETWORK_ERROR', error.message, error);
    }

    if (error.message?.includes('timeout')) {
      return this.createServiceError('TIMEOUT', error.message, error);
    }

    // Generic error
    return this.createServiceError('UNKNOWN_ERROR', error.message || 'An unknown error occurred', error);
  }

  /**
   * Create standardized service error
   */
  protected createServiceError(
    code: string, 
    message: string, 
    details?: any, 
    retryable: boolean = false,
    statusCode?: number
  ): ServiceError {
    return {
      code,
      message,
      details,
      retryable,
      statusCode
    };
  }

  /**
   * Check if error is retryable
   */
  private isRetryableError(error: any): boolean {
    const retryableCodes = [
      'ECONNRESET',
      'ENOTFOUND',
      'ECONNREFUSED',
      'ETIMEDOUT'
    ];

    const retryableMessages = [
      'network error',
      'timeout',
      'temporary failure',
      'service unavailable',
      'internal server error'
    ];

    const errorMessage = error.message?.toLowerCase() || '';
    const errorCode = error.code || '';

    return retryableCodes.includes(errorCode) || 
           retryableMessages.some(msg => errorMessage.includes(msg)) ||
           (error.status >= 500 && error.status < 600);
  }

  /**
   * Logging functionality
   */
  protected logRequest(
    type: 'start' | 'success' | 'error',
    requestId: string,
    metadata?: RequestMetadata,
    additionalData?: Record<string, any>
  ): void {
    if (!this.config.enableLogging) return;

    const logEntry = {
      type,
      requestId,
      timestamp: new Date().toISOString(),
      organizationId: this.config.organizationId,
      service: this.constructor.name,
      metadata,
      ...additionalData
    };

    console.log(JSON.stringify(logEntry));
  }

  /**
   * Utility methods
   */
  protected generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  protected generateExecutionId(): string {
    return `exec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private hasOrganizationId(data: any): boolean {
    if (Array.isArray(data)) {
      return data.length > 0 && typeof data[0] === 'object' && 'organization_id' in data[0];
    }
    return data && typeof data === 'object' && 'organization_id' in data;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Cleanup rate limit store periodically
   */
  private startRateLimitCleanup(): void {
    setInterval(() => {
      const now = Date.now();
      const windowMs = this.config.rateLimitConfig?.windowMs || 60000;
      
      for (const [identifier, timestamps] of this.rateLimitStore.entries()) {
        const filtered = timestamps.filter(ts => ts > now - windowMs);
        
        if (filtered.length === 0) {
          this.rateLimitStore.delete(identifier);
        } else {
          this.rateLimitStore.set(identifier, filtered);
        }
      }
    }, 60000); // Cleanup every minute
  }

  /**
   * Validation helpers
   */
  protected validateRequired(value: any, fieldName: string): void {
    if (value === undefined || value === null || value === '') {
      throw this.createServiceError(
        'VALIDATION_ERROR',
        `${fieldName} is required`,
        { field: fieldName, value }
      );
    }
  }

  protected validateUrl(url: string, fieldName: string = 'url'): void {
    try {
      const parsed = new URL(url);
      if (!['http:', 'https:'].includes(parsed.protocol)) {
        throw new Error('Invalid protocol');
      }
    } catch (error) {
      throw this.createServiceError(
        'VALIDATION_ERROR',
        `${fieldName} must be a valid HTTP/HTTPS URL`,
        { field: fieldName, value: url }
      );
    }
  }

  protected validateHttpMethod(method: string): void {
    const validMethods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'];
    if (!validMethods.includes(method)) {
      throw this.createServiceError(
        'VALIDATION_ERROR',
        `HTTP method must be one of: ${validMethods.join(', ')}`,
        { field: 'httpMethod', value: method, validOptions: validMethods }
      );
    }
  }

  protected validateRange(value: number, min: number, max: number, fieldName: string): void {
    if (value < min || value > max) {
      throw this.createServiceError(
        'VALIDATION_ERROR',
        `${fieldName} must be between ${min} and ${max}`,
        { field: fieldName, value, min, max }
      );
    }
  }

  /**
   * Query building helpers
   */
  protected buildFiltersQuery(query: any, filters: Record<string, any>): any {
    let filteredQuery = query;

    for (const [key, value] of Object.entries(filters)) {
      if (value !== undefined && value !== null) {
        if (Array.isArray(value)) {
          filteredQuery = filteredQuery.in(key, value);
        } else if (typeof value === 'string' && value.includes('%')) {
          filteredQuery = filteredQuery.like(key, value);
        } else {
          filteredQuery = filteredQuery.eq(key, value);
        }
      }
    }

    return filteredQuery;
  }

  protected buildSortQuery(query: any, sortBy?: string, sortOrder?: 'asc' | 'desc'): any {
    if (sortBy) {
      return query.order(sortBy, { ascending: sortOrder !== 'desc' });
    }
    return query.order('created_at', { ascending: false }); // Default sort
  }

  protected buildPaginationQuery(query: any, page?: number, limit?: number): any {
    const pageSize = Math.min(limit || 50, 100); // Max 100 items per page
    const offset = ((page || 1) - 1) * pageSize;
    
    return query.range(offset, offset + pageSize - 1);
  }

  /**
   * Data transformation helpers
   */
  protected snakeToCamel(obj: any): any {
    if (Array.isArray(obj)) {
      return obj.map(item => this.snakeToCamel(item));
    }
    
    if (obj === null || typeof obj !== 'object') {
      return obj;
    }

    const result: any = {};
    for (const [key, value] of Object.entries(obj)) {
      const camelKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
      result[camelKey] = this.snakeToCamel(value);
    }
    return result;
  }

  protected camelToSnake(obj: any): any {
    if (Array.isArray(obj)) {
      return obj.map(item => this.camelToSnake(item));
    }
    
    if (obj === null || typeof obj !== 'object') {
      return obj;
    }

    const result: any = {};
    for (const [key, value] of Object.entries(obj)) {
      const snakeKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
      result[snakeKey] = this.camelToSnake(value);
    }
    return result;
  }

  /**
   * Cleanup resources
   */
  public dispose(): void {
    this.requestQueue.clear();
    this.rateLimitStore.clear();
  }
}