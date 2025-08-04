// Comprehensive type definitions for better type safety

// Base types
export type UserRole = 'admin' | 'user';
export type UserStatus = 'active' | 'inactive' | 'pending';
export type FeedbackType = 'bug' | 'feature' | 'improvement' | 'other';
export type FeedbackStatus = 'pending' | 'reviewing' | 'in_progress' | 'resolved' | 'closed';
export type FeedbackPriority = 'low' | 'medium' | 'high' | 'critical';
export type NotificationType = 'info' | 'warning' | 'success' | 'error' | 'system';
export type SubscriptionPlan = 'free' | 'basic' | 'pro' | 'enterprise';
export type SubscriptionStatus = 'active' | 'canceled' | 'past_due' | 'unpaid';

// User-related types
export interface User {
  id: string;
  full_name: string;
  username: string;
  avatar_url?: string | null;
  email: string;
  role?: UserRole;
  status?: UserStatus;
  department?: string | null;
  position?: string | null;
  phone_number?: string | null;
  bio?: string | null;
  joinedAt?: string;
  lastLoginAt?: string | null;
  first_login_completed?: boolean;
  mfa_enabled?: boolean;
  preferences?: Record<string, any>;
}

export interface Profile {
  id: string;
  full_name?: string | null;
  username?: string | null;
  avatar_url?: string | null;
  phone_number?: string | null;
  bio?: string | null;
  last_login_at?: string | null;
  first_login_completed?: boolean;
  mfa_enabled?: boolean;
  is_super_admin?: boolean;
  preferences?: Record<string, any>;
  created_at?: string;
  updated_at?: string;
}

// Organization-related types
export interface Organization {
  id: string;
  name: string;
  slug: string;
  logo_url?: string | null;
  userRole?: UserRole;
  memberCount?: number;
  subscription_plan?: SubscriptionPlan;
  subscription_status?: SubscriptionStatus;
  subscription_expires_at?: string | null;
  is_active?: boolean;
  settings?: Record<string, any>;
  security_settings?: OrganizationSecuritySettings;
  createdAt: string;
  updated_at?: string;
}

export interface OrganizationSecuritySettings {
  ip_whitelist?: string[];
  mfa_required?: boolean;
  session_timeout?: number;
  password_policy?: {
    min_length?: number;
    require_uppercase?: boolean;
    require_lowercase?: boolean;
    require_numbers?: boolean;
    require_symbols?: boolean;
  };
}

export interface Membership {
  id: string;
  user_id: string;
  organization_id: string;
  role: UserRole;
  status: UserStatus;
  department?: string | null;
  position?: string | null;
  joined_at?: string;
  invited_at?: string | null;
  invited_by?: string | null;
  created_at?: string;
}

// Invitation types
export interface Invitation {
  id: string;
  email: string;
  organization_id: string;
  role: UserRole;
  token: string;
  expires_at: string;
  accepted_at?: string | null;
  invited_by?: string | null;
  message?: string | null;
  created_at: string;
}

export interface InvitationRequest {
  email: string;
  organizationId: string;
  role: UserRole;
  department?: string;
  position?: string;
  message?: string;
  invitedBy: string;
}

export interface InvitationResponse {
  id: string;
  email: string;
  expiresAt: string;
}

// Feedback types
export interface Feedback {
  id: string;
  user_id?: string | null;
  organization_id?: string | null;
  type: FeedbackType;
  category?: string | null;
  subject: string;
  description: string;
  status: FeedbackStatus;
  priority: FeedbackPriority;
  admin_response?: string | null;
  resolution_notes?: string | null;
  internal_notes?: string | null;
  responded_by?: string | null;
  responded_at?: string | null;
  attachments?: string[] | null;
  status_history?: FeedbackStatusHistoryEntry[];
  created_at: string;
  updated_at: string;
}

export interface FeedbackStatusHistoryEntry {
  status: FeedbackStatus;
  changed_at: string;
  changed_by?: string;
  notes?: string;
}

export interface FeedbackCreateRequest {
  subject: string;
  description: string;
  type: FeedbackType;
  category?: string;
  priority?: FeedbackPriority;
  attachments?: File[];
}

// Notification types
export interface Notification {
  id: string;
  user_id: string;
  organization_id?: string | null;
  type: NotificationType;
  title: string;
  message: string;
  read: boolean;
  read_at?: string | null;
  action_url?: string | null;
  data?: Record<string, any>;
  category?: string | null;
  created_at: string;
}

export interface NotificationTemplate {
  id: string;
  type: string;
  title: string;
  message: string;
  variables: string[];
  active: boolean;
  created_at: string;
  updated_at: string;
}

// File and upload types
export interface FileUpload {
  id: string;
  file_name: string;
  file_path: string;
  mime_type?: string | null;
  file_size?: number | null;
  folder_path?: string | null;
  description?: string | null;
  is_public?: boolean;
  organization_id?: string | null;
  uploaded_by?: string | null;
  metadata?: Record<string, any>;
  created_at: string;
  updated_at?: string;
}

// Settings types
export interface SystemSetting {
  id: string;
  key: string;
  value: any;
  category?: string | null;
  description?: string | null;
  is_sensitive?: boolean;
  updated_by?: string | null;
  created_at: string;
  updated_at: string;
}

export interface OrganizationSetting {
  id: string;
  organization_id: string;
  key: string;
  value: any;
  category?: string | null;
  updated_by?: string | null;
  created_at: string;
  updated_at: string;
}

// API Response types
export interface ApiResponse<T = any> {
  data: T;
  success: boolean;
  message?: string;
  errors?: string[];
}

export interface ApiError {
  message: string;
  code?: string;
  field?: string;
  details?: Record<string, any>;
}

export interface PaginatedResponse<T = any> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
  totalPages?: number;
}

export interface QueryOptions {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  filters?: Record<string, any>;
}

// Hook return types
export interface BaseQueryResult<T = any> {
  data: T | undefined;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  refetch: () => void;
  isStale?: boolean;
  isFetching?: boolean;
}

export interface BaseMutationResult<TData = any, TVariables = any> {
  mutate: (variables: TVariables) => void;
  mutateAsync: (variables: TVariables) => Promise<TData>;
  data: TData | undefined;
  error: Error | null;
  isLoading: boolean;
  isError: boolean;
  isSuccess: boolean;
  reset: () => void;
}

export interface UseUsersQueryResult extends BaseQueryResult<User[]> {
  users: User[];
  totalUsers: number;
  hasMore: boolean;
  loadMore: () => void;
}

export interface UseDashboardDataResult {
  totalUsers: number;
  activeUsers: number;
  pendingInvitations: number;
  feedback: number;
  isLoading: boolean;
  error: Error | null;
}

export interface UseOrganizationsResult extends BaseQueryResult<Organization[]> {
  organizations: Organization[];
  currentOrganization: Organization | null;
  switchOrganization: (organizationId: string) => void;
}

// Form types
export interface LoginForm {
  email: string;
  password: string;
  remember?: boolean;
}

export interface RegisterForm {
  email: string;
  password: string;
  confirmPassword: string;
  fullName: string;
  acceptTerms: boolean;
}

export interface UserProfileForm {
  full_name: string;
  username: string;
  phone_number?: string;
  bio?: string;
}

export interface OrganizationForm {
  name: string;
  description?: string;
}

export interface PasswordResetForm {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

// Dashboard and analytics types
export interface DashboardStats {
  totalUsers: number;
  activeUsers: number;
  pendingInvitations: number;
  totalFeedback: number;
  resolvedFeedback: number;
  pendingFeedback: number;
  totalOrganizations?: number;
  totalFiles?: number;
}

export interface AnalyticsData {
  period: string;
  userGrowth: number[];
  feedbackTrends: number[];
  organizationActivity: number[];
  labels: string[];
}

// Feature and permissions types
export interface Feature {
  slug: string;
  name: string;
  description?: string;
  category?: string;
  is_enabled: boolean;
  menu_order?: number;
}

export interface FeatureAccess {
  feature_slug: string;
  is_enabled: boolean;
  source: 'system' | 'organization' | 'user';
}

// Utility types
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

export type RequiredFields<T, K extends keyof T> = T & Required<Pick<T, K>>;

export type OptionalFields<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

// Type guards
export const isUser = (obj: any): obj is User => {
  return obj && typeof obj.id === 'string' && typeof obj.email === 'string';
};

export const isOrganization = (obj: any): obj is Organization => {
  return obj && typeof obj.id === 'string' && typeof obj.name === 'string';
};

export const isFeedback = (obj: any): obj is Feedback => {
  return obj && typeof obj.id === 'string' && typeof obj.subject === 'string';
};

export const isApiError = (obj: any): obj is ApiError => {
  return obj && typeof obj.message === 'string';
};