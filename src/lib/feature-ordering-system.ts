/**
 * Future-Proof Feature Ordering System
 * 
 * This module provides a robust, future-proof system for managing feature ordering
 * across system-level and organization-level configurations.
 * 
 * Features:
 * - Automatic ordering assignment for new features
 * - Validation to prevent ordering conflicts
 * - Migration utilities for fixing existing issues
 * - Consistent ordering logic across the application
 */

import { supabase } from '@/integrations/supabase/client';

export interface FeatureOrderingConfig {
  feature_slug: string;
  system_menu_order: number;
  org_menu_order?: number;
  organization_id?: string;
}

/**
 * Default ordering for built-in features
 * This ensures consistent ordering across all organizations
 */
const DEFAULT_FEATURE_ORDER: Record<string, number> = {
  'knowledge-base': 100,      // First feature - core functionality
  'content-creation': 200,    // Second feature - content tools
  'market-intel': 300,        // Third feature - analytics
  // Future features will use higher numbers (400+)
};

/**
 * Get the next available system menu order
 * Prevents ordering conflicts for new features
 */
export async function getNextSystemMenuOrder(): Promise<number> {
  const { data: maxOrder, error } = await supabase
    .from('system_feature_configs')
    .select('system_menu_order')
    .order('system_menu_order', { ascending: false })
    .limit(1)
    .single();

  if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
    console.error('Error getting max system menu order:', error);
    return 1000; // Safe fallback
  }

  const currentMax = maxOrder?.system_menu_order || 0;
  return Math.max(currentMax + 100, 1000); // Increment by 100, minimum 1000
}

/**
 * Get the next available org menu order for a specific organization
 */
export async function getNextOrgMenuOrder(organizationId: string): Promise<number> {
  const { data: maxOrder, error } = await supabase
    .from('organization_feature_configs')
    .select('org_menu_order')
    .eq('organization_id', organizationId)
    .order('org_menu_order', { ascending: false })
    .limit(1)
    .single();

  if (error && error.code !== 'PGRST116') {
    console.error('Error getting max org menu order:', error);
    return 1000; // Safe fallback
  }

  const currentMax = maxOrder?.org_menu_order || 0;
  return Math.max(currentMax + 100, 1000); // Increment by 100, minimum 1000
}

/**
 * Normalize feature ordering across all organizations
 * This should be called when adding new features or fixing ordering issues
 */
export async function normalizeFeatureOrdering(): Promise<{
  success: boolean;
  updatedFeatures: number;
  errors: string[];
}> {
  const errors: string[] = [];
  let updatedFeatures = 0;

  try {
    // Step 1: Fix system-level ordering based on defaults
    console.log('🔧 Normalizing system-level feature ordering...');
    
    for (const [featureSlug, defaultOrder] of Object.entries(DEFAULT_FEATURE_ORDER)) {
      const { error } = await supabase
        .from('system_feature_configs')
        .update({ 
          system_menu_order: defaultOrder,
          updated_at: new Date().toISOString()
        })
        .eq('feature_slug', featureSlug);

      if (error) {
        errors.push(`Failed to update system order for ${featureSlug}: ${error.message}`);
      } else {
        updatedFeatures++;
      }
    }

    // Step 2: Fix organization-level ordering to match system defaults
    console.log('🔧 Normalizing organization-level feature ordering...');
    
    const { data: organizations, error: orgsError } = await supabase
      .from('organizations')
      .select('id');

    if (orgsError) {
      errors.push(`Failed to fetch organizations: ${orgsError.message}`);
      return { success: false, updatedFeatures, errors };
    }

    for (const org of organizations || []) {
      for (const [featureSlug, defaultOrder] of Object.entries(DEFAULT_FEATURE_ORDER)) {
        const { error } = await supabase
          .from('organization_feature_configs')
          .update({ 
            org_menu_order: defaultOrder,
            updated_at: new Date().toISOString()
          })
          .eq('organization_id', org.id)
          .eq('feature_slug', featureSlug);

        if (error) {
          errors.push(`Failed to update org order for ${featureSlug} in org ${org.id}: ${error.message}`);
        } else {
          updatedFeatures++;
        }
      }
    }

    return {
      success: errors.length === 0,
      updatedFeatures,
      errors
    };

  } catch (error) {
    errors.push(`Unexpected error during normalization: ${error}`);
    return { success: false, updatedFeatures, errors };
  }
}

/**
 * Validate feature ordering configuration
 * Checks for duplicate orders and missing configurations
 */
export async function validateFeatureOrdering(): Promise<{
  valid: boolean;
  issues: string[];
  suggestions: string[];
}> {
  const issues: string[] = [];
  const suggestions: string[] = [];

  try {
    // Check for duplicate system menu orders
    const { data: systemFeatures, error: systemError } = await supabase
      .from('system_feature_configs')
      .select('feature_slug, system_menu_order')
      .order('system_menu_order');

    if (systemError) {
      issues.push(`Failed to fetch system features: ${systemError.message}`);
      return { valid: false, issues, suggestions };
    }

    // Check for duplicate orders
    const orderCounts = new Map<number, string[]>();
    for (const feature of systemFeatures || []) {
      const order = feature.system_menu_order;
      if (!orderCounts.has(order)) {
        orderCounts.set(order, []);
      }
      orderCounts.get(order)!.push(feature.feature_slug);
    }

    for (const [order, features] of orderCounts.entries()) {
      if (features.length > 1) {
        issues.push(`Duplicate system menu order ${order} for features: ${features.join(', ')}`);
        suggestions.push(`Run normalizeFeatureOrdering() to fix duplicate orders`);
      }
    }

    // Check for missing default orders
    for (const [featureSlug, expectedOrder] of Object.entries(DEFAULT_FEATURE_ORDER)) {
      const feature = systemFeatures?.find(f => f.feature_slug === featureSlug);
      if (!feature) {
        issues.push(`Missing system feature configuration for ${featureSlug}`);
        suggestions.push(`Create system feature config for ${featureSlug} with order ${expectedOrder}`);
      } else if (feature.system_menu_order !== expectedOrder) {
        issues.push(`Feature ${featureSlug} has order ${feature.system_menu_order}, expected ${expectedOrder}`);
        suggestions.push(`Update ${featureSlug} system order to ${expectedOrder} or run normalization`);
      }
    }

    return {
      valid: issues.length === 0,
      issues,
      suggestions
    };

  } catch (error) {
    issues.push(`Validation failed with error: ${error}`);
    return { valid: false, issues, suggestions };
  }
}

/**
 * Add a new feature with proper ordering
 * Automatically assigns appropriate menu orders
 */
export async function addFeatureWithOrdering(
  featureSlug: string,
  displayName: string,
  description: string = '',
  iconName: string = 'package',
  colorHex: string = '#6366f1'
): Promise<{
  success: boolean;
  systemOrder: number;
  error?: string;
}> {
  try {
    // Get next available system order
    const systemOrder = await getNextSystemMenuOrder();

    // Create system feature config
    const { error: systemError } = await supabase
      .from('system_feature_configs')
      .insert({
        feature_slug: featureSlug,
        display_name: displayName,
        description,
        icon_name: iconName,
        color_hex: colorHex,
        system_menu_order: systemOrder,
        is_enabled_globally: true,
        is_marketplace_visible: true,
        feature_pages: [],
        navigation_config: { pages: [] },
      });

    if (systemError) {
      return {
        success: false,
        systemOrder,
        error: `Failed to create system feature: ${systemError.message}`
      };
    }

    // Add organization configs for all existing organizations
    const { data: organizations, error: orgsError } = await supabase
      .from('organizations')
      .select('id');

    if (orgsError) {
      return {
        success: false,
        systemOrder,
        error: `Failed to fetch organizations: ${orgsError.message}`
      };
    }

    // Add organization feature configs
    for (const org of organizations || []) {
      const { error: orgError } = await supabase
        .from('organization_feature_configs')
        .insert({
          organization_id: org.id,
          feature_slug: featureSlug,
          is_enabled: true,
          is_user_accessible: true,
          org_menu_order: systemOrder, // Use same order as system
        });

      if (orgError) {
        console.warn(`Failed to create org config for ${featureSlug} in org ${org.id}:`, orgError.message);
        // Continue with other organizations rather than failing completely
      }
    }

    return {
      success: true,
      systemOrder
    };

  } catch (error) {
    return {
      success: false,
      systemOrder: 0,
      error: `Unexpected error: ${error}`
    };
  }
}

/**
 * Update feature ordering for a specific organization
 * Ensures no conflicts with other features
 */
export async function updateOrganizationFeatureOrder(
  organizationId: string,
  featureSlug: string,
  newOrder: number
): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    // Check if the order is already in use by another feature
    const { data: existingFeature, error: checkError } = await supabase
      .from('organization_feature_configs')
      .select('feature_slug')
      .eq('organization_id', organizationId)
      .eq('org_menu_order', newOrder)
      .neq('feature_slug', featureSlug)
      .single();

    if (checkError && checkError.code !== 'PGRST116') {
      return {
        success: false,
        error: `Failed to check existing order: ${checkError.message}`
      };
    }

    if (existingFeature) {
      return {
        success: false,
        error: `Order ${newOrder} is already used by feature ${existingFeature.feature_slug}`
      };
    }

    // Update the feature order
    const { error: updateError } = await supabase
      .from('organization_feature_configs')
      .update({
        org_menu_order: newOrder,
        updated_at: new Date().toISOString()
      })
      .eq('organization_id', organizationId)
      .eq('feature_slug', featureSlug);

    if (updateError) {
      return {
        success: false,
        error: `Failed to update feature order: ${updateError.message}`
      };
    }

    return { success: true };

  } catch (error) {
    return {
      success: false,
      error: `Unexpected error: ${error}`
    };
  }
}

/**
 * Get comprehensive ordering information for debugging
 */
export async function getOrderingDebugInfo(): Promise<{
  systemFeatures: Array<{ feature_slug: string; system_menu_order: number }>;
  organizationFeatures: Array<{ 
    organization_id: string; 
    feature_slug: string; 
    org_menu_order: number; 
  }>;
  conflicts: string[];
}> {
  const conflicts: string[] = [];

  // Get system features
  const { data: systemFeatures, error: systemError } = await supabase
    .from('system_feature_configs')
    .select('feature_slug, system_menu_order')
    .order('system_menu_order');

  // Get organization features
  const { data: orgFeatures, error: orgError } = await supabase
    .from('organization_feature_configs')
    .select('organization_id, feature_slug, org_menu_order')
    .order('organization_id, org_menu_order');

  if (systemError) {
    conflicts.push(`System features error: ${systemError.message}`);
  }

  if (orgError) {
    conflicts.push(`Organization features error: ${orgError.message}`);
  }

  return {
    systemFeatures: systemFeatures || [],
    organizationFeatures: orgFeatures || [],
    conflicts
  };
}

/**
 * Initialize the feature ordering system
 * Should be called during application setup
 */
export async function initializeFeatureOrdering(): Promise<void> {
  console.log('🚀 Initializing feature ordering system...');
  
  const validation = await validateFeatureOrdering();
  
  if (!validation.valid) {
    console.warn('⚠️ Feature ordering issues detected:', validation.issues);
    console.log('💡 Suggestions:', validation.suggestions);
    
    // Auto-fix if there are issues
    const normalization = await normalizeFeatureOrdering();
    if (normalization.success) {
      console.log(`✅ Fixed ordering for ${normalization.updatedFeatures} features`);
    } else {
      console.error('❌ Failed to normalize feature ordering:', normalization.errors);
    }
  } else {
    console.log('✅ Feature ordering system is properly configured');
  }
}

// Export default feature orders for reference
export { DEFAULT_FEATURE_ORDER };