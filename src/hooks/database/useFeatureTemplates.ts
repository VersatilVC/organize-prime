import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { FeatureTemplate, FeatureDependency, FeatureImportResult, FeatureExport } from '@/types/feature-templates';

export function useFeatureTemplates() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: templates = [], isLoading, error } = useQuery({
    queryKey: ['feature-templates'],
    queryFn: async (): Promise<FeatureTemplate[]> => {
      const { data, error } = await supabase
        .from('feature_templates')
        .select('*')
        .order('name');

      if (error) {
        console.error('Error fetching feature templates:', error);
        throw new Error('Failed to fetch feature templates');
      }

      return data || [];
    },
  });

  const createFromTemplateMutation = useMutation({
    mutationFn: async ({ templateId, customizations }: { 
      templateId: string; 
      customizations: Partial<FeatureTemplate['default_config']> 
    }) => {
      // Get template
      const { data: template, error: templateError } = await supabase
        .from('feature_templates')
        .select('*')
        .eq('id', templateId)
        .single();

      if (templateError) throw templateError;

      // Merge template config with customizations
      const config = { ...template.default_config, ...customizations };
      
      // Create feature from template
      const { data, error } = await supabase
        .from('system_feature_configs')
        .insert({
          feature_slug: config.display_name.toLowerCase().replace(/\s+/g, '-'),
          display_name: config.display_name,
          description: config.description,
          category: config.category,
          icon_name: config.icon_name,
          color_hex: config.color_hex,
          is_enabled_globally: true,
          is_marketplace_visible: true,
          system_menu_order: 0,
          navigation_config: config.navigation_config,
          feature_pages: config.pages || [],
        })
        .select()
        .single();

      if (error) throw error;

      // Update template usage count
      await supabase
        .from('feature_templates')
        .update({ usage_count: template.usage_count + 1 })
        .eq('id', templateId);

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['system-features'] });
      queryClient.invalidateQueries({ queryKey: ['feature-templates'] });
      toast({
        title: 'Success',
        description: 'Feature created from template successfully',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: 'Failed to create feature from template',
        variant: 'destructive',
      });
      console.error('Create from template error:', error);
    },
  });

  const saveAsTemplateMutation = useMutation({
    mutationFn: async ({ 
      featureId, 
      templateData 
    }: { 
      featureId: string; 
      templateData: Omit<FeatureTemplate, 'id' | 'created_at' | 'updated_at' | 'usage_count' | 'rating'> 
    }) => {
      // Get feature data
      const { data: feature, error: featureError } = await supabase
        .from('system_feature_configs')
        .select('*')
        .eq('id', featureId)
        .single();

      if (featureError) throw featureError;

      // Create template
      const { data, error } = await supabase
        .from('feature_templates')
        .insert({
          name: templateData.name,
          description: templateData.description,
          category: feature.category,
          icon_name: feature.icon_name,
          color_hex: feature.color_hex,
          version: templateData.version,
          author: templateData.author,
          tags: templateData.tags,
          default_config: {
            display_name: feature.display_name,
            description: feature.description,
            category: feature.category,
            icon_name: feature.icon_name,
            color_hex: feature.color_hex,
            navigation_config: feature.navigation_config,
            pages: feature.feature_pages || [],
            required_tables: templateData.default_config.required_tables,
            webhook_endpoints: templateData.default_config.webhook_endpoints,
            setup_sql: templateData.default_config.setup_sql,
            cleanup_sql: templateData.default_config.cleanup_sql,
          },
          dependencies: templateData.dependencies,
          requirements: templateData.requirements,
          is_system_template: templateData.is_system_template,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feature-templates'] });
      toast({
        title: 'Success',
        description: 'Feature saved as template successfully',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: 'Failed to save feature as template',
        variant: 'destructive',
      });
      console.error('Save as template error:', error);
    },
  });

  const exportFeaturesMutation = useMutation({
    mutationFn: async (featureIds: string[]): Promise<FeatureExport> => {
      const { data: features, error } = await supabase
        .from('system_feature_configs')
        .select('*')
        .in('id', featureIds);

      if (error) throw error;

      const exportData: FeatureExport = {
        version: '1.0',
        exported_at: new Date().toISOString(),
        exported_by: (await supabase.auth.getUser()).data.user?.id || 'unknown',
        features: features.map(feature => ({
          feature: {
            name: feature.display_name,
            description: feature.description || '',
            category: feature.category,
            icon_name: feature.icon_name,
            color_hex: feature.color_hex,
            version: '1.0',
            author: 'System',
            tags: [feature.category],
            default_config: {
              display_name: feature.display_name,
              description: feature.description || '',
              category: feature.category,
              icon_name: feature.icon_name,
              color_hex: feature.color_hex,
              navigation_config: feature.navigation_config || {},
              pages: feature.feature_pages || [],
              required_tables: [],
              webhook_endpoints: {},
              setup_sql: null,
              cleanup_sql: null,
            },
            dependencies: [],
            requirements: {
              min_plan: 'free',
              required_permissions: [],
              required_features: [],
            },
            is_system_template: true,
          },
          dependencies: [],
        })),
      };

      return exportData;
    },
    onSuccess: (data) => {
      // Download the export file
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `features-export-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({
        title: 'Success',
        description: 'Features exported successfully',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: 'Failed to export features',
        variant: 'destructive',
      });
      console.error('Export error:', error);
    },
  });

  const importFeaturesMutation = useMutation({
    mutationFn: async (importData: FeatureExport): Promise<FeatureImportResult> => {
      const result: FeatureImportResult = {
        success: true,
        imported_features: [],
        skipped_features: [],
        errors: [],
        warnings: [],
      };

      for (const featureData of importData.features) {
        try {
          const slug = featureData.feature.name.toLowerCase().replace(/\s+/g, '-');
          
          // Check if feature already exists
          const { data: existingFeature } = await supabase
            .from('system_feature_configs')
            .select('id')
            .eq('feature_slug', slug)
            .single();

          if (existingFeature) {
            result.skipped_features.push(slug);
            result.warnings.push(`Feature '${featureData.feature.name}' already exists`);
            continue;
          }

          // Import feature
          const { error } = await supabase
            .from('system_feature_configs')
            .insert({
              feature_slug: slug,
              display_name: featureData.feature.default_config.display_name,
              description: featureData.feature.default_config.description,
              category: featureData.feature.default_config.category,
              icon_name: featureData.feature.default_config.icon_name,
              color_hex: featureData.feature.default_config.color_hex,
              is_enabled_globally: false, // Start disabled for imported features
              is_marketplace_visible: true,
              system_menu_order: 0,
              navigation_config: featureData.feature.default_config.navigation_config,
              feature_pages: featureData.feature.default_config.pages,
            });

          if (error) throw error;
          result.imported_features.push(slug);
        } catch (error) {
          result.errors.push({
            feature_slug: featureData.feature.name,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
          result.success = false;
        }
      }

      return result;
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['system-features'] });
      
      if (result.success) {
        toast({
          title: 'Success',
          description: `Imported ${result.imported_features.length} features successfully`,
        });
      } else {
        toast({
          title: 'Partial Success',
          description: `Imported ${result.imported_features.length} features with ${result.errors.length} errors`,
          variant: 'destructive',
        });
      }
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: 'Failed to import features',
        variant: 'destructive',
      });
      console.error('Import error:', error);
    },
  });

  return {
    templates,
    isLoading,
    error,
    createFromTemplate: createFromTemplateMutation.mutate,
    saveAsTemplate: saveAsTemplateMutation.mutate,
    exportFeatures: exportFeaturesMutation.mutate,
    importFeatures: importFeaturesMutation.mutate,
    isCreating: createFromTemplateMutation.isPending,
    isSaving: saveAsTemplateMutation.isPending,
    isExporting: exportFeaturesMutation.isPending,
    isImporting: importFeaturesMutation.isPending,
  };
}