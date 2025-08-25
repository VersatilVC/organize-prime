import { useState, useCallback } from 'react';
import { N8NWebhookService } from '../services/N8NWebhookService';
import { N8NWebhookConfig } from '../types/AppTypes';
import { useOrganization } from '@/contexts/OrganizationContext';
import { useAuth } from '@/auth/AuthProvider';

interface UseN8NIntegrationProps {
  appId: string;
}

export function useN8NIntegration({ appId }: UseN8NIntegrationProps) {
  const { currentOrganization } = useOrganization();
  const { user } = useAuth();
  const [isTesting, setIsTesting] = useState(false);

  const testWebhook = useCallback(async (config: N8NWebhookConfig) => {
    if (!currentOrganization?.id || !user?.id) {
      throw new Error('Organization or user not available');
    }

    setIsTesting(true);
    try {
      const result = await N8NWebhookService.testWebhook(
        config,
        currentOrganization.id,
        user.id
      );
      return result;
    } finally {
      setIsTesting(false);
    }
  }, [currentOrganization?.id, user?.id]);

  const executeWebhook = useCallback(async (
    config: N8NWebhookConfig,
    payload: Record<string, any>
  ) => {
    if (!currentOrganization?.id || !user?.id) {
      throw new Error('Organization or user not available');
    }

    return N8NWebhookService.executeWebhook(
      config,
      payload,
      currentOrganization.id,
      user.id,
      appId
    );
  }, [currentOrganization?.id, user?.id, appId]);

  const getWebhookConfig = useCallback(async (webhookId: string) => {
    if (!currentOrganization?.id) {
      throw new Error('Organization not available');
    }

    return N8NWebhookService.getWebhookConfig(
      appId,
      currentOrganization.id,
      webhookId
    );
  }, [currentOrganization?.id, appId]);

  return {
    testWebhook,
    executeWebhook,
    getWebhookConfig,
    isTesting,
  };
}