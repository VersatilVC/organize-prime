import * as React from 'react'; // Fixed React imports
import { User, Session, AuthError } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

// Minimal auth context that works reliably
interface SimpleAuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: AuthError | null }>;
  signUp: (email: string, password: string) => Promise<{ error: AuthError | null }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: AuthError | null }>;
  signInWithGoogle: () => Promise<{ error: AuthError | null }>;
}

const SimpleAuthContext = React.createContext<SimpleAuthContextType | undefined>(undefined);

export function SimpleAuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = React.useState<User | null>(null);
  const [session, setSession] = React.useState<Session | null>(null);
  const [loading, setLoading] = React.useState(true);
  
  console.log('🏗️ SimpleAuthProvider rendering - URL:', window.location.href);

  // Basic sign in
  const signIn = async (email: string, password: string) => {
    console.log('🔐 Simple Auth: Sign in attempt for:', email);
    
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });
      
      if (error) {
        console.error('🚨 Sign in error:', error);
      } else if (data.user) {
        console.log('✅ Sign in successful');
      }
      
      return { error };
    } catch (err) {
      console.error('🚨 Sign in unexpected error:', err);
      const error = err as AuthError;
      return { error };
    }
  };

  // Basic sign up
  const signUp = async (email: string, password: string) => {
    console.log('📝 Simple Auth: Sign up attempt for:', email);
    
    try {
      const { data, error } = await supabase.auth.signUp({
        email: email.trim().toLowerCase(),
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      
      if (error) {
        console.error('🚨 Sign up error:', error);
      } else {
        console.log('✅ Sign up successful');
      }
      
      return { error };
    } catch (err) {
      console.error('🚨 Sign up unexpected error:', err);
      const error = err as AuthError;
      return { error };
    }
  };

  // Basic sign out
  const signOut = async () => {
    console.log('🚪 Simple Auth: Sign out');
    
    try {
      const { error } = await supabase.auth.signOut();
      
      if (!error) {
        console.log('✅ Sign out successful');
        // Clear OAuth state
        const oauthKeys = [
          'supabase.auth.token',
          'sb-auth-token', 
          'pkce_code_verifier',
          'oauth_state',
          'auth_callback_url',
          'oauth_error',
          'auth_failure_count'
        ];
        
        oauthKeys.forEach(key => {
          try {
            localStorage.removeItem(key);
          } catch (e) {
            console.warn('Could not clear localStorage key:', key);
          }
        });
      } else {
        console.error('🚨 Sign out error:', error);
      }
    } catch (error) {
      console.error('🚨 Sign out unexpected error:', error);
    }
  };

  // Basic password reset
  const resetPassword = async (email: string) => {
    console.log('🔄 Simple Auth: Password reset for:', email);
    
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(
        email.trim().toLowerCase(),
        {
          redirectTo: `${window.location.origin}/auth/reset-password`,
        }
      );
      
      return { error };
    } catch (err) {
      console.error('🚨 Password reset error:', err);
      const error = err as AuthError;
      return { error };
    }
  };

  // Iframe-aware Google sign in with hybrid OAuth approach
  const signInWithGoogle = async () => {
    console.log('🔍 Simple Auth: Google sign in attempt');
    
    // Import iframe utilities for context detection
    const { IframeUtils } = await import('@/lib/iframe-utils');
    
    // Detect iframe context and log for debugging
    const iframeContext = IframeUtils.getIframeContext();
    IframeUtils.logIframeContext();
    
    // Clear previous error state
    localStorage.removeItem('oauth_error');
    localStorage.removeItem('auth_failure_count');
    
    try {
      // Determine redirect URL based on context
      let redirectUrl: string;
      let shouldUseHybridApproach = false;
      
      if (iframeContext.isInIframe) {
        console.log('🖼️ Iframe detected - using hybrid OAuth approach');
        shouldUseHybridApproach = true;
        
        // Try to use parent window origin for better compatibility
        if (iframeContext.parentOrigin) {
          redirectUrl = `${iframeContext.parentOrigin}/auth/callback`;
          console.log('🔗 Using parent origin for redirect:', redirectUrl);
        } else {
          redirectUrl = `${window.location.origin}/auth/callback`;
          console.log('🔗 Using current origin for redirect:', redirectUrl);
        }
      } else {
        // Standard OAuth flow for standalone context
        redirectUrl = `${window.location.origin}/auth/callback`;
        console.log('🔗 Standard OAuth redirect:', redirectUrl);
      }

      // Add iframe context to query params for server-side handling
      const queryParams: Record<string, string> = {};
      
      if (shouldUseHybridApproach) {
        queryParams.iframe_context = 'true';
        queryParams.parent_origin = iframeContext.parentOrigin || '';
      }
      
      // Add production-specific params
      const isProduction = window.location.origin.includes('lovableproject.com') || 
                          window.location.origin.includes('lovable.app');
      
      if (isProduction) {
        queryParams.access_type = 'offline';
        queryParams.prompt = 'consent';
      }

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUrl,
          queryParams,
        },
      });
      
      if (error) {
        console.error('🚨 Google sign in error:', error);
        localStorage.setItem('oauth_error', error.message);
        
        // For iframe context, suggest alternative approaches
        if (shouldUseHybridApproach) {
          console.log('💡 Iframe OAuth failed - consider "Open in New Tab" approach');
        }
      } else {
        console.log('✅ Google OAuth initiated successfully');
        
        // For iframe context, notify about the OAuth attempt
        if (shouldUseHybridApproach) {
          IframeUtils.postToParent({
            action: 'oauth-initiated',
            provider: 'google',
            redirectUrl
          });
        }
      }
      
      return { error };
    } catch (err) {
      console.error('🚨 Google sign in unexpected error:', err);
      const error = err as AuthError;
      localStorage.setItem('oauth_error', error.message);
      return { error };
    }
  };

  // Auth state management with enhanced error handling
  React.useEffect(() => {
    console.log('🔧 Simple Auth: Setting up auth listener - URL:', window.location.href);
    
    try {
      // Set up auth state listener
      const { data: { subscription } } = supabase.auth.onAuthStateChange(
        (event, session) => {
          console.log('🔔 Auth state change:', event, session?.user?.email);
          setSession(session);
          setUser(session?.user ?? null);
          setLoading(false);
        }
      );

      // Get initial session with better error handling
      supabase.auth.getSession().then(({ data: { session }, error }) => {
        if (error) {
          console.error('🚨 Error getting initial session:', error);
        } else {
          console.log('🔍 Initial session check successful:', session?.user?.email);
        }
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
      }).catch((error) => {
        console.error('🚨 Failed to get initial session:', error);
        setLoading(false);
      });

      return () => {
        console.log('🧹 Simple Auth: Cleaning up auth listener');
        subscription.unsubscribe();
      };
    } catch (error) {
      console.error('🚨 Error setting up auth listener:', error);
      setLoading(false);
    }
  }, []);

  const value = React.useMemo(() => ({
    user,
    session,
    loading,
    signIn,
    signUp,
    signOut,
    resetPassword,
    signInWithGoogle,
  }), [user, session, loading]);

  return (
    <SimpleAuthContext.Provider value={value}>
      {children}
    </SimpleAuthContext.Provider>
  );
}

export function useSimpleAuth() {
  const context = React.useContext(SimpleAuthContext);
  if (context === undefined) {
    throw new Error('useSimpleAuth must be used within a SimpleAuthProvider');
  }
  return context;
}
