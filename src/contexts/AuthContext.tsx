// Re-export the new auth system for backward compatibility
import { useAuth as useAuthOriginal, AuthProvider } from '../auth/AuthProvider';
export { AuthProvider };
export type { UserRole } from '../auth/hooks/useRoleAccess';

// Legacy hook for backward compatibility
export function useUserData() {
  const { user, loading } = useAuthOriginal();
  return { user, loading };
}

export function useAuth() {
  return useAuthOriginal();
}