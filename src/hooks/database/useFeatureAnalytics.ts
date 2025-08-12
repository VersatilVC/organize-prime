import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { FeatureAnalytics, FeatureUsageStats } from '@/types/feature-templates';

export function useFeatureAnalytics() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: analytics = [], isLoading } = useQuery({
    queryKey: ['feature-analytics'],
    queryFn: async (): Promise<FeatureAnalytics[]> => {
      const { data, error } = await supabase
        .from('feature_analytics')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1000);

      if (error) {
        console.error('Error fetching feature analytics:', error);
        throw new Error('Failed to fetch feature analytics');
      }

      return data || [];
    },
  });

  const getFeatureUsageStats = useQuery({
    queryKey: ['feature-usage-stats'],
    queryFn: async (): Promise<FeatureUsageStats[]> => {
      const { data, error } = await supabase.rpc('get_feature_usage_stats');

      if (error) {
        console.error('Error fetching feature usage stats:', error);
        throw new Error('Failed to fetch feature usage stats');
      }

      return data || [];
    },
  });

  const trackEventMutation = useMutation({
    mutationFn: async ({
      feature_slug,
      event_type,
      event_data = {},
      organization_id,
    }: {
      feature_slug: string;
      event_type: FeatureAnalytics['event_type'];
      event_data?: Record<string, any>;
      organization_id?: string;
    }) => {
      const { data: user } = await supabase.auth.getUser();
      
      const { data, error } = await supabase
        .from('feature_analytics')
        .insert({
          feature_slug,
          event_type,
          event_data,
          organization_id,
          user_id: user.user?.id || null,
          ip_address: null, // Will be populated by database trigger
          user_agent: navigator.userAgent,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      // Invalidate analytics queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['feature-analytics'] });
      queryClient.invalidateQueries({ queryKey: ['feature-usage-stats'] });
    },
    onError: (error) => {
      console.error('Failed to track analytics event:', error);
      // Don't show user-facing error for analytics failures
    },
  });

  const getAnalyticsByFeature = (featureSlug: string) => {
    return analytics.filter(event => event.feature_slug === featureSlug);
  };

  const getAnalyticsByOrganization = (organizationId: string) => {
    return analytics.filter(event => event.organization_id === organizationId);
  };

  const getEventCounts = (events: FeatureAnalytics[]) => {
    const counts = events.reduce((acc, event) => {
      acc[event.event_type] = (acc[event.event_type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      total: events.length,
      installs: counts.install || 0,
      uninstalls: counts.uninstall || 0,
      enables: counts.enable || 0,
      disables: counts.disable || 0,
      page_views: counts.page_view || 0,
      actions: counts.action_trigger || 0,
    };
  };

  const getUsageTrends = (events: FeatureAnalytics[], days: number = 30) => {
    const now = new Date();
    const startDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
    
    const recentEvents = events.filter(event => 
      new Date(event.created_at) >= startDate
    );

    const dailyUsage = new Map<string, number>();
    
    // Initialize all days with 0
    for (let i = 0; i < days; i++) {
      const date = new Date(startDate.getTime() + i * 24 * 60 * 60 * 1000);
      const dateKey = date.toISOString().split('T')[0];
      dailyUsage.set(dateKey, 0);
    }

    // Count events by day
    recentEvents.forEach(event => {
      const dateKey = event.created_at.split('T')[0];
      dailyUsage.set(dateKey, (dailyUsage.get(dateKey) || 0) + 1);
    });

    return Array.from(dailyUsage.entries()).map(([date, count]) => ({
      date,
      count,
    }));
  };

  return {
    analytics,
    usageStats: getFeatureUsageStats.data || [],
    isLoading: isLoading || getFeatureUsageStats.isLoading,
    trackEvent: trackEventMutation.mutate,
    isTracking: trackEventMutation.isPending,
    getAnalyticsByFeature,
    getAnalyticsByOrganization,
    getEventCounts,
    getUsageTrends,
  };
}