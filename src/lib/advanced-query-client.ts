import { QueryClient, QueryKey } from '@tanstack/react-query';
import { toast } from 'sonner';

// Advanced cache configuration with intelligent invalidation
export const advancedCacheConfig = {
  // Static data - rarely changes, long cache
  static: {
    staleTime: 15 * 60 * 1000, // 15 minutes
    gcTime: 60 * 60 * 1000, // 1 hour
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  },
  
  // Semi-static data - changes occasionally
  semiStatic: {
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
  },
  
  // Dynamic data - changes frequently
  dynamic: {
    staleTime: 1 * 60 * 1000, // 1 minute
    gcTime: 10 * 60 * 1000, // 10 minutes
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
  },
  
  // Real-time data - always fresh
  realtime: {
    staleTime: 0, // Always stale
    gcTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    refetchInterval: 30 * 1000, // 30 seconds
  },
  
  // Background refresh data
  background: {
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 15 * 60 * 1000, // 15 minutes
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
    refetchInterval: 5 * 60 * 1000, // 5 minutes background refresh
  }
};

// Query key factory with hierarchical structure
export const queryKeys = {
  // User-related queries
  users: {
    all: ['users'] as const,
    lists: () => [...queryKeys.users.all, 'list'] as const,
    list: (filters: Record<string, any>) => [...queryKeys.users.lists(), filters] as const,
    details: () => [...queryKeys.users.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.users.details(), id] as const,
    profile: (id: string) => [...queryKeys.users.all, 'profile', id] as const,
  },
  
  // Organization-related queries
  organizations: {
    all: ['organizations'] as const,
    lists: () => [...queryKeys.organizations.all, 'list'] as const,
    list: (filters: Record<string, any>) => [...queryKeys.organizations.lists(), filters] as const,
    details: () => [...queryKeys.organizations.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.organizations.details(), id] as const,
    settings: (id: string) => [...queryKeys.organizations.all, 'settings', id] as const,
    stats: (id: string) => [...queryKeys.organizations.all, 'stats', id] as const,
  },
  
  // Dashboard queries
  dashboard: {
    all: ['dashboard'] as const,
    stats: (orgId: string, userId: string) => [...queryKeys.dashboard.all, 'stats', orgId, userId] as const,
    batch: (orgId: string, userId: string) => [...queryKeys.dashboard.all, 'batch', orgId, userId] as const,
    activity: (orgId: string) => [...queryKeys.dashboard.all, 'activity', orgId] as const,
  },
  
  // Feedback queries
  feedback: {
    all: ['feedback'] as const,
    lists: () => [...queryKeys.feedback.all, 'list'] as const,
    list: (filters: Record<string, any>) => [...queryKeys.feedback.lists(), filters] as const,
    details: () => [...queryKeys.feedback.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.feedback.details(), id] as const,
    stats: (orgId: string) => [...queryKeys.feedback.all, 'stats', orgId] as const,
  },
  
  // Notification queries
  notifications: {
    all: ['notifications'] as const,
    lists: () => [...queryKeys.notifications.all, 'list'] as const,
    list: (userId: string) => [...queryKeys.notifications.lists(), userId] as const,
    unread: (userId: string) => [...queryKeys.notifications.all, 'unread', userId] as const,
    count: (userId: string) => [...queryKeys.notifications.all, 'count', userId] as const,
  },
  
  // File queries
  files: {
    all: ['files'] as const,
    lists: () => [...queryKeys.files.all, 'list'] as const,
    list: (orgId: string) => [...queryKeys.files.lists(), orgId] as const,
    stats: (orgId: string) => [...queryKeys.files.all, 'stats', orgId] as const,
  }
};

// Advanced invalidation patterns
export class QueryInvalidationManager {
  constructor(private queryClient: QueryClient) {}

  // Invalidate all user-related data
  async invalidateUserData(userId?: string) {
    const promises = [
      this.queryClient.invalidateQueries({ queryKey: queryKeys.users.all }),
    ];
    
    if (userId) {
      promises.push(
        this.queryClient.invalidateQueries({ queryKey: queryKeys.users.detail(userId) }),
        this.queryClient.invalidateQueries({ queryKey: queryKeys.users.profile(userId) })
      );
    }
    
    await Promise.all(promises);
  }

  // Invalidate organization-specific data
  async invalidateOrganizationData(orgId: string) {
    await Promise.all([
      this.queryClient.invalidateQueries({ queryKey: queryKeys.organizations.detail(orgId) }),
      this.queryClient.invalidateQueries({ queryKey: queryKeys.organizations.settings(orgId) }),
      this.queryClient.invalidateQueries({ queryKey: queryKeys.organizations.stats(orgId) }),
      this.queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.stats(orgId, '') }),
      this.queryClient.invalidateQueries({ queryKey: queryKeys.feedback.stats(orgId) }),
      this.queryClient.invalidateQueries({ queryKey: queryKeys.files.stats(orgId) }),
    ]);
  }

  // Invalidate dashboard data
  async invalidateDashboardData(orgId: string, userId: string) {
    await Promise.all([
      this.queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.stats(orgId, userId) }),
      this.queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.batch(orgId, userId) }),
      this.queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.activity(orgId) }),
    ]);
  }

  // Smart invalidation based on mutation type
  async invalidateByMutationType(type: string, data: any) {
    switch (type) {
      case 'user_created':
      case 'user_updated':
      case 'user_deleted':
        await this.invalidateUserData(data.userId);
        if (data.orgId) {
          await this.invalidateDashboardData(data.orgId, data.userId);
        }
        break;
        
      case 'feedback_created':
      case 'feedback_updated':
      case 'feedback_deleted':
        await this.queryClient.invalidateQueries({ queryKey: queryKeys.feedback.all });
        if (data.orgId) {
          await this.invalidateDashboardData(data.orgId, data.userId);
        }
        break;
        
      case 'organization_updated':
        await this.invalidateOrganizationData(data.orgId);
        break;
        
      case 'notification_created':
      case 'notification_read':
        await this.queryClient.invalidateQueries({ 
          queryKey: queryKeys.notifications.list(data.userId) 
        });
        await this.queryClient.invalidateQueries({ 
          queryKey: queryKeys.notifications.unread(data.userId) 
        });
        break;
        
      default:
        // Fallback: invalidate dashboard data
        if (data.orgId && data.userId) {
          await this.invalidateDashboardData(data.orgId, data.userId);
        }
    }
  }

  // Background refresh for critical data
  async backgroundRefresh(orgId: string, userId: string) {
    const criticalQueries = [
      queryKeys.dashboard.batch(orgId, userId),
      queryKeys.notifications.unread(userId),
      queryKeys.organizations.detail(orgId),
    ];

    // Refresh in background without affecting UI
    criticalQueries.forEach(queryKey => {
      this.queryClient.refetchQueries({ 
        queryKey, 
        type: 'active',
        stale: true 
      });
    });
  }

  // Cleanup stale data
  async cleanupStaleData() {
    // Remove queries that haven't been used in the last hour
    this.queryClient.getQueryCache().getAll()
      .filter(query => {
        const lastUsed = query.state.dataUpdatedAt;
        const oneHourAgo = Date.now() - (60 * 60 * 1000);
        return lastUsed < oneHourAgo && !query.getObserversCount();
      })
      .forEach(query => {
        this.queryClient.removeQueries({ queryKey: query.queryKey });
      });
  }
}

// Create optimized query client with advanced patterns
export function createAdvancedQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        ...advancedCacheConfig.semiStatic, // Default to semi-static
        retry: (failureCount, error: any) => {
          // Don't retry on authentication errors
          if (error?.message?.includes('auth') || error?.status === 401) {
            return false;
          }
          // Retry up to 3 times for other errors
          return failureCount < 3;
        },
        retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000), // Exponential backoff
        staleTime: 5 * 60 * 1000, // 5 minutes default
        gcTime: 30 * 60 * 1000, // 30 minutes default
      },
      mutations: {
        retry: 1, // Retry mutations once
        onError: (error: any) => {
          console.error('Mutation error:', error);
          
          // Show user-friendly error messages
          if (error?.message?.includes('network')) {
            toast.error('Network error. Please check your connection.');
          } else if (error?.message?.includes('auth')) {
            toast.error('Authentication error. Please sign in again.');
          } else {
            toast.error('An error occurred. Please try again.');
          }
        },
      },
    },
  });
}