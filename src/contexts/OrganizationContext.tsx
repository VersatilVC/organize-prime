import * as React from 'react';
import { supabase, withRetry, cacheManager, getConnectionStatus } from '@/integrations/supabase/client';
import { useAuth } from '@/auth/AuthProvider';
import { safeStorage } from '@/lib/safe-storage';
import { useToast } from '@/hooks/use-toast';
import { debugSafeguards } from '@/lib/debug-safeguards';

interface Organization {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface OrganizationContextType {
  currentOrganization: Organization | null;
  organizations: Organization[];
  loading: boolean;
  error: Error | null;
  isOffline: boolean;
  retryCount: number;
  setCurrentOrganization: (org: Organization | null) => void;
  refreshOrganizations: () => Promise<void>;
  retryConnection: () => Promise<void>;
}

const OrganizationContext = React.createContext<OrganizationContextType | undefined>(undefined);

export function OrganizationProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [currentOrganization, setCurrentOrganization] = React.useState<Organization | null>(null);
  const [organizations, setOrganizations] = React.useState<Organization[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<Error | null>(null);
  const [retryCount, setRetryCount] = React.useState(0);

  // 🚫 TEMPORARILY DISABLED: Debug tracking (causing overhead)
  // React.useEffect(() => {
  //   debugSafeguards.trackRender('OrganizationProvider', { userId: user?.id, organizationsCount: organizations.length });
  // }, [user?.id, organizations.length]);

  // Check if we're in offline mode
  const isOffline = React.useMemo(() => {
    const connectionStatus = getConnectionStatus();
    return !connectionStatus.isConnected && organizations.length > 0;
  }, [organizations.length]);

  const loadCachedOrganizations = React.useCallback(() => {
    if (!user) return [];
    
    const cached = cacheManager.get(`organizations-${user.id}`);
    if (cached && Array.isArray(cached)) {
      return cached as Organization[];
    }
    return [];
  }, [user]);

  // Use useRef to avoid dependency issues with refreshOrganizations
  const refreshOrganizationsRef = React.useRef<((showErrorToast?: boolean) => Promise<void>) | null>(null);

  const refreshOrganizations = React.useCallback(async (showErrorToast = true) => {
    if (!user) {
      setOrganizations([]);
      setCurrentOrganization(null);
      setLoading(false);
      setError(null);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Try to fetch organizations with retry logic
      const result = await withRetry(async () => {
        const { data: memberships, error } = await supabase
          .from('memberships')
          .select(`
            organization_id,
            organizations (
              id,
              name,
              slug,
              logo_url,
              is_active,
              created_at,
              updated_at
            )
          `)
          .eq('user_id', user.id)
          .eq('status', 'active');

        if (error) {
          throw error;
        }

        return memberships?.map(m => m.organizations).filter(Boolean) as Organization[] || [];
      }, 3, 1000);

      setOrganizations(result);
      setRetryCount(0);

      // Cache the successful result
      cacheManager.set(`organizations-${user.id}`, result, 15 * 60 * 1000); // 15 minutes

      // Set current organization from localStorage or first available
      const savedOrgId = safeStorage.getItemSync('currentOrganizationId');
      let currentOrg = null;

      if (savedOrgId) {
        currentOrg = result.find(org => org.id === savedOrgId) || result[0] || null;
      } else {
        currentOrg = result[0] || null;
      }

      setCurrentOrganization(currentOrg);
      if (currentOrg) {
        safeStorage.setItemSync('currentOrganizationId', currentOrg.id);
      }

    } catch (fetchError) {
      const err = fetchError as Error;
      setError(err);
      setRetryCount(prev => prev + 1);

      // Try to load cached organizations
      const cachedOrgs = loadCachedOrganizations();
      if (cachedOrgs.length > 0) {
        setOrganizations(cachedOrgs);
        
        // Set current organization from cache
        const savedOrgId = safeStorage.getItemSync('currentOrganizationId');
        const currentOrg = savedOrgId ? cachedOrgs.find(org => org.id === savedOrgId) || cachedOrgs[0] : cachedOrgs[0];
        setCurrentOrganization(currentOrg || null);

        if (showErrorToast) {
          toast({
            title: "Connection Issue",
            description: "Using cached organization data. Some information may be outdated.",
            variant: "default",
          });
        }
      } else {
        // No cached data available
        if (showErrorToast) {
          toast({
            title: "Unable to Load Organizations",
            description: "Please check your connection and try again.",
            variant: "destructive",
          });
        }
      }

      console.error('Error fetching organizations:', err);
    } finally {
      setLoading(false);
    }
  }, [user?.id]); // ✅ Only depend on user.id, not the entire user object

  // Update the ref whenever refreshOrganizations changes
  React.useEffect(() => {
    refreshOrganizationsRef.current = refreshOrganizations;
  }, [refreshOrganizations]);

  const retryConnection = React.useCallback(async () => {
    if (refreshOrganizationsRef.current) {
      await refreshOrganizationsRef.current(true);
    }
  }, []); // ✅ No dependencies needed

  // ✅ CRITICAL FIX: Only run when user.id changes, not when refreshOrganizations changes
  React.useEffect(() => {
    debugSafeguards.trackEffect('OrganizationProvider:userChange', [user?.id]);
    
    if (user?.id) {
      refreshOrganizations();
    }
  }, [user?.id]); // ✅ Stable dependency

  const handleSetCurrentOrganization = React.useCallback((org: Organization | null) => {
    setCurrentOrganization(org);
    if (org) {
      safeStorage.setItemSync('currentOrganizationId', org.id);
    } else {
      safeStorage.removeItemSync('currentOrganizationId');
    }
    // Clear permissions cache when switching organizations
    cacheManager.clear('permissions-');
  }, []);

  const contextValue = React.useMemo(() => ({
    currentOrganization,
    organizations,
    loading,
    error,
    isOffline,
    retryCount,
    setCurrentOrganization: handleSetCurrentOrganization,
    refreshOrganizations,
    retryConnection,
  }), [currentOrganization, organizations, loading, error, isOffline, retryCount, handleSetCurrentOrganization, refreshOrganizations, retryConnection]);

  return React.createElement(
    OrganizationContext.Provider,
    { value: contextValue },
    children
  );
}

export function useOrganization() {
  const context = React.useContext(OrganizationContext);
  if (context === undefined) {
    throw new Error('useOrganization must be used within an OrganizationProvider');
  }
  return context;
}

// Multiple aliases for backward compatibility with different naming conventions
export const useOrganizationData = useOrganization;
export const useOrganizationMethods = useOrganization;
export const useOrganizationContext = useOrganization;

// Export types for TypeScript
export type { Organization, OrganizationContextType };