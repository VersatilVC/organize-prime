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
    
    // Post-auth setup completed
  };

  // Development-only bypass for localhost testing
  const devBypassAuth = async () => {
    if (import.meta.env.DEV && window.location.hostname === 'localhost') {
      console.log('🚧 DEV: Bypassing authentication for localhost testing');
      
      // Clear any existing auth state first
      setError(null);
      setLoading(true);
      
      try {
        // Try to sign in with real credentials for development testing
        const { data, error } = await supabase.auth.signInWithPassword({
          email: 'admin@demo.com',
          password: 'demo123'
        });

        if (data.user && data.session) {
          console.log('🚧 DEV: Real Supabase authentication successful');
          setUser(data.user);
          setSession(data.session);
          setLoading(false);
          return { error: null };
        }

        if (error) {
          console.warn('🚧 DEV: Real auth failed, falling back to mock:', error.message);
        }
      } catch (authError) {
        console.warn('🚧 DEV: Auth connection failed, using mock:', authError);
      }

      // Fallback: Create mock user and session for development 
      const mockUser = {
        id: 'd6a2a926-4884-4f92-88d1-1539ea12729a',
        email: 'admin@demo.com',
        user_metadata: { full_name: 'Demo Super Admin', is_super_admin: true },
        app_metadata: { provider: 'dev-bypass', providers: ['dev-bypass'], is_super_admin: true },
        aud: 'authenticated',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        confirmed_at: new Date().toISOString(),
        last_sign_in_at: new Date().toISOString(),
        role: 'authenticated'
      } as any;

      setUser(mockUser);
      setSession({ access_token: 'dev-token', user: mockUser } as any);
      setLoading(false);
      
      console.log('🚧 DEV: Bypass authentication complete, state set');
      return { error: null };
    }
    return { error: new Error('Development bypass only available on localhost') };
  };

  React.useEffect(() => {
    // Check for development bypass on page load
    if (import.meta.env.DEV && window.location.hostname === 'localhost') {
      const urlParams = new URLSearchParams(window.location.search);
      const bypassActive = localStorage.getItem('dev_bypass_active') === 'true';
      const bypassRequested = urlParams.get('dev_bypass') === 'true';
      
      if (bypassRequested || bypassActive) {
        console.log('🚧 DEV: Auto-bypassing authentication - completely skipping Supabase auth');
        localStorage.setItem('dev_bypass_active', 'true');
        
        // Set a flag to prevent auth listener setup
        (globalThis as any).__devBypassActive = true;
        
        devBypassAuth();
        return () => {
          console.log('🚧 DEV: Bypass cleanup - no auth listener to clean up');
        };
      }
    }
    
    // Don't set up auth listener if bypass is active
    if ((globalThis as any).__devBypassActive) {
      console.log('🚧 DEV: Skipping auth listener setup due to active bypass');
      return () => {
        console.log('🚧 DEV: Bypass mode - no auth cleanup needed');
      };
    }

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
    
    // Add a small delay to batch rapid auth state changes
    let authStateTimeout: NodeJS.Timeout | null = null;
    // Auth listener started
    
    // Set up auth state listener (consolidated from client.ts to prevent duplicates)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!isSubscribed) return; // Prevent execution after cleanup
        
        debugSafeguards.trackAuthEvent(event, session);
        
        // Debounce rapid auth state changes to prevent excessive re-renders
        if (authStateTimeout) {
          clearTimeout(authStateTimeout);
        }
        
        authStateTimeout = setTimeout(() => {
          // Only update state if there's an actual change to prevent excessive re-renders
          setSession(prevSession => {
            if (JSON.stringify(prevSession) === JSON.stringify(session)) {
              return prevSession; // No change, prevent re-render
            }
            return session;
          });
          setUser(prevUser => {
            const newUser = session?.user ?? null;
            if (JSON.stringify(prevUser) === JSON.stringify(newUser)) {
              return prevUser; // No change, prevent re-render
            }
            return newUser;
          });
          setLoading(false);
        }, 100); // Increased to 100ms debounce for better batching

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
      if (authStateTimeout) {
        clearTimeout(authStateTimeout);
      }
      subscription.unsubscribe();
      (globalThis as any).__authListenerActive = false;
      (globalThis as any).__authListenerInstanceId = null;
      // Auth listener cleaned up
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

  // Expose dev bypass on window for testing
  if (import.meta.env.DEV && window.location.hostname === 'localhost') {
    (window as any).__devBypassAuth = devBypassAuth;
    (window as any).__clearDevBypass = () => {
      localStorage.removeItem('dev_bypass_active');
      (globalThis as any).__devBypassActive = false;
      console.log('🚧 DEV: Bypass cleared, reload page to use normal auth');
    };
  }

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