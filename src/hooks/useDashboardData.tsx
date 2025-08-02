import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useUserRole } from './useUserRole';
import { useOrganization } from '@/contexts/OrganizationContext';

interface DashboardStats {
  organizations: number;
  users: number;
  notifications: number;
  files: number;
  feedback: number;
  loading: boolean;
}

export function useDashboardData(): DashboardStats {
  const { user } = useAuth();
  const { role, loading: roleLoading } = useUserRole();
  const { currentOrganization, loading: orgLoading } = useOrganization();

  const { data: stats, isLoading } = useQuery({
    queryKey: ['dashboard-stats', user?.id, role, currentOrganization?.id],
    queryFn: async (): Promise<Omit<DashboardStats, 'loading'>> => {
      if (!user) throw new Error('User not authenticated');
      
      let organizationsCount = 0;
      let usersCount = 0;
      let notificationsCount = 0;
      let filesCount = 0;
      let feedbackCount = 0;

      if (role === 'super_admin') {
        // Optimized single batch query for super admin
        const [orgsResult, usersResult, notificationsResult, filesResult, feedbackResult] = await Promise.all([
          supabase.from('organizations').select('*', { count: 'exact', head: true }),
          supabase.from('profiles').select('*', { count: 'exact', head: true }),
          supabase.from('notifications').select('*', { count: 'exact', head: true }).eq('read', false),
          supabase.from('files').select('*', { count: 'exact', head: true }),
          supabase.from('feedback').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
        ]);

        organizationsCount = orgsResult.count || 0;
        usersCount = usersResult.count || 0;
        notificationsCount = notificationsResult.count || 0;
        filesCount = filesResult.count || 0;
        feedbackCount = feedbackResult.count || 0;

      } else if (role === 'admin' && currentOrganization) {
        // Optimized batch query for admin
        const [membershipsResult, invitationsResult, notificationsResult, filesResult, feedbackResult] = await Promise.all([
          supabase.from('memberships').select('*', { count: 'exact', head: true })
            .eq('organization_id', currentOrganization.id)
            .eq('status', 'active'),
          supabase.from('invitations').select('*', { count: 'exact', head: true })
            .eq('organization_id', currentOrganization.id)
            .is('accepted_at', null),
          supabase.from('notifications').select('*', { count: 'exact', head: true })
            .eq('user_id', user.id)
            .eq('read', false),
          supabase.from('files').select('*', { count: 'exact', head: true })
            .eq('organization_id', currentOrganization.id),
          supabase.from('feedback').select('*', { count: 'exact', head: true })
            .eq('organization_id', currentOrganization.id)
            .eq('status', 'pending'),
        ]);

        organizationsCount = 1;
        usersCount = membershipsResult.count || 0;
        notificationsCount = notificationsResult.count || 0;
        filesCount = filesResult.count || 0;
        feedbackCount = feedbackResult.count || 0;

      } else {
        // Optimized batch query for regular users
        const [orgsResult, notificationsResult, filesResult, feedbackResult] = await Promise.all([
          supabase.from('memberships').select('*', { count: 'exact', head: true })
            .eq('user_id', user.id)
            .eq('status', 'active'),
          supabase.from('notifications').select('*', { count: 'exact', head: true })
            .eq('user_id', user.id)
            .eq('read', false),
          supabase.from('files').select('*', { count: 'exact', head: true })
            .eq('uploaded_by', user.id),
          supabase.from('feedback').select('*', { count: 'exact', head: true })
            .eq('user_id', user.id),
        ]);

        organizationsCount = orgsResult.count || 0;
        usersCount = 0;
        notificationsCount = notificationsResult.count || 0;
        filesCount = filesResult.count || 0;
        feedbackCount = feedbackResult.count || 0;
      }

      return {
        organizations: organizationsCount,
        users: usersCount,
        notifications: notificationsCount,
        files: filesCount,
        feedback: feedbackCount,
      };
    },
    enabled: !!user && !roleLoading && !orgLoading && (role !== 'admin' || !!currentOrganization),
    staleTime: 5 * 60 * 1000, // 5 minutes cache
    retry: 2,
    retryDelay: 1000,
  });

  return {
    organizations: stats?.organizations || 0,
    users: stats?.users || 0,
    notifications: stats?.notifications || 0,
    files: stats?.files || 0,
    feedback: stats?.feedback || 0,
    loading: isLoading || roleLoading || orgLoading,
  };
}