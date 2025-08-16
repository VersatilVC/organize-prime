import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useRef } from 'react';
import { useOrganization } from '@/contexts/OrganizationContext';
import { useToast } from '@/hooks/use-toast';
import { ChatSettingsService } from '../services/ChatSettingsService';
import type { ChatSettings } from '../types/ChatSettings';

export const chatSettingsKeys = {
  all: ['chat-settings'] as const,
  organization: (orgId: string) => [...chatSettingsKeys.all, 'organization', orgId] as const,
};

/**
 * Hook for managing chat settings
 */
export function useChatSettings() {
  const { currentOrganization } = useOrganization();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const orgId = currentOrganization?.id;

  // Fetch chat settings
  const settingsQuery = useQuery({
    queryKey: chatSettingsKeys.organization(orgId || ''),
    queryFn: () => ChatSettingsService.getChatSettings(orgId!),
    enabled: !!orgId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 2,
  });

  // Update settings mutation
  const updateSettingsMutation = useMutation({
    mutationFn: (settings: ChatSettings) => 
      ChatSettingsService.updateChatSettings(orgId!, settings),
    onMutate: async (newSettings) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({
        queryKey: chatSettingsKeys.organization(orgId || '')
      });

      // Snapshot previous settings
      const previousSettings = queryClient.getQueryData<ChatSettings>(
        chatSettingsKeys.organization(orgId || '')
      );

      // Optimistically update settings
      queryClient.setQueryData(
        chatSettingsKeys.organization(orgId || ''),
        newSettings
      );

      return { previousSettings };
    },
    onError: (error, variables, context) => {
      // Revert optimistic update
      if (context?.previousSettings) {
        queryClient.setQueryData(
          chatSettingsKeys.organization(orgId || ''),
          context.previousSettings
        );
      }

      console.error('Failed to update chat settings:', error);
      toast({
        title: 'Settings Update Failed',
        description: error instanceof Error ? error.message : 'Failed to save settings.',
        variant: 'destructive',
      });
    },
    onSuccess: () => {
      toast({
        title: 'Settings Saved',
        description: 'Chat settings have been updated successfully.',
      });
    },
    onSettled: () => {
      // Always invalidate to ensure we have fresh data
      queryClient.invalidateQueries({
        queryKey: chatSettingsKeys.organization(orgId || '')
      });
    },
  });

  // Reset settings mutation
  const resetSettingsMutation = useMutation({
    mutationFn: () => ChatSettingsService.resetChatSettings(orgId!),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: chatSettingsKeys.organization(orgId || '')
      });
      
      toast({
        title: 'Settings Reset',
        description: 'Chat settings have been reset to defaults.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Reset Failed',
        description: error instanceof Error ? error.message : 'Failed to reset settings.',
        variant: 'destructive',
      });
    },
  });

  // Auto-save function with debouncing
  const autoSaveSettings = useCallback((settings: ChatSettings) => {
    if (!orgId) return;

    // Clear existing timeout
    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current);
    }

    // Set new timeout for auto-save
    autoSaveTimeoutRef.current = setTimeout(() => {
      updateSettingsMutation.mutate(settings);
    }, 2000); // 2 seconds delay
  }, [orgId, updateSettingsMutation]);

  // Manual save function
  const saveSettings = useCallback((settings: ChatSettings) => {
    if (!orgId) return;

    // Clear auto-save timeout if exists
    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current);
      autoSaveTimeoutRef.current = null;
    }

    updateSettingsMutation.mutate(settings);
  }, [orgId, updateSettingsMutation]);

  // Reset to defaults
  const resetToDefaults = useCallback(() => {
    if (!orgId) return;

    // Clear auto-save timeout if exists
    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current);
      autoSaveTimeoutRef.current = null;
    }

    resetSettingsMutation.mutate();
  }, [orgId, resetSettingsMutation]);

  // Validate settings
  const validateSettings = useCallback((settings: ChatSettings) => {
    return ChatSettingsService.validateSettings(settings);
  }, []);

  // Generate system prompt from settings
  const generateSystemPrompt = useCallback((settings: ChatSettings) => {
    return ChatSettingsService.generateSystemPrompt(settings);
  }, []);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
    };
  }, []);

  return {
    // Data
    settings: settingsQuery.data,
    isLoading: settingsQuery.isLoading,
    error: settingsQuery.error,
    
    // Actions
    autoSaveSettings,
    saveSettings,
    resetToDefaults,
    validateSettings,
    generateSystemPrompt,
    
    // Status
    isSaving: updateSettingsMutation.isPending,
    isResetting: resetSettingsMutation.isPending,
    hasUnsavedChanges: !!autoSaveTimeoutRef.current,
    
    // Refetch
    refetch: settingsQuery.refetch,
  };
}

/**
 * Hook for checking if user can manage chat settings
 */
export function useCanManageChatSettings() {
  // This would integrate with your existing role checking
  // For now, returning true - implement actual role checking
  return true;
}