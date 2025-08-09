import { useEffect } from 'react';
import { useUserData } from '@/contexts/AuthContext';
import { useOrganizationData } from '@/contexts/OrganizationContext';
import { AppAnalyticsService } from '@/apps/shared/services/AppAnalyticsService';
import { PerformanceMonitor } from '@/lib/performance';
import { initWebVitals } from '@/lib/web-vitals';
import { getAnalyticsConfig } from '@/config/app-config';

// Bridges PerformanceMonitor -> Supabase analytics sink
export function PerformanceSinkConnector() {
  const { user } = useUserData();
  const { currentOrganization } = useOrganizationData();

  useEffect(() => {
    const { enablePerformanceMonitoring } = getAnalyticsConfig();
    if (!enablePerformanceMonitoring) return;

    // Initialize precise Web Vitals collection (sampled inside)
    initWebVitals();

    const perf = PerformanceMonitor.getInstance();

    const sink = async (type: string, data: any) => {
      try {
        if (!user || !currentOrganization) return;
        const appId = 'core_platform';
        const orgId = currentOrganization.id;
        const userId = user.id;

        // Normalize metric/value/unit across events
        let metric = type;
        let value = 0;
        let unit = 'ms';
        const metadata: Record<string, any> = { ...data };

        switch (type) {
          case 'page_load':
            value = Number(data?.loadTime ?? 0);
            unit = 'ms';
            break;
          case 'route_change':
            value = Number(data?.duration ?? 0);
            unit = 'ms';
            break;
          case 'slow_render':
            value = Number(data?.renderTime ?? 0);
            unit = 'ms';
            break;
          case 'bundle_load':
            value = Number(data?.loadTime ?? 0);
            unit = 'ms';
            break;
          case 'user_interaction':
            value = Number(data?.duration ?? 0);
            unit = 'ms';
            break;
          case 'web_vitals': {
            // legacy aggregate { lcp, fid, cls }
            await Promise.all([
              AppAnalyticsService.trackPerformance(appId, orgId, userId, 'LCP', Number(data?.lcp ?? 0), 'ms', metadata),
              AppAnalyticsService.trackPerformance(appId, orgId, userId, 'FID', Number(data?.fid ?? 0), 'ms', metadata),
              AppAnalyticsService.trackPerformance(appId, orgId, userId, 'CLS', Number(data?.cls ?? 0), 'unitless', metadata),
            ]);
            return;
          }
          case 'web_vital': {
            metric = data?.name || 'web_vital';
            value = Number(data?.value ?? 0);
            unit = data?.unit || (metric === 'CLS' ? 'unitless' : 'ms');
            break;
          }
          default:
            // pass-through
            value = Number(data?.value ?? 0);
            unit = typeof data?.unit === 'string' ? data.unit : unit;
        }

        await AppAnalyticsService.trackPerformance(appId, orgId, userId, metric, value, unit, metadata);
      } catch (err) {
        // Never disrupt UI due to analytics
        if (import.meta.env.DEV) console.warn('Performance sink error', err);
      }
    };

    const unsubscribe = perf.registerSink(sink);
    return unsubscribe;
  }, [user, currentOrganization]);

  return null;
}
