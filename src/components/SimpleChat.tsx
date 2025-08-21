import React, { useState, useEffect } from 'react';
import { Send, MessageSquare, Bot, User, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { SimpleChatService, type ChatMessage } from '@/services/SimpleChatService';
import { useSimpleChat } from '@/hooks/useSimpleChat';
import { cn } from '@/lib/utils';

interface SimpleChatProps {
  conversationId?: string;
  onConversationCreated?: (conversationId: string) => void;
  className?: string;
}

export function SimpleChat({ conversationId, onConversationCreated, className }: SimpleChatProps) {
  const [currentConversationId, setCurrentConversationId] = useState(conversationId || '');
  const [messageInput, setMessageInput] = useState('');
  const [isCreatingConversation, setIsCreatingConversation] = useState(false);

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
      SimpleChatService.createConversation('New Chat')
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
    <div className={cn("h-full flex flex-col bg-background border rounded-lg shadow-sm", className)}>
      {/* Header */}
      <div className="flex items-center gap-2 p-4 border-b bg-muted/30">
        <Bot className="h-5 w-5 text-primary" />
        <h2 className="font-semibold">AI Chat</h2>
      </div>
      
      {/* Messages Area */}
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-6 space-y-6 bg-gradient-to-b from-background to-muted/20"
      >
          {isLoading && messages.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : error ? (
            <div className="flex items-center justify-center h-full text-red-500">
              <p>Failed to load messages</p>
            </div>
          ) : messages.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <Bot className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                <p className="text-muted-foreground">Start a conversation by sending a message below.</p>
              </div>
            </div>
          ) : (
            messages.map((message) => (
              <ChatMessageComponent key={message.id} message={message} />
            ))
          )}
        </div>

      {/* Sticky Input Area */}
      <div className="border-t bg-background/95 backdrop-blur-sm p-4 sticky bottom-0">
        <div className="flex gap-3 items-end">
          <div className="flex-1">
            <Input
              value={messageInput}
              onChange={(e) => setMessageInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Ask me anything..."
              disabled={isProcessing}
              className="min-h-[44px] resize-none border-2 focus:border-primary/50 transition-colors"
            />
          </div>
          <Button
            onClick={handleSendMessage}
            disabled={!messageInput.trim() || isProcessing}
            size="lg"
            className="h-[44px] w-[44px] p-0 rounded-full shadow-lg hover:shadow-xl transition-all"
          >
            {isProcessing ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Send className="h-5 w-5" />
            )}
          </Button>
        </div>
        {isProcessing && (
          <div className="mt-2 text-xs text-muted-foreground flex items-center gap-2">
            <div className="flex gap-1">
              <div className="w-1 h-1 bg-primary rounded-full animate-pulse"></div>
              <div className="w-1 h-1 bg-primary rounded-full animate-pulse delay-150"></div>
              <div className="w-1 h-1 bg-primary rounded-full animate-pulse delay-300"></div>
            </div>
            AI is thinking...
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
    <div className={cn("flex gap-4 group", isUser ? "justify-end" : "justify-start")}>
      {!isUser && (
        <Avatar className="h-9 w-9 border-2 border-primary/20 shadow-sm">
          <AvatarFallback className="bg-primary/10 text-primary">
            <Bot className="h-5 w-5" />
          </AvatarFallback>
        </Avatar>
      )}
      
      <div className={cn(
        "max-w-[75%] rounded-2xl px-4 py-3 shadow-sm transition-all group-hover:shadow-md",
        "word-wrap break-words overflow-wrap-anywhere", // Better text wrapping
        isUser 
          ? "bg-primary text-primary-foreground rounded-br-sm" 
          : "bg-white border border-border/50 rounded-bl-sm"
      )}>
        {isProcessing && !message.content ? (
          <div className="flex items-center gap-3 text-muted-foreground py-1">
            <div className="flex gap-1">
              <div className="w-2 h-2 bg-primary rounded-full animate-pulse"></div>
              <div className="w-2 h-2 bg-primary rounded-full animate-pulse delay-150"></div>
              <div className="w-2 h-2 bg-primary rounded-full animate-pulse delay-300"></div>
            </div>
            <span className="text-sm font-medium">AI is thinking...</span>
          </div>
        ) : hasError ? (
          <div className="flex items-center gap-2 text-red-600">
            <div className="w-2 h-2 bg-red-500 rounded-full"></div>
            <p className="text-sm font-medium">
              {message.error_message || 'An error occurred while processing your message.'}
            </p>
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
        <Avatar className="h-9 w-9 border-2 border-muted shadow-sm">
          <AvatarFallback className="bg-muted/50">
            <User className="h-5 w-5" />
          </AvatarFallback>
        </Avatar>
      )}
    </div>
  );
}