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

  // Basic sign out
  const signOut = async () => {
    console.log('🚪 Simple Auth: Sign out');
    
    try {
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        toast({
          title: "Sign Out Error", 
          description: error.message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Signed Out",
          description: "You have been signed out successfully.",
        });
      }
    } catch (error) {
      console.error('🚨 Sign out error:', error);
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

  // Basic Google sign in
  const signInWithGoogle = async () => {
    console.log('🔍 Simple Auth: Google sign in attempt');
    
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      
      if (error) {
        console.error('🚨 Google sign in error:', error);
        toast({
          title: "Google Sign In Failed",
          description: error.message,
          variant: "destructive",
        });
      } else {
        console.log('✅ Google OAuth initiated');
      }
      
      return { error };
    } catch (err) {
      console.error('🚨 Google sign in unexpected error:', err);
      const error = err as AuthError;
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