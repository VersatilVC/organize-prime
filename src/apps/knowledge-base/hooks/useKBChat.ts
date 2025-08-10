import { useState, useCallback } from 'react';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  createdAt: number;
}

export function useKBChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);

  const send = useCallback(async (content: string) => {
    const msg: ChatMessage = { id: crypto.randomUUID(), role: 'user', content, createdAt: Date.now() };
    setMessages(prev => [...prev, msg]);
    // TODO: Call chat webhook and append assistant reply
  }, []);

  return { messages, send };
}
