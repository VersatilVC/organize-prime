import * as React from 'react';
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

  // Production-ready Google sign in with domain detection
  const signInWithGoogle = async () => {
    console.log('🔍 Simple Auth: Google sign in attempt');
    
    // Detect current domain for proper redirect configuration
    const currentDomain = window.location.origin;
    const isProduction = currentDomain.includes('lovableproject.com') || currentDomain.includes('lovable.app');
    
    console.log('🌐 Domain:', currentDomain, 'Production:', isProduction);
    
    try {
      // Clear previous error state
      localStorage.removeItem('oauth_error');
      localStorage.removeItem('auth_failure_count');

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${currentDomain}/auth/callback`,
          // Add production-specific query params if needed
          queryParams: isProduction ? {
            access_type: 'offline',
            prompt: 'consent',
          } : {},
        },
      });
      
      if (error) {
        console.error('🚨 Google sign in error:', error);
        localStorage.setItem('oauth_error', error.message);
      } else {
        console.log('✅ Google OAuth initiated successfully');
      }
      
      return { error };
    } catch (err) {
      console.error('🚨 Google sign in unexpected error:', err);
      const error = err as AuthError;
      localStorage.setItem('oauth_error', error.message);
      return { error };
    }
  };

  // Auth state management
  React.useEffect(() => {
    console.log('🔧 Simple Auth: Setting up auth listener');
    
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        console.log('🔔 Auth state change:', event, session?.user?.email);
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
      }
    );

    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      console.log('🔍 Initial session check:', session?.user?.email);
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    }).catch((error) => {
      console.error('🚨 Error getting initial session:', error);
      setLoading(false);
    });

    return () => {
      console.log('🧹 Simple Auth: Cleaning up auth listener');
      subscription.unsubscribe();
    };
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
