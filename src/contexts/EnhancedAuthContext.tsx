import React, { createContext, useContext, useEffect, useState, useMemo, useCallback } from 'react';
import { User, Session, AuthError } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
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

const EnhancedAuthContext = createContext<EnhancedAuthContextType | undefined>(undefined);

export function EnhancedAuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  // Enhanced sign in with comprehensive security
  const signIn = useCallback(async (email: string, password: string) => {
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

      // Rate limiting check
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
      console.error('Sign in error:', error);
      await logSecurityEvent('sign_in_error', 'authentication', undefined, {
        error: error.message,
      });
      return { error };
    }
  }, [toast]);

  // Enhanced sign up with password validation
  const signUp = useCallback(async (email: string, password: string, fullName?: string) => {
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

      // Rate limiting
      const rateLimitPassed = await checkRateLimit(sanitizedEmail, 'sign_up', 3, 60);
      if (!rateLimitPassed) {
        toast({
          title: "Too Many Attempts",
          description: "Please wait before trying again",
          variant: "destructive",
        });
        return { error: new AuthError("Rate limited") };
      }

      const { data, error } = await supabase.auth.signUp({
        email: sanitizedEmail,
        password,
        options: {
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
      console.error('Sign up error:', error);
      return { error };
    }
  }, [toast]);

  // Enhanced sign out with security logging
  const signOut = useCallback(async () => {
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
      console.error('Sign out error:', error);
      toast({
        title: "Sign Out Error",
        description: "An error occurred during sign out",
        variant: "destructive",
      });
    }
  }, [toast, user]);

  // Enhanced password reset with validation
  const resetPassword = useCallback(async (email: string) => {
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

      // Rate limiting for password reset
      const rateLimitPassed = await checkRateLimit(sanitizedEmail, 'password_reset', 3, 60);
      if (!rateLimitPassed) {
        toast({
          title: "Too Many Attempts",
          description: "Please wait before requesting another password reset",
          variant: "destructive",
        });
        return { error: new AuthError("Rate limited") };
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
      console.error('Password reset error:', error);
      return { error };
    }
  }, [toast]);

  // Enhanced Google sign in with logging
  const signInWithGoogle = useCallback(async () => {
    try {
      // Rate limiting for OAuth attempts
      const rateLimitPassed = await checkRateLimit('google_oauth', 'oauth_sign_in', 10, 15);
      if (!rateLimitPassed) {
        toast({
          title: "Too Many Attempts",
          description: "Please wait before trying Google sign in again",
          variant: "destructive",
        });
        return { error: new AuthError("Rate limited") };
      }

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      
      if (error) {
        toast({
          title: "Google Sign In Error",
          description: error.message,
          variant: "destructive",
        });
        
        await logSecurityEvent('google_sign_in_failed', 'authentication', undefined, {
          error: error.message,
        });
      } else {
        await logSecurityEvent('google_sign_in_initiated', 'authentication');
      }
      
      return { error };
    } catch (err) {
      const error = err as AuthError;
      console.error('Google sign in error:', error);
      return { error };
    }
  }, [toast]);

  // Password validation helper
  const validatePassword = useCallback(async (password: string) => {
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
        console.error('Error checking profile:', selectError);
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
            console.error('Error creating profile with unique username:', retryError);
            await logSecurityEvent('profile_creation_failed', 'user', user.id, {
              error: retryError.message,
            });
          } else {
            await logSecurityEvent('profile_created', 'user', user.id, {
              username: uniqueUsername,
            });
          }
        } else if (error) {
          console.error('Error creating profile:', error);
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
          console.error('Error marking first login completed:', updateError);
        } else {
          await logSecurityEvent('first_login_completed', 'user', user.id);
        }
      }
    } catch (error) {
      console.error('Error in ensureProfile:', error);
      await logSecurityEvent('profile_error', 'user', user.id, {
        error: (error as Error).message,
      });
    }
  };

  // Enhanced auth state management with security validation
  useEffect(() => {
    let mounted = true;

    const getInitialSession = async () => {
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error) {
        console.error('Error getting initial session:', error);
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
              console.warn('Session security validation failed');
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
  const value = useMemo(() => ({
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
  const context = useContext(EnhancedAuthContext);
  if (context === undefined) {
    throw new Error('useEnhancedAuth must be used within an EnhancedAuthProvider');
  }
  return context;
}