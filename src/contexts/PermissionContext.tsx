import React, { createContext, useContext, useMemo } from 'react';
import { useOrganizationFeatures } from '@/hooks/database/useOrganizationFeatures';
import { useResilientQuery, useCacheManager } from '@/hooks/database/useResilientQuery';
import { useOrganization } from '@/contexts/OrganizationContext';
import { cacheManager } from '@/integrations/supabase/client';

interface PermissionContextType {
  hasFeatureAccess: (featureSlug: string) => boolean;
  isLoading: boolean;
  availableFeatures: string[];
  error: Error | null;
  isOffline: boolean;
}

const PermissionContext = createContext<PermissionContextType | undefined>(undefined);

interface PermissionProviderProps {
  children: React.ReactNode;
}

export function PermissionProvider({ children }: PermissionProviderProps) {
  const { currentOrganization } = useOrganization();
  const { clearCache } = useCacheManager();
  
  // Use existing hook with enhanced error handling
  const { data: organizationFeatures = [], isLoading, error } = useOrganizationFeatures(currentOrganization?.id);
  
  // Check for cached permissions if there's an error
  const cachedPermissions = React.useMemo(() => {
    if (error && currentOrganization?.id) {
      const cached = cacheManager.get(`permissions-${currentOrganization.id}`);
      if (cached && Array.isArray(cached)) {
        return cached.map(slug => ({ 
          system_feature: { slug },
          feature_id: slug 
        }));
      }
    }
    return [];
  }, [error, currentOrganization?.id]);
  
  const finalData = organizationFeatures.length > 0 ? organizationFeatures : cachedPermissions;
  const finalLoading = isLoading;
  const finalError = error;

  // Memoize permission results to prevent unnecessary re-calculations
  const permissionResults = useMemo(() => {
    // Check if we're in offline mode (have cached data but connection issues)
    const isOffline = !!error && finalData.length > 0;
    
    const availableFeatures = finalData.map(f => f.system_feature?.slug || f.feature_id).filter(Boolean);
    const featureSet = new Set(availableFeatures);

    // Cache permissions for offline access
    if (currentOrganization?.id && availableFeatures.length > 0) {
      cacheManager.set(`permissions-${currentOrganization.id}`, availableFeatures, 30 * 60 * 1000); // 30 minutes
    }

    return {
      hasFeatureAccess: (featureSlug: string) => {
        // Development bypass: Grant access to all features for bypass user
        if (import.meta.env.DEV && (globalThis as any).__devBypassActive) {
          console.log(`🚧 DEV: Bypass granting access to feature: ${featureSlug}`);
          return true;
        }
        
        // During loading, return true to prevent flash - let stable loading handle the timing
        if (finalLoading) {
          return true;
        }
        
        // If we have an error but no cached data, be permissive for core features
        if (finalError && finalData.length === 0) {
          const coreFeatures = ['dashboard', 'users', 'settings', 'knowledge-base'];
          return coreFeatures.includes(featureSlug);
        }
        return featureSet.has(featureSlug);
      },
      isLoading: finalLoading,
      availableFeatures,
      error: finalError,
      isOffline,
    };
  }, [finalData, finalLoading, finalError, currentOrganization?.id]);

  // Clear permissions cache when organization changes
  React.useEffect(() => {
    if (currentOrganization?.id) {
      // Clear old permissions cache
      clearCache('permissions-');
    }
  }, [currentOrganization?.id]); // ✅ Removed clearCache from dependencies to prevent re-render loops

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