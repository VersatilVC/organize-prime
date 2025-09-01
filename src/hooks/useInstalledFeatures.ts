import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/auth/AuthProvider';
import { useOrganization } from '@/contexts/OrganizationContext';
import { supabase } from '@/integrations/supabase/client';

/**
 * Represents an installed feature with proper typing
 */
export interface InstalledFeature {
  slug: string;
  displayName: string;
  iconName: string;
  isActive: boolean;
  installedAt: string;
  navigation: {
    name: string;
    href: string;
    icon: string;
    badge?: number;
  }[];
}

/**
 * Database response from get_user_effective_features function
 */
interface EffectiveFeatureResponse {
  feature_slug: string;
  is_enabled: boolean;
  menu_order: number;
  source: string;
}

/**
 * Feature metadata for UI display - fallback only
 */
const featureMetadata: Record<string, Pick<InstalledFeature, 'displayName' | 'iconName'>> = {
  'knowledge-base': {
    displayName: 'Knowledge Base',
    iconName: 'database',
  },
  'content-creation': {
    displayName: 'Content Engine',
    iconName: 'edit',
  },
  'market-intel': {
    displayName: 'Market Intelligence',
    iconName: 'trendingUp',
  }
};

/**
 * Hook to get user's effective features using database function
 * This moves business logic from frontend to database for security
 */
export function useInstalledFeatures() {
  const { user } = useAuth();
  const { currentOrganization } = useOrganization();
  
  // Use database function instead of client-side logic
  const { data: effectiveFeatures = [], isLoading } = useQuery({
    queryKey: ['user-effective-features', user?.id, currentOrganization?.id],
    queryFn: async (): Promise<EffectiveFeatureResponse[]> => {
      if (!user?.id || !currentOrganization?.id) {
        return [];
      }
      
      const { data, error } = await supabase.rpc('get_user_effective_features', {
        p_user_id: user.id,
        p_organization_id: currentOrganization.id
      });
      
      if (error) {
        console.error('Failed to get effective features:', error);
        return [];
      }
      
      return data || [];
    },
    enabled: !!(user?.id && currentOrganization?.id),
    staleTime: 5 * 60 * 1000, // 5 minutes
    cacheTime: 10 * 60 * 1000, // 10 minutes
  });
  
  return useMemo(() => {
    if (isLoading || !currentOrganization) return [];
    
    // Transform database response to UI format
    const installedFeatures = effectiveFeatures
      .filter(feature => feature.is_enabled)
      .map(feature => {
        const metadata = featureMetadata[feature.feature_slug];
        
        if (!metadata) {
          console.warn(`Missing metadata for feature: ${feature.feature_slug}`);
          return null;
        }
        
        return {
          slug: feature.feature_slug,
          displayName: metadata.displayName,
          iconName: metadata.iconName,
          isActive: true,
          installedAt: new Date().toISOString(), // Could be enhanced with actual install date
          navigation: [], // Navigation handled by other hooks
          menuOrder: feature.menu_order
        };
      })
      .filter((feature): feature is InstalledFeature & { menuOrder: number } => feature !== null)
      .sort((a, b) => a.menuOrder - b.menuOrder)
      .map(({ menuOrder, ...feature }) => feature);
    
    return installedFeatures;
  }, [effectiveFeatures, currentOrganization, isLoading]);
}