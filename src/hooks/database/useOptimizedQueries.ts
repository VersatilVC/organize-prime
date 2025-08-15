import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/auth/AuthProvider';
import { useOrganization } from '@/contexts/OrganizationContext';
import { cacheConfig, queryKeys } from '@/lib/query-client';
import { useToast } from '@/hooks/use-toast';


// ===== OPTIMIZED USER LIST HOOK =====

interface UseOptimizedUsersOptions {
  page?: number;
  pageSize?: number;
  search?: string;
  roleFilter?: string;
  statusFilter?: string;
}

export function useOptimizedUsers(options: UseOptimizedUsersOptions = {}) {
  const { user } = useAuth();
  const { currentOrganization } = useOrganization();
  const { 
    page = 1, 
    pageSize = 20, 
    search, 
    roleFilter, 
    statusFilter = 'active' 
  } = options;

  return useQuery({
    queryKey: queryKeys.organizationUsers(
      currentOrganization?.id || '', 
      page, 
      search || undefined
    ),
    queryFn: async () => {
      if (!user?.id || !currentOrganization?.id) {
        throw new Error('User or organization not available');
      }

      const { data, error } = await supabase.rpc('get_organization_users_optimized', {
        p_organization_id: currentOrganization.id,
        p_requesting_user_id: user.id,
        p_page: page,
        p_page_size: pageSize,
        p_search: search || null,
        p_role_filter: roleFilter || null,
        p_status_filter: statusFilter
      });

      if (error) throw error;
      return data;
    },
    enabled: !!(user?.id && currentOrganization?.id),
    ...cacheConfig.dynamic,
    keepPreviousData: true, // Smooth pagination
  });
}

// ===== OPTIMIZED FEEDBACK HOOK =====

interface UseOptimizedFeedbackOptions {
  page?: number;
  pageSize?: number;
  statusFilter?: string;
  priorityFilter?: string;
  typeFilter?: string;
}

export function useOptimizedFeedback(options: UseOptimizedFeedbackOptions = {}) {
  const { user } = useAuth();
  const { currentOrganization } = useOrganization();
  const { 
    page = 1, 
    pageSize = 20, 
    statusFilter, 
    priorityFilter, 
    typeFilter 
  } = options;

  return useQuery({
    queryKey: queryKeys.feedbackList(
      currentOrganization?.id, 
      page, 
      statusFilter
    ),
    queryFn: async () => {
      if (!user?.id || !currentOrganization?.id) {
        throw new Error('User or organization not available');
      }

      const { data, error } = await supabase.rpc('get_feedback_list_optimized', {
        p_organization_id: currentOrganization.id,
        p_requesting_user_id: user.id,
        p_page: page,
        p_page_size: pageSize,
        p_status_filter: statusFilter || null,
        p_priority_filter: priorityFilter || null,
        p_type_filter: typeFilter || null
      });

      if (error) throw error;
      return data;
    },
    enabled: !!(user?.id && currentOrganization?.id),
    ...cacheConfig.dynamic,
    keepPreviousData: true,
  });
}

// ===== OPTIMIZED KB SEARCH HOOK =====

interface UseOptimizedKBSearchOptions {
  query: string;
  kbConfigId?: string;
  limit?: number;
  enabled?: boolean;
}

export function useOptimizedKBSearch(options: UseOptimizedKBSearchOptions) {
  const { user } = useAuth();
  const { currentOrganization } = useOrganization();
  const { query, kbConfigId, limit = 20, enabled = true } = options;

  return useQuery({
    queryKey: ['kb-search', currentOrganization?.id, query, kbConfigId, limit],
    queryFn: async () => {
      if (!user?.id || !currentOrganization?.id || !query.trim()) {
        return { results: [], total_results: 0 };
      }

      const { data, error } = await supabase.rpc('search_kb_content_optimized', {
        p_organization_id: currentOrganization.id,
        p_user_id: user.id,
        p_search_query: query.trim(),
        p_kb_config_id: kbConfigId || null,
        p_limit: limit
      });

      if (error) throw error;
      return data;
    },
    enabled: !!(user?.id && currentOrganization?.id && query.trim() && enabled),
    ...cacheConfig.search,
    staleTime: 2 * 60 * 1000, // 2 minutes for search results
  });
}

// ===== OPTIMIZED NOTIFICATIONS HOOK =====

interface UseOptimizedNotificationsOptions {
  limit?: number;
  unreadOnly?: boolean;
}

export function useOptimizedNotifications(options: UseOptimizedNotificationsOptions = {}) {
  const { user } = useAuth();
  const { currentOrganization } = useOrganization();
  const { limit = 50, unreadOnly = false } = options;
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['notifications', user?.id, currentOrganization?.id, unreadOnly],
    queryFn: async () => {
      if (!user?.id) {
        throw new Error('User not available');
      }

      const { data, error } = await supabase.rpc('get_user_notifications_optimized', {
        p_user_id: user.id,
        p_organization_id: currentOrganization?.id || null,
        p_limit: limit,
        p_unread_only: unreadOnly
      });

      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
    ...cacheConfig.realtime,
  });

  // Mark notification as read mutation
  const markAsReadMutation = useMutation({
    mutationFn: async (notificationId: string) => {
      const { error } = await supabase
        .from('notifications')
        .update({ read: true, read_at: new Date().toISOString() })
        .eq('id', notificationId)
        .eq('user_id', user?.id);

      if (error) throw error;
    },
    onSuccess: () => {
      // Invalidate notifications to refresh count
      queryClient.invalidateQueries({ 
        queryKey: ['notifications', user?.id] 
      });
    },
  });

  // Mark all as read mutation
  const markAllAsReadMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('notifications')
        .update({ read: true, read_at: new Date().toISOString() })
        .eq('user_id', user?.id)
        .eq('read', false);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ 
        queryKey: ['notifications', user?.id] 
      });
    },
  });

  return {
    ...query,
    notifications: query.data?.notifications || [],
    unreadCount: query.data?.unread_count || 0,
    markAsRead: markAsReadMutation.mutate,
    markAllAsRead: markAllAsReadMutation.mutate,
    isMarkingAsRead: markAsReadMutation.isPending || markAllAsReadMutation.isPending,
  };
}

// ===== OPTIMIZED ANALYTICS HOOK =====

interface UseOptimizedAnalyticsOptions {
  featureSlug?: string;
  days?: number;
}

export function useOptimizedAnalytics(options: UseOptimizedAnalyticsOptions = {}) {
  const { user } = useAuth();
  const { currentOrganization } = useOrganization();
  const { featureSlug, days = 30 } = options;

  return useQuery({
    queryKey: ['analytics', currentOrganization?.id, featureSlug, days],
    queryFn: async () => {
      if (!user?.id || !currentOrganization?.id) {
        throw new Error('User or organization not available');
      }

      const { data, error } = await supabase.rpc('get_feature_analytics_optimized', {
        p_organization_id: currentOrganization.id,
        p_requesting_user_id: user.id,
        p_feature_slug: featureSlug || null,
        p_days: days
      });

      if (error) throw error;
      return data;
    },
    enabled: !!(user?.id && currentOrganization?.id),
    ...cacheConfig.computation, // Use computation cache for analytics
  });
}

// ===== BATCH INVALIDATION HELPER =====

export function useOptimizedInvalidation() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { currentOrganization } = useOrganization();

  return {
    invalidateAll: () => {
      queryClient.invalidateQueries();
    },
    invalidateDashboard: () => {
      queryClient.invalidateQueries({ 
        queryKey: queryKeys.dashboardStats(user?.id || '', currentOrganization?.id) 
      });
    },
    invalidateUsers: () => {
      queryClient.invalidateQueries({ 
        queryKey: queryKeys.organizationUsers(currentOrganization?.id || '') 
      });
    },
    invalidateFeedback: () => {
      queryClient.invalidateQueries({ 
        queryKey: queryKeys.feedbackList(currentOrganization?.id) 
      });
    },
    invalidateNotifications: () => {
      queryClient.invalidateQueries({ 
        queryKey: ['notifications', user?.id] 
      });
    },
  };
}