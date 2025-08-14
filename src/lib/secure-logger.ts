/**
 * Secure Production-Safe Logging Utility
 * 
 * SECURITY: Never logs sensitive data like tokens, passwords, user info, or internal state
 * Only logs in development environment or for critical production errors
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'security';

export interface LogContext {
  component?: string;
  action?: string;
  userId?: string; // Only log user ID, never PII
  organizationId?: string;
  feature?: string;
  timestamp?: string;
}

export interface SecurityEvent {
  type: 'auth_attempt' | 'access_denied' | 'rate_limit' | 'error_boundary' | 'csrf_attempt';
  severity: 'low' | 'medium' | 'high' | 'critical';
  context?: LogContext;
}

class SecureLogger {
  private isDevelopment = import.meta.env.DEV;
  private isProduction = import.meta.env.PROD;
  public originalConsole: Console;

  constructor() {
    // Store original console methods before any overrides
    this.originalConsole = {
      log: console.log?.bind(console) || (() => {}),
      info: console.info?.bind(console) || (() => {}),
      warn: console.warn?.bind(console) || (() => {}),
      error: console.error?.bind(console) || (() => {}),
      debug: console.debug?.bind(console) || (() => {})
    } as Console;
  }

  /**
   * Development-only debug logging
   * NEVER reaches production
   */
  debug(message: string, context?: LogContext): void {
    if (this.isDevelopment) {
      const sanitizedContext = this.sanitizeContext(context);
      // Fallback to regular console if originalConsole is not available
      const logger = this.originalConsole?.log || console.log;
      logger(`[DEBUG] ${message}`, sanitizedContext);
    }
  }

  /**
   * Info logging - development only unless critical
   */
  info(message: string, context?: LogContext): void {
    if (this.isDevelopment) {
      const sanitizedContext = this.sanitizeContext(context);
      const logger = this.originalConsole?.info || console.info;
      logger(`[INFO] ${message}`, sanitizedContext);
    }
  }

  /**
   * Warning logging - allowed in production for non-sensitive warnings
   */
  warn(message: string, context?: LogContext): void {
    const sanitizedContext = this.sanitizeContext(context);
    const logger = this.originalConsole?.warn || console.warn;
    logger(`[WARN] ${message}`, sanitizedContext);
  }

  /**
   * Error logging - allowed in production for error tracking
   * NEVER logs sensitive data
   */
  error(message: string, error?: Error, context?: LogContext): void {
    const sanitizedContext = this.sanitizeContext(context);
    
    if (this.isDevelopment) {
      const logger = this.originalConsole?.error || console.error;
      logger(`[ERROR] ${message}`, error, sanitizedContext);
    } else {
      // Production: Log error message but not stack trace or sensitive data
      const errorInfo = error ? { name: error.name, message: this.sanitizeErrorMessage(error.message) } : undefined;
      const logger = this.originalConsole?.error || console.error;
      logger(`[ERROR] ${message}`, errorInfo, sanitizedContext);
    }
  }

  /**
   * Security event logging - always logs security events for audit trail
   * Sanitizes all data before logging
   */
  security(event: SecurityEvent, message: string): void {
    const sanitizedEvent = {
      type: event.type,
      severity: event.severity,
      timestamp: new Date().toISOString(),
      context: this.sanitizeContext(event.context),
      message: this.sanitizeMessage(message)
    };

    // Always log security events
    const logger = this.originalConsole?.warn || console.warn;
    logger(`[SECURITY] ${event.type} - ${event.severity}`, sanitizedEvent);
  }

  /**
   * Performance logging - development only
   */
  performance(operation: string, duration: number, context?: LogContext): void {
    if (this.isDevelopment) {
      const sanitizedContext = this.sanitizeContext(context);
      const logger = this.originalConsole?.info || console.info;
      logger(`[PERF] ${operation}: ${duration}ms`, sanitizedContext);
    }
  }

  /**
   * Sanitize context to remove sensitive data
   */
  private sanitizeContext(context?: LogContext): LogContext | undefined {
    if (!context) return undefined;

    return {
      component: context.component,
      action: context.action,
      userId: context.userId ? this.hashUserId(context.userId) : undefined,
      organizationId: context.organizationId ? this.hashId(context.organizationId) : undefined,
      feature: context.feature,
      timestamp: context.timestamp || new Date().toISOString()
    };
  }

  /**
   * Sanitize error messages to remove sensitive information
   */
  private sanitizeErrorMessage(message: string): string {
    // Remove potential sensitive patterns
    return message
      .replace(/token[:\s]*[a-zA-Z0-9_\-\.]+/gi, 'token:***')
      .replace(/password[:\s]*[^\s]+/gi, 'password:***')
      .replace(/email[:\s]*[^\s]+/gi, 'email:***')
      .replace(/auth[:\s]*[a-zA-Z0-9_\-\.]+/gi, 'auth:***')
      .replace(/bearer\s+[a-zA-Z0-9_\-\.]+/gi, 'bearer ***')
      .replace(/key[:\s]*[a-zA-Z0-9_\-\.]+/gi, 'key:***');
  }

  /**
   * Sanitize general messages
   */
  private sanitizeMessage(message: string): string {
    return this.sanitizeErrorMessage(message);
  }

  /**
   * Hash user ID for privacy while maintaining uniqueness for debugging
   */
  private hashUserId(userId: string): string {
    if (this.isDevelopment) {
      return userId.substring(0, 8) + '***';
    }
    // In production, use first 4 chars only
    return userId.substring(0, 4) + '***';
  }

  /**
   * Hash any ID for privacy
   */
  private hashId(id: string): string {
    return id.substring(0, 4) + '***';
  }
}

// Export singleton instance
export const logger = new SecureLogger();

// Legacy console replacement for migration
export const secureConsole = {
  log: (message: string, ...args: any[]) => {
    if (import.meta.env.DEV) {
      logger.debug(message, args.length > 0 ? { component: 'legacy' } : undefined);
    }
  },
  
  error: (message: string, error?: Error, ...args: any[]) => {
    logger.error(message, error);
  },
  
  warn: (message: string, ...args: any[]) => {
    logger.warn(message, args.length > 0 ? { component: 'legacy' } : undefined);
  },
  
  info: (message: string, ...args: any[]) => {
    logger.info(message, args.length > 0 ? { component: 'legacy' } : undefined);
  }
};

// Development helper to track console usage
if (import.meta.env.DEV) {
  // Override console in development to track usage
  const originalConsole = { 
    log: console.log?.bind(console) || (() => {}),
    info: console.info?.bind(console) || (() => {}), 
    warn: console.warn?.bind(console) || (() => {}),
    error: console.error?.bind(console) || (() => {})
  };
  
  console.log = (...args) => {
    // Use safe fallback to avoid recursion
    const safeWarn = logger.originalConsole?.warn || originalConsole.warn;
    safeWarn('Direct console.log usage detected - use logger.debug() instead');
    originalConsole.log(...args);
  };
  
  console.error = (...args) => {
    const safeWarn = logger.originalConsole?.warn || originalConsole.warn;
    safeWarn('Direct console.error usage detected - use logger.error() instead');
    originalConsole.error(...args);
  };
  
  console.warn = (...args) => {
    const safeWarn = logger.originalConsole?.warn || originalConsole.warn;
    safeWarn('Direct console.warn usage detected - use logger.warn() instead');
    originalConsole.warn(...args);
  };
}