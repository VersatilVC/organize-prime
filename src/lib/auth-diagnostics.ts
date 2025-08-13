// Enhanced OAuth and PKCE diagnostics utility
export class AuthDiagnostics {
  static logOAuthState() {
    const state = {
      verifier: localStorage.getItem('pkce_code_verifier'),
      oauthState: localStorage.getItem('oauth_state'),
      authToken: localStorage.getItem('supabase.auth.token'),
      callbackUrl: localStorage.getItem('auth_callback_url'),
      failures: localStorage.getItem('pkce_failure_count'),
      retries: sessionStorage.getItem('auth_retry_count'),
    };
    
    console.log('🔍 OAuth State Diagnostic:', {
      hasVerifier: !!state.verifier,
      verifierLength: state.verifier?.length,
      hasOAuthState: !!state.oauthState,
      hasAuthToken: !!state.authToken,
      hasCallbackUrl: !!state.callbackUrl,
      failures: state.failures || '0',
      retries: state.retries || '0',
    });
    
    return state;
  }

  static validateDomainConfiguration() {
    const currentDomain = window.location.origin;
    const isSecure = currentDomain.startsWith('https://') || currentDomain.includes('localhost');
    const isLocalhost = currentDomain.includes('localhost');
    const isLovable = currentDomain.includes('lovableproject.com');
    
    const config = {
      domain: currentDomain,
      isSecure,
      isLocalhost,
      isLovable,
      redirectUrl: `${currentDomain}/auth/callback`,
    };
    
    console.log('🌐 Domain Configuration:', config);
    
    if (!isSecure && !isLocalhost) {
      console.warn('⚠️ Insecure domain detected:', currentDomain);
    }
    
    return config;
  }

  static clearOAuthState() {
    console.log('🧹 Clearing OAuth state');
    
    const keys = [
      'pkce_code_verifier',
      'oauth_state', 
      'auth_callback_url',
      'oauth_error',
      'pkce_failure_count',
      // Additional Supabase auth keys
      'supabase.auth.token',
      'sb-auth-token',
      'sb-access-token',
      'sb-refresh-token'
    ];
    
    keys.forEach(key => {
      try {
        localStorage.removeItem(key);
        console.log(`✅ Cleared: ${key}`);
      } catch (e) {
        console.warn(`❌ Failed to clear: ${key}`, e);
      }
    });
    
    // Also clear session storage
    try {
      sessionStorage.removeItem('auth_retry_count');
      console.log('✅ Cleared session: auth_retry_count');
    } catch (e) {
      console.warn('❌ Failed to clear session storage', e);
    }
  }

  static async debugCurrentOAuthFlow() {
    console.log('🔍 OAuth Flow Debug Information:');
    
    // Current URL analysis
    const url = new URL(window.location.href);
    const params = Object.fromEntries(url.searchParams.entries());
    console.log('🔗 Current URL params:', params);
    
    // Check for OAuth error parameters
    if (params.error) {
      console.error('🚨 OAuth Error in URL:', {
        error: params.error,
        description: params.error_description,
        state: params.state
      });
    }
    
    // Check for authorization code
    if (params.code) {
      console.log('✅ Authorization code present:', params.code.substring(0, 10) + '...');
    } else if (window.location.pathname === '/auth/callback') {
      console.error('🚨 Missing authorization code in callback URL');
    }
    
    // Domain configuration check
    this.validateDomainConfiguration();
    
    // OAuth state check
    this.logOAuthState();
    
    return {
      url: window.location.href,
      params,
      hasError: !!params.error,
      hasCode: !!params.code,
      domainConfig: this.validateDomainConfiguration(),
      oauthState: this.logOAuthState()
    };
  }

  static getAuthGuideMessage() {
    const domain = window.location.origin;
    const domainWithoutProtocol = domain.replace('https://', '').replace('http://', '');
    
    return `🔧 Google OAuth Configuration Guide:

📋 REQUIRED STEPS:

1. Google Cloud Console Setup:
   • Go to: console.cloud.google.com → APIs & Services → Credentials
   • Edit your OAuth 2.0 Client ID
   • Under "Authorized JavaScript origins":
     ✓ Add: ${domain}
   • Under "Authorized redirect URIs":
     ✓ Add: ${domain}/auth/callback

2. Supabase Configuration:
   • Go to: supabase.com/dashboard → Authentication → URL Configuration
   • Site URL: ${domain}
   • Redirect URLs: ${domain}/auth/callback

3. OAuth Consent Screen (if using external testing):
   • Go to: console.cloud.google.com → APIs & Services → OAuth consent screen
   • Under "Authorized domains":
     ✓ Add: ${domainWithoutProtocol}

🔍 Current Configuration:
• Domain: ${domain}
• Callback: ${domain}/auth/callback
• Protocol: ${domain.startsWith('https://') ? 'HTTPS ✓' : 'HTTP (development only)'}

⚠️ Common Issues:
- Redirect URI mismatch: URLs must match EXACTLY
- Domain not authorized: Add domain to both Google and Supabase
- HTTPS required: Use localhost for development or HTTPS for production

🔧 Quick Fix Commands:
Run in browser console:
AuthDiagnostics.clearOAuthState(); // Clear problematic state
AuthDiagnostics.debugCurrentOAuthFlow(); // Full debug info`;
  }

  static async fixCommonIssues() {
    console.log('🔧 Running automated OAuth fixes...');
    
    // 1. Clear potentially corrupted OAuth state
    this.clearOAuthState();
    
    // 2. Check domain configuration
    const domainConfig = this.validateDomainConfiguration();
    
    // 3. Verify current URL structure
    const urlCheck = this.debugCurrentOAuthFlow();
    
    // 4. Generate specific guidance
    if (!domainConfig.isSecure && !domainConfig.isLocalhost) {
      console.error('❌ Domain not secure - OAuth will fail');
      return false;
    }
    
    if (window.location.pathname === '/auth/callback' && !window.location.search.includes('code=')) {
      console.error('❌ Missing authorization code in callback - likely configuration issue');
      console.log('🔧 Suggestion: Check Google Cloud Console redirect URI configuration');
      return false;
    }
    
    console.log('✅ Basic OAuth configuration appears correct');
    console.log('📋 Next step: Try Google sign-in again');
    
    return true;
  }
}

// Global debug function for easy console access
if (typeof window !== 'undefined') {
  (window as any).debugOAuth = () => {
    return AuthDiagnostics.debugCurrentOAuthFlow();
  };
  
  (window as any).fixOAuth = () => {
    return AuthDiagnostics.fixCommonIssues();
  };
  
  (window as any).clearOAuth = () => {
    AuthDiagnostics.clearOAuthState();
    console.log('🧹 OAuth state cleared. Try signing in again.');
  };
}