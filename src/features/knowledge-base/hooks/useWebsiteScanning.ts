import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface WebsiteScanConfig {
  id: string;
  organization_id: string;
  kb_id: string;
  kb_display_name?: string;
  website_url: string;
  website_domain: string;
  scan_frequency: 'manual' | 'daily' | 'weekly' | 'monthly';
  max_pages: number;
  exclude_patterns: string[];
  include_patterns: string[];
  last_scan_at?: string;
  next_scan_at?: string;
  scan_status: 'inactive' | 'scanning' | 'completed' | 'failed';
  scan_metadata?: any;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface WebsitePage {
  id: string;
  organization_id: string;
  website_config_id: string;
  kb_id: string;
  kb_file_id?: string;
  page_url: string;
  page_path: string;
  page_title: string;
  page_description: string;
  content_hash: string;
  word_count: number;
  status: 'discovered' | 'processing' | 'indexed' | 'failed' | 'excluded';
  last_crawled_at: string;
  last_indexed_at?: string;
  extracted_content?: string;
  extraction_metadata?: any;
  embedding_count: number;
  error_message?: string;
  retry_count: number;
  created_at: string;
  updated_at: string;
}

export interface WebsiteScanLog {
  id: string;
  organization_id: string;
  website_config_id: string;
  scan_type: 'full' | 'incremental' | 'single_page';
  status: 'started' | 'crawling' | 'processing' | 'completed' | 'failed';
  total_pages_found: number;
  pages_processed: number;
  pages_indexed: number;
  pages_failed: number;
  pages_skipped: number;
  started_at: string;
  completed_at?: string;
  processing_time_ms?: number;
  apify_run_id?: string;
  apify_actor_id: string;
  crawl_metadata?: any;
  error_message?: string;
  created_at: string;
}

export interface WebsiteScanRequest {
  action: 'scan' | 'status' | 'cancel';
  websiteUrl: string;
  kbId: string;
  options?: {
    maxPages?: number;
    includePatterns?: string[];
    excludePatterns?: string[];
    scanType?: 'full' | 'incremental' | 'single_page';
  };
  runId?: string;
}

export interface WebsiteScanResponse {
  success: boolean;
  runId?: string;
  status?: string;
  data?: any;
  error?: string;
  stats?: {
    totalPages: number;
    processedPages: number;
    indexedPages: number;
    failedPages: number;
  };
}

// Custom hooks
export function useWebsiteScanConfigs(organizationId?: string) {
  return useQuery({
    queryKey: ['website-scan-configs', organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      
      const { data, error } = await supabase
        .from('website_scan_configs')
        .select(`
          *,
          kb_configurations!inner(display_name)
        `)
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data.map(config => ({
        ...config,
        kb_display_name: config.kb_configurations?.display_name
      })) as (WebsiteScanConfig & { kb_display_name: string })[];
    },
    enabled: !!organizationId,
  });
}

export function useWebsitePages(organizationId?: string, websiteConfigId?: string) {
  return useQuery({
    queryKey: ['website-pages', organizationId, websiteConfigId],
    queryFn: async () => {
      if (!organizationId || !websiteConfigId) return [];
      
      const { data, error } = await supabase
        .from('website_pages')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('website_config_id', websiteConfigId)
        .order('last_crawled_at', { ascending: false });

      if (error) throw error;
      return data as WebsitePage[];
    },
    enabled: !!organizationId && !!websiteConfigId,
  });
}

export function useWebsiteScanLogs(organizationId?: string, websiteConfigId?: string) {
  return useQuery({
    queryKey: ['website-scan-logs', organizationId, websiteConfigId],
    queryFn: async () => {
      if (!organizationId || !websiteConfigId) return [];
      
      const { data, error } = await supabase
        .from('website_scan_logs')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('website_config_id', websiteConfigId)
        .order('started_at', { ascending: false });

      if (error) throw error;
      return data as WebsiteScanLog[];
    },
    enabled: !!organizationId && !!websiteConfigId,
  });
}

export function useStartWebsiteScan() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (request: WebsiteScanRequest): Promise<WebsiteScanResponse> => {
      const response = await supabase.functions.invoke('website-scanner', {
        body: request
      });

      if (response.error) {
        throw new Error(response.error.message || 'Failed to start website scan');
      }

      if (!response.data.success) {
        throw new Error(response.data.error || 'Website scan failed');
      }

      return response.data;
    },
    onSuccess: (data, variables) => {
      toast({
        title: 'Website Scan Started',
        description: `Scanning ${variables.websiteUrl} in progress. This may take several minutes.`,
      });
      
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: ['website-scan-configs'] });
      queryClient.invalidateQueries({ queryKey: ['website-scan-logs'] });
    },
    onError: (error: Error) => {
      toast({
        title: 'Scan Failed',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

export function useGetScanStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ runId, organizationId }: { runId: string; organizationId: string }): Promise<WebsiteScanResponse> => {
      const response = await supabase.functions.invoke('website-scanner', {
        body: {
          action: 'status',
          runId,
          websiteUrl: '', // Not used for status
          kbId: '' // Not used for status
        }
      });

      if (response.error) {
        throw new Error(response.error.message || 'Failed to get scan status');
      }

      return response.data;
    },
    onSuccess: (data) => {
      // Update queries with new status
      queryClient.invalidateQueries({ queryKey: ['website-scan-configs'] });
      queryClient.invalidateQueries({ queryKey: ['website-scan-logs'] });
      queryClient.invalidateQueries({ queryKey: ['website-pages'] });
    },
  });
}

export function useCancelWebsiteScan() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ runId }: { runId: string }): Promise<WebsiteScanResponse> => {
      const response = await supabase.functions.invoke('website-scanner', {
        body: {
          action: 'cancel',
          runId,
          websiteUrl: '', // Not used for cancel
          kbId: '' // Not used for cancel
        }
      });

      if (response.error) {
        throw new Error(response.error.message || 'Failed to cancel scan');
      }

      return response.data;
    },
    onSuccess: () => {
      toast({
        title: 'Scan Cancelled',
        description: 'Website scan has been cancelled.',
      });
      
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: ['website-scan-configs'] });
      queryClient.invalidateQueries({ queryKey: ['website-scan-logs'] });
    },
    onError: (error: Error) => {
      toast({
        title: 'Cancel Failed',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

export function useDeleteScanConfig() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ configId, organizationId }: { configId: string; organizationId: string }) => {
      const { error } = await supabase
        .from('website_scan_configs')
        .delete()
        .eq('id', configId)
        .eq('organization_id', organizationId);

      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: 'Configuration Deleted',
        description: 'Website scan configuration has been removed.',
      });
      
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: ['website-scan-configs'] });
      queryClient.invalidateQueries({ queryKey: ['website-pages'] });
      queryClient.invalidateQueries({ queryKey: ['website-scan-logs'] });
    },
    onError: (error: Error) => {
      toast({
        title: 'Delete Failed',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

export function useUpdateScanConfig() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      configId, 
      organizationId, 
      updates 
    }: { 
      configId: string; 
      organizationId: string; 
      updates: Partial<WebsiteScanConfig>;
    }) => {
      const { data, error } = await supabase
        .from('website_scan_configs')
        .update(updates)
        .eq('id', configId)
        .eq('organization_id', organizationId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast({
        title: 'Configuration Updated',
        description: 'Website scan configuration has been updated.',
      });
      
      queryClient.invalidateQueries({ queryKey: ['website-scan-configs'] });
    },
    onError: (error: Error) => {
      toast({
        title: 'Update Failed',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

// Utility hook for real-time status updates
export function useWebsiteScanPolling(runId?: string, organizationId?: string, enabled: boolean = false) {
  const getScanStatus = useGetScanStatus();

  return useQuery({
    queryKey: ['website-scan-status', runId],
    queryFn: async () => {
      if (!runId || !organizationId) return null;
      const result = await getScanStatus.mutateAsync({ runId, organizationId });
      return result;
    },
    enabled: enabled && !!runId && !!organizationId,
    refetchInterval: (data) => {
      // Stop polling if scan is completed or failed
      if (data?.status === 'completed' || data?.status === 'failed') {
        return false;
      }
      // Poll every 10 seconds for active scans
      return 10000;
    },
    refetchIntervalInBackground: false,
  });
}