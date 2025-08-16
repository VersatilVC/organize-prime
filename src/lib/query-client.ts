import { QueryClient } from '@tanstack/react-query';
import { toast } from '@/hooks/use-toast';

// Query key factory for consistent cache management
export const queryKeys = {
  // User-related queries
  users: ['users'] as const,
  user: (id: string) => [...queryKeys.users, id] as const,
  userRole: (userId: string, orgId?: string) => ['user-role', userId, orgId] as const,
  userProfile: (id: string) => [...queryKeys.users, 'profile', id] as const,
  
  // Organization-related queries
  organizations: ['organizations'] as const,
  organization: (id: string) => [...queryKeys.organizations, id] as const,
  organizationUsers: (orgId: string, page?: number, search?: string) => 
    [...queryKeys.organizations, orgId, 'users', page, search] as const,
  organizationStats: (orgId: string) => [...queryKeys.organizations, orgId, 'stats'] as const,
  
  // Invitation queries
  invitations: ['invitations'] as const,
  organizationInvitations: (orgId: string, page?: number) => 
    [...queryKeys.invitations, orgId, page] as const,
  
  // Dashboard and stats
  stats: (type: string) => ['stats', type] as const,
  dashboardStats: (userId: string, orgId?: string, role?: string) => 
    [...queryKeys.stats('dashboard'), userId, orgId, role] as const,
  systemStats: () => [...queryKeys.stats('system')] as const,
  
  // Feedback queries
  feedback: ['feedback'] as const,
  feedbackList: (orgId?: string, page?: number, status?: string) => 
    [...queryKeys.feedback, orgId, page, status] as const,
  feedbackDetail: (id: string) => [...queryKeys.feedback, id] as const,
  
  // Search queries
  search: ['search'] as const,
  searchUsers: (query: string, orgId?: string) => [...queryKeys.search, 'users', query, orgId] as const,
  
  // File and media queries
  files: ['files'] as const,
  organizationFiles: (orgId: string) => [...queryKeys.files, orgId] as const,
} as const;

// Cache time configurations based on data volatility - HEAVILY OPTIMIZED FOR PERFORMANCE
export const cacheConfig = {
  // Static data - rarely changes (user profiles, system configs)
  static: {
    staleTime: 30 * 60 * 1000, // 30 minutes - significantly increased
    gcTime: 2 * 60 * 60 * 1000, // 2 hours - keep in cache much longer
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: false,
    networkMode: 'offlineFirst', // Prefer cache when available
  },
  
  // Semi-static data - changes occasionally (organization settings, features)
  semiStatic: {
    staleTime: 20 * 60 * 1000, // 20 minutes - doubled for better performance
    gcTime: 60 * 60 * 1000, // 1 hour
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    networkMode: 'offlineFirst',
  },
  
  // Dynamic data - changes frequently (user lists, dashboard stats)
  dynamic: {
    staleTime: 5 * 60 * 1000, // 5 minutes - increased significantly
    gcTime: 20 * 60 * 1000, // 20 minutes
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  },
  
  // Real-time data - changes very frequently (notifications, active users)
  realtime: {
    staleTime: 60 * 1000, // 1 minute - doubled
    gcTime: 10 * 60 * 1000, // 10 minutes
    refetchInterval: 2 * 60 * 1000, // Background refetch every 2 minutes (reduced frequency)
    refetchOnWindowFocus: true, // Only real-time data refetches on focus
  },
  
  // Search results - cache aggressively
  search: {
    staleTime: 5 * 60 * 1000, // 5 minutes - much longer cache for search results
    gcTime: 30 * 60 * 1000, // 30 minutes
    refetchOnWindowFocus: false,
  },
  
  // New: Heavy computation results (analytics, reports)
  computation: {
    staleTime: 15 * 60 * 1000, // 15 minutes
    gcTime: 60 * 60 * 1000, // 1 hour
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    networkMode: 'offlineFirst',
  },
} as const;

// Create optimized query client
export const createOptimizedQueryClient = () => {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: cacheConfig.dynamic.staleTime,
        gcTime: cacheConfig.dynamic.gcTime,
        refetchOnWindowFocus: false,
        refetchOnMount: false,
        refetchOnReconnect: false,
        placeholderData: (prev) => prev as unknown,
        // Prevent flashing by keeping old data during background refetches
        keepPreviousData: true,
        
        retry: (failureCount, error: any) => {
          // Don't retry on client errors (4xx) or authentication errors
          if (error?.status === 400 || error?.status === 401 || error?.status === 403 || error?.status === 404 || error?.statusCode === 400) {
            return false;
          }
          // Retry up to 3 times for server errors (5xx) and network errors
          return failureCount < 3;
        },
        retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      },
      mutations: {
        retry: 1,
        onError: (error: any) => {
          // Global error handling for mutations
          const message = error?.message || 'Something went wrong';
          if (error?.status !== 401) { // Don't show toast for auth errors
            toast({
              title: "Error",
              description: message,
              variant: "destructive",
            });
          }
        },
        onSuccess: () => {
          // Optional: Global success handling
        },
      },
    },
  });
};

// Query invalidation helpers
export const invalidateQueries = {
  // Invalidate all user-related data
  users: (queryClient: QueryClient) => {
    queryClient.invalidateQueries({ queryKey: queryKeys.users });
  },
  
  // Invalidate organization data
  organization: (queryClient: QueryClient, orgId?: string) => {
    if (orgId) {
      queryClient.invalidateQueries({ queryKey: queryKeys.organization(orgId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.organizationUsers(orgId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.organizationStats(orgId) });
    } else {
      queryClient.invalidateQueries({ queryKey: queryKeys.organizations });
    }
  },
  
  // Invalidate dashboard stats
  dashboard: (queryClient: QueryClient) => {
    queryClient.invalidateQueries({ queryKey: queryKeys.stats('dashboard') });
  },
  
  // Invalidate all stats
  allStats: (queryClient: QueryClient) => {
    queryClient.invalidateQueries({ 
      predicate: (query) => query.queryKey[0] === 'stats' 
    });
  },
} as const;