/**
 * React hooks for actual element webhook data
 * Connects to feature_webhooks table to show real N8N webhook data
 * Replaces placeholder data with actual webhook information
 */

import { useQuery, UseQueryResult } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  ElementWebhook,
  PaginatedWebhooks,
  WebhookSearchFilters,
  PaginationOptions
} from '../types/webhook';

// Query key factory for actual webhook operations
export const actualWebhookQueryKeys = {
  all: ['actual-webhooks'] as const,
  lists: () => [...actualWebhookQueryKeys.all, 'list'] as const,
  list: (filters: WebhookSearchFilters) => [...actualWebhookQueryKeys.lists(), filters] as const,
};

/**
 * Transform feature_webhooks data to ElementWebhook format
 */
function transformFeatureWebhookToElementWebhook(webhook: any): ElementWebhook {
  return {
    id: webhook.id,
    organizationId: 'default', // feature_webhooks doesn't have org_id
    featureSlug: webhook.feature_slug || 'unknown',
    pagePath: getPagePathFromFeature(webhook.feature_slug || 'unknown'),
    elementId: `${webhook.feature_slug || 'unknown'}-${webhook.name || 'unnamed'}`,
    elementType: 'webhook',
    displayName: webhook.name || 'Unnamed Webhook',
    endpointUrl: webhook.endpoint_url || webhook.url || '',
    httpMethod: webhook.method || 'POST',
    payloadTemplate: {},
    headers: webhook.headers || {},
    timeoutSeconds: webhook.timeout_seconds || 30,
    retryCount: webhook.retry_attempts || 3,
    rateLimitPerMinute: 60,
    isActive: webhook.is_active || false,
    healthStatus: determineHealthStatus(webhook),
    totalExecutions: webhook.total_calls || ((webhook.success_count || 0) + (webhook.failure_count || 0)),
    successfulExecutions: webhook.success_count || 0,
    failedExecutions: webhook.failure_count || 0,
    averageResponseTime: webhook.avg_response_time || 0,
    lastExecutedAt: webhook.last_triggered || null,
    createdBy: webhook.created_by || null,
    updatedBy: webhook.created_by || null, // fallback
    createdAt: webhook.created_at || new Date().toISOString(),
    updatedAt: webhook.updated_at || new Date().toISOString(),
    metadata: {
      originalSource: 'feature_webhooks',
      isN8NWebhook: isN8NWebhook(webhook),
      testStatus: webhook.test_status || 'unknown'
    }
  };
}

function getPagePathFromFeature(featureSlug: string): string {
  const pathMap: Record<string, string> = {
    'knowledge-base': '/knowledge-base',
    'dashboard': '/dashboard',
    'admin': '/admin',
    'settings': '/settings'
  };
  return pathMap[featureSlug] || `/${featureSlug}`;
}

function determineHealthStatus(webhook: any): 'healthy' | 'warning' | 'error' | 'unknown' {
  if (webhook.test_status === 'success') return 'healthy';
  if (webhook.test_status === 'error') return 'error';
  
  const totalCalls = webhook.total_calls || ((webhook.success_count || 0) + (webhook.failure_count || 0));
  if (totalCalls > 0) {
    const successRate = (webhook.success_count || 0) / totalCalls;
    if (successRate >= 0.9) return 'healthy';
    if (successRate >= 0.7) return 'warning';
    if (successRate < 0.7) return 'error';
  }
  
  return 'unknown';
}

function isN8NWebhook(webhook: any): boolean {
  const url = webhook.endpoint_url || webhook.url || '';
  return url.toLowerCase().includes('n8n') || url.includes('/webhook/');
}

/**
 * Get webhooks with search and pagination from actual feature_webhooks table
 */
export function useActualElementWebhooks(
  filters: WebhookSearchFilters = {},
  pagination: PaginationOptions = {}
): UseQueryResult<PaginatedWebhooks> {
  return useQuery({
    queryKey: actualWebhookQueryKeys.list({ ...filters, ...pagination }),
    queryFn: async (): Promise<PaginatedWebhooks> => {
      try {
        console.log('Fetching actual webhooks from feature_webhooks table...');
        
        let query = supabase.from('feature_webhooks').select('*');

        // Apply filters
        if (filters.featureSlug) {
          query = query.eq('feature_slug', filters.featureSlug);
        }

        if (filters.isActive !== undefined) {
          query = query.eq('is_active', filters.isActive);
        }

        if (filters.healthStatus) {
          // We'll filter this client-side since the mapping is complex
        }

        // Apply pagination
        if (pagination.limit) {
          query = query.limit(pagination.limit);
        }

        if (pagination.offset) {
          query = query.range(pagination.offset, pagination.offset + (pagination.limit || 50) - 1);
        }

        const { data: webhooks, error, count } = await query;

        if (error) {
          console.error('Error fetching webhooks:', error);
          throw new Error(`Failed to fetch webhooks: ${error.message}`);
        }

        console.log(`Found ${webhooks?.length || 0} webhooks in feature_webhooks table`);

        let transformedWebhooks = (webhooks || []).map(transformFeatureWebhookToElementWebhook);

        // Apply client-side health status filter if needed
        if (filters.healthStatus) {
          transformedWebhooks = transformedWebhooks.filter(
            webhook => webhook.healthStatus === filters.healthStatus
          );
        }

        return {
          webhooks: transformedWebhooks,
          totalCount: count || transformedWebhooks.length,
          hasMore: transformedWebhooks.length === (pagination.limit || 50),
          pagination: {
            offset: pagination.offset || 0,
            limit: pagination.limit || 50
          }
        };
      } catch (error) {
        console.error('Error in useActualElementWebhooks:', error);
        throw error;
      }
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
    keepPreviousData: true,
    retry: (failureCount, error) => {
      console.log(`Query failed (attempt ${failureCount}):`, error);
      return failureCount < 2; // Retry once
    },
    onError: (error) => {
      console.error('useActualElementWebhooks query error:', error);
    },
    onSuccess: (data) => {
      console.log(`Successfully loaded ${data.webhooks.length} actual webhooks`);
    }
  });
}

/**
 * Get webhooks for a specific feature from feature_webhooks table
 */
export function useActualElementWebhooksForFeature(featureSlug: string): UseQueryResult<ElementWebhook[]> {
  return useQuery({
    queryKey: ['actual-webhooks', 'feature', featureSlug],
    queryFn: async (): Promise<ElementWebhook[]> => {
      console.log(`Fetching webhooks for feature: ${featureSlug}`);
      
      const { data: webhooks, error } = await supabase
        .from('feature_webhooks')
        .select('*')
        .eq('feature_slug', featureSlug);

      if (error) {
        console.error('Error fetching feature webhooks:', error);
        throw new Error(`Failed to fetch webhooks for feature ${featureSlug}: ${error.message}`);
      }

      console.log(`Found ${webhooks?.length || 0} webhooks for feature ${featureSlug}`);

      return (webhooks || []).map(transformFeatureWebhookToElementWebhook);
    },
    enabled: !!featureSlug,
    staleTime: 5 * 60 * 1000, // 5 minutes
    onSuccess: (data) => {
      console.log(`Successfully loaded ${data.length} webhooks for feature ${featureSlug}`);
    }
  });
}

/**
 * Get active webhooks from feature_webhooks table
 */
export function useActualActiveElementWebhooks(): UseQueryResult<ElementWebhook[]> {
  return useQuery({
    queryKey: ['actual-webhooks', 'active'],
    queryFn: async (): Promise<ElementWebhook[]> => {
      console.log('Fetching active webhooks...');
      
      const { data: webhooks, error } = await supabase
        .from('feature_webhooks')
        .select('*')
        .eq('is_active', true);

      if (error) {
        console.error('Error fetching active webhooks:', error);
        throw new Error(`Failed to fetch active webhooks: ${error.message}`);
      }

      console.log(`Found ${webhooks?.length || 0} active webhooks`);

      return (webhooks || []).map(transformFeatureWebhookToElementWebhook);
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
    onSuccess: (data) => {
      console.log(`Successfully loaded ${data.length} active webhooks`);
    }
  });
}