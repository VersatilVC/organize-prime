// Enhanced type definitions for database operations and hooks
import { User, Organization, Feedback, Invitation, Notification } from './api';

// Database query result types
export interface DatabaseQueryResult<T = any> {
  data: T | null;
  error: DatabaseError | null;
  count?: number | null;
}

export interface DatabaseError {
  message: string;
  code?: string;
  details?: string;
  hint?: string;
}

// Supabase specific types
export interface SupabaseQueryOptions {
  select?: string;
  eq?: Record<string, any>;
  neq?: Record<string, any>;
  gt?: Record<string, any>;
  gte?: Record<string, any>;
  lt?: Record<string, any>;
  lte?: Record<string, any>;
  like?: Record<string, any>;
  ilike?: Record<string, any>;
  is?: Record<string, any>;
  in?: Record<string, any[]>;
  contains?: Record<string, any>;
  containedBy?: Record<string, any>;
  rangeGt?: Record<string, any>;
  rangeGte?: Record<string, any>;
  rangeLt?: Record<string, any>;
  rangeLte?: Record<string, any>;
  rangeAdjacent?: Record<string, any>;
  overlaps?: Record<string, any>;
  textSearch?: Record<string, any>;
  match?: Record<string, any>;
  not?: SupabaseQueryOptions;
  or?: string;
  order?: Record<string, { ascending?: boolean; nullsFirst?: boolean }>;
  limit?: number;
  offset?: number;
  head?: boolean;
  count?: 'exact' | 'planned' | 'estimated';
}

// Hook-specific types
export interface UseQueryOptions<T = any> {
  enabled?: boolean;
  staleTime?: number;
  cacheTime?: number;
  refetchOnWindowFocus?: boolean;
  refetchInterval?: number;
  retry?: boolean | number;
  retryDelay?: number;
  onSuccess?: (data: T) => void;
  onError?: (error: Error) => void;
  onSettled?: (data: T | undefined, error: Error | null) => void;
  suspense?: boolean;
  keepPreviousData?: boolean;
  placeholderData?: T;
}

export interface UseMutationOptions<TData = unknown, TError = unknown, TVariables = void> {
  onSuccess?: (data: TData, variables: TVariables) => void;
  onError?: (error: TError, variables: TVariables) => void;
  onSettled?: (data: TData | undefined, error: TError | null, variables: TVariables) => void;
  onMutate?: (variables: TVariables) => void;
  retry?: boolean | number;
  retryDelay?: number;
}

// Enhanced hook return types with better type safety
export interface BaseHookResult<T = any> {
  data: T | undefined;
  isLoading: boolean;
  isError: boolean;
  isFetching: boolean;
  isStale: boolean;
  error: Error | null;
  refetch: () => Promise<any>;
  remove: () => void;
  dataUpdatedAt: number;
  errorUpdatedAt: number;
  failureCount: number;
  isLoadingError: boolean;
  isRefetchError: boolean;
  isSuccess: boolean;
  status: 'idle' | 'loading' | 'error' | 'success';
}

export interface BaseMutationHookResult<TData = unknown, TError = Error, TVariables = void> {
  data: TData | undefined;
  error: TError | null;
  isError: boolean;
  isIdle: boolean;
  isLoading: boolean;
  isPending: boolean;
  isSuccess: boolean;
  failureCount: number;
  failureReason: TError | null;
  mutate: (variables: TVariables) => void;
  mutateAsync: (variables: TVariables) => Promise<TData>;
  reset: () => void;
  status: 'idle' | 'loading' | 'error' | 'success';
  submittedAt: number;
  variables: TVariables | undefined;
}

// User-related hook types
export interface UserWithMembership extends User {
  membershipId: string;
  organizationId: string;
  organizationName: string;
  membershipStatus: 'active' | 'inactive' | 'pending';
  invitedBy?: string;
  invitedAt?: string;
}

export interface UserQueryFilters {
  search?: string;
  role?: 'admin' | 'user' | 'all';
  status?: 'active' | 'inactive' | 'pending' | 'all';
  department?: string;
  organization?: string;
}

export interface UserQueryResult {
  users: UserWithMembership[];
  totalCount: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export interface UseUsersQueryHookResult extends BaseHookResult<UserQueryResult> {
  users: UserWithMembership[];
  totalUsers: number;
  hasMore: boolean;
  loadMore: () => Promise<void>;
  isLoadingMore: boolean;
}

// Organization-related hook types
export interface OrganizationWithStats extends Organization {
  totalMembers: number;
  adminCount: number;
  activeMembers: number;
  pendingInvitations: number;
  recentActivity: Date;
}

export interface UseOrganizationQueryHookResult extends BaseHookResult<Organization[]> {
  organizations: Organization[];
  currentOrganization: Organization | null;
  totalOrganizations: number;
  canCreateMore: boolean;
}

// Invitation-related hook types
export interface InvitationWithDetails extends Invitation {
  organizationName: string;
  inviterName?: string;
  inviterEmail?: string;
  isExpired: boolean;
  canResend: boolean;
}

export interface InvitationQueryFilters {
  status?: 'pending' | 'accepted' | 'expired' | 'all';
  organization?: string;
  dateRange?: {
    start: Date;
    end: Date;
  };
}

export interface UseInvitationsQueryHookResult extends BaseHookResult<InvitationWithDetails[]> {
  invitations: InvitationWithDetails[];
  pendingCount: number;
  acceptedCount: number;
  expiredCount: number;
}

// Feedback-related hook types
export interface FeedbackWithDetails extends Feedback {
  userDisplayName?: string;
  organizationName?: string;
  responseCount: number;
  isOverdue: boolean;
  daysOld: number;
}

export interface FeedbackQueryFilters {
  status?: 'pending' | 'reviewing' | 'in_progress' | 'resolved' | 'closed' | 'all';
  type?: 'bug' | 'feature' | 'improvement' | 'other' | 'all';
  priority?: 'low' | 'medium' | 'high' | 'critical' | 'all';
  assignedTo?: string;
  dateRange?: {
    start: Date;
    end: Date;
  };
}

export interface UseFeedbackQueryHookResult extends BaseHookResult<FeedbackWithDetails[]> {
  feedback: FeedbackWithDetails[];
  pendingCount: number;
  resolvedCount: number;
  overdueCount: number;
}

// Dashboard-related hook types
export interface DashboardMetrics {
  users: {
    total: number;
    active: number;
    newThisMonth: number;
    growthRate: number;
  };
  organizations: {
    total: number;
    active: number;
    newThisMonth: number;
  };
  feedback: {
    total: number;
    pending: number;
    resolved: number;
    responseTime: number; // average in hours
  };
  invitations: {
    pending: number;
    acceptedThisMonth: number;
    acceptanceRate: number;
  };
  files: {
    total: number;
    totalSize: number; // in bytes
    recentUploads: number;
  };
}

export interface DashboardChartData {
  userGrowth: Array<{ date: string; count: number }>;
  feedbackTrends: Array<{ date: string; created: number; resolved: number }>;
  organizationActivity: Array<{ name: string; value: number }>;
}

export interface UseDashboardHookResult extends BaseHookResult<DashboardMetrics> {
  metrics: DashboardMetrics;
  chartData: DashboardChartData;
  isAdmin: boolean;
  isSuperAdmin: boolean;
  lastUpdated: Date;
}

// Settings-related hook types
export interface SettingValue<T = any> {
  key: string;
  value: T;
  category?: string;
  isDefault: boolean;
  updatedAt: Date;
  updatedBy?: string;
}

export interface UseSettingsHookResult<T = any> extends BaseHookResult<SettingValue<T>[]> {
  settings: SettingValue<T>[];
  getSetting: <K = T>(key: string, defaultValue?: K) => K;
  updateSetting: (key: string, value: T) => Promise<void>;
  resetSetting: (key: string) => Promise<void>;
  isUpdating: boolean;
}

// Notification-related hook types
export interface NotificationWithActions extends Notification {
  canMarkAsRead: boolean;
  canDelete: boolean;
  isClickable: boolean;
  relativeTime: string;
}

export interface UseNotificationsHookResult extends BaseHookResult<NotificationWithActions[]> {
  notifications: NotificationWithActions[];
  unreadCount: number;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  deleteNotification: (id: string) => Promise<void>;
  isUpdating: boolean;
}

// File upload related types
export interface FileUploadProgress {
  file: File;
  progress: number;
  status: 'pending' | 'uploading' | 'success' | 'error';
  error?: string;
  url?: string;
}

export interface UseFileUploadHookResult {
  uploads: FileUploadProgress[];
  uploadFiles: (files: File[]) => Promise<string[]>;
  removeUpload: (fileIndex: number) => void;
  isUploading: boolean;
  totalProgress: number;
}

// Search and filtering types
export interface SearchFilters {
  query?: string;
  category?: string;
  status?: string;
  dateRange?: {
    start: Date;
    end: Date;
  };
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface SearchResult<T = any> {
  items: T[];
  totalCount: number;
  facets?: Record<string, Array<{ value: string; count: number }>>;
  suggestions?: string[];
  searchTime: number;
}

export interface UseSearchHookResult<T = any> extends BaseHookResult<SearchResult<T>> {
  searchResults: T[];
  totalResults: number;
  isSearching: boolean;
  searchQuery: string;
  search: (query: string, filters?: SearchFilters) => Promise<void>;
  clearSearch: () => void;
  suggestions: string[];
}

// Real-time subscription types
export interface RealtimeEvent<T = any> {
  eventType: 'INSERT' | 'UPDATE' | 'DELETE';
  new?: T;
  old?: T;
  timestamp: Date;
  table: string;
}

export interface UseRealtimeHookResult<T = any> {
  isConnected: boolean;
  lastEvent?: RealtimeEvent<T>;
  subscribe: (table: string, filter?: string) => void;
  unsubscribe: (table: string) => void;
  error?: Error;
}

// Bulk operations types
export interface BulkOperation<T = any> {
  operation: 'insert' | 'update' | 'delete';
  items: T[];
  options?: {
    batchSize?: number;
    continueOnError?: boolean;
    onProgress?: (completed: number, total: number) => void;
  };
}

export interface BulkOperationResult<T = any> {
  successful: T[];
  failed: Array<{ item: T; error: string }>;
  totalProcessed: number;
  duration: number;
}

export interface UseBulkOperationHookResult<T = any> {
  execute: (operation: BulkOperation<T>) => Promise<BulkOperationResult<T>>;
  isExecuting: boolean;
  progress: number;
  result?: BulkOperationResult<T>;
  cancel: () => void;
}

// Utility types for common patterns
export type EntityId = string;
export type Timestamp = string; // ISO 8601 string
export type JSONValue = string | number | boolean | null | JSONValue[] | { [key: string]: JSONValue };

// Type guards for runtime type checking
export const isUserWithMembership = (obj: any): obj is UserWithMembership => {
  return obj && typeof obj.id === 'string' && typeof obj.membershipId === 'string';
};

export const isOrganizationWithStats = (obj: any): obj is OrganizationWithStats => {
  return obj && typeof obj.id === 'string' && typeof obj.totalMembers === 'number';
};

export const isInvitationWithDetails = (obj: any): obj is InvitationWithDetails => {
  return obj && typeof obj.id === 'string' && typeof obj.organizationName === 'string';
};

export const isFeedbackWithDetails = (obj: any): obj is FeedbackWithDetails => {
  return obj && typeof obj.id === 'string' && typeof obj.daysOld === 'number';
};

// Generic utility types
export type ValueOf<T> = T[keyof T];
export type NonEmptyArray<T> = [T, ...T[]];
export type Mutable<T> = { -readonly [P in keyof T]: T[P] };
export type KeysOfType<T, U> = { [K in keyof T]: T[K] extends U ? K : never }[keyof T];
export type RequireAtLeastOne<T, Keys extends keyof T = keyof T> =
  Pick<T, Exclude<keyof T, Keys>> & {
    [K in Keys]-?: Required<Pick<T, K>> & Partial<Pick<T, Exclude<Keys, K>>>;
  }[Keys];

// Export commonly used type combinations
export type DatabaseEntity = User | Organization | Feedback | Invitation | Notification;
export type EntityWithDetails = UserWithMembership | OrganizationWithStats | FeedbackWithDetails | InvitationWithDetails;
export type QueryFilters = UserQueryFilters | FeedbackQueryFilters | InvitationQueryFilters | SearchFilters;