import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/auth/AuthProvider';
import { useOrganization } from '@/contexts/OrganizationContext';
import { supabase } from '@/integrations/supabase/client';
import { useMemo } from 'react';
import * as React from 'react';

interface UserRoleData {
  role: string;
  isSuperAdmin: boolean;
  isOrgAdmin: boolean;
  permissions: string[];
}

export function useOptimizedUserRole() {
  const { user } = useAuth();
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
    staleTime: 15 * 60 * 1000, // 15 minutes - roles rarely change
    gcTime: 60 * 60 * 1000, // 1 hour - keep in cache longer for faster loads
    refetchOnWindowFocus: false, // Don't refetch on window focus
    refetchOnMount: false, // Don't refetch on every component mount
    refetchOnReconnect: false, // Don't refetch on network reconnect
    refetchInterval: false, // Don't refetch periodically
    retry: 1, // Reduce retries to prevent loops
    initialData: () => {
      // Return cached data immediately if available
      return undefined;
    }
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

  // Create stable fallbacks to prevent role switching
  const stableRole = React.useMemo(() => {
    if (query.isLoading && !query.data) return 'user'; // Loading state
    return query.data?.role || 'user';
  }, [query.data?.role, query.isLoading]);

  const stableIsSuperAdmin = React.useMemo(() => {
    if (query.isLoading && !query.data) return false;
    return query.data?.isSuperAdmin || false;
  }, [query.data?.isSuperAdmin, query.isLoading]);

  return {
    ...query,
    role: stableRole,
    isSuperAdmin: stableIsSuperAdmin,
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