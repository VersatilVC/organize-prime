import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export function useFeatureValidation() {
  const { toast } = useToast();
  const [isValidating, setIsValidating] = useState(false);

  const validateFeatureSlug = useCallback(async (slug: string, excludeId?: string): Promise<ValidationResult> => {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Basic format validation
    if (!slug) {
      errors.push('Slug is required');
      return { isValid: false, errors, warnings };
    }

    if (!/^[a-z0-9\-]+$/.test(slug)) {
      errors.push('Slug can only contain lowercase letters, numbers, and hyphens');
    }

    if (slug.length < 3) {
      errors.push('Slug must be at least 3 characters long');
    }

    if (slug.length > 50) {
      errors.push('Slug must be less than 50 characters');
    }

    if (slug.startsWith('-') || slug.endsWith('-')) {
      errors.push('Slug cannot start or end with a hyphen');
    }

    if (slug.includes('--')) {
      errors.push('Slug cannot contain consecutive hyphens');
    }

    // Reserved slugs
    const reservedSlugs = [
      'admin', 'api', 'auth', 'dashboard', 'settings', 'profile', 'users', 
      'organizations', 'system', 'public', 'private', 'static', 'assets'
    ];

    if (reservedSlugs.includes(slug)) {
      errors.push('This slug is reserved and cannot be used');
    }

    // Database uniqueness check
    if (errors.length === 0) {
      try {
        setIsValidating(true);
        let query = supabase
          .from('system_feature_configs')
          .select('id, feature_slug')
          .eq('feature_slug', slug);

        if (excludeId) {
          query = query.neq('id', excludeId);
        }

        const { data, error } = await query;

        if (error) {
          warnings.push('Could not verify slug uniqueness');
        } else if (data && data.length > 0) {
          errors.push('A feature with this slug already exists');
        }
      } catch (error) {
        warnings.push('Could not verify slug uniqueness');
      } finally {
        setIsValidating(false);
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }, []);

  const validateFeatureRoutes = useCallback((pages: any[]): ValidationResult => {
    const errors: string[] = [];
    const warnings: string[] = [];
    const routes = new Set<string>();

    pages.forEach((page, index) => {
      if (!page.route) {
        errors.push(`Page ${index + 1}: Route is required`);
        return;
      }

      // Route format validation
      if (!page.route.startsWith('/')) {
        errors.push(`Page ${index + 1}: Route must start with /`);
      }

      if (!/^\/[a-z0-9\-\/]*$/.test(page.route)) {
        errors.push(`Page ${index + 1}: Route can only contain lowercase letters, numbers, hyphens, and forward slashes`);
      }

      // Check for duplicates
      if (routes.has(page.route)) {
        errors.push(`Page ${index + 1}: Duplicate route "${page.route}"`);
      } else {
        routes.add(page.route);
      }

      // Check for conflicting routes
      const conflictingRoutes = [
        '/admin', '/api', '/auth', '/dashboard', '/settings', '/profile', 
        '/users', '/organizations', '/system', '/login', '/register', '/logout'
      ];

      if (conflictingRoutes.some(route => page.route.startsWith(route))) {
        warnings.push(`Page ${index + 1}: Route "${page.route}" might conflict with system routes`);
      }
    });

    // Check for default page
    const defaultPages = pages.filter(page => page.isDefault);
    if (defaultPages.length === 0) {
      warnings.push('No default page specified. The first page will be used as default.');
    } else if (defaultPages.length > 1) {
      errors.push('Only one page can be marked as default');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }, []);

  const validateFeatureData = useCallback(async (featureData: any, excludeId?: string): Promise<ValidationResult> => {
    const slugValidation = await validateFeatureSlug(featureData.slug, excludeId);
    const routesValidation = validateFeatureRoutes(featureData.pages || []);

    return {
      isValid: slugValidation.isValid && routesValidation.isValid,
      errors: [...slugValidation.errors, ...routesValidation.errors],
      warnings: [...slugValidation.warnings, ...routesValidation.warnings]
    };
  }, [validateFeatureSlug, validateFeatureRoutes]);

  return {
    validateFeatureSlug,
    validateFeatureRoutes,
    validateFeatureData,
    isValidating
  };
}