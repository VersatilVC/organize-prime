import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/lib/auth-migration';
import { useOrganization } from '@/contexts/OrganizationContext';
import { useUserRole } from '@/hooks/useUserRole';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useMemo } from 'react';

export interface UserWithMembership {
  user_id: string;
  full_name: string | null;
  username: string | null;
  avatar_url: string | null;
  last_login_at: string | null;
  email?: string | null;
  role: string;
  status: string;
  joined_at: string | null;
  organization_id: string | null;
  organization_name: string | null;
}

interface UsersQueryResult {
  users: UserWithMembership[];
  totalCount: number;
}

interface UseOrganizationUsersOptions {
  page?: number;
  pageSize?: number;
  search?: string;
  organizationId?: string;
  enabled?: boolean;
}

export function useOrganizationUsers({
  page = 0,
  pageSize = 50,
  search,
  organizationId,
  enabled = true
}: UseOrganizationUsersOptions = {}) {
  const { user } = useAuth();
  const { currentOrganization } = useOrganization();
  const { role, loading: roleLoading } = useUserRole();
  const { toast } = useToast();

  // Use provided org ID or current organization
  const targetOrgId = organizationId || currentOrganization?.id;

  // Memoized query key for better caching
  const queryKey = useMemo(() => [
    'organization-users',
    user?.id,
    targetOrgId,
    page,
    pageSize,
    search
  ], [user?.id, targetOrgId, page, pageSize, search]);

  // Check if user has permission to view users
  const hasPermission = useMemo(() => {
    return role === 'super_admin' || role === 'admin';
  }, [role]);

  const query = useQuery({
    queryKey,
    queryFn: async (): Promise<UsersQueryResult> => {
      if (!user?.id || !targetOrgId) {
        throw new Error('User or organization not available');
      }

      const { data, error } = await supabase.rpc('get_users_optimized', {
        p_user_id: user.id,
        p_organization_id: targetOrgId,
        p_page: page,
        p_page_size: pageSize,
        p_search: search || null
      });

      if (error) throw error;

      if (!data || data.length === 0) {
        return { users: [], totalCount: 0 };
      }

      const users = data.map((row: any) => ({
        user_id: row.user_id,
        full_name: row.full_name,
        username: row.username,
        avatar_url: row.avatar_url,
        last_login_at: row.last_login_at,
        email: row.email,
        role: row.role,
        status: row.status,
        joined_at: row.joined_at,
        organization_id: row.organization_id,
        organization_name: row.organization_name
      }));

      return {
        users,
        totalCount: data[0]?.total_count || 0
      };
    },
    enabled: enabled && !!user?.id && !!targetOrgId && hasPermission && !roleLoading,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });

  return {
    ...query,
    users: query.data?.users || [],
    totalCount: query.data?.totalCount || 0,
    hasPermission,
    targetOrgId
  };
}

export function useUpdateUserMutation() {
  const { user } = useAuth();
  const { currentOrganization } = useOrganization();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      userId, 
      updates 
    }: { 
      userId: string; 
      updates: { full_name?: string; username?: string; role?: string } 
    }) => {
      if (!user?.id || !currentOrganization?.id) {
        throw new Error('User or organization not available');
      }

      const { data, error } = await supabase.rpc('update_user_profile_and_role', {
        p_user_id: userId,
        p_full_name: updates.full_name || null,
        p_username: updates.username || null,
        p_new_role: updates.role || null,
        p_organization_id: currentOrganization.id,
        p_requesting_user_id: user.id
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast({
        title: 'Success',
        description: 'User updated successfully',
      });
      
      // Invalidate related queries
      queryClient.invalidateQueries({ 
        queryKey: ['organization-users', user?.id, currentOrganization?.id] 
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: 'Failed to update user. Please try again.',
        variant: 'destructive',
      });
      console.error('User update error:', error);
    }
  });
}

export function useDeleteUserMutation() {
  const { user } = useAuth();
  const { currentOrganization } = useOrganization();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (userId: string) => {
      if (!user?.id || !currentOrganization?.id) {
        throw new Error('User or organization not available');
      }

      const { error } = await supabase
        .from('memberships')
        .update({ status: 'inactive' })
        .eq('user_id', userId)
        .eq('organization_id', currentOrganization.id);

      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: 'Success',
        description: 'User removed successfully',
      });
      
      // Invalidate related queries
      queryClient.invalidateQueries({ 
        queryKey: ['organization-users', user?.id, currentOrganization?.id] 
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: 'Failed to remove user. Please try again.',
        variant: 'destructive',
      });
      console.error('User delete error:', error);
    }
  });
}