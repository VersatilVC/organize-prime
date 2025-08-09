import React, { createContext, useContext, useEffect, useState, useMemo, useCallback } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

// Split auth context into methods and data for better performance
interface AuthMethodsContextType {
  signUp: (email: string, password: string) => Promise<{ error: any }>;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signInWithGoogle: () => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: any }>;
}

interface UserDataContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
}

// Legacy interface for backward compatibility
interface AuthContextType extends AuthMethodsContextType, UserDataContextType {}

const AuthMethodsContext = createContext<AuthMethodsContextType | undefined>(undefined);
const UserDataContext = createContext<UserDataContextType | undefined>(undefined);
const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    let mounted = true; // Prevent state updates after unmount
    
    const initializeAuth = async () => {
      try {
        // Get initial session first
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (!mounted) return; // Prevent race condition
        
        if (error) {
          console.error('Auth initialization error:', error);
        } else {
          setSession(session);
          setUser(session?.user ?? null);
        }
      } catch (error) {
        console.error('Auth initialization failed:', error);
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return;
        
        console.log('Auth state change:', event, session?.user?.email);
        
        setSession(session);
        setUser(session?.user ?? null);
        
        if (event === 'SIGNED_IN' && session?.user) {
          // Use a timeout to prevent blocking the auth state change
          setTimeout(() => {
            if (mounted) {
              ensureProfile(session.user);
            }
          }, 100);
        }
        
        if (event === 'SIGNED_OUT') {
          setUser(null);
          setSession(null);
        }
        
        if (mounted) {
          setLoading(false);
        }
      }
    );

    // Initialize auth state
    initializeAuth();

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const ensureProfile = async (user: User) => {
    try {
      const { data: profile, error: selectError } = await supabase
        .from('profiles')
        .select('id, first_login_completed')
        .eq('id', user.id)
        .maybeSingle();

      if (selectError) {
        console.error('Error checking profile:', selectError);
        return;
      }

      if (!profile) {
        // Generate initial username from email
        const baseUsername = user.email?.split('@')[0] || 'user';
        
        // Try creating profile with base username first
        let { error } = await supabase.from('profiles').insert({
          id: user.id,
          full_name: user.user_metadata?.full_name || user.user_metadata?.name || '',
          avatar_url: user.user_metadata?.avatar_url || user.user_metadata?.picture || '',
          username: baseUsername,
          first_login_completed: false, // Track first login
        });

        // If username conflict, retry with user ID suffix
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
          } else {
            console.log('Profile created successfully with unique username:', uniqueUsername);
          }
        } else if (error) {
          console.error('Error creating profile:', error);
        } else {
          console.log('Profile created successfully with username:', baseUsername);
        }
      } else if (profile && !profile.first_login_completed) {
        // Mark first login as completed - this will trigger the welcome notification via database trigger
        console.log('DEBUG: User exists but first_login_completed is false, marking as completed for user:', user.id);
        const { error: updateError } = await supabase
          .from('profiles')
          .update({ first_login_completed: true })
          .eq('id', user.id);

        if (updateError) {
          console.error('Error marking first login completed:', updateError);
        } else {
          console.log('First login completed for user:', user.id);
        }
      } else if (profile && profile.first_login_completed) {
        console.log('DEBUG: User exists and first_login_completed is already true for user:', user.id);
      }

      // Handle organization logic after profile creation
      await handleOrganizationLogic(user);
    } catch (error) {
      console.error('Error in ensureProfile:', error);
    }
  };

  const handleOrganizationLogic = async (user: User) => {
    if (!user.email) return;

    // First check if user already has any memberships
    const { data: existingMemberships } = await supabase
      .from('memberships')
      .select('id')
      .eq('user_id', user.id)
      .eq('status', 'active');

    // If user already has memberships, skip organization creation
    if (existingMemberships && existingMemberships.length > 0) {
      return;
    }

    const domain = user.email.split('@')[1];
    const businessDomains = ['versatil.vc', 'verss.ai'];
    const personalDomains = ['gmail.com', 'outlook.com', 'yahoo.com', 'hotmail.com', 'icloud.com'];

    if (businessDomains.includes(domain)) {
      // Business domain logic
      const { data: existingOrg } = await supabase
        .from('organizations')
        .select('id, name')
        .eq('slug', domain)
        .maybeSingle();

      if (!existingOrg) {
        // First user from this domain - create organization
        const orgName = domain === 'versatil.vc' ? 'Versatil VC' : 
                       domain === 'verss.ai' ? 'Verss AI' : 
                       domain.split('.')[0].charAt(0).toUpperCase() + domain.split('.')[0].slice(1);

        const { data: newOrg, error: orgError } = await supabase
          .from('organizations')
          .insert({
            name: orgName,
            slug: domain,
          })
          .select()
          .maybeSingle();

        if (newOrg && !orgError) {
          // Create admin membership
          const { error: membershipError } = await supabase.from('memberships').insert({
            user_id: user.id,
            organization_id: newOrg.id,
            role: 'admin',
            status: 'active',
            joined_at: new Date().toISOString(),
          });

          if (!membershipError) {
            console.log(`Organization ${orgName} created successfully for ${user.email}`);
            toast({
              title: "Welcome!",
              description: `You're now the Company Admin for ${orgName}`,
            });
          } else {
            console.error('Error creating membership:', membershipError);
          }
        } else {
          console.error('Error creating organization:', orgError);
        }
      } else {
        // Organization exists, check if user has pending invitation
        const { data: invitation } = await supabase
          .from('invitations')
          .select('id, role, organization_id')
          .eq('email', user.email)
          .eq('organization_id', existingOrg.id)
          .is('accepted_at', null)
          .maybeSingle();

        if (invitation) {
          // Accept invitation
          await supabase.from('invitations').update({
            accepted_at: new Date().toISOString(),
          }).eq('id', invitation.id);

          await supabase.from('memberships').insert({
            user_id: user.id,
            organization_id: invitation.organization_id,
            role: invitation.role,
            status: 'active',
            joined_at: new Date().toISOString(),
          });

          toast({
            title: "Welcome!",
            description: `You've joined ${existingOrg.name}`,
          });
        } else {
          // Show contact admin message
          toast({
            title: "Contact Admin",
            description: `Please contact your company admin at ${existingOrg.name} for an invitation.`,
            variant: "default",
          });
        }
      }
    }
    // For personal domains, we'll handle this in the UI
  };

  // Memoize auth methods to prevent unnecessary re-renders
  const signUp = useCallback(async (email: string, password: string) => {
    const redirectUrl = `${window.location.origin}/`;
    
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl
      }
    });
    
    if (error) {
      toast({
        title: "Sign Up Error",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Check your email",
        description: "We've sent you a confirmation link.",
      });
    }
    
    return { error };
  }, [toast]);

  const signIn = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    
    if (error) {
      toast({
        title: "Sign In Error",
        description: error.message,
        variant: "destructive",
      });
    }
    
    return { error };
  }, [toast]);

  const signInWithGoogle = useCallback(async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/`
      }
    });
    
    if (error) {
      toast({
        title: "Google Sign In Error",
        description: error.message,
        variant: "destructive",
      });
    }
    
    return { error };
  }, [toast]);

  const signOut = useCallback(async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast({
        title: "Sign Out Error",
        description: error.message,
        variant: "destructive",
      });
    }
  }, [toast]);

  const resetPassword = useCallback(async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    
    if (error) {
      toast({
        title: "Password Reset Error",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Password reset sent",
        description: "Check your email for reset instructions.",
      });
    }
    
    return { error };
  }, [toast]);

  // Memoize context values to prevent unnecessary re-renders
  const authMethods = useMemo(() => ({
    signUp,
    signIn,
    signInWithGoogle,
    signOut,
    resetPassword,
  }), [signUp, signIn, signInWithGoogle, signOut, resetPassword]);

  const userData = useMemo(() => ({
    user,
    session,
    loading,
  }), [user, session, loading]);

  // Legacy combined value for backward compatibility
  const legacyValue = useMemo(() => ({
    ...userData,
    ...authMethods,
  }), [userData, authMethods]);

  return (
    <AuthMethodsContext.Provider value={authMethods}>
      <UserDataContext.Provider value={userData}>
        <AuthContext.Provider value={legacyValue}>
          {children}
        </AuthContext.Provider>
      </UserDataContext.Provider>
    </AuthMethodsContext.Provider>
  );
}

// Optimized hooks for selective context subscriptions
export function useAuthMethods() {
  const context = useContext(AuthMethodsContext);
  if (context === undefined) {
    throw new Error('useAuthMethods must be used within an AuthProvider');
  }
  return context;
}

export function useUserData() {
  const context = useContext(UserDataContext);
  if (context === undefined) {
    throw new Error('useUserData must be used within an AuthProvider');
  }
  return context;
}

// Legacy hook for backward compatibility
export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}