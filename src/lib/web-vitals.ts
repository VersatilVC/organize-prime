import { onCLS, onFID, onLCP, onINP, onTTFB, type Metric } from 'web-vitals';
import { PerformanceMonitor } from '@/lib/performance';
import { getAnalyticsConfig } from '@/config/app-config';

export type WebVitalName = 'LCP' | 'FID' | 'CLS' | 'INP' | 'TTFB';

const unitMap: Record<WebVitalName, string> = {
  LCP: 'ms',
  FID: 'ms',
  CLS: 'unitless',
  INP: 'ms',
  TTFB: 'ms',
};

export function initWebVitals(): void {
  if (typeof window === 'undefined') return;

  const { enablePerformanceMonitoring, sampleRate = 1 } = getAnalyticsConfig();
  if (!enablePerformanceMonitoring) return;

  const sampled = Math.random() <= sampleRate;
  if (!sampled) return;

  const perf = PerformanceMonitor.getInstance();

  const report = (metric: Metric) => {
    const name = metric.name as WebVitalName;
    const unit = unitMap[name] || 'ms';
    perf.reportCustom('web_vital', {
      name,
      value: metric.value,
      delta: metric.delta,
      id: metric.id,
      rating: (metric as any).rating,
      unit,
      navigationType: (performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined)?.type,
    });
  };

  // Report only the final value for each metric
  onLCP(report);
  onFID(report);
  onCLS(report);
  onINP(report);
  onTTFB(report);
}
