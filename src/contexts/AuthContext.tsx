// Re-export the new auth system for backward compatibility
export { useAuth, AuthProvider } from '../auth/AuthProvider';
export type { UserRole } from '../auth/hooks/useRoleAccess';

// Legacy hook for backward compatibility
export function useUserData() {
  const { user, loading } = useAuth();
  return { user, loading };
}