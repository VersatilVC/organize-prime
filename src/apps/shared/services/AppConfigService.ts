import { supabase } from '@/integrations/supabase/client';
import { AppConfiguration, AppConfigurationError } from '../types/AppTypes';

export class AppConfigService {
  /**
   * Get app configuration for an organization
   */
  static async getAppConfiguration(
    appId: string, 
    organizationId: string
  ): Promise<AppConfiguration | null> {
    try {
      const { data, error } = await supabase
        .from('marketplace_app_installations')
        .select('*')
        .eq('app_id', appId)
        .eq('organization_id', organizationId)
        .eq('status', 'active')
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // No rows returned - app not installed
          return null;
        }
        throw error;
      }

      return {
        id: data.id,
        appId: data.app_id,
        organizationId: data.organization_id,
        settings: data.app_settings || {},
        customNavigation: data.custom_navigation || [],
        featureFlags: data.feature_flags || {},
        lastUsedAt: data.last_used_at,
        status: data.status,
      };
    } catch (error) {
      console.error('Failed to get app configuration:', error);
      throw new AppConfigurationError(
        `Failed to load configuration for app ${appId}`,
        appId,
        organizationId
      );
    }
  }

  /**
   * Update app configuration
   */
  static async updateAppConfiguration(
    appId: string,
    organizationId: string,
    updates: Partial<AppConfiguration>
  ): Promise<AppConfiguration> {
    try {
      const updateData: any = {};
      
      if (updates.settings !== undefined) {
        updateData.app_settings = updates.settings;
      }
      
      if (updates.customNavigation !== undefined) {
        updateData.custom_navigation = updates.customNavigation;
      }
      
      if (updates.featureFlags !== undefined) {
        updateData.feature_flags = updates.featureFlags;
      }

      if (updates.status !== undefined) {
        updateData.status = updates.status;
      }

      updateData.updated_at = new Date().toISOString();
      updateData.last_used_at = new Date().toISOString();

      const { data, error } = await supabase
        .from('marketplace_app_installations')
        .update(updateData)
        .eq('app_id', appId)
        .eq('organization_id', organizationId)
        .select()
        .single();

      if (error) throw error;

      return {
        id: data.id,
        appId: data.app_id,
        organizationId: data.organization_id,
        settings: data.app_settings || {},
        customNavigation: data.custom_navigation || [],
        featureFlags: data.feature_flags || {},
        lastUsedAt: data.last_used_at,
        status: data.status,
      };
    } catch (error) {
      console.error('Failed to update app configuration:', error);
      throw new AppConfigurationError(
        `Failed to update configuration for app ${appId}`,
        appId,
        organizationId
      );
    }
  }

  /**
   * Get all installed apps for an organization
   */
  static async getInstalledApps(organizationId: string): Promise<AppConfiguration[]> {
    try {
      const { data, error } = await supabase
        .from('marketplace_app_installations')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('status', 'active')
        .order('installed_at', { ascending: false });

      if (error) throw error;

      return data.map(installation => ({
        id: installation.id,
        appId: installation.app_id,
        organizationId: installation.organization_id,
        settings: installation.app_settings || {},
        customNavigation: installation.custom_navigation || [],
        featureFlags: installation.feature_flags || {},
        lastUsedAt: installation.last_used_at,
        status: installation.status,
      }));
    } catch (error) {
      console.error('Failed to get installed apps:', error);
      throw new AppConfigurationError(
        'Failed to load installed apps',
        '',
        organizationId
      );
    }
  }

  /**
   * Check if app is installed and active
   */
  static async isAppInstalled(appId: string, organizationId: string): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from('marketplace_app_installations')
        .select('id')
        .eq('app_id', appId)
        .eq('organization_id', organizationId)
        .eq('status', 'active')
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      return !!data;
    } catch (error) {
      console.error('Failed to check app installation:', error);
      return false;
    }
  }

  /**
   * Update last used timestamp
   */
  static async updateLastUsed(appId: string, organizationId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('marketplace_app_installations')
        .update({ 
          last_used_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('app_id', appId)
        .eq('organization_id', organizationId);

      if (error) throw error;
    } catch (error) {
      console.error('Failed to update last used timestamp:', error);
      // Don't throw error for this operation - it's not critical
    }
  }

  /**
   * Validate app settings against schema
   */
  static validateSettings(
    settings: Record<string, any>,
    schema: any
  ): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!schema?.sections) {
      return { valid: true, errors: [] };
    }

    for (const section of schema.sections) {
      for (const field of section.fields) {
        const value = settings[field.key];

        // Check required fields
        if (field.required && (value === undefined || value === null || value === '')) {
          errors.push(`${field.label} is required`);
          continue;
        }

        // Skip validation if field is not required and empty
        if (!field.required && (value === undefined || value === null || value === '')) {
          continue;
        }

        // Type validation
        switch (field.type) {
          case 'number':
            if (isNaN(Number(value))) {
              errors.push(`${field.label} must be a valid number`);
            }
            break;
          case 'email':
            if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
              errors.push(`${field.label} must be a valid email address`);
            }
            break;
          case 'url':
            try {
              new URL(value);
            } catch {
              errors.push(`${field.label} must be a valid URL`);
            }
            break;
        }

        // Custom validation
        if (field.validation) {
          if (field.validation.min !== undefined && value < field.validation.min) {
            errors.push(field.validation.message || `${field.label} must be at least ${field.validation.min}`);
          }
          if (field.validation.max !== undefined && value > field.validation.max) {
            errors.push(field.validation.message || `${field.label} must be no more than ${field.validation.max}`);
          }
          if (field.validation.pattern && !new RegExp(field.validation.pattern).test(value)) {
            errors.push(field.validation.message || `${field.label} format is invalid`);
          }
        }
      }
    }

    return { valid: errors.length === 0, errors };
  }
}