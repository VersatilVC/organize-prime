
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  error: string | null;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signUp: (email: string, password: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: any }>;
  signInWithGoogle: () => Promise<{ error: any }>;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  // Safety check to ensure React hooks are available
  if (!React || !React.useState) {
    console.error('React hooks not available in AuthProvider');
    return (
      <div style={{ 
        minHeight: '100vh', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        background: 'white' 
      }}>
        <div>Loading...</div>
      </div>
    );
  }

  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Simple domain logic without hooks to avoid initialization issues
  const handlePostAuthSetup = async (user: User) => {
    if (!user.email) return;

    const domain = user.email.split('@')[1]?.toLowerCase();
    const personalDomains = ['gmail.com', 'outlook.com', 'yahoo.com', 'hotmail.com', 'icloud.com', 'aol.com', 'protonmail.com', 'mail.com'];
    
    // For now, just log the setup - we'll implement full logic later
    console.log('Post-auth setup for:', user.email, 'Domain:', domain, 'Is personal:', personalDomains.includes(domain));
  };

  useEffect(() => {
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);

        // Handle post-auth setup for new users
        if (event === 'SIGNED_IN' && session?.user) {
          setTimeout(() => {
            handlePostAuthSetup(session.user);
          }, 0);
        }
      }
    );

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    setError(null);
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });
    if (error) setError(error.message);
    return { error };
  };

  const signUp = async (email: string, password: string) => {
    setError(null);
    const redirectUrl = `${window.location.origin}/`;
    
    const { error } = await supabase.auth.signUp({
      email: email.trim().toLowerCase(),
      password,
      options: {
        emailRedirectTo: redirectUrl
      }
    });
    if (error) setError(error.message);
    return { error };
  };

  const signInWithGoogle = async () => {
    setError(null);
    const redirectUrl = `${window.location.origin}/`;
    
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: redirectUrl
      }
    });
    if (error) setError(error.message);
    return { error };
  };

  const resetPassword = async (email: string) => {
    setError(null);
    const redirectUrl = `${window.location.origin}/reset-password`;
    
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: redirectUrl
    });
    if (error) setError(error.message);
    return { error };
  };

  const signOut = async () => {
    setError(null);
    await supabase.auth.signOut();
  };

  const clearError = () => setError(null);

  return (
    <AuthContext.Provider value={{
      user,
      session,
      loading,
      error,
      signIn,
      signUp,
      signOut,
      resetPassword,
      signInWithGoogle,
      clearError
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
