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
      // For now, return empty array until database is updated
      return [];
    },
  });

  const getFeatureUsageStats = useQuery({
    queryKey: ['feature-usage-stats'],
    queryFn: async (): Promise<FeatureUsageStats[]> => {
      // For now, return empty array until database is updated
      return [];
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
      
      // For now, just return a mock response until database is updated
      return {
        id: 'mock-id',
        feature_slug,
        event_type,
        event_data,
        organization_id: organization_id || null,
        user_id: user.user?.id || null,
        ip_address: null,
        user_agent: navigator.userAgent,
        created_at: new Date().toISOString(),
      };
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