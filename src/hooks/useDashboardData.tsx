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

interface OptimizedStats {
  totalUsers: number;
  activeUsers: number;
  pendingInvitations: number;
  totalFeedback: number;
}

const getDashboardStats = async (organizationId: string, userId: string, isSuperAdmin: boolean): Promise<OptimizedStats> => {
  try {
    // Use optimized RPC call for better performance
    const { data, error } = await supabase.rpc('get_dashboard_stats_optimized', {
      p_organization_id: organizationId,
      p_user_id: userId,
      p_is_super_admin: isSuperAdmin
    });

    if (error) throw error;
    
    // Parse the JSON response
    const parsedData = typeof data === 'string' ? JSON.parse(data) : data;
    return parsedData as OptimizedStats;
  } catch (error) {
    console.error('Dashboard stats error:', error);
    return {
      totalUsers: 0,
      activeUsers: 0,
      pendingInvitations: 0,
      totalFeedback: 0
    };
  }
};

export function useDashboardData(): DashboardStats {
  const { user } = useAuth();
  const { role, loading: roleLoading } = useUserRole();
  const { currentOrganization, loading: orgLoading } = useOrganization();

  const { data: stats, isLoading } = useQuery({
    queryKey: ['dashboard-stats-optimized', user?.id, role, currentOrganization?.id],
    queryFn: async (): Promise<Omit<DashboardStats, 'loading'>> => {
      if (!user) throw new Error('User not authenticated');
      
      // Use optimized RPC function
      const optimizedStats = await getDashboardStats(
        currentOrganization?.id || '', 
        user.id, 
        role === 'super_admin'
      );

      // Get additional counts that aren't in the optimized function
      let organizationsCount = 0;
      let notificationsCount = 0;
      let filesCount = 0;

      if (role === 'super_admin') {
        const [orgsResult, notificationsResult, filesResult] = await Promise.all([
          supabase.from('organizations').select('*', { count: 'exact', head: true }),
          supabase.from('notifications').select('*', { count: 'exact', head: true }).eq('read', false),
          supabase.from('files').select('*', { count: 'exact', head: true }),
        ]);

        organizationsCount = orgsResult.count || 0;
        notificationsCount = notificationsResult.count || 0;
        filesCount = filesResult.count || 0;

      } else if (role === 'admin' && currentOrganization) {
        const [notificationsResult, filesResult] = await Promise.all([
          supabase.from('notifications').select('*', { count: 'exact', head: true })
            .eq('user_id', user.id)
            .eq('read', false),
          supabase.from('files').select('*', { count: 'exact', head: true })
            .eq('organization_id', currentOrganization.id),
        ]);

        organizationsCount = 1;
        notificationsCount = notificationsResult.count || 0;
        filesCount = filesResult.count || 0;

      } else {
        const [orgsResult, notificationsResult, filesResult] = await Promise.all([
          supabase.from('memberships').select('*', { count: 'exact', head: true })
            .eq('user_id', user.id)
            .eq('status', 'active'),
          supabase.from('notifications').select('*', { count: 'exact', head: true })
            .eq('user_id', user.id)
            .eq('read', false),
          supabase.from('files').select('*', { count: 'exact', head: true })
            .eq('uploaded_by', user.id),
        ]);

        organizationsCount = orgsResult.count || 0;
        notificationsCount = notificationsResult.count || 0;
        filesCount = filesResult.count || 0;
      }

      return {
        organizations: organizationsCount,
        users: optimizedStats?.totalUsers || 0,
        notifications: notificationsCount,
        files: filesCount,
        feedback: optimizedStats?.totalFeedback || 0,
      };
    },
    enabled: !!user && !roleLoading && !orgLoading && (role !== 'admin' || !!currentOrganization),
    staleTime: 2 * 60 * 1000, // 2 minutes cache for better performance
    gcTime: 5 * 60 * 1000, // 5 minutes garbage collection
    retry: 2,
    retryDelay: 1000,
    refetchOnWindowFocus: false,
    refetchInterval: 5 * 60 * 1000, // Refetch every 5 minutes
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