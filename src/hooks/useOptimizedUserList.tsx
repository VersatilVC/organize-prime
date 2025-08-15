import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/auth/AuthProvider';
import { useOrganization } from '@/contexts/OrganizationContext';
import { useState, useMemo } from 'react';

interface User {
  id: string;
  full_name: string;
  username: string;
  avatar_url: string;
  last_login_at: string;
  role: string;
  status: string;
  joined_at: string;
  organization_id: string;
  department: string;
  position: string;
  last_active: string;
}

interface UserListData {
  users: User[];
  total: number;
  page: number;
  page_size: number;
  has_next: boolean;
}

interface UseOptimizedUserListProps {
  page?: number;
  pageSize?: number;
  search?: string;
  roleFilter?: string;
  statusFilter?: string;
}

export function useOptimizedUserList({
  page = 0,
  pageSize = 50,
  search,
  roleFilter,
  statusFilter
}: UseOptimizedUserListProps = {}) {
  const { user } = useAuth();
  const { currentOrganization } = useOrganization();

  const queryKey = useMemo(() => [
    'user-list-optimized',
    currentOrganization?.id,
    user?.id,
    page,
    pageSize,
    search,
    roleFilter,
    statusFilter
  ], [currentOrganization?.id, user?.id, page, pageSize, search, roleFilter, statusFilter]);

  const { data, isLoading, error } = useQuery({
    queryKey,
    queryFn: async (): Promise<UserListData> => {
      if (!user || !currentOrganization) throw new Error('Missing user or organization');
      
      const { data, error } = await supabase.rpc('get_user_list_optimized', {
        p_organization_id: currentOrganization.id,
        p_requesting_user_id: user.id,
        p_page: page,
        p_page_size: pageSize,
        p_search: search || null,
        p_role_filter: roleFilter || null,
        p_status_filter: statusFilter || null
      });

      if (error) throw error;
      
      return typeof data === 'string' ? JSON.parse(data) : data;
    },
    enabled: !!user && !!currentOrganization,
    staleTime: 2 * 60 * 1000, // 2 minutes cache
    gcTime: 10 * 60 * 1000, // 10 minutes garbage collection
    retry: 2,
    retryDelay: 1000,
    refetchOnWindowFocus: false,
  });

  return {
    users: data?.users || [],
    total: data?.total || 0,
    page: data?.page || 0,
    pageSize: data?.page_size || pageSize,
    hasNext: data?.has_next || false,
    isLoading,
    error,
  };
}