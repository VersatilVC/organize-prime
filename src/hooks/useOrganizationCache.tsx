import { useState, useEffect, useCallback } from 'react';
import { organizationCache } from '@/lib/local-storage';
import { useOptimizedUserRole } from '@/hooks/database/useOptimizedUserRole';
import { useOrganizationData } from '@/contexts/OrganizationContext';
import type { OrganizationCache } from '@/lib/local-storage';

export function useOrganizationCache() {
  const { currentOrganization, organizations } = useOrganizationData();
  const { role, permissions } = useOptimizedUserRole();
  const [cachedOrganizations, setCachedOrganizations] = useState<OrganizationCache[]>([]);

  // Update cache when organizations or role changes
  useEffect(() => {
    if (currentOrganization && role && permissions) {
      const cacheData: OrganizationCache = {
        id: currentOrganization.id,
        name: currentOrganization.name,
        logo_url: currentOrganization.logo_url,
        permissions: permissions,
        lastUpdated: Date.now(),
        userRole: role,
      };
      
      organizationCache.set(cacheData);
    }
  }, [currentOrganization, role, permissions]);

  // Load cached organizations on mount
  useEffect(() => {
    const cached = organizationCache.getAll();
    setCachedOrganizations(cached);
  }, []);

  const getCachedOrganization = useCallback((orgId: string): OrganizationCache | null => {
    return organizationCache.get(orgId);
  }, []);

  const updateOrganizationCache = useCallback((orgData: Partial<OrganizationCache> & { id: string }) => {
    const existing = organizationCache.get(orgData.id);
    if (existing) {
      organizationCache.set({
        ...existing,
        ...orgData,
        lastUpdated: Date.now(),
      });
    }
  }, []);

  const clearOrganizationCache = useCallback((orgId?: string) => {
    if (orgId) {
      organizationCache.remove(orgId);
    } else {
      organizationCache.clear();
    }
    setCachedOrganizations(organizationCache.getAll());
  }, []);

  const getOfflineOrganizations = useCallback((): OrganizationCache[] => {
    // Return cached organizations when offline
    return organizationCache.getAll();
  }, []);

  const isOrganizationCached = useCallback((orgId: string): boolean => {
    return organizationCache.get(orgId) !== null;
  }, []);

  // Check if current organization data is available offline
  const hasOfflineAccess = currentOrganization ? 
    isOrganizationCached(currentOrganization.id) : false;

  return {
    cachedOrganizations,
    getCachedOrganization,
    updateOrganizationCache,
    clearOrganizationCache,
    getOfflineOrganizations,
    isOrganizationCached,
    hasOfflineAccess,
  };
}

// Hook for organization-specific features that work offline
export function useOfflineOrganizationFeatures(orgId?: string) {
  const { getCachedOrganization } = useOrganizationCache();
  const targetOrgId = orgId || '';
  
  const [cachedData, setCachedData] = useState<OrganizationCache | null>(null);

  useEffect(() => {
    if (targetOrgId) {
      const cached = getCachedOrganization(targetOrgId);
      setCachedData(cached);
    }
  }, [targetOrgId, getCachedOrganization]);

  const canAccessFeature = useCallback((feature: string): boolean => {
    if (!cachedData) return false;
    return cachedData.permissions.includes(feature);
  }, [cachedData]);

  const isAdmin = cachedData?.userRole === 'admin' || cachedData?.userRole === 'super_admin';
  const isSuperAdmin = cachedData?.userRole === 'super_admin';

  return {
    cachedData,
    canAccessFeature,
    isAdmin,
    isSuperAdmin,
    isOffline: !navigator.onLine,
    hasOfflineData: !!cachedData,
  };
}