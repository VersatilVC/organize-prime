// Temporary migration helper to update all useAuth imports
// This file provides a re-export to help with the transition

import { useSimpleAuth } from '@/contexts/SimpleAuthContext';

// Re-export the simple auth hook as useAuth for backward compatibility
export const useAuth = useSimpleAuth;

// This allows existing imports to continue working while we migrate
// Example: import { useAuth } from '@/lib/auth-migration';