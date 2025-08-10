import { useMemo } from 'react';
import { useN8NIntegration } from '@/apps/shared/hooks/useN8NIntegration';

export function useN8NWebhooks() {
  const { getWebhookUrl } = useN8NIntegration();

  const endpoints = useMemo(() => ({
    processFile: getWebhookUrl('/webhook/kb-process-file'),
    chat: getWebhookUrl('/webhook/kb-ai-chat'),
  }), [getWebhookUrl]);

  return endpoints;
}
