import React from 'react';
import KBChat from '@/apps/knowledge-base/pages/KBChat';

interface ChatAppLayoutProps {
  children?: React.ReactNode;
}

export function ChatAppLayout({ children }: ChatAppLayoutProps) {
  return <KBChat />;
}