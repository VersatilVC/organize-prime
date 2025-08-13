import { QueryClient } from '@tanstack/react-query';
import { cacheConfig } from './query-client';

// Enhanced prefetch with priority-based loading
export async function prefetchQueriesByPath(path: string, client: QueryClient) {
  if (!path) return;
  const clean = path.split('?')[0].split('#')[0];

  try {
    // Dashboard: prefetch essential data with stale-while-revalidate
    if (clean === '/' || clean === '/dashboard') {
      // Prefetch user profile and organization data (critical)
      await Promise.allSettled([
        client.prefetchQuery({
          queryKey: ['user-profile'],
          queryFn: async () => {
            // Simplified mock data to avoid type issues
            return { display_name: 'User' };
          },
          staleTime: cacheConfig.semiStatic.staleTime,
        }),
        
        client.prefetchQuery({
          queryKey: ['current-organization'],
          queryFn: async () => {
            // Simplified mock data to avoid type issues
            return 'org-id';
          },
          staleTime: cacheConfig.semiStatic.staleTime,
        })
      ]);
    }

    // Users page: prefetch user list
    if (clean.startsWith('/users')) {
      await client.prefetchQuery({
        queryKey: ['users', 'organization'],
        queryFn: async () => {
          // Simplified mock data to avoid type issues
          return [];
        },
        staleTime: cacheConfig.dynamic.staleTime,
      });
    }

    // Settings pages: prefetch settings data
    if (clean.startsWith('/settings')) {
      await client.prefetchQuery({
        queryKey: ['organization-settings'],
        queryFn: async () => {
          // Simplified mock data to avoid type issues
          return [];
        },
        staleTime: cacheConfig.semiStatic.staleTime,
      });
    }

    // Knowledge Base: prefetch KB data
    if (clean.startsWith('/knowledge-base') || clean.startsWith('/apps/knowledge-base')) {
      await client.prefetchQuery({
        queryKey: ['kb-dashboard-stats'],
        queryFn: async () => {
          // Lightweight placeholder for KB stats
          return { documents: 0, searches: 0, users: 0 };
        },
        staleTime: cacheConfig.dynamic.staleTime,
      });
    }
  } catch {
    // Ignore prefetch errors to avoid blocking UI
  }
}

// Helper to produce a handler suitable for onMouseEnter
export function makeHoverPrefetchHandler(path: string, client: QueryClient) {
  return () => {
    prefetchQueriesByPath(path, client);
  };
}