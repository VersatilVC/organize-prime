import { useMemo } from 'react';


export function useN8NWebhooks() {
  const endpoints = useMemo(() => ({
    processFile: '/webhook/kb-process-file',
    chat: '/webhook/kb-ai-chat',
  }), []);

  return endpoints;
}
