import { useN8NWebhooks } from '../hooks/useN8NWebhooks';

export function fileProcessingService() {
  const { processFile } = useN8NWebhooks();

  async function enqueue(fileInfo: Record<string, any>) {
    await fetch(processFile, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(fileInfo),
    });
  }

  return { enqueue };
}
