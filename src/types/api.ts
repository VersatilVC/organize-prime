// Comprehensive type definitions for better type safety

export interface User {
  id: string;
  full_name: string;
  username: string;
  avatar_url?: string;
  email: string;
  role?: 'admin' | 'user';
  status?: 'active' | 'inactive';
  department?: string;
  position?: string;
  joinedAt?: string;
  lastLoginAt?: string;
}

export interface Organization {
  id: string;
  name: string;
  slug: string;
  logo_url?: string;
  userRole?: 'admin' | 'user';
  memberCount?: number;
  createdAt: string;
}

export interface Membership {
  id: string;
  user_id: string;
  organization_id: string;
  role: 'admin' | 'user';
  status: 'active' | 'inactive' | 'pending';
  department?: string;
  position?: string;
  joined_at?: string;
}

export interface Invitation {
  id: string;
  email: string;
  organization_id: string;
  role: 'admin' | 'user';
  token: string;
  expires_at: string;
  accepted_at?: string;
  invited_by?: string;
  message?: string;
}

export interface Feedback {
  id: string;
  user_id?: string;
  organization_id?: string;
  type: 'bug' | 'feature' | 'improvement' | 'other';
  category?: string;
  subject: string;
  description: string;
  status: 'pending' | 'reviewing' | 'in_progress' | 'resolved' | 'closed';
  priority: 'low' | 'medium' | 'high' | 'critical';
  admin_response?: string;
  created_at: string;
  updated_at: string;
}

export interface Notification {
  id: string;
  user_id: string;
  organization_id?: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  created_at: string;
  action_url?: string;
}

// API Response types
export interface ApiResponse<T> {
  data: T;
  success: boolean;
  message?: string;
  errors?: string[];
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

// Form types
export interface InvitationRequest {
  email: string;
  organizationId: string;
  role: 'admin' | 'user';
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

// Hook return types
export interface UseUsersQueryResult {
  users: User[];
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
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