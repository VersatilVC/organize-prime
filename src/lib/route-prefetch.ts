// Lightweight route chunk prefetching to improve perceived nav speed
// Maps common route prefixes to their dynamic imports

const routeLoaders: Array<{ test: (path: string) => boolean; load: () => Promise<unknown> }> = [
  { test: (p) => p === '/' || p === '/dashboard', load: () => import('@/pages/Index') },
  { test: (p) => p.startsWith('/users'), load: () => import('@/pages/Users') },
  { test: (p) => p.startsWith('/organizations'), load: () => import('@/pages/Organizations') },
  { test: (p) => p.startsWith('/marketplace'), load: () => import('@/pages/Marketplace') },
  { test: (p) => p.startsWith('/billing'), load: () => import('@/pages/Billing') },
  { test: (p) => p.startsWith('/feedback/my'), load: () => import('@/pages/MyFeedback') },
  { test: (p) => p.startsWith('/feedback'), load: () => import('@/pages/Feedback') },
  { test: (p) => p.startsWith('/notifications'), load: () => import('@/pages/Notifications') },
  { test: (p) => p.startsWith('/settings/company'), load: () => import('@/pages/CompanySettings') },
  { test: (p) => p.startsWith('/settings/system'), load: () => import('@/pages/SystemSettings') },
  { test: (p) => p.startsWith('/settings/profile'), load: () => import('@/pages/ProfileSettings') },
  { test: (p) => p.startsWith('/apps/'), load: () => import('@/apps/shared/components/AppRouter') },
  { test: (p) => p.startsWith('/features/'), load: () => import('@/components/FeatureRouter') },
];

const prefetched = new Set<string>();

let inFlight = 0;
const MAX_CONCURRENT = 2;

const schedule = (fn: () => void) => {
  const ric = (window as any).requestIdleCallback as undefined | ((cb: () => void, opts?: { timeout?: number }) => number);
  if (ric) {
    ric(() => fn(), { timeout: 1500 });
  } else {
    setTimeout(fn, 0);
  }
};

export function prefetchByPath(path: string) {
  if (!path) return;
  // Normalize without query/hash
  const clean = path.split('?')[0].split('#')[0];
  if (prefetched.has(clean)) return;
  const loader = routeLoaders.find((r) => r.test(clean));
  if (loader) {
    prefetched.add(clean);
    const run = () => {
      if (inFlight >= MAX_CONCURRENT) {
        setTimeout(run, 50);
        return;
      }
      inFlight++;
      loader.load().catch(() => {
        // ignore preload errors
        prefetched.delete(clean);
      }).finally(() => {
        inFlight--;
      });
    };
    schedule(run);
  }
}
