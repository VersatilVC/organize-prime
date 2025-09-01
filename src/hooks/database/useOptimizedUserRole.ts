import { useAuth } from '@/auth/AuthProvider';
import { useOrganization } from '@/contexts/OrganizationContext';
import { useImpersonation } from '@/contexts/ImpersonationContext';
import { supabase, withRetry, cacheManager } from '@/integrations/supabase/client';
import { useMemo } from 'react';
import { useResilientQuery } from './useResilientQuery';
import { getUserRoleInOrganization } from '@/services/superAdminService';

interface UserRoleData {
  role: string;
  isSuperAdmin: boolean;
  isOrgAdmin: boolean;
  permissions: string[];
}

export function useOptimizedUserRole() {
  const { user } = useAuth();
  const { currentOrganization } = useOrganization();
  const { impersonationState } = useImpersonation();

  // Determine the effective user ID and organization for role lookup
  const effectiveUserId = impersonationState.isImpersonating 
    ? impersonationState.impersonatedUser?.id || user?.id
    : user?.id;
  
  const effectiveOrganizationId = impersonationState.isImpersonating
    ? impersonationState.impersonatedOrganization?.id || currentOrganization?.id
    : currentOrganization?.id;

  // Memoized query key for optimal caching
  const queryKey = useMemo(() => [
    'user-role',
    effectiveUserId,
    effectiveOrganizationId,
    impersonationState.isImpersonating ? 'impersonating' : 'normal'
  ], [effectiveUserId, effectiveOrganizationId, impersonationState.isImpersonating]);

  const query = useResilientQuery({
    queryKey,
    queryFn: async (): Promise<UserRoleData> => {
      if (!effectiveUserId) {
        throw new Error('User not authenticated');
      }

      return await withRetry(async () => {
        // If we're impersonating, we need to get the role of the impersonated user
        // but the real user must be a super admin to perform impersonation
        if (impersonationState.isImpersonating) {
          // Verify that the actual logged-in user is a super admin
          const { data: actualUserProfile, error: actualUserError } = await supabase
            .from('profiles')
            .select('is_super_admin')
            .eq('id', user?.id)
            .maybeSingle();

          if (actualUserError || !actualUserProfile?.is_super_admin) {
            throw new Error('Unauthorized impersonation attempt');
          }

          // Get the impersonated user's role in the target organization
          if (effectiveOrganizationId) {
            const roleData = await getUserRoleInOrganization(effectiveUserId, effectiveOrganizationId);
            return {
              role: roleData.role,
              isSuperAdmin: roleData.isSuperAdmin,
              isOrgAdmin: roleData.isOrgAdmin,
              permissions: roleData.isSuperAdmin 
                ? ['read', 'write', 'admin', 'super_admin']
                : roleData.isOrgAdmin
                  ? ['read', 'write', 'admin']
                  : ['read']
            };
          }
        }

        // Normal flow (not impersonating)
        // Get user profile and super admin status
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('is_super_admin')
          .eq('id', effectiveUserId)
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
        if (effectiveOrganizationId) {
          const { data: membership, error: membershipError } = await supabase
            .from('memberships')
            .select('role')
            .eq('user_id', effectiveUserId)
            .eq('organization_id', effectiveOrganizationId)
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
      });
    },
    cacheKey: `user-role-${effectiveUserId}-${effectiveOrganizationId}-${impersonationState.isImpersonating ? 'impersonating' : 'normal'}`,
    fallbackData: {
      role: 'user',
      isSuperAdmin: false,
      isOrgAdmin: false,
      permissions: ['read']
    },
    enabled: !!effectiveUserId,
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
  const stableRole = useMemo(() => {
    if (query.isLoading && !query.data) return 'user'; // Loading state
    return query.data?.role || 'user';
  }, [query.data?.role, query.isLoading]);

  const stableIsSuperAdmin = useMemo(() => {
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