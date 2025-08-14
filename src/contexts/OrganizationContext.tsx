import { createContext, useState, useEffect, useContext, ReactNode, useMemo, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/auth/AuthProvider';
import { safeStorage } from '@/lib/safe-storage';

interface Organization {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// Split organization context into methods and data for better performance
interface OrganizationMethodsContextType {
  setCurrentOrganization: (org: Organization | null) => void;
  refreshOrganizations: () => Promise<void>;
}

interface OrganizationDataContextType {
  currentOrganization: Organization | null;
  organizations: Organization[];
  loading: boolean;
}

// Legacy interface for backward compatibility
interface OrganizationContextType extends OrganizationMethodsContextType, OrganizationDataContextType {}

const OrganizationMethodsContext = createContext<OrganizationMethodsContextType | undefined>(undefined);
const OrganizationDataContext = createContext<OrganizationDataContextType | undefined>(undefined);
const OrganizationContext = createContext<OrganizationContextType | undefined>(undefined);

// Organization cache to prevent unnecessary refetching
let organizationCache: { data: Organization[]; timestamp: number } | null = null;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export function OrganizationProvider({ children }: { children: ReactNode }) {
  console.log('OrganizationProvider starting');
  const { user } = useAuth();
  const [currentOrganization, setCurrentOrganization] = useState<Organization | null>(null);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);

  // Optimized refresh with caching
  const refreshOrganizations = useCallback(async () => {
    console.log('🔍 OrganizationContext: refreshOrganizations called', { user: !!user });
    if (!user) {
      console.log('🔍 OrganizationContext: No user, clearing organizations');
      setOrganizations([]);
      setCurrentOrganization(null);
      setLoading(false);
      organizationCache = null;
      return;
    }

    // Check cache first
    const now = Date.now();
    if (organizationCache && (now - organizationCache.timestamp) < CACHE_DURATION) {
      setOrganizations(organizationCache.data);
      setLoading(false);
      return;
    }

    try {
      // Get user's organizations through memberships
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
        console.error('Error fetching organizations:', error);
        setLoading(false);
        return;
      }

      const userOrgs = memberships?.map(m => m.organizations).filter(Boolean) as Organization[] || [];
      
      // Update cache
      organizationCache = {
        data: userOrgs,
        timestamp: now
      };
      
      setOrganizations(userOrgs);

      console.log('🔍 OrganizationContext: Organizations fetched:', {
        userOrgsCount: userOrgs.length,
        userOrgs: userOrgs.map(o => ({ id: o.id, name: o.name }))
      });

      // Set current organization from localStorage or first available
      const savedOrgId = safeStorage.getItemSync('currentOrganizationId');
      let currentOrg = null;

      if (savedOrgId) {
        currentOrg = userOrgs.find(org => org.id === savedOrgId) || userOrgs[0] || null;
      } else {
        currentOrg = userOrgs[0] || null;
      }

      console.log('🔍 OrganizationContext: Setting current organization:', {
        savedOrgId,
        currentOrg: currentOrg ? { id: currentOrg.id, name: currentOrg.name } : null
      });

      setCurrentOrganization(currentOrg);
      if (currentOrg) {
        safeStorage.setItemSync('currentOrganizationId', currentOrg.id);
      }
    } catch (error) {
      console.error('Error fetching organizations:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    refreshOrganizations();
  }, [refreshOrganizations]);

  const handleSetCurrentOrganization = useCallback((org: Organization | null) => {
    setCurrentOrganization(org);
    if (org) {
      safeStorage.setItemSync('currentOrganizationId', org.id);
    } else {
      safeStorage.removeItemSync('currentOrganizationId');
    }
  }, []);

  // Memoize context values to prevent unnecessary re-renders
  const organizationMethods = useMemo(() => ({
    setCurrentOrganization: handleSetCurrentOrganization,
    refreshOrganizations,
  }), [handleSetCurrentOrganization, refreshOrganizations]);

  const organizationData = useMemo(() => ({
    currentOrganization,
    organizations,
    loading,
  }), [currentOrganization, organizations, loading]);

  // Legacy combined value for backward compatibility
  const legacyValue = useMemo(() => ({
    ...organizationData,
    ...organizationMethods,
  }), [organizationData, organizationMethods]);

  return (
    <OrganizationMethodsContext.Provider value={organizationMethods}>
      <OrganizationDataContext.Provider value={organizationData}>
        <OrganizationContext.Provider value={legacyValue}>
          {children}
        </OrganizationContext.Provider>
      </OrganizationDataContext.Provider>
    </OrganizationMethodsContext.Provider>
  );
}

// Optimized hooks for selective context subscriptions
export function useOrganizationMethods() {
  const context = useContext(OrganizationMethodsContext);
  if (context === undefined) {
    throw new Error('useOrganizationMethods must be used within an OrganizationProvider');
  }
  return context;
}

export function useOrganizationData() {
  const context = useContext(OrganizationDataContext);
  if (context === undefined) {
    throw new Error('useOrganizationData must be used within an OrganizationProvider');
  }
  return context;
}

// Legacy hook for backward compatibility
export function useOrganization() {
  const context = useContext(OrganizationContext);
  if (context === undefined) {
    throw new Error('useOrganization must be used within an OrganizationProvider');
  }
  return context;
}