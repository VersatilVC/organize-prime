import React, { createContext, useContext, useEffect, useState, useMemo } from 'react';
import { User, Session, AuthError } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

// Simplified auth context for initial testing
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

export function SimpleAuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  // Basic sign in without complex security features
  const signIn = async (email: string, password: string) => {
    console.log('🔐 Simple Auth: Sign in attempt for:', email);
    
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });
      
      if (error) {
        console.error('🚨 Sign in error:', error);
        toast({
          title: "Sign In Error",
          description: error.message,
          variant: "destructive",
        });
      } else if (data.user) {
        console.log('✅ Sign in successful');
        toast({
          title: "Welcome back!",
          description: "You have been signed in successfully.",
        });
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
        toast({
          title: "Sign Up Error",
          description: error.message,
          variant: "destructive",
        });
      } else {
        console.log('✅ Sign up successful');
        toast({
          title: "Account Created",
          description: "Please check your email to verify your account.",
        });
      }
      
      return { error };
    } catch (err) {
      console.error('🚨 Sign up unexpected error:', err);
      const error = err as AuthError;
      return { error };
    }
  };

  // Enhanced sign out with proper OAuth state cleanup
  const signOut = async () => {
    console.log('🚪 Simple Auth: Sign out');
    
    try {
      const { error } = await supabase.auth.signOut();
      
      // Only clear OAuth state AFTER successful sign out
      if (!error) {
        console.log('🧹 Clearing OAuth state after successful sign out');
        
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

        toast({
          title: "Signed Out",
          description: "You have been signed out successfully.",
        });
      } else {
        console.error('🚨 Sign out error:', error);
        toast({
          title: "Sign Out Error", 
          description: error.message,
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('🚨 Sign out unexpected error:', error);
      toast({
        title: "Sign Out Error",
        description: "An error occurred during sign out",
        variant: "destructive",
      });
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
      
      if (error) {
        toast({
          title: "Reset Password Error",
          description: error.message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Password Reset Sent",
          description: "Please check your email for password reset instructions.",
        });
      }
      
      return { error };
    } catch (err) {
      console.error('🚨 Password reset error:', err);
      const error = err as AuthError;
      return { error };
    }
  };

  // Enhanced Google sign in with comprehensive OAuth debugging
  const signInWithGoogle = async () => {
    console.log('🔍 Simple Auth: Google sign in attempt');
    
    try {
      // Import OAuth debugging utilities
      const { OAuthDebugger } = await import('@/lib/oauth-debug');
      
      // Generate comprehensive diagnostic report
      const diagnostics = OAuthDebugger.generateDiagnosticReport();
      
      // Validate OAuth configuration before proceeding
      const configValidation = OAuthDebugger.validateOAuthConfig();
      
      if (!configValidation.isValid) {
        const configError = `OAuth configuration invalid: ${JSON.stringify(configValidation.validations)}`;
        console.error('🚨 OAuth Config Error:', configError);
        
        toast({
          title: "OAuth Configuration Error",
          description: configError,
          variant: "destructive",
        });
        
        return { error: { message: configError } as AuthError };
      }

      // Clear only error tracking, preserve OAuth state for retry
      const errorKeys = ['oauth_error', 'auth_failure_count'];
      errorKeys.forEach(key => {
        try {
          localStorage.removeItem(key);
        } catch (e) {
          console.warn('Could not clear error key:', key);
        }
      });

      // Get current domain for OAuth configuration
      const currentDomain = window.location.origin;
      
      // Enhanced OAuth request with comprehensive logging
      const oauthOptions = {
        redirectTo: `${currentDomain}/auth/callback`,
        scopes: 'openid email profile',
        queryParams: {
          access_type: 'offline',
          prompt: 'consent'
        },
        skipBrowserRedirect: false
      };
      
      // Log OAuth request details
      OAuthDebugger.logOAuthRequest('google', oauthOptions);

      // Execute OAuth request with enhanced error handling
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: oauthOptions,
      });
      
      if (error) {
        console.error('🚨 Google OAuth error:', error);
        
        // Enhanced error tracking and analysis
        const failureCount = parseInt(localStorage.getItem('auth_failure_count') || '0') + 1;
        localStorage.setItem('auth_failure_count', failureCount.toString());
        localStorage.setItem('oauth_error', error.message);
        
        // Analyze error type for specific guidance
        let errorDescription = error.message;
        const isConfigError = errorDescription.includes('unauthorized_client') || 
                             errorDescription.includes('redirect_uri_mismatch') ||
                             errorDescription.includes('invalid_client');
        
        const isDomainError = errorDescription.includes('Domain') || 
                             errorDescription.includes('domain');
                             
        if (isConfigError) {
          // Import auth diagnostics for configuration guidance
          const { AuthDiagnostics } = await import('@/lib/auth-diagnostics');
          errorDescription = AuthDiagnostics.getAuthGuideMessage();
        } else if (isDomainError) {
          errorDescription += `\n\nDomain Configuration:\n1. Current domain: ${currentDomain}\n2. Required callback: ${currentDomain}/auth/callback\n3. Check Google Cloud Console settings match exactly`;
        }
        
        // Log detailed error for debugging
        console.error('🔍 OAuth Error Details:', {
          error: error.message,
          failureCount,
          currentDomain,
          isConfigError,
          isDomainError
        });
        
        toast({
          title: "Google Sign In Failed",
          description: errorDescription,
          variant: "destructive",
        });
      } else {
        console.log('✅ Google OAuth initiated successfully');
        
        // Clear error tracking on successful initiation
        localStorage.removeItem('auth_failure_count');
        localStorage.removeItem('oauth_error');
        
        // Monitor OAuth state creation
        setTimeout(() => {
          const postOAuthState = OAuthDebugger.getOAuthState();
          console.log('🔑 Post-OAuth State:', postOAuthState);
        }, 200);
      }
      
      return { error };
    } catch (err) {
      console.error('🚨 Google sign in unexpected error:', err);
      
      // Track unexpected errors
      localStorage.setItem('oauth_error', (err as Error).message);
      
      const error = err as AuthError;
      
      toast({
        title: "Google Sign In Error",
        description: `Unexpected error: ${error.message}. Please try again or use email/password sign in.`,
        variant: "destructive",
      });
      
      return { error };
    }
  };

  // Auth state management
  useEffect(() => {
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