import React, { useState } from 'react';
import { MessageSquare, Brain, Sparkles } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ChatSidebar } from './ChatSidebar';
import { useActiveSession } from '../hooks/useChatSessions';
import { useKnowledgeBases } from '../../hooks/useKnowledgeBases';
import { cn } from '@/lib/utils';

interface ChatLayoutProps {
  className?: string;
}

export function ChatLayout({ className }: ChatLayoutProps) {
  const [activeSessionId, setActiveSessionId] = useState<string>('');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  const { session: activeSession, isLoading: isSessionLoading } = useActiveSession(activeSessionId);
  const { data: knowledgeBases } = useKnowledgeBases();

  const handleSessionSelect = (sessionId: string) => {
    setActiveSessionId(sessionId);
  };

  const handleNewChat = () => {
    // This will be handled by the sidebar's create conversation
    // The new session ID will be passed to handleSessionSelect
  };

  return (
    <div className={cn("flex h-full min-h-[600px]", className)}>
      {/* Sidebar */}
      <div className={cn(
        "transition-all duration-300 border-r",
        isSidebarCollapsed ? "w-0 overflow-hidden" : "w-80 flex-shrink-0"
      )}>
        <ChatSidebar
          activeSessionId={activeSessionId}
          onSessionSelect={handleSessionSelect}
          onNewChat={handleNewChat}
          className="h-full border-0"
        />
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
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
  session: any; // Will be replaced with proper ChatSession + messages
  isLoading: boolean;
  onToggleSidebar: () => void;
  isSidebarCollapsed: boolean;
}

function ChatInterface({ 
  session, 
  isLoading,
  onToggleSidebar,
  isSidebarCollapsed 
}: ChatInterfaceProps) {
  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading conversation...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col">
      {/* Chat Header */}
      <div className="border-b p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {isSidebarCollapsed && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onToggleSidebar}
                className="lg:hidden"
              >
                <MessageSquare className="h-4 w-4" />
              </Button>
            )}
            
            <div>
              <h1 className="font-semibold text-lg">{session.title}</h1>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-sm text-muted-foreground">
                  {session.message_count} messages
                </span>
                {session.kb_ids.length > 0 && (
                  <Badge variant="secondary" className="text-xs">
                    {session.kb_ids.length} Knowledge Base{session.kb_ids.length > 1 ? 's' : ''}
                  </Badge>
                )}
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs">
              {session.model_config?.model || 'gpt-4'}
            </Badge>
          </div>
        </div>
      </div>

      {/* Chat Messages Area */}
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <MessageSquare className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
          <h3 className="text-lg font-medium mb-2">Chat Interface Coming Soon</h3>
          <p className="text-muted-foreground mb-4">
            The messaging interface will be implemented in the next phase.
          </p>
          <p className="text-sm text-muted-foreground">
            Session ID: {session.id}
          </p>
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
  return (
    <div className="flex-1 flex flex-col">
      {/* Header */}
      <div className="border-b p-4">
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

      {/* Welcome Content */}
      <div className="flex-1 flex items-center justify-center p-8">
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
  );
}