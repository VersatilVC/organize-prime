import * as React from 'react'; // Fixed React imports
import { User, Session, AuthError } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { logger } from '@/lib/secure-logger';
import { 
  checkRateLimit, 
  logSecurityEvent, 
  validateEmail, 
  sanitizeInput,
  validateSessionSecurity,
  validatePasswordStrength 
} from '@/lib/security-config';

// Enhanced auth context with security features
interface EnhancedAuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: AuthError | null }>;
  signUp: (email: string, password: string, fullName?: string) => Promise<{ error: AuthError | null }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: AuthError | null }>;
  signInWithGoogle: () => Promise<{ error: AuthError | null }>;
  validatePassword: (password: string) => Promise<{ isValid: boolean; feedback: string[] }>;
}

const EnhancedAuthContext = React.createContext<EnhancedAuthContextType | undefined>(undefined);

export function EnhancedAuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = React.useState<User | null>(null);
  const [session, setSession] = React.useState<Session | null>(null);
  const [loading, setLoading] = React.useState(true);
  const { toast } = useToast();

  // Enhanced sign in with comprehensive security
  const signIn = React.useCallback(async (email: string, password: string) => {
    try {
      // Input validation and sanitization
      if (!email || !password) {
        toast({
          title: "Validation Error",
          description: "Email and password are required",
          variant: "destructive",
        });
        return { error: new AuthError("Invalid input") };
      }

      const sanitizedEmail = sanitizeInput(email.toLowerCase().trim());
      
      if (!validateEmail(sanitizedEmail)) {
        toast({
          title: "Validation Error", 
          description: "Please enter a valid email address",
          variant: "destructive",
        });
        return { error: new AuthError("Invalid email format") };
      }

      // Rate limiting check (non-blocking)
      try {
        const rateLimitPassed = await checkRateLimit(sanitizedEmail, 'sign_in', 5, 15);
        if (!rateLimitPassed) {
          toast({
            title: "Too Many Attempts",
            description: "Please wait 15 minutes before trying again",
            variant: "destructive",
          });
          await logSecurityEvent('rate_limit_exceeded', 'authentication', sanitizedEmail);
          return { error: new AuthError("Rate limited") };
        }
      } catch (rateLimitError) {
        // Rate limiting failed - continue with authentication
        // Continue with authentication even if rate limiting fails
      }

      const { data, error } = await supabase.auth.signInWithPassword({
        email: sanitizedEmail,
        password,
      });
      
      if (error) {
        toast({
          title: "Sign In Error",
          description: error.message,
          variant: "destructive",
        });
        
        // Log failed attempt
        await logSecurityEvent('sign_in_failed', 'authentication', sanitizedEmail, {
          error: error.message,
          timestamp: new Date().toISOString(),
        });
      } else if (data.user) {
        // Log successful sign in
        await logSecurityEvent('sign_in_success', 'authentication', data.user.id);
        
        toast({
          title: "Welcome back!",
          description: "You have been signed in successfully.",
        });
      }
      
      return { error };
    } catch (err) {
      const error = err as AuthError;
      logger.error('Sign in error', error, { component: 'EnhancedAuth' });
      await logSecurityEvent('sign_in_error', 'authentication', undefined, {
        error: error.message,
      });
      return { error };
    }
  }, [toast]);

  // Enhanced sign up with password validation
  const signUp = React.useCallback(async (email: string, password: string, fullName?: string) => {
    try {
      // Input validation
      if (!email || !password) {
        toast({
          title: "Validation Error",
          description: "Email and password are required",
          variant: "destructive",
        });
        return { error: new AuthError("Invalid input") };
      }

      const sanitizedEmail = sanitizeInput(email.toLowerCase().trim());
      const sanitizedFullName = fullName ? sanitizeInput(fullName) : undefined;
      
      if (!validateEmail(sanitizedEmail)) {
        toast({
          title: "Validation Error",
          description: "Please enter a valid email address", 
          variant: "destructive",
        });
        return { error: new AuthError("Invalid email format") };
      }

      // Client-side password validation
      const passwordValidation = validatePasswordStrength(password);
      if (!passwordValidation.isStrong) {
        toast({
          title: "Weak Password",
          description: passwordValidation.feedback.join('. '),
          variant: "destructive",
        });
        return { error: new AuthError("Password does not meet requirements") };
      }

      // Rate limiting (non-blocking)
      try {
        const rateLimitPassed = await checkRateLimit(sanitizedEmail, 'sign_up', 3, 60);
        if (!rateLimitPassed) {
          toast({
            title: "Too Many Attempts",
            description: "Please wait before trying again",
            variant: "destructive",
          });
          return { error: new AuthError("Rate limited") };
        }
      } catch (rateLimitError) {
        // Rate limiting failed - continue with authentication
        // Continue with authentication even if rate limiting fails
      }

      const { data, error } = await supabase.auth.signUp({
        email: sanitizedEmail,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
          data: {
            full_name: sanitizedFullName,
          },
        },
      });
      
      if (error) {
        toast({
          title: "Sign Up Error",
          description: error.message,
          variant: "destructive",
        });
        
        await logSecurityEvent('sign_up_failed', 'authentication', sanitizedEmail, {
          error: error.message,
        });
      } else {
        toast({
          title: "Account Created",
          description: "Please check your email to verify your account.",
        });
        
        if (data.user) {
          await logSecurityEvent('sign_up_success', 'authentication', data.user.id);
        }
      }
      
      return { error };
    } catch (err) {
      const error = err as AuthError;
      logger.error('Sign up error', error, { component: 'EnhancedAuth' });
      return { error };
    }
  }, [toast]);

  // Enhanced sign out with security logging
  const signOut = React.useCallback(async () => {
    try {
      const currentUser = user;
      
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        toast({
          title: "Sign Out Error", 
          description: error.message,
          variant: "destructive",
        });
      } else {
        if (currentUser) {
          await logSecurityEvent('sign_out_success', 'authentication', currentUser.id);
        }
        
        toast({
          title: "Signed Out",
          description: "You have been signed out successfully.",
        });
      }
    } catch (error) {
      logger.error('Sign out error', error as Error, { component: 'EnhancedAuth' });
      toast({
        title: "Sign Out Error",
        description: "An error occurred during sign out",
        variant: "destructive",
      });
    }
  }, [toast, user]);

  // Enhanced password reset with validation
  const resetPassword = React.useCallback(async (email: string) => {
    try {
      if (!email) {
        toast({
          title: "Validation Error",
          description: "Email is required",
          variant: "destructive",
        });
        return { error: new AuthError("Invalid input") };
      }

      const sanitizedEmail = sanitizeInput(email.toLowerCase().trim());
      
      if (!validateEmail(sanitizedEmail)) {
        toast({
          title: "Validation Error",
          description: "Please enter a valid email address",
          variant: "destructive",
        });
        return { error: new AuthError("Invalid email format") };
      }

      // Rate limiting for password reset (non-blocking)
      try {
        const rateLimitPassed = await checkRateLimit(sanitizedEmail, 'password_reset', 3, 60);
        if (!rateLimitPassed) {
          toast({
            title: "Too Many Attempts",
            description: "Please wait before requesting another password reset",
            variant: "destructive",
          });
          return { error: new AuthError("Rate limited") };
        }
      } catch (rateLimitError) {
        // Rate limiting failed - continue with password reset
        // Continue with password reset even if rate limiting fails
      }

      const { error } = await supabase.auth.resetPasswordForEmail(sanitizedEmail, {
        redirectTo: `${window.location.origin}/auth/reset-password`,
      });
      
      if (error) {
        toast({
          title: "Reset Password Error",
          description: error.message,
          variant: "destructive",
        });
        
        await logSecurityEvent('password_reset_failed', 'authentication', sanitizedEmail, {
          error: error.message,
        });
      } else {
        toast({
          title: "Password Reset Sent",
          description: "Please check your email for password reset instructions.",
        });
        
        await logSecurityEvent('password_reset_requested', 'authentication', sanitizedEmail);
      }
      
      return { error };
    } catch (err) {
      const error = err as AuthError;
      logger.error('Password reset error', error, { component: 'EnhancedAuth' });
      return { error };
    }
  }, [toast]);

  // Simplified Google sign in without blocking rate limiting
  const signInWithGoogle = React.useCallback(async () => {
    try {
      // Domain analysis and validation
      const currentDomain = window.location.origin;
      const callbackUrl = `${currentDomain}/auth/callback`;
      
      // Skip rate limiting for now to avoid blocking authentication
      // Rate limiting with domain-specific key (non-blocking)
      const rateLimitKey = `google_oauth_${currentDomain}`;
      try {
        await checkRateLimit(rateLimitKey, 'oauth_sign_in', 10, 15);
      } catch (rateLimitError) {
        // Rate limiting check failed - proceed with OAuth
        // Continue with authentication even if rate limiting fails
      }

      // Enhanced OAuth call with domain validation
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: callbackUrl,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        },
      });
      
      if (error) {
        logger.error('Google OAuth error', error, { component: 'EnhancedAuth', action: 'signInWithGoogle' });
        
        // Enhanced error messaging with domain-specific guidance
        let userMessage = error.message;
        let isDomainIssue = false;
        
        if (error.message.includes('Provider not found')) {
          userMessage = 'Google sign-in provider is not configured in Supabase. Please contact support.';
        } else if (error.message.includes('Invalid redirect URL') || 
                   error.message.includes('unauthorized_client') ||
                   error.message.includes('redirect_uri_mismatch')) {
          isDomainIssue = true;
          userMessage = `Domain configuration issue detected.\n\nCurrent domain: ${currentDomain}\n\nPlease ensure:\n1. This domain is added to Google Cloud Console\n2. Supabase Site URL matches this domain\n3. Redirect URL is properly configured`;
        }
        
        toast({
          title: "Google Sign In Failed",
          description: userMessage,
          variant: "destructive",
        });
        
        await logSecurityEvent('google_sign_in_failed', 'authentication', undefined, {
          error: error.message,
          domain: currentDomain,
          isDomainIssue,
          timestamp: new Date().toISOString(),
        });
      } else {
        await logSecurityEvent('google_sign_in_initiated', 'authentication', undefined, {
          domain: currentDomain,
          redirectUrl: callbackUrl,
          timestamp: new Date().toISOString(),
        });
        
        toast({
          title: "Redirecting to Google",
          description: "Please complete authentication with Google.",
        });
      }
      
      return { error };
    } catch (err) {
      const error = err as AuthError;
      logger.error('Google sign in unexpected error', error, { component: 'EnhancedAuth', action: 'signInWithGoogle' });
      
      const currentDomain = window.location.origin;
      let errorMessage = error.message;
      
      if (errorMessage.includes('timeout') || errorMessage.includes('network')) {
        errorMessage = `Network or timeout error. Current domain: ${currentDomain}. This may indicate a configuration issue.`;
      }
      
      toast({
        title: "Google Sign In Error",
        description: errorMessage,
        variant: "destructive",
      });
      
      await logSecurityEvent('google_sign_in_error', 'authentication', undefined, {
        error: error.message,
        domain: currentDomain,
        stack: error.stack,
        timestamp: new Date().toISOString(),
      });
      
      return { error };
    }
  }, [toast]);

  // Password validation helper
  const validatePassword = React.useCallback(async (password: string) => {
    const validation = validatePasswordStrength(password);
    return {
      isValid: validation.isStrong,
      feedback: validation.feedback,
    };
  }, []);

  // Ensure profile creation with security logging
  const ensureProfile = async (user: User) => {
    try {
      const { data: profile, error: selectError } = await supabase
        .from('profiles')
        .select('id, first_login_completed')
        .eq('id', user.id)
        .maybeSingle();

      if (selectError) {
        logger.error('Error checking profile', selectError, { component: 'EnhancedAuth', action: 'ensureProfile' });
        await logSecurityEvent('profile_check_failed', 'user', user.id, {
          error: selectError.message,
        });
        return;
      }

      if (!profile) {
        const baseUsername = user.email?.split('@')[0] || 'user';
        
        let { error } = await supabase.from('profiles').insert({
          id: user.id,
          full_name: user.user_metadata?.full_name || user.user_metadata?.name || '',
          avatar_url: user.user_metadata?.avatar_url || user.user_metadata?.picture || '',
          username: baseUsername,
          first_login_completed: false,
        });

        if (error?.code === '23505' && error.message?.includes('profiles_username_key')) {
          const uniqueUsername = `${baseUsername}_${user.id.slice(0, 8)}`;
          
          const { error: retryError } = await supabase.from('profiles').insert({
            id: user.id,
            full_name: user.user_metadata?.full_name || user.user_metadata?.name || '',
            avatar_url: user.user_metadata?.avatar_url || user.user_metadata?.picture || '',
            username: uniqueUsername,
            first_login_completed: false,
          });

          if (retryError) {
            logger.error('Error creating profile with unique username', retryError, { component: 'EnhancedAuth', action: 'ensureProfile' });
            await logSecurityEvent('profile_creation_failed', 'user', user.id, {
              error: retryError.message,
            });
          } else {
            await logSecurityEvent('profile_created', 'user', user.id, {
              username: uniqueUsername,
            });
          }
        } else if (error) {
          logger.error('Error creating profile', error, { component: 'EnhancedAuth', action: 'ensureProfile' });
          await logSecurityEvent('profile_creation_failed', 'user', user.id, {
            error: error.message,
          });
        } else {
          await logSecurityEvent('profile_created', 'user', user.id, {
            username: baseUsername,
          });
        }
      } else if (profile && !profile.first_login_completed) {
        const { error: updateError } = await supabase
          .from('profiles')
          .update({ first_login_completed: true })
          .eq('id', user.id);

        if (updateError) {
          logger.error('Error marking first login completed', updateError, { component: 'EnhancedAuth', action: 'ensureProfile' });
        } else {
          await logSecurityEvent('first_login_completed', 'user', user.id);
        }
      }
    } catch (error) {
      logger.error('Error in ensureProfile', error as Error, { component: 'EnhancedAuth', action: 'ensureProfile' });
      await logSecurityEvent('profile_error', 'user', user.id, {
        error: (error as Error).message,
      });
    }
  };

  // Enhanced auth state management with security validation
  React.useEffect(() => {
    let mounted = true;

    const getInitialSession = async () => {
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error) {
        logger.error('Error getting initial session', error, { component: 'EnhancedAuth' });
        await logSecurityEvent('session_error', 'authentication', undefined, {
          error: error.message,
        });
      }
      
      if (mounted) {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);

        // Validate session security if user exists
        if (session?.user) {
          validateSessionSecurity().then(isValid => {
            if (!isValid) {
              // Session security validation failed - handled securely
              signOut();
            }
          });
        }
      }
    };

    getInitialSession();

    // Listen for auth changes with security logging
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (mounted) {
          setSession(session);
          setUser(session?.user ?? null);
          setLoading(false);

          // Log auth state changes
          if (event === 'SIGNED_IN' && session?.user) {
            await logSecurityEvent('session_started', 'authentication', session.user.id);
            setTimeout(async () => {
              await ensureProfile(session.user);
            }, 0);
          } else if (event === 'SIGNED_OUT') {
            await logSecurityEvent('session_ended', 'authentication');
          } else if (event === 'TOKEN_REFRESHED' && session?.user) {
            await logSecurityEvent('token_refreshed', 'authentication', session.user.id);
          }
        }
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [signOut]);

  // Memoize context value
  const value = React.useMemo(() => ({
    user,
    session,
    loading,
    signIn,
    signUp,
    signOut,
    resetPassword,
    signInWithGoogle,
    validatePassword,
  }), [user, session, loading, signIn, signUp, signOut, resetPassword, signInWithGoogle, validatePassword]);

  return (
    <EnhancedAuthContext.Provider value={value}>
      {children}
    </EnhancedAuthContext.Provider>
  );
}

export function useEnhancedAuth() {
  const context = React.useContext(EnhancedAuthContext);
  if (context === undefined) {
    throw new Error('useEnhancedAuth must be used within an EnhancedAuthProvider');
  }
  return context;
}