import React, { useState, useEffect } from 'react';
import { Send, MessageSquare, Bot, User, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { SimpleChatService, type ChatMessage } from '@/services/SimpleChatService';
import { useSimpleChat } from '@/hooks/useSimpleChat';
import { cn } from '@/lib/utils';
import { useKBAIChatSettings } from '@/apps/knowledge-base/hooks/useKBAIChatSettings';

interface SimpleChatProps {
  conversationId?: string;
  onConversationCreated?: (conversationId: string) => void;
  className?: string;
}

export function SimpleChat({ conversationId, onConversationCreated, className }: SimpleChatProps) {
  const [currentConversationId, setCurrentConversationId] = useState(conversationId || '');
  const [messageInput, setMessageInput] = useState('');
  const [isCreatingConversation, setIsCreatingConversation] = useState(false);
  const { settings: chatSettings } = useKBAIChatSettings();

  const {
    messages,
    isLoading,
    error,
    sendMessage,
    isProcessing,
    scrollRef,
  } = useSimpleChat(currentConversationId);

  // Update current conversation ID when prop changes
  useEffect(() => {
    if (conversationId) {
      setCurrentConversationId(conversationId);
    }
  }, [conversationId]);

  // Create new conversation if none provided (only for standalone usage)
  useEffect(() => {
    if (!conversationId && !currentConversationId && !isCreatingConversation) {
      setIsCreatingConversation(true);
      SimpleChatService.createConversation('New Chat', chatSettings?.custom_greeting)
        .then((newConversationId) => {
          setCurrentConversationId(newConversationId);
          onConversationCreated?.(newConversationId);
        })
        .catch((error) => {
          console.error('Failed to create conversation:', error);
        })
        .finally(() => {
          setIsCreatingConversation(false);
        });
    }
  }, [conversationId, currentConversationId, isCreatingConversation, onConversationCreated]);

  const handleSendMessage = () => {
    if (!messageInput.trim() || isProcessing) return;
    
    sendMessage(messageInput);
    setMessageInput('');
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  if (isCreatingConversation) {
    return (
      <Card className={cn("h-[600px] flex flex-col", className)}>
        <CardContent className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
            <p className="text-muted-foreground">Starting new conversation...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!currentConversationId) {
    return (
      <Card className={cn("h-[600px] flex flex-col", className)}>
        <CardContent className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <MessageSquare className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
            <h3 className="text-lg font-medium mb-2">No Conversation</h3>
            <p className="text-muted-foreground">Failed to create or load conversation.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={cn("h-full flex flex-col bg-background", className)}>
      {/* Messages Area */}
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto py-6 px-6 space-y-4 min-h-0"
      >
          {isLoading && messages.length === 0 ? (
            <div className="flex items-center justify-center min-h-full animate-fade-in">
              <div className="text-center">
                <div className="p-4 rounded-2xl bg-gradient-to-br from-primary/10 to-primary/20 border border-primary/20 mb-4 animate-scale-in">
                  <Loader2 className="h-6 w-6 animate-spin text-primary mx-auto" />
                </div>
                <p className="text-muted-foreground font-medium">Loading conversation...</p>
              </div>
            </div>
          ) : error ? (
            <div className="flex items-center justify-center min-h-full text-red-500 animate-fade-in">
              <div className="text-center p-8 rounded-2xl border border-red-200 bg-red-50/50">
                <div className="p-4 rounded-2xl bg-red-100 inline-block mb-4">
                  <Bot className="h-8 w-8 text-red-600" />
                </div>
                <p className="font-semibold">Failed to load messages</p>
                <p className="text-sm text-red-400 mt-2">Please try refreshing the page</p>
              </div>
            </div>
          ) : messages.length === 0 ? (
            <div className="flex items-center justify-center min-h-full animate-fade-in">
              <div className="text-center">
                <div className="p-6 rounded-2xl bg-gradient-to-br from-primary/10 to-muted/20 border border-primary/20 mb-4 animate-scale-in">
                  <Bot className="h-12 w-12 mx-auto text-primary animate-pulse" />
                </div>
                <h3 className="text-lg font-bold mb-2 text-foreground">Ready to chat!</h3>
                <p className="text-muted-foreground text-sm">Start a conversation by sending a message below.</p>
              </div>
            </div>
          ) : (
            messages.map((message, index) => (
              <div key={message.id} style={{ animationDelay: `${index * 100}ms` }}>
                <ChatMessageComponent message={message} />
              </div>
            ))
          )}
        </div>

      {/* Sticky Input Area */}
      <div className="flex-shrink-0 border-t border-border/50 bg-background p-6">
        <div className="flex gap-3 items-end w-full">
          <div className="flex-1">
            <Input
              value={messageInput}
              onChange={(e) => setMessageInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Ask me anything..."
              disabled={isProcessing}
              className="min-h-[40px] resize-none border border-border focus:border-primary transition-colors text-base px-4 py-3"
            />
          </div>
          <Button
            onClick={handleSendMessage}
            disabled={!messageInput.trim() || isProcessing}
            size="default"
            className="h-[40px] w-[40px] p-0"
          >
            {isProcessing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
        {isProcessing && (
          <div className="mt-4 text-sm text-muted-foreground flex items-center gap-3 animate-fade-in">
            <div className="flex gap-1">
              <div className="w-2 h-2 bg-primary rounded-full animate-bounce"></div>
              <div className="w-2 h-2 bg-primary rounded-full animate-bounce delay-150"></div>
              <div className="w-2 h-2 bg-primary rounded-full animate-bounce delay-300"></div>
            </div>
            <span className="font-medium bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent">
              AI is thinking...
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

interface ChatMessageComponentProps {
  message: ChatMessage;
}

function ChatMessageComponent({ message }: ChatMessageComponentProps) {
  const isUser = message.message_type === 'user';
  const isProcessing = message.processing_status === 'processing';
  const hasError = message.processing_status === 'error';

  return (
    <div className={cn("flex gap-3 group animate-slide-up w-full", isUser ? "justify-end" : "justify-start")}>
      {!isUser && (
        <Avatar className="h-8 w-8 border border-primary/30 shadow bg-gradient-to-br from-primary/10 to-primary/20">
          <AvatarFallback className="bg-gradient-to-br from-primary/20 to-primary/30 text-primary">
            <Bot className="h-4 w-4" />
          </AvatarFallback>
        </Avatar>
      )}
      
      <div className={cn(
        "max-w-[85%] rounded-2xl px-4 py-3 shadow-lg transition-all duration-300 group-hover:shadow-xl group-hover:scale-[1.02]",
        "word-wrap break-words overflow-wrap-anywhere backdrop-blur-sm", // Better text wrapping
        isUser 
          ? "bg-gradient-to-br from-primary to-primary/90 text-primary-foreground rounded-br-lg shadow-primary/20" 
          : "bg-gradient-to-br from-background/80 to-muted/50 border-2 border-border/30 rounded-bl-lg"
      )}>
        {isProcessing && !message.content ? (
          <div className="flex items-center gap-4 text-muted-foreground py-3">
            <div className="flex gap-1">
              <div className="w-3 h-3 bg-gradient-to-r from-primary to-primary/80 rounded-full animate-bounce"></div>
              <div className="w-3 h-3 bg-gradient-to-r from-primary to-primary/80 rounded-full animate-bounce delay-150"></div>
              <div className="w-3 h-3 bg-gradient-to-r from-primary to-primary/80 rounded-full animate-bounce delay-300"></div>
            </div>
            <span className="text-base font-medium bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent">
              AI is thinking...
            </span>
          </div>
        ) : hasError ? (
          <div className="flex items-center gap-3 p-4 rounded-2xl bg-red-50/50 border-2 border-red-200">
            <div className="p-2 rounded-lg bg-red-100">
              <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
            </div>
            <div>
              <p className="text-red-700 font-semibold text-sm">Error</p>
              <p className="text-red-600 text-sm">
                {message.error_message || 'An error occurred while processing your message.'}
              </p>
            </div>
          </div>
        ) : (
          <div className={cn(
            "text-sm leading-relaxed",
            "whitespace-pre-wrap break-words hyphens-auto", // Enhanced text formatting
            isUser ? "text-primary-foreground" : "text-foreground"
          )}>
            {/* Format text with proper paragraphs */}
            {message.content.split('\n\n').map((paragraph, index) => (
              <p key={index} className={cn(
                index > 0 && "mt-3", // Add spacing between paragraphs
                "leading-relaxed"
              )}>
                {paragraph.split('\n').map((line, lineIndex) => (
                  <React.Fragment key={lineIndex}>
                    {line}
                    {lineIndex < paragraph.split('\n').length - 1 && <br />}
                  </React.Fragment>
                ))}
              </p>
            ))}
          </div>
        )}
      </div>

      {isUser && (
        <Avatar className="h-8 w-8 border border-primary/20 shadow bg-gradient-to-br from-muted/10 to-muted/30">
          <AvatarFallback className="bg-gradient-to-br from-muted/20 to-muted/40 text-muted-foreground">
            <User className="h-4 w-4" />
          </AvatarFallback>
        </Avatar>
      )}
    </div>
  );
}