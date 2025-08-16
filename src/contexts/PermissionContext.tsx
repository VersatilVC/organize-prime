import React, { createContext, useContext, useMemo } from 'react';
import { useOrganizationFeatures } from '@/hooks/database/useOrganizationFeatures';

interface PermissionContextType {
  hasFeatureAccess: (featureSlug: string) => boolean;
  isLoading: boolean;
  availableFeatures: string[];
}

const PermissionContext = createContext<PermissionContextType | undefined>(undefined);

interface PermissionProviderProps {
  children: React.ReactNode;
}

export function PermissionProvider({ children }: PermissionProviderProps) {
  const { data: organizationFeatures = [], isLoading } = useOrganizationFeatures();

  // Memoize permission results to prevent unnecessary re-calculations
  const permissionResults = useMemo(() => {
    const availableFeatures = organizationFeatures.map(f => f.system_feature.slug);
    const featureSet = new Set(availableFeatures);

    return {
      hasFeatureAccess: (featureSlug: string) => featureSet.has(featureSlug),
      isLoading,
      availableFeatures,
    };
  }, [organizationFeatures, isLoading]);

  return (
    <PermissionContext.Provider value={permissionResults}>
      {children}
    </PermissionContext.Provider>
  );
}

export function usePermissions() {
  const context = useContext(PermissionContext);
  if (context === undefined) {
    throw new Error('usePermissions must be used within a PermissionProvider');
  }
  return context;
}