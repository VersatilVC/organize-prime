/**
 * Advanced security validation and rate limiting for webhook execution
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.53.0";
import {
  ElementWebhookRequest,
  WebhookConfiguration,
  AuthenticationConfig,
  SecurityConfig,
  RateLimitStatus,
  ErrorType,
  ExecutionError,
  AuthenticationType
} from "./types.ts";

export class SecurityValidator {
  private supabase: any;
  private requestId: string;

  constructor(supabaseUrl: string, supabaseKey: string, requestId: string) {
    this.supabase = createClient(supabaseUrl, supabaseKey);
    this.requestId = requestId;
  }

  /**
   * Comprehensive security validation
   */
  async validateSecurity(
    request: ElementWebhookRequest,
    config: WebhookConfiguration
  ): Promise<{ valid: boolean; error?: ExecutionError }> {
    try {
      // 1. Rate limiting check
      const rateLimitResult = await this.checkRateLimit(request, config);
      if (!rateLimitResult.allowed) {
        return {
          valid: false,
          error: this.createError(
            ErrorType.RATE_LIMIT_EXCEEDED,
            `Rate limit exceeded: ${rateLimitResult.limitType} limit of ${rateLimitResult.limitValue} per window`,
            { rateLimitStatus: rateLimitResult }
          )
        };
      }

      // 2. URL security validation
      const urlValidation = await this.validateWebhookUrl(config.endpointUrl, config.securityConfig);
      if (!urlValidation.valid) {
        return {
          valid: false,
          error: this.createError(
            ErrorType.VALIDATION_URL_INVALID,
            urlValidation.error || 'Webhook URL failed security validation'
          )
        };
      }

      // 3. Payload security validation
      const payloadValidation = this.validatePayloadSecurity(request.payload);
      if (!payloadValidation.valid) {
        return {
          valid: false,
          error: this.createError(
            ErrorType.VALIDATION_PAYLOAD_INVALID,
            payloadValidation.error || 'Payload failed security validation'
          )
        };
      }

      // 4. IP address validation
      if (request.userContext.ipAddress && config.securityConfig) {
        const ipValidation = this.validateIpAddress(
          request.userContext.ipAddress,
          config.securityConfig
        );
        if (!ipValidation.valid) {
          return {
            valid: false,
            error: this.createError(
              ErrorType.AUTH_INSUFFICIENT_PERMISSIONS,
              ipValidation.error || 'IP address not allowed'
            )
          };
        }
      }

      // 5. User authorization check
      const authValidation = await this.validateUserAuthorization(request);
      if (!authValidation.valid) {
        return {
          valid: false,
          error: this.createError(
            ErrorType.AUTH_INSUFFICIENT_PERMISSIONS,
            authValidation.error || 'User not authorized for webhook execution'
          )
        };
      }

      return { valid: true };
    } catch (error) {
      console.error('Security validation error:', error);
      return {
        valid: false,
        error: this.createError(
          ErrorType.SYSTEM_CONFIGURATION_ERROR,
          `Security validation failed: ${error.message}`
        )
      };
    }
  }

  /**
   * Multi-tier rate limiting check
   */
  private async checkRateLimit(
    request: ElementWebhookRequest,
    config: WebhookConfiguration
  ): Promise<RateLimitStatus> {
    try {
      // Use the enhanced rate limiting function from database
      const { data: allowed, error } = await this.supabase.rpc('check_element_webhook_rate_limit', {
        p_webhook_id: config.id,
        p_user_id: request.userContext.userId,
        p_organization_id: request.organizationId
      });

      if (error) {
        console.error('Rate limit check error:', error);
        // Fail open - allow request if rate limit check fails
        return {
          allowed: true,
          limitType: 'global',
          currentCount: 0,
          limitValue: 0,
          windowStart: new Date().toISOString(),
          windowEnd: new Date(Date.now() + 60000).toISOString()
        };
      }

      if (!allowed) {
        // Get detailed rate limit info
        const rateLimitInfo = await this.getRateLimitDetails(request, config);
        return {
          allowed: false,
          ...rateLimitInfo,
          retryAfter: this.calculateRetryAfter(rateLimitInfo.limitType)
        };
      }

      return {
        allowed: true,
        limitType: 'webhook',
        currentCount: 0,
        limitValue: config.rateLimitPerMinute,
        windowStart: new Date().toISOString(),
        windowEnd: new Date(Date.now() + 60000).toISOString()
      };
    } catch (error) {
      console.error('Rate limit check failed:', error);
      // Fail open - allow request if rate limit check fails
      return {
        allowed: true,
        limitType: 'global',
        currentCount: 0,
        limitValue: 0,
        windowStart: new Date().toISOString(),
        windowEnd: new Date(Date.now() + 60000).toISOString()
      };
    }
  }

  /**
   * Get detailed rate limit information
   */
  private async getRateLimitDetails(
    request: ElementWebhookRequest,
    config: WebhookConfiguration
  ): Promise<Omit<RateLimitStatus, 'allowed'>> {
    // Check webhook-specific rate limit
    const { data: webhookCount } = await this.supabase
      .from('element_webhook_logs')
      .select('id', { count: 'exact' })
      .eq('webhook_id', config.id)
      .eq('user_id', request.userContext.userId)
      .gte('executed_at', new Date(Date.now() - 60000).toISOString());

    if (webhookCount && webhookCount >= config.rateLimitPerMinute) {
      return {
        limitType: 'webhook',
        currentCount: webhookCount,
        limitValue: config.rateLimitPerMinute,
        windowStart: new Date(Date.now() - 60000).toISOString(),
        windowEnd: new Date().toISOString()
      };
    }

    // Check user rate limit
    const { data: userCount } = await this.supabase
      .from('element_webhook_logs')
      .select('id', { count: 'exact' })
      .eq('user_id', request.userContext.userId)
      .gte('executed_at', new Date(Date.now() - 60000).toISOString());

    if (userCount && userCount >= 100) { // Default user limit
      return {
        limitType: 'user',
        currentCount: userCount,
        limitValue: 100,
        windowStart: new Date(Date.now() - 60000).toISOString(),
        windowEnd: new Date().toISOString()
      };
    }

    // Check organization rate limit
    const { data: orgCount } = await this.supabase
      .from('element_webhook_logs')
      .select('id', { count: 'exact' })
      .eq('organization_id', request.organizationId)
      .gte('executed_at', new Date(Date.now() - 60000).toISOString());

    if (orgCount && orgCount >= 500) { // Default org limit
      return {
        limitType: 'organization',
        currentCount: orgCount,
        limitValue: 500,
        windowStart: new Date(Date.now() - 60000).toISOString(),
        windowEnd: new Date().toISOString()
      };
    }

    // Default response
    return {
      limitType: 'global',
      currentCount: 0,
      limitValue: 1000,
      windowStart: new Date(Date.now() - 60000).toISOString(),
      windowEnd: new Date().toISOString()
    };
  }

  /**
   * Calculate retry-after time based on limit type
   */
  private calculateRetryAfter(limitType: string): number {
    switch (limitType) {
      case 'webhook':
      case 'user':
        return 60; // 1 minute
      case 'organization':
        return 300; // 5 minutes
      case 'global':
        return 600; // 10 minutes
      default:
        return 60;
    }
  }

  /**
   * Validate webhook URL security
   */
  private async validateWebhookUrl(
    url: string,
    securityConfig?: SecurityConfig
  ): Promise<{ valid: boolean; error?: string }> {
    try {
      const urlObj = new URL(url);

      // Must be HTTPS
      if (urlObj.protocol !== 'https:') {
        return { valid: false, error: 'Webhook URL must use HTTPS protocol' };
      }

      // Check against blocked domains
      if (securityConfig?.blockedDomains?.includes(urlObj.hostname)) {
        return { valid: false, error: `Domain ${urlObj.hostname} is blocked` };
      }

      // Check for localhost/private IPs
      const hostname = urlObj.hostname.toLowerCase();
      const privatePatterns = [
        /^localhost$/,
        /^127\./,
        /^10\./,
        /^172\.(1[6-9]|2[0-9]|3[01])\./,
        /^192\.168\./,
        /^::1$/,
        /^fc00:/,
        /^fe80:/
      ];

      if (privatePatterns.some(pattern => pattern.test(hostname))) {
        return { valid: false, error: 'Private IP addresses and localhost are not allowed' };
      }

      // Check URL length
      if (url.length > 2000) {
        return { valid: false, error: 'URL length exceeds maximum of 2000 characters' };
      }

      // Additional security checks can be added here
      // - Domain reputation checks
      // - SSL certificate validation
      // - Geo-blocking based on domain location

      return { valid: true };
    } catch (error) {
      return { valid: false, error: `Invalid URL format: ${error.message}` };
    }
  }

  /**
   * Validate payload security
   */
  private validatePayloadSecurity(payload: Record<string, any>): { valid: boolean; error?: string } {
    try {
      // Check payload size
      const payloadString = JSON.stringify(payload);
      const payloadSize = new TextEncoder().encode(payloadString).length;
      
      if (payloadSize > 50 * 1024 * 1024) { // 50MB limit
        return { valid: false, error: 'Payload size exceeds 50MB limit' };
      }

      // Check for potentially dangerous patterns
      const dangerousPatterns = [
        /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
        /javascript:/gi,
        /vbscript:/gi,
        /data:text\/html/gi,
        /eval\s*\(/gi,
        /expression\s*\(/gi
      ];

      for (const pattern of dangerousPatterns) {
        if (pattern.test(payloadString)) {
          return { valid: false, error: 'Payload contains potentially dangerous content' };
        }
      }

      // Check for excessively nested objects (potential DoS)
      if (this.getObjectDepth(payload) > 20) {
        return { valid: false, error: 'Payload object nesting exceeds maximum depth of 20' };
      }

      return { valid: true };
    } catch (error) {
      return { valid: false, error: `Payload validation failed: ${error.message}` };
    }
  }

  /**
   * Validate IP address restrictions
   */
  private validateIpAddress(
    ipAddress: string,
    securityConfig: SecurityConfig
  ): { valid: boolean; error?: string } {
    try {
      // Check against allowed IP ranges
      if (securityConfig.allowedIpRanges && securityConfig.allowedIpRanges.length > 0) {
        const isAllowed = securityConfig.allowedIpRanges.some(range => 
          this.isIpInRange(ipAddress, range)
        );
        
        if (!isAllowed) {
          return { valid: false, error: `IP address ${ipAddress} is not in allowed ranges` };
        }
      }

      // Geographic blocking would be implemented here
      // This would require an IP geolocation service
      if (securityConfig.enableGeoBlocking && securityConfig.allowedCountries) {
        // TODO: Implement geo-blocking
        // const country = await this.getCountryFromIP(ipAddress);
        // if (!securityConfig.allowedCountries.includes(country)) {
        //   return { valid: false, error: `Access from ${country} is not allowed` };
        // }
      }

      return { valid: true };
    } catch (error) {
      return { valid: false, error: `IP validation failed: ${error.message}` };
    }
  }

  /**
   * Validate user authorization for webhook execution
   */
  private async validateUserAuthorization(
    request: ElementWebhookRequest
  ): Promise<{ valid: boolean; error?: string }> {
    try {
      // Check if user is a member of the organization
      const { data: membership, error } = await this.supabase
        .from('memberships')
        .select('role, status')
        .eq('user_id', request.userContext.userId)
        .eq('organization_id', request.organizationId)
        .eq('status', 'active')
        .single();

      if (error || !membership) {
        return { valid: false, error: 'User is not an active member of the organization' };
      }

      // Additional role-based checks can be added here
      // For now, any active member can trigger webhooks

      return { valid: true };
    } catch (error) {
      return { valid: false, error: `Authorization check failed: ${error.message}` };
    }
  }

  /**
   * Generate authentication headers for outgoing webhook requests
   */
  generateAuthHeaders(authConfig: AuthenticationConfig): Record<string, string> {
    const headers: Record<string, string> = {};

    switch (authConfig.type) {
      case AuthenticationType.API_KEY:
        if (authConfig.placement === 'header') {
          headers['X-API-Key'] = authConfig.credentials.apiKey || '';
        }
        break;

      case AuthenticationType.BEARER_TOKEN:
        headers['Authorization'] = `Bearer ${authConfig.credentials.bearerToken || ''}`;
        break;

      case AuthenticationType.BASIC_AUTH:
        const credentials = btoa(`${authConfig.credentials.username || ''}:${authConfig.credentials.password || ''}`);
        headers['Authorization'] = `Basic ${credentials}`;
        break;

      case AuthenticationType.HMAC_SIGNATURE:
        // HMAC signature generation would be implemented here
        // This requires the request body to generate the signature
        headers['X-Signature'] = this.generateHmacSignature(
          authConfig.credentials.signingKey || '',
          '' // payload would be passed in
        );
        break;

      case AuthenticationType.CUSTOM:
        // Custom authentication headers
        if (authConfig.customHeaders) {
          Object.assign(headers, authConfig.customHeaders);
        }
        break;
    }

    return headers;
  }

  /**
   * Generate HMAC signature for request authentication
   */
  private generateHmacSignature(signingKey: string, payload: string): string {
    // In a real implementation, this would use a crypto library
    // For now, return a placeholder
    return `hmac-sha256=${btoa(signingKey + payload)}`;
  }

  /**
   * Check if IP address is in CIDR range
   */
  private isIpInRange(ip: string, range: string): boolean {
    // Basic implementation - in production, use a proper IP range library
    if (range.includes('/')) {
      // CIDR notation
      const [network, prefixLength] = range.split('/');
      // TODO: Implement proper CIDR matching
      return ip.startsWith(network.split('.').slice(0, 2).join('.'));
    } else {
      // Single IP
      return ip === range;
    }
  }

  /**
   * Get the depth of nested objects
   */
  private getObjectDepth(obj: any, depth = 0): number {
    if (obj === null || typeof obj !== 'object') {
      return depth;
    }

    if (Array.isArray(obj)) {
      return Math.max(depth, ...obj.map(item => this.getObjectDepth(item, depth + 1)));
    }

    const depths = Object.values(obj).map(value => this.getObjectDepth(value, depth + 1));
    return depths.length > 0 ? Math.max(...depths) : depth;
  }

  /**
   * Create standardized error object
   */
  private createError(type: ErrorType, message: string, details?: any): ExecutionError {
    return {
      type,
      message,
      details,
      retryable: this.isRetryableError(type),
      suggestedAction: this.getSuggestedAction(type)
    };
  }

  /**
   * Determine if error type is retryable
   */
  private isRetryableError(errorType: ErrorType): boolean {
    const nonRetryableErrors = [
      ErrorType.AUTH_INVALID_CREDENTIALS,
      ErrorType.AUTH_INSUFFICIENT_PERMISSIONS,
      ErrorType.VALIDATION_URL_INVALID,
      ErrorType.VALIDATION_PAYLOAD_INVALID,
      ErrorType.WEBHOOK_DISABLED,
      ErrorType.CLIENT_BAD_REQUEST
    ];
    return !nonRetryableErrors.includes(errorType);
  }

  /**
   * Get suggested action for error type
   */
  private getSuggestedAction(errorType: ErrorType): string {
    const suggestions: Record<ErrorType, string> = {
      [ErrorType.RATE_LIMIT_EXCEEDED]: 'Wait for rate limit window to reset or increase limits',
      [ErrorType.AUTH_INSUFFICIENT_PERMISSIONS]: 'Check user permissions and organization membership',
      [ErrorType.VALIDATION_URL_INVALID]: 'Ensure webhook URL uses HTTPS and is not localhost/private IP',
      [ErrorType.VALIDATION_PAYLOAD_INVALID]: 'Check payload for dangerous content or excessive size',
      [ErrorType.WEBHOOK_DISABLED]: 'Enable webhook in configuration settings'
    } as any;

    return suggestions[errorType] || 'Review webhook configuration and try again';
  }
}