// Database hooks for centralized data management
export { 
  useOrganizationUsers, 
  useUpdateUserMutation, 
  useDeleteUserMutation,
  type UserWithMembership 
} from './useOrganizationUsers';

export { 
  useDashboardStats, 
  useSystemStats, 
  useOrganizationStats 
} from './useSystemStats';

export { 
  useInvitations, 
  useCreateInvitationMutation, 
  useResendInvitationMutation, 
  useCancelInvitationMutation, 
  useAcceptInvitationMutation,
  type Invitation 
} from './useInvitations';

export { 
  useOptimizedUserRole 
} from './useOptimizedUserRole';

// System features
export { useSystemFeatures } from './useSystemFeatures';
export { useOrganizationFeatures } from './useOrganizationFeatures';
export { useUserRole } from './useOptimizedUserRole';
export { useSystemFeatureConfigs } from './useSystemFeatureConfigs';
export { useOrganizationFeatureConfigs } from './useOrganizationFeatureConfigs';

// Feature webhooks
export { useFeatureWebhooks } from './useFeatureWebhooks';

// Marketplace functionality removed - tables no longer exist
// export { useEnhancedMarketplaceApps } from './useEnhancedMarketplaceApps';
// export { useMarketplaceApps } from './useMarketplaceApps';
// export { useAppCategories } from './useAppCategories';
// export { useAppReviews } from './useAppReviews';

// Re-export common types for convenience
export type DatabaseHookResult<T> = {
  data: T | undefined;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  refetch: () => void;
};

export type MutationResult = {
  mutate: (...args: any[]) => void;
  mutateAsync: (...args: any[]) => Promise<any>;
  isPending: boolean;
  isError: boolean;
  error: Error | null;
  reset: () => void;
};