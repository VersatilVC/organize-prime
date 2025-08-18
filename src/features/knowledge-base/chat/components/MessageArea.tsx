import React, { useEffect, useRef, useState, useCallback } from 'react';
import { MessageSquare, Loader2 } from 'lucide-react';
import { ChatMessage } from './ChatMessage';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { ChatMessage as ChatMessageType } from '../services/ChatMessageService';

interface MessageAreaProps {
  messages: ChatMessageType[];
  isLoadingMessages: boolean;
  messagesError: any;
  onRegenerateResponse: (messageId: string, originalPrompt: string) => void;
  onMessageReaction: (messageId: string, reaction: string) => void;
  messagesEndRef: React.RefObject<HTMLDivElement>;
  className?: string;
}

export function MessageArea({
  messages,
  isLoadingMessages,
  messagesError,
  onRegenerateResponse,
  onMessageReaction,
  messagesEndRef,
  className
}: MessageAreaProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [isUserScrolled, setIsUserScrolled] = useState(false);
  const [showScrollToBottom, setShowScrollToBottom] = useState(false);

  // Handle scroll behavior and show/hide scroll to bottom button
  const handleScroll = useCallback(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const { scrollTop, scrollHeight, clientHeight } = container;
    const isAtBottom = scrollHeight - scrollTop - clientHeight < 100;
    
    setIsUserScrolled(!isAtBottom);
    setShowScrollToBottom(!isAtBottom && messages.length > 0);
  }, [messages.length]);

  // Auto-scroll to bottom for new messages (only if user hasn't scrolled up)
  useEffect(() => {
    if (!isUserScrolled && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isUserScrolled, messagesEndRef]);

  // Scroll to bottom function
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    setIsUserScrolled(false);
    setShowScrollToBottom(false);
  }, [messagesEndRef]);

  // Handle scroll events
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    container.addEventListener('scroll', handleScroll, { passive: true });
    return () => container.removeEventListener('scroll', handleScroll);
  }, [handleScroll]);

  if (isLoadingMessages) {
    return (
      <div className={cn("message-area flex items-center justify-center", className)}>
        <div className="text-center py-12">
          <Loader2 className="h-6 w-6 animate-spin mx-auto mb-4 text-muted-foreground" />
          <p className="text-muted-foreground">Loading messages...</p>
        </div>
      </div>
    );
  }

  if (messagesError) {
    return (
      <div className={cn("message-area flex items-center justify-center", className)}>
        <div className="text-center py-12">
          <MessageSquare className="h-8 w-8 mx-auto mb-4 text-muted-foreground opacity-50" />
          <h3 className="font-medium mb-2">Failed to load messages</h3>
          <p className="text-muted-foreground text-sm">
            {messagesError?.message || 'An error occurred while loading the conversation.'}
          </p>
          <Button 
            variant="outline" 
            size="sm" 
            className="mt-4"
            onClick={() => window.location.reload()}
          >
            Try again
          </Button>
        </div>
      </div>
    );
  }

  if (messages.length === 0) {
    return (
      <div className={cn("message-area flex items-center justify-center", className)}>
        <div className="text-center py-12 px-6">
          <MessageSquare className="h-16 w-16 mx-auto mb-6 text-muted-foreground opacity-30" />
          <h3 className="text-xl font-semibold mb-3">Start the Conversation</h3>
          <p className="text-muted-foreground max-w-md">
            Send a message below to begin chatting with your knowledge base. 
            Ask questions, get insights, and explore your documents with AI assistance.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("message-area relative", className)}>
      {/* Scrollable Messages Container */}
      <div 
        ref={scrollContainerRef}
        className="h-full overflow-y-auto overflow-x-hidden scroll-smooth"
        style={{ scrollBehavior: 'smooth' }}
      >
        <div className="max-w-4xl mx-auto px-4 py-6">
          {/* Message Groups with Optimized Rendering */}
          <div className="space-y-0">
            {messages.map((message, index) => (
              <MessageGroup
                key={message.id}
                message={message}
                isLast={index === messages.length - 1}
                isFirst={index === 0}
                onRegenerate={onRegenerateResponse}
                onReaction={onMessageReaction}
              />
            ))}
            
            {/* Scroll anchor */}
            <div ref={messagesEndRef} className="h-1" />
          </div>
        </div>
      </div>

      {/* Scroll to Bottom Button */}
      {showScrollToBottom && (
        <div className="absolute bottom-4 right-4 z-10">
          <Button
            onClick={scrollToBottom}
            size="sm"
            variant="secondary"
            className="rounded-full shadow-lg hover:shadow-xl transition-all duration-200"
          >
            <MessageSquare className="h-4 w-4 mr-2" />
            New messages
          </Button>
        </div>
      )}
    </div>
  );
}

// Optimized message group component with React.memo
interface MessageGroupProps {
  message: ChatMessageType;
  isLast: boolean;
  isFirst: boolean;
  onRegenerate: (messageId: string, originalPrompt: string) => void;
  onReaction: (messageId: string, reaction: string) => void;
}

const MessageGroup = React.memo(({ 
  message, 
  isLast, 
  isFirst, 
  onRegenerate, 
  onReaction 
}: MessageGroupProps) => {
  return (
    <div className={cn(
      "message-group",
      isFirst && "pt-4",
      isLast && "pb-4"
    )}>
      <ChatMessage
        message={message}
        isLast={isLast}
        onRegenerate={onRegenerate}
        onReaction={onReaction}
      />
    </div>
  );
});

MessageGroup.displayName = 'MessageGroup';

// Virtual scrolling hook for large conversations (optional enhancement)
export function useVirtualScrolling(
  messages: ChatMessageType[],
  containerHeight: number,
  itemHeight: number = 100
) {
  const [visibleRange, setVisibleRange] = useState({ start: 0, end: 20 });
  
  const updateVisibleRange = useCallback((scrollTop: number) => {
    const start = Math.floor(scrollTop / itemHeight);
    const visibleCount = Math.ceil(containerHeight / itemHeight);
    const end = Math.min(start + visibleCount + 5, messages.length); // Buffer of 5 items
    
    setVisibleRange({ start: Math.max(0, start - 5), end });
  }, [messages.length, itemHeight, containerHeight]);

  const visibleMessages = messages.slice(visibleRange.start, visibleRange.end);
  
  return {
    visibleMessages,
    updateVisibleRange,
    visibleRange,
    totalHeight: messages.length * itemHeight
  };
}

// Smooth scrolling utility
export function smoothScrollToElement(
  element: HTMLElement, 
  container: HTMLElement,
  offset: number = 0
) {
  const containerRect = container.getBoundingClientRect();
  const elementRect = element.getBoundingClientRect();
  
  const scrollTop = container.scrollTop;
  const targetScrollTop = scrollTop + elementRect.top - containerRect.top - offset;
  
  container.scrollTo({
    top: targetScrollTop,
    behavior: 'smooth'
  });
}