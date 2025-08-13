import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth-migration';
import { useOrganization } from '@/contexts/OrganizationContext';
import { useUserRole } from './useUserRole';
import { useToast } from './use-toast';

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
  organization_id?: string | null;
  organization_name?: string | null;
}

interface UsersQueryResult {
  users: UserWithMembership[];
  totalCount: number;
}

interface UseUsersQueryOptions {
  page?: number;
  pageSize?: number;
  search?: string;
}

export function useUsersQuery({ page = 0, pageSize = 50, search }: UseUsersQueryOptions = {}) {
  const { user } = useAuth();
  const { currentOrganization } = useOrganization();
  const { role, loading: roleLoading } = useUserRole();

  return useQuery({
    queryKey: ['users', user?.id, currentOrganization?.id, role, page, pageSize, search],
    queryFn: async (): Promise<UsersQueryResult> => {
      if (!user) throw new Error('User not authenticated');
      
      const { data, error } = await supabase.rpc('get_users_optimized', {
        p_user_id: user.id,
        p_organization_id: currentOrganization?.id || null,
        p_role: role,
        p_page: page,
        p_page_size: pageSize,
        p_search: search || null,
      });

      if (error) throw error;

      const users = (data || []).map((row: any) => ({
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
        organization_name: row.organization_name,
      }));

      const totalCount = data?.[0]?.total_count || 0;

      return { users, totalCount };
    },
    enabled: !!user && !roleLoading && (role === 'admin' || role === 'super_admin'),
    staleTime: 2 * 60 * 1000, // 2 minutes
    retry: 2,
  });
}

export function useUpdateUserMutation() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();
  const { currentOrganization } = useOrganization();
  const { role } = useUserRole();

  return useMutation({
    mutationFn: async ({ 
      userId, 
      updates 
    }: { 
      userId: string; 
      updates: { full_name?: string; username?: string; role?: string } 
    }) => {
      // Update profile
      if (updates.full_name !== undefined || updates.username !== undefined) {
        const { error: profileError } = await supabase
          .from('profiles')
          .update({
            ...(updates.full_name !== undefined && { full_name: updates.full_name }),
            ...(updates.username !== undefined && { username: updates.username }),
          })
          .eq('id', userId);

        if (profileError) throw profileError;
      }

      // Update membership role if changed
      if (updates.role !== undefined) {
        const { data: memberships, error: membershipFindError } = await supabase
          .from('memberships')
          .select('id')
          .eq('user_id', userId)
          .eq('status', 'active')
          .limit(1);

        if (membershipFindError) throw membershipFindError;

        if (memberships && memberships.length > 0) {
          const { error: membershipError } = await supabase
            .from('memberships')
            .update({ role: updates.role })
            .eq('id', memberships[0].id);

          if (membershipError) throw membershipError;
        }
      }

      return { userId, updates };
    },
    onMutate: async ({ userId, updates }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ 
        queryKey: ['users', user?.id, currentOrganization?.id, role] 
      });

      // Get current data
      const queryKey = ['users', user?.id, currentOrganization?.id, role, 0, 50, undefined];
      const previousData = queryClient.getQueryData<UsersQueryResult>(queryKey);

      // Optimistically update
      if (previousData) {
        const optimisticData = {
          ...previousData,
          users: previousData.users.map(u => 
            u.user_id === userId 
              ? { 
                  ...u, 
                  ...(updates.full_name !== undefined && { full_name: updates.full_name }),
                  ...(updates.username !== undefined && { username: updates.username }),
                  ...(updates.role !== undefined && { role: updates.role }),
                }
              : u
          ),
        };
        queryClient.setQueryData(queryKey, optimisticData);
      }

      return { previousData, queryKey };
    },
    onError: (error, variables, context) => {
      // Revert optimistic update
      if (context?.previousData) {
        queryClient.setQueryData(context.queryKey, context.previousData);
      }
      
      toast({
        title: "Error",
        description: "Failed to update user",
        variant: "destructive",
      });
    },
    onSuccess: () => {
      toast({
        title: "User Updated",
        description: "User has been updated successfully.",
      });
    },
    onSettled: () => {
      // Invalidate and refetch
      queryClient.invalidateQueries({ 
        queryKey: ['users', user?.id, currentOrganization?.id, role] 
      });
    },
  });
}

export function useDeleteUserMutation() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();
  const { currentOrganization } = useOrganization();
  const { role } = useUserRole();

  return useMutation({
    mutationFn: async (userId: string) => {
      const { error } = await supabase
        .from('memberships')
        .update({ status: 'inactive' })
        .eq('user_id', userId);

      if (error) throw error;
      return userId;
    },
    onMutate: async (userId) => {
      await queryClient.cancelQueries({ 
        queryKey: ['users', user?.id, currentOrganization?.id, role] 
      });

      const queryKey = ['users', user?.id, currentOrganization?.id, role, 0, 50, undefined];
      const previousData = queryClient.getQueryData<UsersQueryResult>(queryKey);

      if (previousData) {
        const optimisticData = {
          ...previousData,
          users: previousData.users.filter(u => u.user_id !== userId),
          totalCount: previousData.totalCount - 1,
        };
        queryClient.setQueryData(queryKey, optimisticData);
      }

      return { previousData, queryKey };
    },
    onError: (error, variables, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(context.queryKey, context.previousData);
      }
      
      toast({
        title: "Error",
        description: "Failed to remove user",
        variant: "destructive",
      });
    },
    onSuccess: (userId, variables, context) => {
      const userData = context?.previousData?.users.find(u => u.user_id === userId);
      toast({
        title: "User Removed",
        description: `${userData?.full_name || userData?.username} has been removed from the organization.`,
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ 
        queryKey: ['users', user?.id, currentOrganization?.id, role] 
      });
    },
  });
}