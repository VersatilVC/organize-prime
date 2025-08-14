import * as React from 'react';
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

const OrganizationContext = React.createContext<OrganizationContextType | undefined>(undefined);

export function OrganizationProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [currentOrganization, setCurrentOrganization] = React.useState<Organization | null>(null);
  const [organizations, setOrganizations] = React.useState<Organization[]>([]);
  const [loading, setLoading] = React.useState(true);

  const refreshOrganizations = React.useCallback(async () => {
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

  React.useEffect(() => {
    refreshOrganizations();
  }, [refreshOrganizations]);

  const handleSetCurrentOrganization = React.useCallback((org: Organization | null) => {
    setCurrentOrganization(org);
    if (org) {
      safeStorage.setItemSync('currentOrganizationId', org.id);
    } else {
      safeStorage.removeItemSync('currentOrganizationId');
    }
  }, []);

  const contextValue = React.useMemo(() => ({
    currentOrganization,
    organizations,
    loading,
    setCurrentOrganization: handleSetCurrentOrganization,
    refreshOrganizations,
  }), [currentOrganization, organizations, loading, handleSetCurrentOrganization, refreshOrganizations]);

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