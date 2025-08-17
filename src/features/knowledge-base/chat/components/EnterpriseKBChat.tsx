import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Plus, MessageSquare, Brain, Loader2, User, Bot, Menu, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { useAuth } from '@/auth/AuthProvider';
import { useOrganization } from '@/contexts/OrganizationContext';
import { useToast } from '@/hooks/use-toast';
import { 
  useOptimizedKBConversations, 
  useOptimizedKBMessages, 
  useOptimizedActiveSession,
  useOptimizedKBChatMutations,
  type KBMessage 
} from '@/hooks/database/useOptimizedChat';
import { N8NWebhookService } from '@/services/N8NWebhookService';
import { ConversationManager } from './ConversationManager';
import { cn } from '@/lib/utils';

// ===== MESSAGE BUBBLE COMPONENT =====

interface MessageBubbleProps {
  message: KBMessage;
}

const MessageBubble = React.memo(({ message }: MessageBubbleProps) => {
  const isUser = message.message_type === 'user';
  
  return (
    <div className={cn("flex gap-3", isUser ? "justify-end" : "justify-start")}>
      {!isUser && (
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
          <Bot className="h-4 w-4 text-primary" />
        </div>
      )}
      
      <div className={cn(
        "max-w-[80%] px-4 py-2 rounded-lg",
        isUser 
          ? "bg-primary text-primary-foreground" 
          : "bg-muted"
      )}>
        <p className="text-sm whitespace-pre-wrap">{message.content}</p>
        
        {/* Metadata for assistant messages */}
        {!isUser && message.source_count > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            <Badge variant="secondary" className="text-xs">
              {message.source_count} source{message.source_count > 1 ? 's' : ''}
            </Badge>
            {message.confidence_score && (
              <Badge variant="outline" className="text-xs">
                {Math.round(message.confidence_score * 100)}% confidence
              </Badge>
            )}
          </div>
        )}
        
        <div className="mt-1 text-xs opacity-70">
          {new Date(message.created_at).toLocaleTimeString()}
        </div>
      </div>
      
      {isUser && (
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary flex items-center justify-center">
          <User className="h-4 w-4 text-primary-foreground" />
        </div>
      )}
    </div>
  );
});

MessageBubble.displayName = 'MessageBubble';

// ===== CHAT INPUT COMPONENT =====

interface ChatInputProps {
  onSend: (message: string) => void;
  disabled?: boolean;
  placeholder?: string;
}

const ChatInput = React.memo(({ onSend, disabled = false, placeholder = "Ask a question about your knowledge base..." }: ChatInputProps) => {
  const [message, setMessage] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea
  const adjustTextareaHeight = useCallback(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      const newHeight = Math.min(textarea.scrollHeight, 120); // Max 6 lines
      textarea.style.height = `${newHeight}px`;
    }
  }, []);

  useEffect(() => {
    adjustTextareaHeight();
  }, [message, adjustTextareaHeight]);

  const handleSend = useCallback(() => {
    if (!message.trim() || disabled) return;
    
    onSend(message.trim());
    setMessage('');
  }, [message, disabled, onSend]);

  const handleKeyPress = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }, [handleSend]);

  return (
    <div className="flex items-end gap-2">
      <div className="flex-1 relative">
        <Textarea
          ref={textareaRef}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={handleKeyPress}
          placeholder={placeholder}
          disabled={disabled}
          className="min-h-[44px] max-h-[120px] resize-none pr-12"
          rows={1}
        />
      </div>
      
      <Button 
        onClick={handleSend}
        disabled={!message.trim() || disabled}
        size="icon"
        className="h-11 w-11 shrink-0"
      >
        {disabled ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <MessageSquare className="h-4 w-4" />
        )}
      </Button>
    </div>
  );
});

ChatInput.displayName = 'ChatInput';

// ===== EMPTY STATE COMPONENT =====

const EmptyState = React.memo(() => (
  <div className="flex flex-col items-center justify-center h-full text-center space-y-4">
    <div className="relative">
      <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
        <Brain className="h-8 w-8 text-primary" />
      </div>
    </div>
    
    <div className="space-y-2">
      <h3 className="text-lg font-semibold">Welcome to AI Assistant</h3>
      <p className="text-muted-foreground max-w-md">
        Start a conversation with your knowledge base. Ask questions, get insights, 
        and explore your documents with AI assistance.
      </p>
    </div>
    
    <div className="grid grid-cols-1 gap-2 mt-6 w-full max-w-sm">
      <Card className="text-left">
        <CardContent className="p-3">
          <p className="text-xs text-muted-foreground">
            💡 Try asking: "What are the key features of our product?"
          </p>
        </CardContent>
      </Card>
      
      <Card className="text-left">
        <CardContent className="p-3">
          <p className="text-xs text-muted-foreground">
            🔍 Or: "Find information about customer feedback"
          </p>
        </CardContent>
      </Card>
    </div>
  </div>
));

EmptyState.displayName = 'EmptyState';

// ===== LOADING STATE COMPONENT =====

const LoadingState = React.memo(() => (
  <div className="space-y-4">
    {[1, 2, 3].map((i) => (
      <div key={i} className="flex gap-3">
        <Skeleton className="w-8 h-8 rounded-full" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
        </div>
      </div>
    ))}
  </div>
));

LoadingState.displayName = 'LoadingState';

// ===== MAIN CHAT COMPONENT =====

export const EnterpriseKBChat = React.memo(() => {
  const { user } = useAuth();
  const { currentOrganization } = useOrganization();
  const { toast } = useToast();
  
  // State
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Data hooks following OrganizePrime patterns
  const { data: conversations, isLoading: isLoadingConversations } = useOptimizedKBConversations();
  const { data: messages, isLoading: isLoadingMessages } = useOptimizedKBMessages(activeConversationId);
  const { data: activeSession } = useOptimizedActiveSession(activeConversationId);
  
  // Mutations
  const { 
    createConversation, 
    sendMessage, 
    updateTitle,
    isCreating, 
    isSending 
  } = useOptimizedKBChatMutations();

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  // Auto-select first conversation if none selected
  useEffect(() => {
    if (!activeConversationId && conversations && conversations.length > 0) {
      setActiveConversationId(conversations[0].id);
    }
  }, [conversations, activeConversationId]);

  // Handlers following enterprise patterns
  const handleNewConversation = useCallback(async () => {
    if (!currentOrganization?.id || !user?.id) {
      toast({
        title: "Error",
        description: "Organization or user context not available",
        variant: "destructive",
      });
      return;
    }

    createConversation(
      { title: 'New Conversation' },
      {
        onSuccess: (newConversation) => {
          setActiveConversationId(newConversation.id);
          
          // Show welcome message immediately
          toast({
            title: "New conversation started",
            description: "You can now ask questions about your knowledge base",
          });
        }
      }
    );
  }, [createConversation, currentOrganization?.id, user?.id, toast]);

  const handleSendMessage = useCallback((content: string) => {
    if (!activeConversationId || !currentOrganization?.id || !user?.id) {
      toast({
        title: "Error", 
        description: "No active conversation",
        variant: "destructive",
      });
      return;
    }

    sendMessage({
      conversationId: activeConversationId,
      content,
      kbIds: [], // TODO: Integrate with KB selection
      modelConfig: {
        model: activeSession?.model || 'gpt-4',
        temperature: activeSession?.temperature || 0.7,
      },
    });
  }, [activeConversationId, currentOrganization?.id, user?.id, sendMessage, activeSession, toast]);

  // Loading states
  if (isLoadingConversations) {
    return (
      <div className="h-full flex flex-col bg-background">
        <div className="flex-shrink-0 border-b bg-card px-6 py-4">
          <Skeleton className="h-6 w-32" />
        </div>
        <div className="flex-1 p-6">
          <LoadingState />
        </div>
      </div>
    );
  }

  // Error state for missing organization
  if (!currentOrganization) {
    return (
      <div className="h-full flex flex-col bg-background">
        <div className="flex-1 flex items-center justify-center">
          <Card>
            <CardHeader>
              <h3 className="text-lg font-semibold">Organization Required</h3>
              <p className="text-muted-foreground">
                Please select an organization to access the AI assistant.
              </p>
            </CardHeader>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex bg-background">
      {/* Sidebar - Chat Sessions */}
      <div className={cn(
        "transition-all duration-300 border-r bg-card flex-shrink-0",
        isSidebarCollapsed ? "w-0 overflow-hidden" : "w-80"
      )}>
        {!isSidebarCollapsed && (
          <div className="h-full flex flex-col">
            {/* Sidebar Header */}
            <div className="flex-shrink-0 border-b p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Brain className="h-5 w-5 text-primary" />
                  <h3 className="font-semibold">Chat Sessions</h3>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsSidebarCollapsed(true)}
                  className="h-8 w-8 p-0"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
            
            {/* Conversations List */}
            <div className="flex-1 overflow-hidden">
              <ConversationManager
                onSelectConversation={setActiveConversationId}
                onCreateConversation={handleNewConversation}
                activeConversationId={activeConversationId}
                showSearch={false}
                showFilters={false}
                allowBulkActions={false}
              />
            </div>
          </div>
        )}
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col h-full">
        {/* Header */}
        <div className="flex-shrink-0 border-b bg-card px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {isSidebarCollapsed && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsSidebarCollapsed(false)}
                  className="h-8 w-8 p-0"
                >
                  <Menu className="h-4 w-4" />
                </Button>
              )}
              <Brain className="h-5 w-5 text-primary" />
              <h2 className="text-xl font-semibold">
                {activeSession?.title || 'AI Assistant'}
              </h2>
              {activeSession && (
                <Badge variant="secondary" className="ml-2">
                  {activeSession.message_count} message{activeSession.message_count !== 1 ? 's' : ''}
                </Badge>
              )}
            </div>
            
            <Button 
              variant="outline" 
              size="sm"
              onClick={handleNewConversation}
              disabled={isCreating}
              className="gap-2"
            >
              {isCreating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Plus className="h-4 w-4" />
              )}
              New Chat
            </Button>
          </div>
        </div>

        {/* Messages Area */}
        <div className="flex-1 overflow-hidden">
          <ScrollArea className="h-full">
            <div className="p-6 space-y-4">
              {isLoadingMessages ? (
                <LoadingState />
              ) : !messages || messages.length === 0 ? (
                <div className="h-full min-h-[400px]">
                  <EmptyState />
                </div>
              ) : (
                <>
                  {messages.map((message) => (
                    <MessageBubble key={message.id} message={message} />
                  ))}
                  
                  {/* Loading indicator for new messages */}
                  {isSending && (
                    <div className="flex gap-3 justify-start">
                      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                        <Bot className="h-4 w-4 text-primary" />
                      </div>
                      <div className="bg-muted px-4 py-2 rounded-lg">
                        <div className="flex items-center gap-2">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          <span className="text-sm text-muted-foreground">Thinking...</span>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {/* Invisible element to scroll to */}
                  <div ref={messagesEndRef} />
                </>
              )}
            </div>
          </ScrollArea>
        </div>

        {/* Sticky Input */}
        <div className="flex-shrink-0 border-t bg-card p-6">
          <ChatInput 
            onSend={handleSendMessage}
            disabled={!activeConversationId || isSending}
            placeholder={
              activeConversationId 
                ? "Ask a question about your knowledge base..." 
                : "Select a conversation or start a new one to begin chatting"
            }
          />
        </div>
      </div>
    </div>
  );
});

EnterpriseKBChat.displayName = 'EnterpriseKBChat';

// ===== WRAPPED WITH ERROR BOUNDARY =====

export default function KBChatWithErrorBoundary() {
  return (
    <ErrorBoundary>
      <EnterpriseKBChat />
    </ErrorBoundary>
  );
}