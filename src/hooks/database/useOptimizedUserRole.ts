import { useQuery } from '@tanstack/react-query';
import { useSimpleAuth } from '@/contexts/SimpleAuthContext';
import { useOrganization } from '@/contexts/OrganizationContext';
import { supabase } from '@/integrations/supabase/client';
import { useMemo } from 'react';

interface UserRoleData {
  role: string;
  isSuperAdmin: boolean;
  isOrgAdmin: boolean;
  permissions: string[];
}

export function useOptimizedUserRole() {
  const { user } = useSimpleAuth();
  const { currentOrganization } = useOrganization();

  // Memoized query key for optimal caching
  const queryKey = useMemo(() => [
    'user-role',
    user?.id,
    currentOrganization?.id
  ], [user?.id, currentOrganization?.id]);

  const query = useQuery({
    queryKey,
    queryFn: async (): Promise<UserRoleData> => {
      if (!user?.id) {
        throw new Error('User not authenticated');
      }

      // Get user profile and super admin status
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('is_super_admin')
        .eq('id', user.id)
        .maybeSingle();

      if (profileError) throw profileError;

      const isSuperAdmin = profile?.is_super_admin || false;

      // If super admin, return with highest permissions
      if (isSuperAdmin) {
        return {
          role: 'super_admin',
          isSuperAdmin: true,
          isOrgAdmin: false,
          permissions: ['read', 'write', 'admin', 'super_admin']
        };
      }

      // Get organization membership if org is selected
      if (currentOrganization?.id) {
        const { data: membership, error: membershipError } = await supabase
          .from('memberships')
          .select('role')
          .eq('user_id', user.id)
          .eq('organization_id', currentOrganization.id)
          .eq('status', 'active')
          .maybeSingle();

        if (membershipError) throw membershipError;

        const role = membership?.role || 'user';
        const isOrgAdmin = role === 'admin';

        return {
          role,
          isSuperAdmin: false,
          isOrgAdmin,
          permissions: isOrgAdmin ? ['read', 'write', 'admin'] : ['read']
        };
      }

      // Default to user role if no organization selected
      return {
        role: 'user',
        isSuperAdmin: false,
        isOrgAdmin: false,
        permissions: ['read']
      };
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000, // 5 minutes - role changes are infrequent
    gcTime: 15 * 60 * 1000, // 15 minutes
    refetchOnWindowFocus: false, // Don't refetch on window focus for roles
    retry: 3
  });

  // Memoized helper functions
  const hasPermission = useMemo(() => (permission: string) => {
    return query.data?.permissions.includes(permission) || false;
  }, [query.data?.permissions]);

  const canManageUsers = useMemo(() => {
    return query.data?.role === 'admin' || query.data?.role === 'super_admin';
  }, [query.data?.role]);

  const canManageOrganization = useMemo(() => {
    return query.data?.role === 'admin' || query.data?.role === 'super_admin';
  }, [query.data?.role]);

  const canAccessSystemSettings = useMemo(() => {
    return query.data?.role === 'super_admin';
  }, [query.data?.role]);

  return {
    ...query,
    role: query.data?.role || 'user',
    isSuperAdmin: query.data?.isSuperAdmin || false,
    isOrgAdmin: query.data?.isOrgAdmin || false,
    permissions: query.data?.permissions || [],
    hasPermission,
    canManageUsers,
    canManageOrganization,
    canAccessSystemSettings,
    // Backward compatibility
    loading: query.isLoading
  };
}