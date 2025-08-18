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
  private isDevelopment: boolean;
  private isProduction: boolean;
  public originalConsole: Console;
  private isInitialized = false;

  constructor() {
    try {
      this.isDevelopment = import.meta.env?.DEV ?? false;
      this.isProduction = import.meta.env?.PROD ?? true;
    } catch {
      // Fallback if import.meta is not available
      this.isDevelopment = typeof window !== 'undefined' && 
        (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
      this.isProduction = !this.isDevelopment;
    }
    
    try {
      // Store original console methods before any overrides
      this.originalConsole = {
        log: console?.log?.bind?.(console) || (() => {}),
        info: console?.info?.bind?.(console) || (() => {}),
        warn: console?.warn?.bind?.(console) || (() => {}),
        error: console?.error?.bind?.(console) || (() => {}),
        debug: console?.debug?.bind?.(console) || (() => {})
      } as Console;
      this.isInitialized = true;
    } catch (error) {
      // Create safe fallback console
      this.originalConsole = {
        log: () => {},
        info: () => {},
        warn: () => {},
        error: () => {},
        debug: () => {}
      } as Console;
      this.isInitialized = false;
    }
  }

  /**
   * Development-only debug logging with safety checks
   * NEVER reaches production
   */
  debug(message: string, context?: LogContext): void {
    if (!this.isDevelopment || !this.isInitialized) return;
    
    try {
      const sanitizedContext = this.sanitizeContext(context);
      const logger = this.originalConsole?.log || (() => {});
      logger(`[DEBUG] ${message}`, sanitizedContext);
    } catch (error) {
      // Silent failure to prevent logger from breaking the app
    }
  }

  /**
   * Info logging - development only unless critical
   */
  info(message: string, context?: LogContext): void {
    if (!this.isDevelopment) return;
    
    try {
      const sanitizedContext = this.sanitizeContext(context);
      const logger = this.originalConsole?.info || (() => {});
      logger(`[INFO] ${message}`, sanitizedContext);
    } catch (error) {
      // Silent failure
    }
  }

  /**
   * Warning logging - allowed in production for non-sensitive warnings
   */
  warn(message: string, context?: LogContext): void {
    try {
      const sanitizedContext = this.sanitizeContext(context);
      const logger = this.originalConsole?.warn || (() => {});
      logger(`[WARN] ${message}`, sanitizedContext);
    } catch (error) {
      // Silent failure
    }
  }

  /**
   * Error logging - allowed in production for error tracking
   * NEVER logs sensitive data
   */
  error(message: string, error?: Error, context?: LogContext): void {
    try {
      const sanitizedContext = this.sanitizeContext(context);
      const logger = this.originalConsole?.error || (() => {});
      
      if (this.isDevelopment) {
        logger(`[ERROR] ${message}`, error, sanitizedContext);
      } else {
        // Production: Log error message but not stack trace or sensitive data
        const errorInfo = error ? { 
          name: error.name, 
          message: this.sanitizeErrorMessage(error.message || 'Unknown error') 
        } : undefined;
        logger(`[ERROR] ${message}`, errorInfo, sanitizedContext);
      }
    } catch (logError) {
      // Last resort: try native console.error
      try {
        console?.error?.(`Logger failed: ${message}`);
      } catch {
        // Complete silent failure
      }
    }
  }

  /**
   * Security event logging - always logs security events for audit trail
   * Sanitizes all data before logging
   */
  security(event: SecurityEvent, message: string): void {
    try {
      const sanitizedEvent = {
        type: event.type,
        severity: event.severity,
        timestamp: new Date().toISOString(),
        context: this.sanitizeContext(event.context),
        message: this.sanitizeMessage(message)
      };

      // Always log security events
      const logger = this.originalConsole?.warn || (() => {});
      logger(`[SECURITY] ${event.type} - ${event.severity}`, sanitizedEvent);
    } catch (error) {
      // Security events are critical, try fallback
      try {
        console?.warn?.(`[SECURITY] ${event.type} - ${event.severity}: ${message}`);
      } catch {
        // Silent failure
      }
    }
  }

  /**
   * Performance logging - development only
   */
  performance(operation: string, duration: number, context?: LogContext): void {
    if (!this.isDevelopment) return;
    
    try {
      const sanitizedContext = this.sanitizeContext(context);
      const logger = this.originalConsole?.info || (() => {});
      logger(`[PERF] ${operation}: ${duration}ms`, sanitizedContext);
    } catch (error) {
      // Silent failure
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
    if (!message || typeof message !== 'string') {
      return 'Invalid error message';
    }
    
    try {
      // Remove potential sensitive patterns
      return message
        .replace(/token[:\s]*[a-zA-Z0-9_\-\.]+/gi, 'token:***')
        .replace(/password[:\s]*[^\s]+/gi, 'password:***')
        .replace(/email[:\s]*[^\s]+/gi, 'email:***')
        .replace(/auth[:\s]*[a-zA-Z0-9_\-\.]+/gi, 'auth:***')
        .replace(/bearer\s+[a-zA-Z0-9_\-\.]+/gi, 'bearer ***')
        .replace(/key[:\s]*[a-zA-Z0-9_\-\.]+/gi, 'key:***')
        .replace(/api[_\-]?key[:\s]*[a-zA-Z0-9_\-\.]+/gi, 'api_key:***')
        .replace(/secret[:\s]*[a-zA-Z0-9_\-\.]+/gi, 'secret:***');
    } catch {
      return 'Error message sanitization failed';
    }
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

// DISABLED: Console override causing infinite recursion loops
// Development tracking moved to optional debugging tools only
// The console override was creating recursive calls when initializeEnvironment() 
// called console.log, which triggered the override warnings, which called console methods again

if (import.meta.env?.DEV && typeof window !== 'undefined') {
  // Instead of overriding console, provide debugging utilities
  (window as any).__secureLogger = {
    logger,
    trackConsoleUsage: false, // Can be enabled manually for debugging
    enableTracking: () => {
      (window as any).__secureLogger.trackConsoleUsage = true;
      logger.debug('Console usage tracking enabled manually');
    },
    disableTracking: () => {
      (window as any).__secureLogger.trackConsoleUsage = false;
      logger.debug('Console usage tracking disabled');
    }
  };
}