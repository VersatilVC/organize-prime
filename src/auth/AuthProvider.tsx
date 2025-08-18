import * as React from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { debugSafeguards } from '@/lib/debug-safeguards';

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

const AuthContext = React.createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  // Use explicit React.useState to avoid any import conflicts
  const [user, setUser] = React.useState<User | null>(null);
  const [session, setSession] = React.useState<Session | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const handlePostAuthSetup = async (user: User) => {
    if (!user.email) return;

    const domain = user.email.split('@')[1]?.toLowerCase();
    const personalDomains = ['gmail.com', 'outlook.com', 'yahoo.com', 'hotmail.com', 'icloud.com', 'aol.com', 'protonmail.com', 'mail.com'];
    
    console.log('Post-auth setup for:', user.email, 'Domain:', domain, 'Is personal:', personalDomains.includes(domain));
  };

  React.useEffect(() => {
    // Prevent duplicate listeners in StrictMode
    let isSubscribed = true;
    
    // Use a more reliable duplicate prevention mechanism
    const authInstanceId = `auth-${Math.random().toString(36).substr(2, 9)}`;
    
    // Check if we already have an active listener to prevent duplicates
    if ((globalThis as any).__authListenerActive) {
      console.warn(`AuthProvider: Duplicate listener prevented. Active ID: ${(globalThis as any).__authListenerInstanceId}`);
      return () => {}; // Skip if already active
    }
    
    (globalThis as any).__authListenerActive = true;
    (globalThis as any).__authListenerInstanceId = authInstanceId;
    console.log(`AuthProvider: Auth listener started with ID: ${authInstanceId}`);
    
    // Set up auth state listener (consolidated from client.ts to prevent duplicates)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!isSubscribed) return; // Prevent execution after cleanup
        
        debugSafeguards.trackAuthEvent(event, session);
        
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);

        // ✅ Handle cache clearing on sign out (moved from client.ts)
        if (event === 'SIGNED_OUT') {
          if (typeof window !== 'undefined' && window.localStorage) {
            try {
              localStorage.removeItem('currentOrganizationId');
              localStorage.removeItem('cached-permissions');
              localStorage.removeItem('cached-organization-data');
              // Clear any cache with patterns
              const keys = Object.keys(localStorage);
              keys.forEach(key => {
                if (key.startsWith('cache-permissions-') || key.startsWith('cache-organizations-')) {
                  localStorage.removeItem(key);
                }
              });
            } catch (error) {
              console.warn('Could not clear localStorage on signout:', error);
            }
          }
        }

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
      if (!isSubscribed) return; // Prevent execution after cleanup
      
      debugSafeguards.trackAuthEvent('getSession', session);
      
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    }).catch((error) => {
      if (!isSubscribed) return;
      console.error('Error getting session:', error);
      setLoading(false);
    });

    return () => {
      isSubscribed = false;
      subscription.unsubscribe();
      (globalThis as any).__authListenerActive = false;
      (globalThis as any).__authListenerInstanceId = null;
      console.log(`AuthProvider: Auth listener cleaned up for ID: ${authInstanceId}`);
    };
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

  const contextValue: AuthContextType = {
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
  };

  return React.createElement(
    AuthContext.Provider,
    { value: contextValue },
    children
  );
}

export function useAuth() {
  const context = React.useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}