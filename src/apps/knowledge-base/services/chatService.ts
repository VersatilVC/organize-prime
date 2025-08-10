import { useN8NWebhooks } from '../hooks/useN8NWebhooks';

export function chatService() {
  const { chat } = useN8NWebhooks();

  async function ask(payload: { conversationId?: string; message: string }) {
    const res = await fetch(chat, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    // No strict parsing to keep scaffold minimal
    return res.ok;
  }

  return { ask };
}
