import React from 'react';
import { cn } from '@/lib/utils';
import { ConversationManager } from './ConversationManager';
import { useChatSessions } from '../hooks/useChatSessions';

interface ChatSidebarProps {
  activeSessionId?: string;
  onSessionSelect: (sessionId: string) => void;
  onNewChat: () => void;
  className?: string;
}

export function ChatSidebar({
  activeSessionId,
  onSessionSelect,
  onNewChat,
  className
}: ChatSidebarProps) {
  const { createConversation } = useChatSessions();

  const handleCreateConversation = () => {
    console.log('📝 Creating new conversation from sidebar...');
    createConversation(
      { title: 'New Chat', kbIds: [] },
      {
        onSuccess: (conversationId) => {
          console.log('✅ Sidebar new conversation created:', conversationId);
          onNewChat();
          if (conversationId) {
            onSessionSelect(conversationId);
          }
        },
        onError: (error) => {
          console.error('❌ Failed to create new chat from sidebar:', error);
        }
      }
    );
  };

  return (
    <div className={cn("h-full", className)}>
      <ConversationManager
        onSelectConversation={onSessionSelect}
        onCreateConversation={handleCreateConversation}
        activeConversationId={activeSessionId}
        showSearch={true}
        showFilters={true}
        allowBulkActions={true}
      />
    </div>
  );
}