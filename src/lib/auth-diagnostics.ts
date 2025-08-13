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
    
    return `Google OAuth Configuration Guide:

1. Google Cloud Console Setup:
   - Go to Google Cloud Console > APIs & Services > Credentials
   - Add "${domain}" to Authorized JavaScript origins
   - Add "${domain}/auth/callback" to Authorized redirect URIs
   
2. Supabase Configuration:
   - Go to Supabase Dashboard > Authentication > Settings
   - Set Site URL to: ${domain}
   - Verify redirect URLs include: ${domain}/auth/callback
   
3. OAuth Consent Screen:
   - Add "${domain.replace('https://', '').replace('http://', '')}" to Authorized domains
   
Current domain: ${domain}
Callback URL: ${domain}/auth/callback`;
  }
}