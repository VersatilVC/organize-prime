import React, { useState, useEffect, useRef } from 'react';
import { MessageSquare, Brain, Sparkles, Loader2 } from 'lucide-react';
import './chat-layout.css';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ChatSidebar } from './ChatSidebar';
import { ChatHeader } from './ChatHeader';
import { ChatMessage } from './ChatMessage';
import { SimpleChatInput } from './SimpleChatInput';
import { useActiveSession, useChatSessions } from '../hooks/useChatSessions';
import { useChatInterface, useConversationExport } from '../hooks/useChatInterface';
import { useKnowledgeBases } from '../../hooks/useKnowledgeBases';
import { cn } from '@/lib/utils';

interface ChatLayoutProps {
  className?: string;
}

export function ChatLayout({ className }: ChatLayoutProps) {
  const [activeSessionId, setActiveSessionId] = useState<string>('');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  // Add CSS class to body for chat-specific styling
  useEffect(() => {
    document.body.classList.add('chat-page');
    return () => {
      document.body.classList.remove('chat-page');
    };
  }, []);

  const { session: activeSession, isLoading: isSessionLoading } = useActiveSession(activeSessionId);
  const { data: knowledgeBases } = useKnowledgeBases();
  const { createConversation, isCreating } = useChatSessions();

  const handleSessionSelect = (sessionId: string) => {
    setActiveSessionId(sessionId);
  };

  const handleNewChat = () => {
    console.log('📝 Creating new chat from layout...');
    
    // Clear current session first to show immediate feedback
    setActiveSessionId('');
    
    // Create a new conversation
    createConversation(
      { title: 'New Chat', kbIds: [] },
      {
        onSuccess: (conversationId) => {
          console.log('✅ New chat created successfully:', conversationId);
          // Switch to the new conversation
          setActiveSessionId(conversationId);
        },
        onError: (error) => {
          console.error('❌ Failed to create new chat:', error);
          // If creation fails, don't leave user in blank state
          // Could add toast notification here
        }
      }
    );
  };

  return (
    <div className={cn("flex h-full", className)}>
      {/* Sidebar */}
      <div className={cn(
        "transition-all duration-300 border-r bg-background flex-shrink-0",
        isSidebarCollapsed ? "w-0 overflow-hidden" : "w-80"
      )}>
        <ChatSidebar
          activeSessionId={activeSessionId}
          onSessionSelect={handleSessionSelect}
          onNewChat={handleNewChat}
          className="h-full border-0"
        />
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col h-full">
        {activeSessionId && activeSession ? (
          <ChatInterface
            session={activeSession}
            isLoading={isSessionLoading}
            onToggleSidebar={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
            isSidebarCollapsed={isSidebarCollapsed}
          />
        ) : (
          <WelcomeScreen
            onNewChat={handleNewChat}
            knowledgeBasesCount={knowledgeBases?.length || 0}
            onToggleSidebar={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
            isSidebarCollapsed={isSidebarCollapsed}
          />
        )}
      </div>
    </div>
  );
}

interface ChatInterfaceProps {
  session: any;
  isLoading: boolean;
  onToggleSidebar: () => void;
  isSidebarCollapsed: boolean;
}

function ChatInterface({ 
  session, 
  isLoading: isSessionLoading,
  onToggleSidebar,
  isSidebarCollapsed 
}: ChatInterfaceProps) {
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
    // In a real implementation, you might want to save this to the session
  };

  const handleExportConversation = () => {
    exportConversation(messages, session.title);
  };

  const handleClearConversation = () => {
    // Implementation would clear all messages in the conversation
    console.log('Clear conversation requested');
  };

  const handleSendMessage = (message: string) => {
    sendMessage(message, selectedKbIds, modelConfig);
  };

  const handleRegenerateResponse = (messageId: string, originalPrompt: string) => {
    regenerateResponse(messageId, originalPrompt, modelConfig);
  };

  return (
    <div 
      className="flex flex-col h-full chat-container" 
      style={{ 
        display: 'flex !important', 
        flexDirection: 'column !important', 
        height: '100% !important',
        minHeight: '0 !important',
        overflow: 'hidden !important'
      }}
    >
      {/* Chat Header - Fixed at top */}
      <div 
        className="flex-shrink-0 border-b bg-background chat-header" 
        style={{ 
          flexShrink: '0 !important',
          flexGrow: '0 !important',
          minHeight: 'auto !important'
        }}
      >
        <ChatHeader
          session={session}
          selectedKbIds={selectedKbIds}
          onKbSelectionChange={setSelectedKbIds}
          onTitleUpdate={handleTitleUpdate}
          onModelConfigChange={handleModelConfigChange}
          onExportConversation={handleExportConversation}
          onClearConversation={handleClearConversation}
          onToggleSidebar={onToggleSidebar}
          isSidebarCollapsed={isSidebarCollapsed}
          messages={messages}
          onNewChat={handleNewChat}
        />
      </div>

      {/* Messages Area - Scrollable middle section */}
      <div 
        className="overflow-y-auto chat-messages" 
        style={{ 
          flex: '1 1 0% !important', 
          overflowY: 'auto !important',
          overflowX: 'hidden !important',
          minHeight: '0 !important',
          height: '0 !important'
        }}
      >
        <div className="max-w-4xl mx-auto px-4 py-6">
          {isLoadingMessages ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin mr-2" />
              <span className="text-muted-foreground">Loading messages...</span>
            </div>
          ) : messagesError ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <MessageSquare className="h-8 w-8 mx-auto mb-2 text-muted-foreground opacity-50" />
                <p className="text-muted-foreground">Failed to load messages</p>
              </div>
            </div>
          ) : messages.length === 0 ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <MessageSquare className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                <h3 className="text-lg font-medium mb-2">Start the Conversation</h3>
                <p className="text-muted-foreground">
                  Send a message to begin chatting with your knowledge base.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-0">
              {messages.map((message, index) => (
                <ChatMessage
                  key={message.id}
                  message={message}
                  isLast={index === messages.length - 1}
                  onRegenerate={handleRegenerateResponse}
                  onReaction={handleMessageReaction}
                />
              ))}
              {/* Invisible element to scroll to */}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>
      </div>

      {/* Chat Input - Fixed at bottom */}
      <div 
        className="border-t bg-background shadow-sm chat-input" 
        style={{ 
          flexShrink: '0 !important',
          flexGrow: '0 !important',
          position: 'relative !important',
          zIndex: '10 !important'
        }}
      >
        <div className="max-w-4xl mx-auto px-4 py-3">
          <SimpleChatInput
            conversationId={session?.id || ''}
            onSendMessage={handleSendMessage}
            disabled={!session}
            isProcessing={isProcessing}
            placeholder="Ask a question about your knowledge base..."
          />
        </div>
      </div>
    </div>
  );
}

interface WelcomeScreenProps {
  onNewChat: () => void;
  knowledgeBasesCount: number;
  onToggleSidebar: () => void;
  isSidebarCollapsed: boolean;
}

function WelcomeScreen({ 
  onNewChat, 
  knowledgeBasesCount,
  onToggleSidebar,
  isSidebarCollapsed 
}: WelcomeScreenProps) {
  const handleSendMessage = (message: string) => {
    // Only create a new chat if there's actually a message
    if (!message || !message.trim()) {
      console.warn('🚫 Empty message, not creating chat');
      return;
    }
    
    // For welcome screen, we'll create a new chat with this message
    console.log('Starting new chat with message:', message.trim());
    onNewChat();
  };

  return (
    <div 
      className="flex flex-col h-full chat-container" 
      style={{ 
        display: 'flex !important', 
        flexDirection: 'column !important', 
        height: '100% !important',
        minHeight: '0 !important',
        overflow: 'hidden !important'
      }}
    >
      {/* Header - Fixed at top */}
      <div 
        className="flex-shrink-0 border-b p-4 bg-background chat-header" 
        style={{ 
          flexShrink: '0 !important',
          flexGrow: '0 !important'
        }}
      >
        <div className="flex items-center gap-3">
          {isSidebarCollapsed && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onToggleSidebar}
            >
              <MessageSquare className="h-4 w-4" />
            </Button>
          )}
          <h1 className="font-semibold text-lg">Knowledge Base Chat</h1>
        </div>
      </div>

      {/* Welcome Content - Scrollable middle area */}
      <div 
        className="overflow-y-auto chat-messages" 
        style={{ 
          flex: '1 1 0% !important', 
          overflowY: 'auto !important',
          overflowX: 'hidden !important',
          minHeight: '0 !important',
          height: '0 !important'
        }}
      >
        <div className="flex items-center justify-center p-8 min-h-full">
          <div className="max-w-md text-center space-y-6">
            <div className="space-y-4">
              <div className="relative">
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
                    <Brain className="h-8 w-8 text-primary" />
                  </div>
                </div>
                <div className="relative w-20 h-20 mx-auto">
                  <Sparkles className="absolute top-0 right-0 h-4 w-4 text-yellow-500 animate-pulse" />
                  <Sparkles className="absolute bottom-2 left-1 h-3 w-3 text-blue-500 animate-pulse delay-1000" />
                </div>
              </div>

              <div>
                <h2 className="text-2xl font-bold mb-2">Welcome to AI Chat</h2>
                <p className="text-muted-foreground">
                  Start a conversation with your knowledge base. Ask questions, get insights, and explore your documents with AI assistance.
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <Button onClick={onNewChat} size="lg" className="w-full">
                <MessageSquare className="h-4 w-4 mr-2" />
                Start New Chat
              </Button>

              {knowledgeBasesCount > 0 && (
                <div className="text-sm text-muted-foreground">
                  Ready to search across {knowledgeBasesCount} knowledge base{knowledgeBasesCount > 1 ? 's' : ''}
                </div>
              )}
            </div>

            {/* Feature Cards */}
            <div className="grid grid-cols-1 gap-3 mt-8">
              <Card className="text-left">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Brain className="h-4 w-4" />
                    AI-Powered Search
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <p className="text-xs text-muted-foreground">
                    Get intelligent answers from your knowledge base with context-aware responses.
                  </p>
                </CardContent>
              </Card>

              <Card className="text-left">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <MessageSquare className="h-4 w-4" />
                    Natural Conversation
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <p className="text-xs text-muted-foreground">
                    Ask follow-up questions and maintain context throughout your conversation.
                  </p>
                </CardContent>
                </Card>

              <Card className="text-left">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Sparkles className="h-4 w-4" />
                    Source References
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <p className="text-xs text-muted-foreground">
                    See exactly which documents and sections were used to answer your questions.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>

      {/* Chat Input - Fixed at bottom */}
      <div 
        className="border-t bg-background shadow-sm chat-input" 
        style={{ 
          flexShrink: '0 !important',
          flexGrow: '0 !important',
          position: 'relative !important',
          zIndex: '10 !important'
        }}
      >
        <div className="max-w-4xl mx-auto px-4 py-3">
          <SimpleChatInput
            conversationId=""
            onSendMessage={handleSendMessage}
            disabled={false}
            isProcessing={false}
            placeholder="Ask a question about your knowledge base..."
          />
        </div>
      </div>
    </div>
  );
}