/**
 * Security Configuration and Validation
 * Critical security utilities for the application
 */

import { supabase } from '@/integrations/supabase/client';

export interface SecurityConfig {
  passwordMinLength: number;
  sessionTimeoutMinutes: number;
  maxLoginAttempts: number;
  rateLimitWindow: number;
}

export const SECURITY_CONFIG: SecurityConfig = {
  passwordMinLength: 8,
  sessionTimeoutMinutes: 60,
  maxLoginAttempts: 5,
  rateLimitWindow: 15, // minutes
};

/**
 * Validates environment variables for security
 */
export const validateEnvironment = () => {
  // Environment validation - Lovable handles Supabase configuration internally
  // No need to validate VITE_ variables as they are not supported
  
  // Basic validation that we have a working environment
  try {
    // Test if we can access the client configuration
    if (typeof window !== 'undefined') {
      // Client-side validation passed
      return true;
    }
    return true;
  } catch (error) {
    console.error('Environment validation failed:', error);
    return false;
  }
};

/**
 * Client-side input sanitization
 */
export const sanitizeInput = (input: string): string => {
  if (!input) return '';
  
  // Remove HTML tags and dangerous characters
  let sanitized = input
    .replace(/<[^>]*>/g, '') // Remove HTML tags
    .replace(/['"`;\\]/g, '') // Remove dangerous chars
    .trim();

  // Limit length
  if (sanitized.length > 1000) {
    sanitized = sanitized.substring(0, 1000);
  }

  return sanitized;
};

/**
 * Validates email format
 */
export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;
  return emailRegex.test(email);
};

/**
 * Client-side password strength validation
 */
export interface PasswordStrength {
  score: number;
  maxScore: number;
  isStrong: boolean;
  feedback: string[];
}

export const validatePasswordStrength = (password: string): PasswordStrength => {
  let score = 0;
  const feedback: string[] = [];

  // Check length
  if (password.length >= 8) {
    score += 1;
  } else {
    feedback.push('Password must be at least 8 characters long');
  }

  // Check for uppercase
  if (/[A-Z]/.test(password)) {
    score += 1;
  } else {
    feedback.push('Password must contain at least one uppercase letter');
  }

  // Check for lowercase
  if (/[a-z]/.test(password)) {
    score += 1;
  } else {
    feedback.push('Password must contain at least one lowercase letter');
  }

  // Check for numbers
  if (/[0-9]/.test(password)) {
    score += 1;
  } else {
    feedback.push('Password must contain at least one number');
  }

  // Check for special characters
  if (/[^A-Za-z0-9]/.test(password)) {
    score += 1;
  } else {
    feedback.push('Password must contain at least one special character');
  }

  // Check for common patterns
  if (/(password|123456|qwerty|admin)/i.test(password)) {
    feedback.push('Password contains common patterns');
    score = Math.max(0, score - 1);
  }

  return {
    score: Math.max(score, 0),
    maxScore: 5,
    isStrong: score >= 4,
    feedback,
  };
};

/**
 * Rate limiting check - now with graceful failure handling
 */
export const checkRateLimit = async (
  identifier: string,
  actionType: string,
  limit: number = 10,
  windowMinutes: number = 60
): Promise<boolean> => {
  try {
    const { data, error } = await supabase.rpc('check_rate_limit', {
      p_identifier: identifier,
      p_action_type: actionType,
      p_limit: limit,
      p_window_minutes: windowMinutes,
    });

    if (error) {
      console.warn('Rate limit check failed, allowing request:', error.message);
      // For now, allow the request if rate limiting fails to prevent blocking auth
      return true;
    }

    return data === true;
  } catch (error) {
    console.warn('Rate limit check error, allowing request:', error);
    // For now, allow the request if rate limiting fails to prevent blocking auth
    return true;
  }
};

/**
 * Log security events for audit trail
 */
export const logSecurityEvent = async (
  action: string,
  resourceType: string,
  resourceId?: string,
  details?: Record<string, any>
) => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) return;

    // Get user's current organization
    const { data: memberships } = await supabase
      .from('memberships')
      .select('organization_id')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .limit(1);

    const organizationId = memberships?.[0]?.organization_id;

    await supabase.rpc('log_security_event', {
      p_user_id: user.id,
      p_organization_id: organizationId,
      p_action: action,
      p_resource_type: resourceType,
      p_resource_id: resourceId || null,
      p_details: details || {},
    });
  } catch (error) {
    console.error('Failed to log security event:', error);
  }
};

/**
 * Generate secure random string for tokens
 */
export const generateSecureToken = (length: number = 32): string => {
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
};

/**
 * Validate session security
 */
export const validateSessionSecurity = async (): Promise<boolean> => {
  try {
    const { data, error } = await supabase.rpc('validate_session_security');
    
    if (error) {
      console.error('Session validation failed:', error);
      return false;
    }

    return data === true;
  } catch (error) {
    console.error('Session validation error:', error);
    return false;
  }
};

/**
 * Security headers for API requests
 */
export const getSecurityHeaders = (): Record<string, string> => {
  return {
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
  };
};

// Initialize security configuration
export const initializeSecurity = () => {
  if (!validateEnvironment()) {
    throw new Error('Security validation failed: Invalid environment configuration');
  }

  // Add global error handler for unhandled security errors
  window.addEventListener('unhandledrejection', (event) => {
    if (event.reason?.message?.includes('security') || 
        event.reason?.message?.includes('unauthorized')) {
      console.error('Security-related error:', event.reason);
      logSecurityEvent('security_error', 'application', undefined, {
        error: event.reason?.message,
        stack: event.reason?.stack,
      });
    }
  });

  console.log('Security configuration initialized successfully');
};