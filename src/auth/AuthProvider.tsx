import * as React from 'react';
import { User, Session, AuthError } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { debugSafeguards } from '@/lib/debug-safeguards';

/**
 * Authentication response type with proper error typing
 */
interface AuthResponse {
  error: AuthError | null;
}

/**
 * Authentication context interface with proper typing
 */
interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  error: string | null;
  signIn: (email: string, password: string) => Promise<AuthResponse>;
  signUp: (email: string, password: string) => Promise<AuthResponse>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<AuthResponse>;
  signInWithGoogle: () => Promise<AuthResponse>;
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


  React.useEffect(() => {
    // BYPASS MECHANISM DISABLED PER USER REQUEST
    // "let's cancel the bypass it is causing too many issues"

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

    // Handle OAuth callback explicitly (for PKCE code exchange)
    const handleOAuthCallback = async () => {
      if (!isSubscribed) return;
      
      // Check if we have an OAuth callback (code in URL)
      const urlParams = new URLSearchParams(window.location.search);
      const code = urlParams.get('code');
      
      if (code) {
        try {
          console.log('OAuth callback detected, exchanging code for session...');
          // Exchange code for session using exchangeCodeForSession
          const { data, error } = await supabase.auth.exchangeCodeForSession(code);
          
          if (error) {
            console.error('OAuth code exchange error:', error);
            setError(error.message);
            setLoading(false);
            return;
          }
          
          if (data.session) {
            console.log('OAuth session established:', data.session);
            debugSafeguards.trackAuthEvent('oauth_code_exchange', data.session);
            
            setSession(data.session);
            setUser(data.session.user);
            setLoading(false);
            
            // Clean up URL - remove code parameter
            const newUrl = new URL(window.location.href);
            newUrl.searchParams.delete('code');
            window.history.replaceState({}, document.title, newUrl.toString());
            
            return; // Skip getSession() call below
          }
        } catch (error) {
          console.error('OAuth callback handling failed:', error);
          setError('OAuth authentication failed');
          setLoading(false);
          return;
        }
      }
      
      // If no OAuth callback, check for existing session
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
    };
    
    // Execute OAuth callback handling
    handleOAuthCallback();

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