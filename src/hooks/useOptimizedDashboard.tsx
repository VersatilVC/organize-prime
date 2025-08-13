import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth-migration';
import { useUserRole } from './useUserRole';
import { useOrganization } from '@/contexts/OrganizationContext';

interface DashboardData {
  stats: {
    totalUsers: number;
    activeUsers: number;
    pendingInvitations: number;
    totalFeedback: number;
  };
  recent_activity: Array<{
    id: string;
    action: string;
    resource_type: string;
    created_at: string;
    user_name: string;
    details: any;
  }>;
  notifications: {
    unread_count: number;
    latest: Array<{
      id: string;
      title: string;
      message: string;
      created_at: string;
      type: string;
    }>;
  };
  quick_stats: {
    files_uploaded_today: number;
    feedback_pending: number;
    active_users_week: number;
    storage_used_mb: number;
  };
  generated_at: string;
}

export function useOptimizedDashboard() {
  const { user } = useAuth();
  const { role, loading: roleLoading } = useUserRole();
  const { currentOrganization, loading: orgLoading } = useOrganization();

  const { data, isLoading, error } = useQuery({
    queryKey: ['dashboard-data-batch', user?.id, role, currentOrganization?.id],
    queryFn: async (): Promise<DashboardData> => {
      if (!user) throw new Error('User not authenticated');
      
      const { data, error } = await supabase.rpc('get_dashboard_data_batch', {
        p_user_id: user.id,
        p_organization_id: currentOrganization?.id || '',
        p_is_super_admin: role === 'super_admin'
      });

      if (error) throw error;
      
      return typeof data === 'string' ? JSON.parse(data) : data;
    },
    enabled: !!user && !roleLoading && !orgLoading && (role !== 'admin' || !!currentOrganization),
    staleTime: 1 * 60 * 1000, // 1 minute cache for dashboard data
    gcTime: 5 * 60 * 1000, // 5 minutes garbage collection
    retry: 2,
    retryDelay: 1000,
    refetchOnWindowFocus: false,
    refetchInterval: 3 * 60 * 1000, // Refetch every 3 minutes
  });

  return {
    data,
    isLoading: isLoading || roleLoading || orgLoading,
    error,
    stats: data?.stats,
    recentActivity: data?.recent_activity || [],
    notifications: data?.notifications,
    quickStats: data?.quick_stats,
  };
}