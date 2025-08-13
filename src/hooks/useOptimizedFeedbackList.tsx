import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth-migration';
import { useOrganization } from '@/contexts/OrganizationContext';
import { useMemo } from 'react';

interface FeedbackItem {
  id: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  created_at: string;
  updated_at: string;
  user_name: string;
  category: string;
  attachments_count: number;
}

interface FeedbackListData {
  feedback: FeedbackItem[];
  total: number;
  page: number;
  page_size: number;
  has_next: boolean;
}

interface UseOptimizedFeedbackListProps {
  page?: number;
  pageSize?: number;
  statusFilter?: string;
  priorityFilter?: string;
}

export function useOptimizedFeedbackList({
  page = 0,
  pageSize = 50,
  statusFilter,
  priorityFilter
}: UseOptimizedFeedbackListProps = {}) {
  const { user } = useAuth();
  const { currentOrganization } = useOrganization();

  const queryKey = useMemo(() => [
    'feedback-list-optimized',
    currentOrganization?.id,
    user?.id,
    page,
    pageSize,
    statusFilter,
    priorityFilter
  ], [currentOrganization?.id, user?.id, page, pageSize, statusFilter, priorityFilter]);

  const { data, isLoading, error } = useQuery({
    queryKey,
    queryFn: async (): Promise<FeedbackListData> => {
      if (!user || !currentOrganization) throw new Error('Missing user or organization');
      
      const { data, error } = await supabase.rpc('get_feedback_list_optimized', {
        p_organization_id: currentOrganization.id,
        p_requesting_user_id: user.id,
        p_page: page,
        p_page_size: pageSize,
        p_status_filter: statusFilter || null,
        p_priority_filter: priorityFilter || null
      });

      if (error) throw error;
      
      return typeof data === 'string' ? JSON.parse(data) : data;
    },
    enabled: !!user && !!currentOrganization,
    staleTime: 1 * 60 * 1000, // 1 minute cache for feedback
    gcTime: 5 * 60 * 1000, // 5 minutes garbage collection
    retry: 2,
    retryDelay: 1000,
    refetchOnWindowFocus: false,
  });

  return {
    feedback: data?.feedback || [],
    total: data?.total || 0,
    page: data?.page || 0,
    pageSize: data?.page_size || pageSize,
    hasNext: data?.has_next || false,
    isLoading,
    error,
  };
}