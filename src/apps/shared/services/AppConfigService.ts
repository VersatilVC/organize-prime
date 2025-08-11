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
      // TODO: Remove marketplace functionality - replaced with new feature system
      console.log('App configuration requested for:', { appId, organizationId });
      
      // Return null since marketplace functionality is removed
      return null;

      // Marketplace functionality removed - tables don't exist
      // const { data, error } = await supabase.from('marketplace_app_installations')...
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
      // TODO: Remove marketplace functionality - replaced with new feature system
      console.log('App configuration update requested:', { appId, organizationId, updates });

      // Return mock data since marketplace functionality is removed
      return {
        id: 'mock-id',
        appId,
        organizationId,
        settings: updates.settings || {},
        customNavigation: updates.customNavigation || [],
        featureFlags: updates.featureFlags || {},
        lastUsedAt: new Date().toISOString(),
        status: 'active',
      };

      // Marketplace functionality removed - tables don't exist
      // const { data, error } = await supabase.from('marketplace_app_installations')...
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
      // TODO: Remove marketplace functionality - replaced with new feature system
      console.log('Installed apps requested for organization:', organizationId);

      // Return empty array since marketplace functionality is removed
      return [];

      // Marketplace functionality removed - tables don't exist
      // const { data, error } = await supabase.from('marketplace_app_installations')...
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
      // TODO: Remove marketplace functionality - replaced with new feature system
      console.log('App installation check requested:', { appId, organizationId });

      // Return false since marketplace functionality is removed
      return false;

      // Marketplace functionality removed - tables don't exist
      // const { data, error } = await supabase.from('marketplace_app_installations')...
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
      // TODO: Remove marketplace functionality - replaced with new feature system
      console.log('Last used timestamp update requested:', { appId, organizationId });

      // Marketplace functionality removed - tables don't exist
      // const { error } = await supabase.from('marketplace_app_installations')...
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