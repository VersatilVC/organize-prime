// Re-export the new auth system for backward compatibility
import { useAuth as useAuthOriginal, AuthProvider } from '../auth/AuthProvider';
export { AuthProvider };

// Define UserRole type locally to avoid import issues
export type UserRole = 'super_admin' | 'admin' | 'user';

// Legacy hook for backward compatibility
export function useUserData() {
  const { user, loading } = useAuthOriginal();
  return { user, loading };
}

export function useAuth() {
  return useAuthOriginal();
}
