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
    return {
      role: query.data?.role || 'user',
      organizations: query.data?.organizations || [],
      loading: query.isLoading
    };
  }, [query.data?.role, query.data?.organizations, query.isLoading, user?.id]);
}