import { QueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { cacheConfig, queryKeys } from './query-client';

// Prefetch lightweight queries based on route path
export async function prefetchQueriesByPath(path: string, client: QueryClient) {
  if (!path) return;
  const clean = path.split('?')[0].split('#')[0];

  try {
    // Marketplace: categories and branding (used in header)
    if (clean.startsWith('/marketplace')) {
      await client.prefetchQuery({
        queryKey: ['system-settings-branding'],
        queryFn: async () => {
          const { data, error } = await supabase
            .from('system_settings')
            .select('key, value')
            .in('key', ['app_name', 'app_logo_url']);
          if (error) throw error;
          const map: Record<string, any> = {};
          data?.forEach((s: any) => { map[s.key] = s.value; });
          return { app_name: map.app_name || 'SaaS Platform', app_logo_url: map.app_logo_url || null };
        },
        staleTime: cacheConfig.static.staleTime,
      });

      await client.prefetchQuery({
        queryKey: ['app_categories', 'active'],
        queryFn: async () => {
          const { data, error } = await supabase
            .from('app_categories')
            .select('id, name, slug, description, icon_name, color_hex, sort_order, is_active')
            .eq('is_active', true)
            .order('sort_order');
          if (error) throw error;
          return data || [];
        },
        staleTime: cacheConfig.static.staleTime,
      });
    }

    // Dashboard: warm up dashboard stats key (lightweight placeholder)
    if (clean === '/' || clean === '/dashboard') {
      await client.prefetchQuery({
        queryKey: queryKeys.stats('dashboard'),
        queryFn: async () => null,
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
