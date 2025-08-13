// OAuth and PKCE diagnostics utility
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
      'pkce_failure_count'
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
- HTTPS required: Use localhost for development or HTTPS for production`;
  }
}