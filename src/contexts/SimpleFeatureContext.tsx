import React, { createContext, useContext, ReactNode } from 'react';
import { useFeatureConfig } from '@/hooks/useFeatureConfig';
import { usePermissions } from '@/contexts/PermissionContext';

export interface SimpleFeatureContextValue {
  slug: string;
  config: any;
  isLoading: boolean;
  error: string | null;
  hasAccess: boolean;
  navigation: any[];
}

const SimpleFeatureContext = createContext<SimpleFeatureContextValue | undefined>(undefined);

interface SimpleFeatureProviderProps {
  children: ReactNode;
  slug: string;
}

export function SimpleFeatureProvider({ children, slug }: SimpleFeatureProviderProps) {
  const { data: config, isLoading: configLoading, error } = useFeatureConfig(slug);
  const { hasFeatureAccess, isLoading: permissionLoading } = usePermissions();

  const contextValue: SimpleFeatureContextValue = {
    slug,
    config: config || null,
    isLoading: configLoading || permissionLoading,
    error: error?.message || null,
    hasAccess: hasFeatureAccess(slug),
    navigation: config?.navigation_config?.menu_items || [],
  };

  return (
    <SimpleFeatureContext.Provider value={contextValue}>
      {children}
    </SimpleFeatureContext.Provider>
  );
}

export function useSimpleFeatureContext() {
  const context = useContext(SimpleFeatureContext);
  if (context === undefined) {
    throw new Error('useSimpleFeatureContext must be used within a SimpleFeatureProvider');
  }
  return context;
}

// Optional: Add isolation wrapper to prevent context conflicts
export function FeatureContextIsolation({ children }: { children: ReactNode }) {
  return (
    <div className="feature-isolation">
      {children}
    </div>
  );
}