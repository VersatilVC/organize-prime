import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/auth/AuthProvider';
import { useMemo } from 'react';
import { devLog } from '@/lib/dev-logger';

export type UserRole = 'super_admin' | 'admin' | 'user';

interface UserRoleResult {
  role: UserRole;
  organizations: string[];
  loading: boolean;
}

export function useUserRole(): UserRoleResult {
  const { user } = useAuth();

  const query = useQuery({
    queryKey: ['user-role', user?.id],
    queryFn: async () => {
      if (!user?.id) {
        return { role: 'user' as UserRole, organizations: [] };
      }

      // Development bypass: Return super admin role for bypass user
      if (import.meta.env.DEV && (globalThis as any).__devBypassActive && user.id === 'd6a2a926-4884-4f92-88d1-1539ea12729a') {
        devLog.log('🚧 DEV: Using bypass user role - super_admin');
        return {
          role: 'super_admin' as UserRole,
          organizations: ['8aa2da2b-d344-4ff2-beca-d8d34c8d5262'] // Bypass org ID
        };
      }

      try {
        // Single optimized query to get profile and memberships
        const [profileResult, membershipsResult] = await Promise.all([
          supabase
            .from('profiles')
            .select('is_super_admin')
            .eq('id', user.id)
            .maybeSingle(),
          supabase
            .from('memberships')
            .select('role, organization_id')
            .eq('user_id', user.id)
            .eq('status', 'active')
        ]);

        const profile = profileResult.data;
        const memberships = membershipsResult.data || [];

        // Super admin check
        if (profile?.is_super_admin) {
          return {
            role: 'super_admin' as UserRole,
            organizations: memberships.map(m => m.organization_id)
          };
        }

        // Admin check
        const isAdmin = memberships.some(m => m.role === 'admin');
        const role = isAdmin ? 'admin' : 'user';

        return {
          role: role as UserRole,
          organizations: memberships.map(m => m.organization_id)
        };
      } catch (error) {
        devLog.error('Error fetching user role:', error);
        return { role: 'user' as UserRole, organizations: [] };
      }
    },
    enabled: !!user,
    staleTime: 10 * 60 * 1000, // 10 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    retry: 1
  });

  // Memoized result to prevent unnecessary re-renders
  return useMemo(() => {
    // Development bypass: Use super_admin role while loading for bypass user
    let defaultRole: UserRole = 'user';
    if (import.meta.env.DEV && (globalThis as any).__devBypassActive && user?.id === 'd6a2a926-4884-4f92-88d1-1539ea12729a') {
      defaultRole = 'super_admin';
    }

    return {
      role: query.data?.role || defaultRole,
      organizations: query.data?.organizations || [],
      loading: query.isLoading
    };
  }, [query.data?.role, query.data?.organizations, query.isLoading, user?.id]);
}