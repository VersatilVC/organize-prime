import { createContext, useState, useEffect, useContext, useMemo, ReactNode } from 'react';
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

const SimpleAuthContext = createContext<SimpleAuthContextType | undefined>(undefined);

export function SimpleAuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  // Basic sign in
  const signIn = async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });
      
      // Remove logging for performance
      
      return { error };
    } catch (err) {
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
      
      return { error };
    } catch (err) {
      const error = err as AuthError;
      return { error };
    }
  };

  // Basic sign out
  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      
      if (!error) {
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
            // Silent fail for performance
          }
        });
      }
    } catch (error) {
      // Silent fail for performance
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
      
      return { error };
    } catch (err) {
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
        localStorage.setItem('oauth_error', error.message);
      } else {
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
      const error = err as AuthError;
      localStorage.setItem('oauth_error', error.message);
      return { error };
    }
  };

  // Auth state management with enhanced error handling
  useEffect(() => {
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
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
      }).catch((error) => {
        setLoading(false);
      });

      return () => {
        subscription.unsubscribe();
      };
    } catch (error) {
      setLoading(false);
    }
  }, []);

  const value = useMemo(() => ({
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
  const context = useContext(SimpleAuthContext);
  if (context === undefined) {
    throw new Error('useSimpleAuth must be used within a SimpleAuthProvider');
  }
  return context;
}
