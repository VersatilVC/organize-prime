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
      // For now, return empty array until database is updated
      return [];
    },
  });

  const createFromTemplateMutation = useMutation({
    mutationFn: async ({ templateId, customizations }: { 
      templateId: string; 
      customizations: any
    }) => {
      // For now, just return a mock response until database is updated
      return {
        id: 'mock-feature-id',
        feature_slug: 'mock-feature',
        display_name: customizations.display_name || 'Mock Feature',
        description: customizations.description || 'Mock Description',
        category: customizations.category || 'business',
      };
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
      templateData: any
    }) => {
      // For now, just return a mock response until database is updated
      return {
        id: 'mock-template-id',
        name: templateData.name,
        description: templateData.description,
        version: templateData.version,
        author: templateData.author,
      };
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
      // For now, return mock export data
      const exportData: FeatureExport = {
        version: '1.0',
        exported_at: new Date().toISOString(),
        exported_by: 'mock-user',
        features: [],
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
      // For now, return mock import result
      const result: FeatureImportResult = {
        success: true,
        imported_features: [],
        skipped_features: [],
        errors: [],
        warnings: [],
      };

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