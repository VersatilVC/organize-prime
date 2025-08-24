import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useOrganizationData } from '@/contexts/OrganizationContext';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useCallback, useMemo } from 'react';
import { devLog } from '@/lib/dev-logger';
import type { KBAIChatSettings, KBAIChatSettingsInput } from '../types/KnowledgeBaseTypes';

const QUERY_KEY_PREFIX = 'kb-ai-chat-settings';
const STALE_TIME = 10 * 60 * 1000; // 10 minutes

/**
 * Hook for managing Knowledge Base AI Chat Settings
 * Provides CRUD operations with optimistic updates and webhook integration
 */
export function useKBAIChatSettings() {
  const { currentOrganization } = useOrganizationData();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const organizationId = currentOrganization?.id;

  // Query key factory
  const queryKey = useMemo(
    () => [QUERY_KEY_PREFIX, organizationId],
    [organizationId]
  );

  // Fetch current settings
  const {
    data: settings,
    isLoading,
    error,
  } = useQuery({
    queryKey,
    queryFn: async (): Promise<KBAIChatSettings | null> => {
      if (!organizationId) {
        throw new Error('Organization ID is required');
      }

      devLog.log('🎯 Fetching AI chat settings for org:', organizationId);

      const { data, error } = await supabase
        .from('kb_ai_chat_settings')
        .select('*')
        .eq('organization_id', organizationId)
        .single();

      if (error) {
        // If no settings found, return null (will create default when saving)
        if (error.code === 'PGRST116') {
          devLog.log('🔄 No AI chat settings found, will create default');
          return null;
        }
        throw new Error(`Failed to fetch AI chat settings: ${error.message}`);
      }

      devLog.log('✅ AI chat settings loaded:', data);
      return data as KBAIChatSettings;
    },
    enabled: !!organizationId,
    staleTime: STALE_TIME,
    retry: 1,
  });

  // Get default settings
  const getDefaultSettings = useCallback((): KBAIChatSettingsInput => ({
    assistant_name: 'Knowledge Assistant',
    tone: 'friendly',
    communication_style: 'balanced',
    response_preferences: {
      cite_sources: true,
      ask_clarifying_questions: true,
      suggest_related_topics: true,
      use_examples: true,
    },
  }), []);

  // Effective settings (current or default)
  const effectiveSettings = useMemo(() => {
    if (settings) {
      return settings;
    }
    const defaults = getDefaultSettings();
    return {
      ...defaults,
      id: '',
      organization_id: organizationId || '',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    } as KBAIChatSettings;
  }, [settings, getDefaultSettings, organizationId]);

  // Save settings mutation
  const saveSettingsMutation = useMutation({
    mutationFn: async (newSettings: KBAIChatSettingsInput): Promise<KBAIChatSettings> => {
      if (!organizationId) {
        throw new Error('Organization ID is required');
      }

      devLog.log('💾 Saving AI chat settings:', newSettings);

      // Upsert operation
      const { data, error } = await supabase
        .from('kb_ai_chat_settings')
        .upsert(
          {
            organization_id: organizationId,
            ...newSettings,
          },
          {
            onConflict: 'organization_id',
          }
        )
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to save AI chat settings: ${error.message}`);
      }

      devLog.log('✅ AI chat settings saved:', data);
      return data as KBAIChatSettings;
    },
    onSuccess: (savedSettings) => {
      // Update cache optimistically
      queryClient.setQueryData(queryKey, savedSettings);
      
      toast({
        title: 'AI Chat Settings Updated',
        description: 'Your AI assistant settings have been saved successfully.',
      });

      devLog.log('🎉 AI chat settings save success');
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: `Failed to save settings: ${error.message}`,
        variant: 'destructive',
      });

      devLog.error('❌ AI chat settings save error:', error);
    },
  });

  // Simple save settings without webhook integration
  // Note: Webhooks are now managed separately via the new WebhookPanel component
  const saveSettings = useCallback(
    async (newSettings: KBAIChatSettingsInput) => {
      return await saveSettingsMutation.mutateAsync(newSettings);
    },
    [saveSettingsMutation]
  );

  // Auto-save functionality with debounce
  const autoSave = useCallback(
    (newSettings: KBAIChatSettingsInput, delay = 2000) => {
      const timeoutId = setTimeout(() => {
        saveSettings(newSettings);
      }, delay);

      return () => clearTimeout(timeoutId);
    },
    [saveSettings]
  );

  // Reset to defaults
  const resetToDefaults = useCallback(() => {
    const defaults = getDefaultSettings();
    return saveSettings(defaults);
  }, [saveSettings, getDefaultSettings]);

  return {
    // Data
    settings: effectiveSettings,
    defaultSettings: getDefaultSettings(),
    
    // State
    isLoading,
    isSaving: saveSettingsMutation.isPending,
    error,
    
    // Actions
    saveSettings,
    autoSave,
    resetToDefaults,
    
    // Raw mutations for advanced usage
    saveSettingsMutation,
  };
}