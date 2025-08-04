/**
 * Security Middleware for API Requests and Form Validation
 */

import { supabase } from '@/integrations/supabase/client';
import { sanitizeInput, checkRateLimit, logSecurityEvent } from './security-config';

export interface SecurityValidationResult {
  isValid: boolean;
  errors: string[];
  sanitizedData?: Record<string, any>;
}

/**
 * Validates and sanitizes form data with security checks
 */
export const validateFormData = async (
  data: Record<string, any>,
  validationRules: Record<string, (value: any) => boolean | string>
): Promise<SecurityValidationResult> => {
  const errors: string[] = [];
  const sanitizedData: Record<string, any> = {};

  for (const [field, value] of Object.entries(data)) {
    // Sanitize input
    const sanitizedValue = typeof value === 'string' ? sanitizeInput(value) : value;
    sanitizedData[field] = sanitizedValue;

    // Apply validation rules
    if (validationRules[field]) {
      const validationResult = validationRules[field](sanitizedValue);
      if (typeof validationResult === 'string') {
        errors.push(`${field}: ${validationResult}`);
      } else if (!validationResult) {
        errors.push(`${field}: Invalid value`);
      }
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    sanitizedData: errors.length === 0 ? sanitizedData : undefined,
  };
};

/**
 * Security wrapper for Supabase queries
 */
export const secureQuery = async <T>(
  queryBuilder: any,
  options: {
    action: string;
    resourceType: string;
    resourceId?: string;
    rateLimitKey?: string;
    rateLimitMax?: number;
    rateLimitWindow?: number;
  }
): Promise<{ data: T | null; error: Error | null }> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      await logSecurityEvent('unauthorized_access_attempt', options.resourceType, options.resourceId);
      return { data: null, error: new Error('Unauthorized') };
    }

    // Rate limiting if specified
    if (options.rateLimitKey) {
      const rateLimitPassed = await checkRateLimit(
        `${user.id}_${options.rateLimitKey}`,
        options.action,
        options.rateLimitMax || 10,
        options.rateLimitWindow || 60
      );

      if (!rateLimitPassed) {
        await logSecurityEvent('rate_limit_exceeded', options.resourceType, options.resourceId, {
          userId: user.id,
          action: options.action,
        });
        return { data: null, error: new Error('Rate limit exceeded') };
      }
    }

    // Execute query
    const { data, error } = await queryBuilder;

    // Log the action
    if (error) {
      await logSecurityEvent(`${options.action}_failed`, options.resourceType, options.resourceId, {
        userId: user.id,
        error: error.message,
      });
    } else {
      await logSecurityEvent(`${options.action}_success`, options.resourceType, options.resourceId, {
        userId: user.id,
      });
    }

    return { data, error };
  } catch (err) {
    const error = err as Error;
    await logSecurityEvent(`${options.action}_error`, options.resourceType, options.resourceId, {
      error: error.message,
    });
    return { data: null, error };
  }
};

/**
 * Common validation rules
 */
export const commonValidationRules = {
  email: (value: string) => {
    const emailRegex = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;
    return emailRegex.test(value) || 'Invalid email format';
  },
  
  required: (value: any) => {
    return (value !== null && value !== undefined && value !== '') || 'This field is required';
  },
  
  minLength: (min: number) => (value: string) => {
    return value.length >= min || `Minimum length is ${min} characters`;
  },
  
  maxLength: (max: number) => (value: string) => {
    return value.length <= max || `Maximum length is ${max} characters`;
  },
  
  alphanumeric: (value: string) => {
    return /^[a-zA-Z0-9_]+$/.test(value) || 'Only letters, numbers, and underscores allowed';
  },
  
  noHtml: (value: string) => {
    return !/<[^>]*>/g.test(value) || 'HTML tags are not allowed';
  },
  
  uuid: (value: string) => {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(value) || 'Invalid UUID format';
  },
};

/**
 * Security headers for API requests
 */
export const getSecurityHeaders = (): Record<string, string> => {
  return {
    'Content-Type': 'application/json',
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
  };
};

/**
 * CSRF token validation (for future use with edge functions)
 */
export const generateCSRFToken = (): string => {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
};

/**
 * File upload security validation
 */
export const validateFileUpload = (file: File): SecurityValidationResult => {
  const errors: string[] = [];
  
  // Check file size (10MB limit)
  if (file.size > 10 * 1024 * 1024) {
    errors.push('File size must be less than 10MB');
  }
  
  // Check file type
  const allowedTypes = [
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'application/pdf',
    'text/plain',
    'application/json',
  ];
  
  if (!allowedTypes.includes(file.type)) {
    errors.push('File type not allowed');
  }
  
  // Check filename
  const dangerousExtensions = ['.exe', '.bat', '.cmd', '.com', '.pif', '.scr', '.vbs', '.js'];
  const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
  
  if (dangerousExtensions.includes(fileExtension)) {
    errors.push('File extension not allowed');
  }
  
  return {
    isValid: errors.length === 0,
    errors,
  };
};

/**
 * Content Security Policy helper
 */
export const generateCSPHeader = (): string => {
  return [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cjwgfoingscquolnfkhh.supabase.co",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: https: blob:",
    "font-src 'self' data:",
    "connect-src 'self' https://cjwgfoingscquolnfkhh.supabase.co wss://cjwgfoingscquolnfkhh.supabase.co",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join('; ');
};