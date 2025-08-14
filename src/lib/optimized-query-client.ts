import { QueryClient } from '@tanstack/react-query';

// Advanced query client with intelligent caching and optimization
export function createOptimizedQueryClient() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        // Aggressive caching for better performance
        staleTime: 5 * 60 * 1000, // 5 minutes
        gcTime: 30 * 60 * 1000, // 30 minutes
        refetchOnWindowFocus: false,
        refetchOnReconnect: 'always',
        retry: (failureCount, error) => {
          // Smart retry logic
          if (failureCount >= 2) return false;
          if (error?.message?.includes('401')) return false;
          return true;
        },
        retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000),
      },
      mutations: {
        retry: 1,
        retryDelay: 1000,
      },
    },
  });

  return queryClient;
}

// Query key factories for consistent cache management
export const queryKeys = {
  // User-related queries
  auth: ['auth'] as const,
  user: (id: string) => ['user', id] as const,
  userRole: (userId: string, orgId?: string) => ['user-role', userId, orgId] as const,
  
  // Organization queries  
  organizations: ['organizations'] as const,
  organization: (id: string) => ['organization', id] as const,
  organizationUsers: (orgId: string) => ['organization-users', orgId] as const,
  
  // Dashboard queries - split by data type for selective invalidation
  dashboardCore: (userId: string, role: string) => ['dashboard-core', userId, role] as const,
  dashboardStats: (orgId?: string) => ['dashboard-stats', orgId] as const,
  dashboardNotifications: (userId: string) => ['dashboard-notifications', userId] as const,
  
  // Feature queries
  features: ['features'] as const,
  systemFeatures: ['system-features'] as const,
  organizationFeatures: (orgId: string) => ['organization-features', orgId] as const,
  
  // Content queries
  feedback: (orgId?: string) => ['feedback', orgId] as const,
  notifications: (userId: string) => ['notifications', userId] as const,
  files: (orgId: string) => ['files', orgId] as const,
} as const;

// Cache invalidation utilities
export const cacheUtils = {
  // Invalidate all user-related data
  invalidateUserData: (queryClient: QueryClient, userId: string) => {
    queryClient.invalidateQueries({ queryKey: queryKeys.user(userId) });
    queryClient.invalidateQueries({ queryKey: queryKeys.userRole(userId) });
    queryClient.invalidateQueries({ queryKey: queryKeys.dashboardCore(userId, '') });
    queryClient.invalidateQueries({ queryKey: queryKeys.dashboardNotifications(userId) });
  },
  
  // Invalidate organization-specific data
  invalidateOrgData: (queryClient: QueryClient, orgId: string) => {
    queryClient.invalidateQueries({ queryKey: queryKeys.organization(orgId) });
    queryClient.invalidateQueries({ queryKey: queryKeys.organizationUsers(orgId) });
    queryClient.invalidateQueries({ queryKey: queryKeys.organizationFeatures(orgId) });
    queryClient.invalidateQueries({ queryKey: queryKeys.dashboardStats(orgId) });
    queryClient.invalidateQueries({ queryKey: queryKeys.feedback(orgId) });
    queryClient.invalidateQueries({ queryKey: queryKeys.files(orgId) });
  },
  
  // Smart invalidation for dashboard refresh
  refreshDashboard: (queryClient: QueryClient, userId: string, orgId?: string) => {
    queryClient.invalidateQueries({ queryKey: queryKeys.dashboardCore(userId, '') });
    if (orgId) {
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboardStats(orgId) });
    }
  },
};

// Background data prefetching
export const prefetchUtils = {
  // Prefetch critical user data
  prefetchUserData: async (queryClient: QueryClient, userId: string) => {
    await Promise.all([
      queryClient.prefetchQuery({
        queryKey: queryKeys.user(userId),
        staleTime: 10 * 60 * 1000, // 10 minutes
      }),
      queryClient.prefetchQuery({
        queryKey: queryKeys.organizations,
        staleTime: 10 * 60 * 1000,
      }),
    ]);
  },
  
  // Prefetch dashboard data
  prefetchDashboard: async (queryClient: QueryClient, userId: string, role: string) => {
    await queryClient.prefetchQuery({
      queryKey: queryKeys.dashboardCore(userId, role),
      staleTime: 2 * 60 * 1000, // 2 minutes
    });
  },
};