// Enhanced OAuth debugging and monitoring utilities
export class OAuthDebugger {
  private static readonly OAUTH_STORAGE_KEYS = [
    'pkce_code_verifier',
    'oauth_state',
    'sb-auth-token',
    'supabase.auth.token',
    'auth_callback_url'
  ];

  // Monitor OAuth request initiation with iframe context
  static logOAuthRequest(provider: string, options: any) {
    // Import iframe utilities for context detection
    const isInIframe = window.self !== window.top;
    let parentOrigin = null;
    
    try {
      if (document.referrer) {
        parentOrigin = new URL(document.referrer).origin;
      }
    } catch (e) {
      // Ignore referrer errors
    }

    console.log('🚀 OAuth Request Debug:', {
      provider,
      timestamp: new Date().toISOString(),
      currentUrl: window.location.href,
      redirectTo: options.redirectTo,
      scopes: options.scopes,
      queryParams: options.queryParams,
      domain: window.location.origin,
      iframe: {
        isInIframe,
        parentOrigin,
        isLovablePreview: parentOrigin?.includes('lovable') || false
      }
    });

    // Check existing OAuth state before new request
    const existingState = this.getOAuthState();
    console.log('🔍 Existing OAuth State:', existingState);

    return {
      provider,
      options,
      existingState,
      iframe: { isInIframe, parentOrigin },
      timestamp: new Date().toISOString()
    };
  }

  // Get current OAuth state for debugging
  static getOAuthState() {
    const state: Record<string, any> = {};
    
    this.OAUTH_STORAGE_KEYS.forEach(key => {
      try {
        const value = localStorage.getItem(key);
        state[key] = value ? {
          exists: true,
          length: value.length,
          preview: value.substring(0, 20) + '...'
        } : null;
      } catch (e) {
        state[key] = { error: e instanceof Error ? e.message : 'Unknown error' };
      }
    });

    return state;
  }

  // Monitor OAuth callback processing
  static logCallbackProcessing(url: string) {
    const urlObj = new URL(url);
    const params = Object.fromEntries(urlObj.searchParams.entries());
    
    console.log('🔄 OAuth Callback Debug:', {
      timestamp: new Date().toISOString(),
      url: url,
      pathname: urlObj.pathname,
      params: params,
      hasCode: !!params.code,
      hasError: !!params.error,
      hasState: !!params.state
    });

    // Check OAuth state consistency
    const storedState = localStorage.getItem('oauth_state');
    const urlState = params.state;
    
    console.log('🔐 OAuth State Validation:', {
      storedState: storedState ? storedState.substring(0, 20) + '...' : null,
      urlState: urlState ? urlState.substring(0, 20) + '...' : null,
      statesMatch: storedState === urlState
    });

    return {
      params,
      stateValid: storedState === urlState,
      hasRequiredParams: !!params.code && !params.error
    };
  }

  // Clear OAuth state with logging
  static clearOAuthState(reason: string = 'manual') {
    console.log('🧹 Clearing OAuth State:', { reason, timestamp: new Date().toISOString() });
    
    const clearedKeys: string[] = [];
    const failedKeys: string[] = [];

    this.OAUTH_STORAGE_KEYS.forEach(key => {
      try {
        localStorage.removeItem(key);
        clearedKeys.push(key);
      } catch (e) {
        failedKeys.push(key);
        console.warn(`Failed to clear ${key}:`, e);
      }
    });

    // Also clear session storage OAuth data
    try {
      sessionStorage.removeItem('auth_retry_count');
      clearedKeys.push('auth_retry_count');
    } catch (e) {
      failedKeys.push('auth_retry_count');
    }

    console.log('✅ OAuth State Cleared:', { clearedKeys, failedKeys });
    
    return { clearedKeys, failedKeys };
  }

  // Validate OAuth configuration
  static validateOAuthConfig() {
    const domain = window.location.origin;
    const isSecure = domain.startsWith('https://') || domain.includes('localhost');
    const callbackUrl = `${domain}/auth/callback`;
    
    const config = {
      domain,
      callbackUrl,
      isSecure,
      isLocalhost: domain.includes('localhost'),
      isLovable: domain.includes('lovableproject.com'),
      timestamp: new Date().toISOString()
    };

    console.log('🌐 OAuth Configuration:', config);

    // Validation checks
    const validations = {
      secureConnection: isSecure,
      validDomain: config.isLocalhost || config.isLovable || isSecure,
      callbackUrlFormat: callbackUrl.endsWith('/auth/callback')
    };

    console.log('✅ OAuth Validations:', validations);

    return { config, validations, isValid: Object.values(validations).every(Boolean) };
  }

  // Generate OAuth diagnostic report
  static generateDiagnosticReport() {
    console.log('📊 OAuth Diagnostic Report Generated:', new Date().toISOString());
    
    const report = {
      timestamp: new Date().toISOString(),
      url: window.location.href,
      config: this.validateOAuthConfig(),
      state: this.getOAuthState(),
      userAgent: navigator.userAgent,
      localStorage: {
        available: typeof Storage !== 'undefined',
        itemCount: localStorage.length
      }
    };

    console.log('📋 Full OAuth Report:', report);
    
    return report;
  }
}

// Global debugging functions for console access
if (typeof window !== 'undefined') {
  (window as any).oauthDebug = {
    getState: () => OAuthDebugger.getOAuthState(),
    clearState: (reason?: string) => OAuthDebugger.clearOAuthState(reason),
    validate: () => OAuthDebugger.validateOAuthConfig(),
    report: () => OAuthDebugger.generateDiagnosticReport()
  };
}