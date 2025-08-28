/**
 * Feature Ordering Fix Utility
 * 
 * This utility fixes existing feature ordering issues and ensures
 * consistent ordering across all organizations.
 */

import { normalizeFeatureOrdering, validateFeatureOrdering, initializeFeatureOrdering } from './feature-ordering-system';

/**
 * Comprehensive fix for all feature ordering issues
 * This should be run once to fix the current issues
 */
export async function fixAllFeatureOrderingIssues(): Promise<{
  success: boolean;
  summary: string[];
  errors: string[];
}> {
  const summary: string[] = [];
  const errors: string[] = [];

  try {
    // Step 1: Validate current state
    summary.push('🔍 Validating current feature ordering...');
    const validation = await validateFeatureOrdering();
    
    if (validation.valid) {
      summary.push('✅ Feature ordering is already correct');
      return { success: true, summary, errors };
    }

    summary.push(`⚠️ Found ${validation.issues.length} ordering issues:`);
    validation.issues.forEach(issue => summary.push(`   - ${issue}`));

    // Step 2: Apply normalization
    summary.push('🔧 Applying feature ordering normalization...');
    const normalization = await normalizeFeatureOrdering();

    if (!normalization.success) {
      errors.push(...normalization.errors);
      return { success: false, summary, errors };
    }

    summary.push(`✅ Successfully updated ${normalization.updatedFeatures} feature configurations`);

    // Step 3: Re-validate to confirm fix
    summary.push('🔍 Re-validating after fixes...');
    const revalidation = await validateFeatureOrdering();

    if (revalidation.valid) {
      summary.push('✅ All feature ordering issues have been resolved');
    } else {
      errors.push('❌ Some issues remain after normalization:');
      errors.push(...revalidation.issues);
    }

    return {
      success: revalidation.valid,
      summary,
      errors
    };

  } catch (error) {
    errors.push(`Unexpected error during fix: ${error}`);
    return { success: false, summary, errors };
  }
}

/**
 * Quick setup function for development
 * Run this in the browser console to fix ordering issues
 */
export async function quickFixFeatureOrdering(): Promise<void> {
  console.log('🚀 Running quick feature ordering fix...');
  
  const result = await fixAllFeatureOrderingIssues();
  
  console.log('\n📋 Summary:');
  result.summary.forEach(line => console.log(line));
  
  if (result.errors.length > 0) {
    console.log('\n❌ Errors:');
    result.errors.forEach(line => console.error(line));
  }

  if (result.success) {
    console.log('\n✅ Feature ordering fix completed successfully!');
    console.log('💡 Refresh the page to see the updated feature order in the sidebar.');
  } else {
    console.log('\n❌ Feature ordering fix completed with errors.');
    console.log('💡 Check the errors above and run the fix again if needed.');
  }
}

// Make it available globally for easy access in development
if (typeof window !== 'undefined') {
  (window as any).fixFeatureOrdering = quickFixFeatureOrdering;
  (window as any).initializeFeatureOrdering = initializeFeatureOrdering;
  
  // Add cache clearing utility
  (window as any).clearFeatureCache = function() {
    console.log('🔄 Clearing React Query cache for organization features...');
    
    // Get the query client from the global object if available
    const queryClient = (window as any).queryClient;
    
    if (queryClient) {
      // Invalidate organization features queries
      queryClient.invalidateQueries({ queryKey: ['organization-features'] });
      queryClient.invalidateQueries({ queryKey: ['organization-feature-configs'] });
      queryClient.invalidateQueries({ queryKey: ['available-system-features'] });
      
      // Clear cache entirely to force fresh data
      queryClient.removeQueries({ queryKey: ['organization-features'] });
      queryClient.removeQueries({ queryKey: ['organization-feature-configs'] });
      
      console.log('✅ React Query cache cleared successfully');
    }
    
    // Also clear the database optimization cache if available
    const clearQueryCache = (window as any).clearQueryCache;
    if (clearQueryCache) {
      clearQueryCache('org-features');
      clearQueryCache(); // Clear all cache
      console.log('✅ Database optimization cache cleared');
    }
    
    // Clear localStorage as well
    try {
      Object.keys(localStorage).forEach(key => {
        if (key.includes('org') || key.includes('feature')) {
          localStorage.removeItem(key);
        }
      });
      console.log('✅ Local storage cache cleared');
    } catch (e) {
      console.warn('Could not clear localStorage:', e);
    }
    
    console.log('🔄 Recommend refreshing the page to see updated feature ordering');
    return 'Cache cleared! Please refresh to see changes.';
  };
}