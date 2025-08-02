import React, { createContext, useContext, useEffect, useState, useMemo, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useUserData } from './AuthContext';

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

export function OrganizationProvider({ children }: { children: React.ReactNode }) {
  const { user } = useUserData();
  const [currentOrganization, setCurrentOrganization] = useState<Organization | null>(null);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);

  // Optimized refresh with caching
  const refreshOrganizations = useCallback(async () => {
    if (!user) {
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
      const { data: memberships } = await supabase
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

      const userOrgs = memberships?.map(m => m.organizations).filter(Boolean) as Organization[] || [];
      
      // Update cache
      organizationCache = {
        data: userOrgs,
        timestamp: now
      };
      
      setOrganizations(userOrgs);

      // Set current organization from localStorage or first available
      const savedOrgId = localStorage.getItem('currentOrganizationId');
      let currentOrg = null;

      if (savedOrgId) {
        currentOrg = userOrgs.find(org => org.id === savedOrgId) || userOrgs[0] || null;
      } else {
        currentOrg = userOrgs[0] || null;
      }

      setCurrentOrganization(currentOrg);
      if (currentOrg) {
        localStorage.setItem('currentOrganizationId', currentOrg.id);
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
      localStorage.setItem('currentOrganizationId', org.id);
    } else {
      localStorage.removeItem('currentOrganizationId');
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