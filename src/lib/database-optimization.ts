import { supabase } from '@/integrations/supabase/client';
import { PostgrestResponse } from '@supabase/supabase-js';

/**
 * Database Query Optimization Utilities
 * Provides batching, caching, and performance optimization for database operations
 */

// Cache for database query results
const queryCache = new Map<string, { data: any; timestamp: number; ttl: number }>();

// Query result interface
interface QueryResult<T = any> {
  data: T | null;
  error: any;
  count?: number;
}

// Batch query interface
interface BatchQuery {
  key: string;
  table: string;
  select: string;
  filters?: Record<string, any>;
  options?: {
    count?: 'exact' | 'planned' | 'estimated';
    head?: boolean;
    limit?: number;
    offset?: number;
    orderBy?: { column: string; ascending?: boolean };
  };
}

/**
 * Generate cache key for queries
 */
function generateCacheKey(table: string, select: string, filters: Record<string, any> = {}, options: any = {}): string {
  const filterStr = Object.keys(filters)
    .sort()
    .map(key => `${key}:${filters[key]}`)
    .join('|');
  const optionsStr = JSON.stringify(options);
  return `${table}:${select}:${filterStr}:${optionsStr}`;
}

/**
 * Get cached query result if valid
 */
function getCachedResult(cacheKey: string): any | null {
  const cached = queryCache.get(cacheKey);
  if (!cached) return null;
  
  const now = Date.now();
  if (now - cached.timestamp > cached.ttl) {
    queryCache.delete(cacheKey);
    return null;
  }
  
  return cached.data;
}

/**
 * Cache query result
 */
function setCachedResult(cacheKey: string, data: any, ttl: number = 5 * 60 * 1000): void {
  queryCache.set(cacheKey, {
    data,
    timestamp: Date.now(),
    ttl
  });
  
  // Clean up old cache entries periodically
  if (queryCache.size > 100) {
    const now = Date.now();
    for (const [key, value] of queryCache.entries()) {
      if (now - value.timestamp > value.ttl) {
        queryCache.delete(key);
      }
    }
  }
}

/**
 * Execute multiple queries in parallel with intelligent batching
 */
export async function batchQueries(queries: BatchQuery[]): Promise<Record<string, QueryResult>> {
  const results: Record<string, QueryResult> = {};
  const pendingQueries: Array<{ query: BatchQuery; promise: Promise<QueryResult> }> = [];
  
  // Check cache first
  for (const query of queries) {
    const cacheKey = generateCacheKey(query.table, query.select, query.filters, query.options);
    const cached = getCachedResult(cacheKey);
    
    if (cached) {
      results[query.key] = cached;
    } else {
      // Build query
      let queryBuilder = supabase.from(query.table).select(query.select, query.options);
      
      // Apply filters
      if (query.filters) {
        for (const [key, value] of Object.entries(query.filters)) {
          if (Array.isArray(value)) {
            queryBuilder = queryBuilder.in(key, value);
          } else if (value !== null && value !== undefined) {
            queryBuilder = queryBuilder.eq(key, value);
          }
        }
      }
      
      // Apply options
      if (query.options?.limit) {
        queryBuilder = queryBuilder.limit(query.options.limit);
      }
      if (query.options?.offset) {
        queryBuilder = queryBuilder.range(query.options.offset, query.options.offset + (query.options.limit || 10) - 1);
      }
      if (query.options?.orderBy) {
        queryBuilder = queryBuilder.order(query.options.orderBy.column, { ascending: query.options.orderBy.ascending });
      }
      
      const promise = queryBuilder.then((response: PostgrestResponse<any>) => ({
        data: response.data,
        error: response.error,
        count: response.count
      }));
      
      pendingQueries.push({ query, promise });
    }
  }
  
  // Execute pending queries in parallel
  if (pendingQueries.length > 0) {
    const responses = await Promise.all(pendingQueries.map(({ promise }) => promise));
    
    pendingQueries.forEach(({ query }, index) => {
      const result = responses[index];
      results[query.key] = result;
      
      // Cache successful results
      if (!result.error) {
        const cacheKey = generateCacheKey(query.table, query.select, query.filters, query.options);
        setCachedResult(cacheKey, result);
      }
    });
  }
  
  return results;
}

/**
 * Execute RPC functions in parallel with error handling
 */
export async function batchRPCCalls(calls: Array<{
  key: string;
  functionName: string;
  params: Record<string, any>;
}>): Promise<Record<string, QueryResult>> {
  const results: Record<string, QueryResult> = {};
  
  const promises = calls.map(async (call) => {
    try {
      const { data, error } = await supabase.rpc(call.functionName, call.params);
      return { key: call.key, result: { data, error } };
    } catch (error) {
      return { key: call.key, result: { data: null, error } };
    }
  });
  
  const responses = await Promise.allSettled(promises);
  
  responses.forEach((response, index) => {
    const key = calls[index].key;
    if (response.status === 'fulfilled') {
      results[key] = response.value.result;
    } else {
      results[key] = { data: null, error: response.reason };
    }
  });
  
  return results;
}

/**
 * Optimized user dashboard data fetching
 */
export async function fetchUserDashboardData(
  userId: string,
  organizationId: string | null,
  role: string
): Promise<{
  users: number;
  organizations: number;
  notifications: number;
  feedback: number;
}> {
  const queries: BatchQuery[] = [];
  
  if (role === 'super_admin') {
    queries.push(
      {
        key: 'total_users',
        table: 'profiles',
        select: 'id',
        options: { count: 'exact', head: true }
      },
      {
        key: 'total_organizations',
        table: 'organizations',
        select: 'id',
        options: { count: 'exact', head: true }
      },
      {
        key: 'total_feedback',
        table: 'feedback',
        select: 'id',
        options: { count: 'exact', head: true }
      },
      {
        key: 'unread_notifications',
        table: 'notifications',
        select: 'id',
        filters: { read: false },
        options: { count: 'exact', head: true }
      }
    );
  } else if (role === 'admin' && organizationId) {
    queries.push(
      {
        key: 'org_users',
        table: 'memberships',
        select: 'id',
        filters: { organization_id: organizationId, status: 'active' },
        options: { count: 'exact', head: true }
      },
      {
        key: 'org_feedback',
        table: 'feedback',
        select: 'id',
        filters: { organization_id: organizationId },
        options: { count: 'exact', head: true }
      },
      {
        key: 'user_notifications',
        table: 'notifications',
        select: 'id',
        filters: { user_id: userId, read: false },
        options: { count: 'exact', head: true }
      }
    );
  } else {
    queries.push(
      {
        key: 'user_organizations',
        table: 'memberships',
        select: 'id',
        filters: { user_id: userId, status: 'active' },
        options: { count: 'exact', head: true }
      },
      {
        key: 'user_notifications',
        table: 'notifications',
        select: 'id',
        filters: { user_id: userId, read: false },
        options: { count: 'exact', head: true }
      }
    );
  }
  
  const results = await batchQueries(queries);
  
  return {
    users: results.total_users?.count || results.org_users?.count || 0,
    organizations: results.total_organizations?.count || results.user_organizations?.count || 1,
    notifications: results.unread_notifications?.count || results.user_notifications?.count || 0,
    feedback: results.total_feedback?.count || results.org_feedback?.count || 0,
  };
}

/**
 * Optimized organization features fetching with caching
 */
export async function fetchOrganizationFeatures(organizationId: string): Promise<any[]> {
  const cacheKey = `org-features:${organizationId}`;
  const cached = getCachedResult(cacheKey);
  
  if (cached) {
    return cached;
  }
  
  const results = await batchQueries([
    {
      key: 'system_features',
      table: 'system_feature_configs',
      select: 'feature_slug',
      filters: { is_enabled_globally: true }
    },
    {
      key: 'org_features',
      table: 'organization_feature_configs',
      select: 'id, organization_id, feature_slug, is_enabled, is_user_accessible, org_menu_order, created_at, updated_at',
      filters: { organization_id: organizationId, is_enabled: true, is_user_accessible: true },
      options: { orderBy: { column: 'org_menu_order', ascending: true } }
    }
  ]);
  
  const systemFeatures = new Set(results.system_features?.data?.map((f: any) => f.feature_slug) || []);
  const filteredFeatures = results.org_features?.data?.filter((config: any) => 
    systemFeatures.has(config.feature_slug)
  ) || [];
  
  // Cache for 15 minutes
  setCachedResult(cacheKey, filteredFeatures, 15 * 60 * 1000);
  
  // Debug logging to check ordering
  console.log('🔍 fetchOrganizationFeatures result for', organizationId, ':', 
    filteredFeatures.map(f => ({ slug: f.feature_slug, order: f.org_menu_order })));
  
  return filteredFeatures;
}

/**
 * Clear cache for specific patterns
 */
export function clearQueryCache(pattern?: string): void {
  if (!pattern) {
    queryCache.clear();
    return;
  }
  
  for (const key of queryCache.keys()) {
    if (key.includes(pattern)) {
      queryCache.delete(key);
    }
  }
}

/**
 * Get cache statistics
 */
export function getCacheStats(): { size: number; keys: string[] } {
  return {
    size: queryCache.size,
    keys: Array.from(queryCache.keys())
  };
}

// Make cache functions globally available in development
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  (window as any).clearQueryCache = clearQueryCache;
  (window as any).getCacheStats = getCacheStats;
}