import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useOptimizedUserRole } from './database/useOptimizedUserRole';
import { useOrganization } from '@/contexts/OrganizationContext';
import { useEffect, useRef } from 'react';
import { fetchUserDashboardData } from '@/lib/database-optimization';

interface DashboardStats {
  organizations: number;
  users: number;
  notifications: number;
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
  const { role, loading: roleLoading } = useOptimizedUserRole();
  const { currentOrganization, loading: orgLoading } = useOrganization();
  const isMountedRef = useRef(true);

  // Add cleanup on unmount
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const { data: stats, isLoading } = useQuery({
    queryKey: ['dashboard-stats-optimized', user?.id, role, currentOrganization?.id],
    queryFn: async (): Promise<Omit<DashboardStats, 'loading'>> => {
      if (!user) throw new Error('User not authenticated');
      
      // Check if component is still mounted before making requests
      if (!isMountedRef.current) {
        throw new Error('Component unmounted');
      }
      
      // Use the new optimized batch query system
      const dashboardData = await fetchUserDashboardData(
        user.id,
        currentOrganization?.id || null,
        role
      );

      return {
        organizations: dashboardData.organizations,
        users: dashboardData.users,
        notifications: dashboardData.notifications,
        feedback: dashboardData.feedback,
      };
    },
    enabled: !!user && !roleLoading && !orgLoading && (role !== 'admin' || !!currentOrganization) && isMountedRef.current,
    staleTime: 5 * 60 * 1000, // 5 minutes cache for better performance
    gcTime: 15 * 60 * 1000, // 15 minutes garbage collection
    retry: 1, // Reduce retries for faster sidebar
    retryDelay: 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: false, // Don't refetch on mount for faster sidebar
    refetchInterval: false, // Don't poll automatically
  });

  return {
    organizations: stats?.organizations || 0,
    users: stats?.users || 0,
    notifications: stats?.notifications || 0,
    feedback: stats?.feedback || 0,
    loading: isLoading || roleLoading || orgLoading,
  };
}