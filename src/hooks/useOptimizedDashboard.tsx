import { useMemo } from 'react';
import { useQuery, useQueries } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/auth/AuthProvider';
import { useOptimizedUserRole } from '@/hooks/database/useOptimizedUserRole';
import { useOrganization } from '@/contexts/OrganizationContext';
import { queryKeys } from '@/lib/optimized-query-client';

// Optimized dashboard hook with parallel data loading
export function useOptimizedDashboard() {
  const { user } = useAuth();
  const { role } = useOptimizedUserRole();
  const { currentOrganization } = useOrganization();

  // Parallel queries for maximum performance
  const results = useQueries({
    queries: [
      // Core dashboard stats (highest priority)
      {
        queryKey: queryKeys.dashboardCore(user?.id || '', role),
        queryFn: async () => {
          if (!user?.id) return null;
          
          const { data, error } = await supabase.rpc('get_dashboard_stats', {
            p_user_id: user.id,
            p_organization_id: currentOrganization?.id || null,
            p_role: role || null
          });
          
          if (error) throw error;
          return typeof data === 'string' ? JSON.parse(data) : data;
        },
        enabled: !!user?.id && !!role,
        staleTime: 2 * 60 * 1000, // 2 minutes
        refetchInterval: 5 * 60 * 1000, // Refresh every 5 minutes
      },
      
      // Notifications (medium priority)
      {
        queryKey: queryKeys.dashboardNotifications(user?.id || ''),
        queryFn: async () => {
          if (!user) return [];
          
          const { data, error } = await supabase
            .from('notifications')
            .select('id, title, message, type, read, created_at')
            .eq('user_id', user.id)
            .eq('read', false)
            .order('created_at', { ascending: false })
            .limit(5);
          
          if (error) throw error;
          return data || [];
        },
        enabled: !!user,
        staleTime: 30 * 1000, // 30 seconds
      },
      
      // Organization stats (lower priority)
      {
        queryKey: queryKeys.dashboardStats(currentOrganization?.id),
        queryFn: async () => {
          if (!currentOrganization?.id || !user?.id) return null;
          
          const { data, error } = await supabase.rpc('get_organization_users_optimized', {
            p_organization_id: currentOrganization.id,
            p_limit: 5,
            p_offset: 0
          });
          
          if (error) throw error;
          return data;
        },
        enabled: !!currentOrganization?.id && !!user?.id,
        staleTime: 5 * 60 * 1000, // 5 minutes
      },
    ],
  });

  const [coreStatsQuery, notificationsQuery, orgStatsQuery] = results;

  // Memoize derived data to prevent unnecessary recalculations
  const derivedData = useMemo(() => {
    const coreStats = coreStatsQuery.data;
    const notifications = notificationsQuery.data || [];
    const orgStats = orgStatsQuery.data;

    return {
      // Core metrics
      stats: coreStats,
      
      // Notification data
      notifications,
      unreadCount: notifications.length,
      
      // Organization data
      organizationStats: orgStats,
      
      // Loading states
      isCoreLoading: coreStatsQuery.isLoading,
      isNotificationsLoading: notificationsQuery.isLoading,
      isOrgStatsLoading: orgStatsQuery.isLoading,
      
      // Overall loading state (only core is required)
      isLoading: coreStatsQuery.isLoading,
      
      // Error states
      hasError: coreStatsQuery.isError || notificationsQuery.isError || orgStatsQuery.isError,
      errors: {
        core: coreStatsQuery.error,
        notifications: notificationsQuery.error,
        org: orgStatsQuery.error,
      },
      
      // Data readiness flags
      isCoreReady: !coreStatsQuery.isLoading && !!coreStats,
      isNotificationsReady: !notificationsQuery.isLoading,
      isOrgStatsReady: !orgStatsQuery.isLoading,
      isFullyLoaded: results.every(query => !query.isLoading),
    };
  }, [results, coreStatsQuery.data, notificationsQuery.data, orgStatsQuery.data]);

  return derivedData;
}