import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { usePagePerformance } from '@/lib/performance';

export function PagePerformanceTracker() {
  const { pathname } = useLocation();

  // Track page performance on every route change
  usePagePerformance(pathname || 'unknown');

  // Optionally, set document title for better analytics grouping
  useEffect(() => {
    // No-op for now; placeholder if we want to map paths to titles
  }, [pathname]);

  return null;
}
