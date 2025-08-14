import React, { createContext, useState, useEffect, useContext, ReactNode, useMemo, useCallback } from 'react';
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

interface OrganizationContextType {
  currentOrganization: Organization | null;
  organizations: Organization[];
  loading: boolean;
  setCurrentOrganization: (org: Organization | null) => void;
  refreshOrganizations: () => Promise<void>;
}

const OrganizationContext = createContext<OrganizationContextType | undefined>(undefined);

export function OrganizationProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [currentOrganization, setCurrentOrganization] = useState<Organization | null>(null);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);

  const refreshOrganizations = useCallback(async () => {
    if (!user) {
      setOrganizations([]);
      setCurrentOrganization(null);
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
      setOrganizations(userOrgs);

      // Set current organization from localStorage or first available
      const savedOrgId = safeStorage.getItemSync('currentOrganizationId');
      let currentOrg = null;

      if (savedOrgId) {
        currentOrg = userOrgs.find(org => org.id === savedOrgId) || userOrgs[0] || null;
      } else {
        currentOrg = userOrgs[0] || null;
      }

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

  const contextValue = useMemo(() => ({
    currentOrganization,
    organizations,
    loading,
    setCurrentOrganization: handleSetCurrentOrganization,
    refreshOrganizations,
  }), [currentOrganization, organizations, loading, handleSetCurrentOrganization, refreshOrganizations]);

  return (
    <OrganizationContext.Provider value={contextValue}>
      {children}
    </OrganizationContext.Provider>
  );
}

export function useOrganization() {
  const context = useContext(OrganizationContext);
  if (context === undefined) {
    throw new Error('useOrganization must be used within an OrganizationProvider');
  }
  return context;
}