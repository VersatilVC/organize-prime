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

export {
  useMarketplaceApps,
  useAppInstallations,
  useInstallApp,
  useUninstallApp,
  useTrackAppView,
  type MarketplaceApp,
  type AppInstallation
} from './useMarketplaceApps';

export {
  useAppCategories,
  type AppCategory
} from './useAppCategories';

export {
  useAppReviews,
  useUserAppReview,
  useCreateAppReview,
  useUpdateAppReview,
  type AppReview
} from './useAppReviews';

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