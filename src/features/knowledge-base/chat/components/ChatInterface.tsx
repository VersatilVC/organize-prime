import React, { useState, useEffect, useRef, useCallback } from 'react';
import { MessageSquare, Brain, Sparkles, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChatHeader } from './ChatHeader';
import { MessageArea } from './MessageArea';
import { StickyInput } from './StickyInput';
import { WelcomeScreen } from './WelcomeScreen';
import { useActiveSession, useChatSessions } from '../hooks/useChatSessions';
import { useChatInterface, useConversationExport } from '../hooks/useChatInterface';
import { useKnowledgeBases } from '../../hooks/useKnowledgeBases';
import { cn } from '@/lib/utils';

interface ChatInterfaceProps {
  onToggleSidebar: () => void;
  isSidebarOpen: boolean;
  isMobile: boolean;
  className?: string;
}

export function ChatInterface({ 
  onToggleSidebar, 
  isSidebarOpen, 
  isMobile,
  className 
}: ChatInterfaceProps) {
  const [activeSessionId, setActiveSessionId] = useState<string>('');

  const { session: activeSession, isLoading: isSessionLoading } = useActiveSession(activeSessionId);
  const { data: knowledgeBases } = useKnowledgeBases();
  const { createConversation, isCreating } = useChatSessions();

  const handleSessionSelect = (sessionId: string) => {
    setActiveSessionId(sessionId);
  };

  const handleNewChat = () => {
    console.log('📝 Creating new chat from interface...');
    
    // Clear current session first to show immediate feedback
    setActiveSessionId('');
    
    // Create a new conversation
    createConversation(
      { title: 'New Chat', kbIds: [] },
      {
        onSuccess: (conversationId) => {
          console.log('✅ New chat created successfully:', conversationId);
          setActiveSessionId(conversationId);
        },
        onError: (error) => {
          console.error('❌ Failed to create new chat:', error);
        }
      }
    );
  };

  return (
    <div className={cn("chat-interface flex flex-col h-full", className)}>
      {activeSessionId && activeSession ? (
        <ActiveChatInterface
          session={activeSession}
          isLoading={isSessionLoading}
          onToggleSidebar={onToggleSidebar}
          isSidebarOpen={isSidebarOpen}
          isMobile={isMobile}
          onNewChat={handleNewChat}
        />
      ) : (
        <WelcomeScreen
          onNewChat={handleNewChat}
          knowledgeBasesCount={knowledgeBases?.length || 0}
          onToggleSidebar={onToggleSidebar}
          isSidebarOpen={isSidebarOpen}
          isMobile={isMobile}
        />
      )}
    </div>
  );
}

interface ActiveChatInterfaceProps {
  session: any;
  isLoading: boolean;
  onToggleSidebar: () => void;
  isSidebarOpen: boolean;
  isMobile: boolean;
  onNewChat: () => void;
}

function ActiveChatInterface({ 
  session, 
  isLoading: isSessionLoading,
  onToggleSidebar,
  isSidebarOpen,
  isMobile,
  onNewChat
}: ActiveChatInterfaceProps) {
  const [selectedKbIds, setSelectedKbIds] = useState<string[]>(session?.kb_ids || []);
  const [modelConfig, setModelConfig] = useState({
    model: session?.model_config?.model || 'gpt-4',
    temperature: session?.model_config?.temperature || 0.7
  });

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { updateTitle } = useChatSessions();
  const { exportConversation } = useConversationExport();
  
  const {
    messages,
    isLoadingMessages,
    messagesError,
    sendMessage,
    regenerateResponse,
    handleMessageReaction,
    isProcessing,
  } = useChatInterface(session?.id);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  if (isSessionLoading) {
    return (
      <div className="flex flex-col h-full">
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
            <p className="text-muted-foreground">Loading conversation...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="flex flex-col h-full">
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <MessageSquare className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
            <h3 className="text-lg font-medium mb-2">Session Not Found</h3>
            <p className="text-muted-foreground">
              The requested conversation could not be found.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const handleTitleUpdate = (newTitle: string) => {
    updateTitle({ conversationId: session.id, title: newTitle });
  };

  const handleModelConfigChange = (config: { model: string; temperature: number }) => {
    setModelConfig(config);
  };

  const handleExportConversation = () => {
    exportConversation(messages, session.title);
  };

  const handleClearConversation = () => {
    console.log('Clear conversation requested');
  };

  const handleSendMessage = (message: string) => {
    sendMessage(message, selectedKbIds, modelConfig);
  };

  const handleRegenerateResponse = (messageId: string, originalPrompt: string) => {
    regenerateResponse(messageId, originalPrompt, modelConfig);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Chat Header */}
      <div className="flex-shrink-0 border-b bg-background">
        <ChatHeader
          session={session}
          selectedKbIds={selectedKbIds}
          onKbSelectionChange={setSelectedKbIds}
          onTitleUpdate={handleTitleUpdate}
          onModelConfigChange={handleModelConfigChange}
          onExportConversation={handleExportConversation}
          onClearConversation={handleClearConversation}
          onToggleSidebar={onToggleSidebar}
          isSidebarCollapsed={!isSidebarOpen}
          messages={messages}
          onNewChat={onNewChat}
        />
      </div>

      {/* Messages Area */}
      <MessageArea
        messages={messages}
        isLoadingMessages={isLoadingMessages}
        messagesError={messagesError}
        onRegenerateResponse={handleRegenerateResponse}
        onMessageReaction={handleMessageReaction}
        messagesEndRef={messagesEndRef}
        className="flex-1"
      />

      {/* Sticky Input */}
      <StickyInput
        conversationId={session?.id || ''}
        onSendMessage={handleSendMessage}
        disabled={!session}
        isProcessing={isProcessing}
        placeholder="Ask a question about your knowledge base..."
      />
    </div>
  );
}