// Temporary migration helper to update all useAuth imports
// This file provides a re-export to help with the transition

import { useEnhancedAuth } from '@/contexts/EnhancedAuthContext';

// Re-export the enhanced auth hook as useAuth for backward compatibility
export const useAuth = useEnhancedAuth;

// This allows existing imports to continue working while we migrate
// Example: import { useAuth } from '@/lib/auth-migration';