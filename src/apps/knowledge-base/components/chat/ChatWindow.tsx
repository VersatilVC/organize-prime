import React, { useEffect, useRef, useState, useCallback } from 'react';
import { MessageSquare, Settings, Menu, X, Plus, AlertCircle, Wifi, WifiOff, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { ChatMessage, ChatConversation } from '../../hooks/useKBChat';
import { MessageBubble } from './MessageBubble';
import { ChatInput } from './ChatInput';
import { EnhancedTypingIndicator } from './EnhancedTypingIndicator';
import { KBSelector } from './KBSelector';

interface ChatWindowProps {
  conversations: ChatConversation[];
  currentConversationId: string | null;
  messages: ChatMessage[];
  onSendMessage: (message: string) => void;
  onSelectConversation: (id: string) => void;
  onNewConversation: () => void;
  isLoading: boolean;
  isTyping: boolean;
  
  // Enhanced props
  selectedKBId?: string;
  onKBSelect?: (id: string) => void;
  knowledgeBases?: any[];
  inputValue: string;
  onInputChange: (value: string) => void;
  inputDisabled: boolean;
  retryableMessages: Set<string>;
  onRetryMessage: (messageId: string) => void;
  isOnline: boolean;
  isSending: boolean;
  scrollTrigger: number;
  onSourceClick?: (source: any) => void;
  getTotalTokensUsed: () => number;
  getMessageStatus: (messageId: string) => string;
}

// Responsive detection optimized for app layout constraints
function useResponsiveLayout() {
  const [isMobile, setIsMobile] = useState(window.innerWidth < 1200);

  useEffect(() => {
    const updateLayout = () => {
      setIsMobile(window.innerWidth < 1200);
    };

    window.addEventListener('resize', updateLayout);
    return () => window.removeEventListener('resize', updateLayout);
  }, []);

  return { isMobile };
}

export function ChatWindow({
  conversations,
  currentConversationId,
  messages,
  onSendMessage,
  onSelectConversation,
  onNewConversation,
  isLoading,
  isTyping,
  selectedKBId,
  onKBSelect,
  knowledgeBases = [],
  inputValue,
  onInputChange,
  inputDisabled,
  retryableMessages,
  onRetryMessage,
  isOnline,
  isSending,
  scrollTrigger,
  onSourceClick,
  getTotalTokensUsed,
  getMessageStatus,
}: ChatWindowProps) {
  // Simple responsive detection
  const { isMobile } = useResponsiveLayout();
  
  // State management
  const [sidebarOpen, setSidebarOpen] = useState(!isMobile);
  const [searchValue, setSearchValue] = useState('');
  
  // Refs for scroll management
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  // Current conversation
  const currentConversation = conversations.find(c => c.id === currentConversationId);

  // Auto-scroll to bottom
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  // Auto-scroll when messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages.length, scrollToBottom]);

  // Auto-scroll when scrollTrigger changes
  useEffect(() => {
    if (scrollTrigger > 0) {
      setTimeout(() => scrollToBottom(), 100);
    }
  }, [scrollTrigger, scrollToBottom]);

  // Filter conversations based on search
  const filteredConversations = conversations.filter(conv =>
    conv.title?.toLowerCase().includes(searchValue.toLowerCase())
  );

  // Handle conversation selection
  const handleConversationSelect = useCallback((id: string) => {
    onSelectConversation(id);
    if (isMobile) {
      setSidebarOpen(false);
    }
  }, [onSelectConversation, isMobile]);

  // Handle new conversation
  const handleNewConversation = useCallback(() => {
    onNewConversation();
    if (isMobile) {
      setSidebarOpen(false);
    }
  }, [onNewConversation, isMobile]);

  return (
    <div className="flex h-[calc(100vh-8rem)] bg-background" data-updated="2025-08-18-v4">
      {/* Conversations Sidebar */}
      {(!isMobile || sidebarOpen) && (
        <>
          {/* Mobile Backdrop */}
          {isMobile && (
            <div 
              className="fixed inset-0 bg-black/50 z-40"
              onClick={() => setSidebarOpen(false)}
            />
          )}
          
          {/* Sidebar */}
          <div className={cn(
            "w-80 flex flex-col border-r bg-background",
            isMobile && "fixed left-0 top-0 z-50 h-full shadow-xl"
          )}>
            {/* Sidebar Header - Fixed */}
            <div className="flex-shrink-0 p-4 border-b">
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-semibold">Conversations</h2>
                <div className="flex items-center gap-2">
                  <Button onClick={handleNewConversation} size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    New
                  </Button>
                  {isMobile && (
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => setSidebarOpen(false)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input 
                  placeholder="Search conversations..." 
                  value={searchValue}
                  onChange={(e) => setSearchValue(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            
            {/* Conversation List - Scrollable */}
            <div className="flex-1 overflow-y-auto p-2">
              {filteredConversations.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <MessageSquare className="h-8 w-8 mx-auto mb-2" />
                  <p className="text-sm">No conversations yet</p>
                </div>
              ) : (
                <div className="space-y-1">
                  {filteredConversations.map((conversation) => (
                    <button
                      key={conversation.id}
                      onClick={() => handleConversationSelect(conversation.id)}
                      className={cn(
                        "w-full text-left p-3 rounded-lg transition-colors",
                        "hover:bg-muted/50",
                        currentConversationId === conversation.id 
                          ? "bg-muted" 
                          : "bg-transparent"
                      )}
                    >
                      <div className="font-medium text-sm truncate">
                        {conversation.title || 'Untitled Conversation'}
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {conversation.message_count} messages • {conversation.model}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Chat Header - Fixed */}
        <div className="flex-shrink-0 p-4 border-b bg-background">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {/* Mobile menu button */}
              {isMobile && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSidebarOpen(true)}
                  aria-label="Open conversations"
                >
                  <Menu className="h-4 w-4" />
                </Button>
              )}
              
              <MessageSquare className="h-5 w-5" />
              <div>
                <h1 className="text-xl font-semibold">
                  {currentConversation?.title || 'AI Chat'}
                </h1>
                <div className="flex items-center gap-3 mt-1">
                  <p className="text-sm text-muted-foreground">
                    {messages.length} messages • {currentConversation?.model || 'gpt-4'} • {getTotalTokensUsed()} tokens
                  </p>
                  <div className={cn(
                    "flex items-center gap-1 text-xs",
                    isOnline ? "text-green-500" : "text-red-500"
                  )}>
                    {isOnline ? (
                      <Wifi className="h-3 w-3" />
                    ) : (
                      <WifiOff className="h-3 w-3" />
                    )}
                    <span>{isOnline ? 'Online' : 'Offline'}</span>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              {/* Knowledge Base Selector */}
              <KBSelector
                knowledgeBases={knowledgeBases}
                selectedKBId={selectedKBId}
                onKBSelect={onKBSelect}
                isLoading={isLoading}
                className={cn(
                  isMobile ? "w-32" : "w-48 lg:w-64"
                )}
              />
              
              <Button variant="ghost" size="sm">
                <Settings className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Messages Area - Scrollable */}
        <div 
          className="flex-1 overflow-y-auto p-4 space-y-4"
          ref={messagesContainerRef}
        >
          {/* Empty State */}
          {messages.length === 0 && !isLoading && (
            <div className="text-center py-16">
              <MessageSquare className="h-16 w-16 mx-auto text-muted-foreground mb-6" />
              <h2 className="text-xl font-semibold mb-2">Start a conversation</h2>
              <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                Ask questions about your documents and get AI-powered answers with source citations.
              </p>
              
              {!selectedKBId && knowledgeBases.length > 0 && (
                <div className="max-w-sm mx-auto">
                  <p className="text-sm text-muted-foreground mb-3">
                    First, select a knowledge base:
                  </p>
                  <KBSelector
                    knowledgeBases={knowledgeBases}
                    selectedKBId={selectedKBId}
                    onKBSelect={onKBSelect}
                    isLoading={isLoading}
                  />
                </div>
              )}
            </div>
          )}

          {/* Loading State */}
          {isLoading && messages.length === 0 && (
            <div className="text-center py-16">
              <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-4" />
              <p className="text-muted-foreground">Loading conversation...</p>
            </div>
          )}

          {/* Offline Banner */}
          {!isOnline && (
            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3 mb-4">
              <div className="flex items-center gap-2 text-yellow-800 dark:text-yellow-200">
                <AlertCircle className="h-4 w-4" />
                <span className="text-sm font-medium">You're offline</span>
              </div>
              <p className="text-xs text-yellow-700 dark:text-yellow-300 mt-1">
                Messages will be sent when you reconnect
              </p>
            </div>
          )}

          {/* Messages */}
          {messages.map((message, index) => {
            const messageStatus = getMessageStatus(message.id);
            const canRetry = retryableMessages.has(message.id) || retryableMessages.has(message.optimisticId || '');
            
            return (
              <MessageBubble
                key={message.id || message.optimisticId}
                message={{
                  ...message,
                  status: messageStatus,
                }}
                isLatest={index === messages.length - 1}
                onSourceClick={onSourceClick}
                onRetry={canRetry ? () => onRetryMessage(message.id || message.optimisticId || '') : undefined}
              />
            );
          })}

          {/* Typing Indicator */}
          {(isTyping || isSending) && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <div className="flex space-x-1">
                <div className="w-2 h-2 bg-current rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-2 h-2 bg-current rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-2 h-2 bg-current rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
              {isTyping ? "AI is typing..." : "Sending message..."}
            </div>
          )}

          {/* Scroll anchor */}
          <div ref={messagesEndRef} />
        </div>

        {/* Message Input - Fixed */}
        <div className="flex-shrink-0 p-4 border-t bg-background">
          <div className="flex gap-2">
            <Input
              value={inputValue}
              onChange={(e) => onInputChange(e.target.value)}
              placeholder={
                !isOnline
                  ? "Offline - Check your connection..."
                  : !selectedKBId 
                  ? "Select a knowledge base first..."
                  : inputDisabled
                  ? "Processing..."
                  : "Ask a question about your documents..."
              }
              className="flex-1"
              onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && onSendMessage(inputValue)}
              disabled={inputDisabled || !selectedKBId || !isOnline}
            />
            <Button 
              onClick={() => onSendMessage(inputValue)} 
              disabled={isSending || !inputValue.trim() || inputDisabled || !selectedKBId || !isOnline}
              size="default"
            >
              {isSending ? (
                <div className="animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full" />
              ) : (
                'Send'
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}