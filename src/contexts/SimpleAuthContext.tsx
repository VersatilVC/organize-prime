import * as React from 'react'; // Fixed React imports
import { User, Session, AuthError } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/lib/secure-logger';

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

  // Basic sign in
  const signIn = async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });
      
      if (error) {
        logger.error('Sign in failed', error, { component: 'SimpleAuth', action: 'signIn' });
      } else if (data.user) {
        logger.security({
          type: 'auth_attempt',
          severity: 'low'
        }, 'Sign in successful');
      }
      
      return { error };
    } catch (err) {
      logger.error('Sign in unexpected error', err as Error, { component: 'SimpleAuth', action: 'signIn' });
      const error = err as AuthError;
      return { error };
    }
  };

  // Basic sign up
  const signUp = async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email: email.trim().toLowerCase(),
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      
      if (error) {
        logger.error('Sign up failed', error, { component: 'SimpleAuth', action: 'signUp' });
      } else {
        logger.security({
          type: 'auth_attempt',
          severity: 'low'
        }, 'Sign up successful');
      }
      
      return { error };
    } catch (err) {
      logger.error('Sign up unexpected error', err as Error, { component: 'SimpleAuth', action: 'signUp' });
      const error = err as AuthError;
      return { error };
    }
  };

  // Basic sign out
  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      
      if (!error) {
        logger.security({
          type: 'auth_attempt',
          severity: 'low'
        }, 'Sign out successful');
        
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
            logger.warn('Could not clear localStorage key', { component: 'SimpleAuth', action: 'signOut' });
          }
        });
      } else {
        logger.error('Sign out failed', error, { component: 'SimpleAuth', action: 'signOut' });
      }
    } catch (error) {
      logger.error('Sign out unexpected error', error as Error, { component: 'SimpleAuth', action: 'signOut' });
    }
  };

  // Basic password reset
  const resetPassword = async (email: string) => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(
        email.trim().toLowerCase(),
        {
          redirectTo: `${window.location.origin}/auth/reset-password`,
        }
      );
      
      if (error) {
        logger.error('Password reset failed', error, { component: 'SimpleAuth', action: 'resetPassword' });
      } else {
        logger.security({
          type: 'auth_attempt',
          severity: 'low'
        }, 'Password reset initiated');
      }
      
      return { error };
    } catch (err) {
      logger.error('Password reset error', err as Error, { component: 'SimpleAuth', action: 'resetPassword' });
      const error = err as AuthError;
      return { error };
    }
  };

  // Iframe-aware Google sign in with hybrid OAuth approach
  const signInWithGoogle = async () => {
    try {
      // Import iframe utilities for context detection
      const { IframeUtils } = await import('@/lib/iframe-utils');
      
      // Detect iframe context
      const iframeContext = IframeUtils.getIframeContext();
      
      // Clear previous error state
      localStorage.removeItem('oauth_error');
      localStorage.removeItem('auth_failure_count');
      
      // Determine redirect URL based on context
      let redirectUrl: string;
      let shouldUseHybridApproach = false;
      
      if (iframeContext.isInIframe) {
        shouldUseHybridApproach = true;
        
        // Try to use parent window origin for better compatibility
        if (iframeContext.parentOrigin) {
          redirectUrl = `${iframeContext.parentOrigin}/auth/callback`;
        } else {
          redirectUrl = `${window.location.origin}/auth/callback`;
        }
      } else {
        // Standard OAuth flow for standalone context
        redirectUrl = `${window.location.origin}/auth/callback`;
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
        logger.error('Google OAuth failed', error, { 
          component: 'SimpleAuth', 
          action: 'signInWithGoogle',
          feature: 'oauth'
        });
        localStorage.setItem('oauth_error', error.message);
      } else {
        logger.security({
          type: 'auth_attempt',
          severity: 'low'
        }, 'Google OAuth initiated');
        
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
      logger.error('Google OAuth unexpected error', err as Error, {
        component: 'SimpleAuth',
        action: 'signInWithGoogle'
      });
      const error = err as AuthError;
      localStorage.setItem('oauth_error', error.message);
      return { error };
    }
  };

  // Auth state management with enhanced error handling
  React.useEffect(() => {
    try {
      // Set up auth state listener
      const { data: { subscription } } = supabase.auth.onAuthStateChange(
        (event, session) => {
          setSession(session);
          setUser(session?.user ?? null);
          setLoading(false);
        }
      );

      // Get initial session with better error handling
      supabase.auth.getSession().then(({ data: { session }, error }) => {
        if (error) {
          logger.error('Error getting initial session', error, { component: 'SimpleAuth' });
        }
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
      }).catch((error) => {
        logger.error('Failed to get initial session', error as Error, { component: 'SimpleAuth' });
        setLoading(false);
      });

      return () => {
        subscription.unsubscribe();
      };
    } catch (error) {
      logger.error('Error setting up auth listener', error as Error, { component: 'SimpleAuth' });
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
