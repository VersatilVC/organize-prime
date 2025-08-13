import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/lib/auth-migration';
import { useOrganization } from '@/contexts/OrganizationContext';
import { useUserRole } from '@/hooks/useUserRole';
import { supabase } from '@/integrations/supabase/client';
import { useMemo } from 'react';

interface DashboardStats {
  organizations: number;
  users: number;
  notifications: number;
  files: number;
  feedback: number;
}

interface SystemOverviewStats {
  totalOrganizations: number;
  totalUsers: number;
  activeUsersLast30Days: number;
  pendingInvitations: number;
  totalFeedback: number;
  pendingFeedback: number;
  totalFiles: number;
  totalMemberships: number;
  organizationsByPlan: Record<string, number>;
}

export function useDashboardStats() {
  const { user } = useAuth();
  const { currentOrganization } = useOrganization();
  const { role, loading: roleLoading } = useUserRole();

  const queryKey = useMemo(() => [
    'dashboard-stats',
    user?.id,
    currentOrganization?.id,
    role
  ], [user?.id, currentOrganization?.id, role]);

  return useQuery({
    queryKey,
    queryFn: async (): Promise<DashboardStats> => {
      if (!user?.id) {
        throw new Error('User not available');
      }

      const { data, error } = await supabase.rpc('get_dashboard_stats', {
        p_user_id: user.id,
        p_organization_id: currentOrganization?.id || null,
        p_role: role || null
      });

      if (error) throw error;

      const result = data as any;
      return {
        organizations: result?.organizations_count || 0,
        users: result?.users_count || 0,
        notifications: result?.notifications_count || 0,
        files: result?.files_count || 0,
        feedback: result?.feedback_count || 0
      };
    },
    enabled: !!user?.id && !roleLoading,
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: true
  });
}

export function useSystemStats() {
  const { user } = useAuth();
  const { role, loading: roleLoading } = useUserRole();

  const queryKey = useMemo(() => [
    'system-stats',
    user?.id
  ], [user?.id]);

  return useQuery({
    queryKey,
    queryFn: async (): Promise<SystemOverviewStats> => {
      if (!user?.id) {
        throw new Error('User not available');
      }

      const { data, error } = await supabase.rpc('get_system_stats');

      if (error) throw error;

      const result = data as any;
      return {
        totalOrganizations: result?.total_organizations || 0,
        totalUsers: result?.total_users || 0,
        activeUsersLast30Days: result?.active_users_30_days || 0,
        pendingInvitations: result?.pending_invitations || 0,
        totalFeedback: result?.total_feedback || 0,
        pendingFeedback: result?.pending_feedback || 0,
        totalFiles: result?.total_files || 0,
        totalMemberships: result?.total_memberships || 0,
        organizationsByPlan: result?.organizations_by_plan || {}
      };
    },
    enabled: !!user?.id && role === 'super_admin' && !roleLoading,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    refetchOnWindowFocus: true
  });
}

export function useOrganizationStats(organizationId?: string) {
  const { user } = useAuth();
  const { currentOrganization } = useOrganization();
  const { role, loading: roleLoading } = useUserRole();

  const targetOrgId = organizationId || currentOrganization?.id;

  const queryKey = useMemo(() => [
    'organization-stats',
    user?.id,
    targetOrgId
  ], [user?.id, targetOrgId]);

  return useQuery({
    queryKey,
    queryFn: async () => {
      if (!user?.id || !targetOrgId) {
        throw new Error('User or organization not available');
      }

      const [
        membershipsResult,
        filesResult,
        feedbackResult,
        invitationsResult
      ] = await Promise.all([
        supabase
          .from('memberships')
          .select('id', { count: 'exact' })
          .eq('organization_id', targetOrgId)
          .eq('status', 'active'),
        supabase
          .from('files')
          .select('id', { count: 'exact' })
          .eq('organization_id', targetOrgId),
        supabase
          .from('feedback')
          .select('id', { count: 'exact' })
          .eq('organization_id', targetOrgId),
        supabase
          .from('invitations')
          .select('id', { count: 'exact' })
          .eq('organization_id', targetOrgId)
          .is('accepted_at', null)
      ]);

      return {
        members: membershipsResult.count || 0,
        files: filesResult.count || 0,
        feedback: feedbackResult.count || 0,
        pendingInvitations: invitationsResult.count || 0
      };
    },
    enabled: !!user?.id && !!targetOrgId && (role === 'admin' || role === 'super_admin') && !roleLoading,
    staleTime: 3 * 60 * 1000, // 3 minutes
    gcTime: 10 * 60 * 1000 // 10 minutes
  });
}