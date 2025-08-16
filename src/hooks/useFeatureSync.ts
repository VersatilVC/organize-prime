import { useEffect } from 'react';
import { useSystemFeatures } from '@/hooks/database/useSystemFeatures';

/**
 * Hook to automatically sync system features with default navigation configurations
 * Note: Auto-sync is currently disabled to prevent conflicts with manually configured navigation items
 */
export function useFeatureSync() {
  const { features } = useSystemFeatures();

  useEffect(() => {
    const syncFeatures = async () => {
      // Reduced logging to prevent flashing
      // console.log('🔄 Feature sync: Auto-sync disabled to prevent navigation conflicts');
      // Sync is disabled to prevent conflicts with manually configured navigation items
      // This ensures that the manually configured "Manage Knowledgebases" page
      // doesn't get overwritten or conflict with auto-generated navigation
    };

    syncFeatures();
  }, [features]);
}