// This file is deprecated - use AuthProvider from '@/auth/AuthProvider' directly
// Keeping this file temporarily to prevent import errors during migration

export { useAuth, AuthProvider } from '@/auth/AuthProvider';

// Legacy exports for backward compatibility
export type UserRole = 'super_admin' | 'admin' | 'user';

// Re-export useAuth as useUserData for backward compatibility
export { useAuth as useUserData } from '@/auth/AuthProvider';