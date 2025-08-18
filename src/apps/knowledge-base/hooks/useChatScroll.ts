import { useRef, useState, useCallback, useEffect } from 'react';
import { ChatMessage } from './useKBChat';

interface UseChatScrollOptions {
  scrollThreshold?: number;      // Distance from bottom to consider "at bottom" (default: 100)
  smoothScroll?: boolean;        // Enable smooth scrolling (default: true)
  autoScrollDelay?: number;      // Delay before auto-scroll in ms (default: 100)
  enableNotifications?: boolean; // Show new message notifications (default: true)
  throttleMs?: number;          // Throttle scroll events (default: 100)
}

interface UseChatScrollReturn {
  messagesEndRef: React.RefObject<HTMLDivElement>;
  chatContainerRef: React.RefObject<HTMLDivElement>;
  isUserScrolledUp: boolean;
  newMessageCount: number;
  scrollToBottom: (smooth?: boolean) => void;
  handleScroll: () => void;
  clearNewMessages: () => void;
  resetScrollState: () => void;
}

export function useChatScroll(
  messages: ChatMessage[], 
  isLoading: boolean,
  options: UseChatScrollOptions = {}
): UseChatScrollReturn {
  const {
    scrollThreshold = 100,
    smoothScroll = true,
    autoScrollDelay = 100,
    enableNotifications = true,
    throttleMs = 100
  } = options;

  // Refs for DOM elements
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  
  // State management
  const [isUserScrolledUp, setIsUserScrolledUp] = useState(false);
  const [newMessageCount, setNewMessageCount] = useState(0);
  
  // Internal state for tracking
  const lastMessageCountRef = useRef(0);
  const scrollTimeoutRef = useRef<NodeJS.Timeout>();
  const lastScrollTimeRef = useRef(0);

  // Check if user is at bottom of chat
  const isAtBottom = useCallback((container: HTMLElement): boolean => {
    const { scrollTop, scrollHeight, clientHeight } = container;
    return scrollHeight - scrollTop - clientHeight < scrollThreshold;
  }, [scrollThreshold]);

  // Smooth scroll to bottom function
  const scrollToBottom = useCallback((smooth = smoothScroll) => {
    if (messagesEndRef.current) {
      // Clear any pending scroll timeouts
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }

      // Use timeout to ensure DOM is updated
      scrollTimeoutRef.current = setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ 
          behavior: smooth ? 'smooth' : 'instant',
          block: 'end',
          inline: 'nearest'
        });
      }, autoScrollDelay);
    }
  }, [smoothScroll, autoScrollDelay]);

  // Throttled scroll handler
  const handleScroll = useCallback(() => {
    const now = Date.now();
    if (now - lastScrollTimeRef.current < throttleMs) {
      return; // Throttle scroll events
    }
    lastScrollTimeRef.current = now;

    const container = chatContainerRef.current;
    if (!container) return;

    const userIsAtBottom = isAtBottom(container);
    setIsUserScrolledUp(!userIsAtBottom);
    
    // Clear new message count when user reaches bottom
    if (userIsAtBottom && newMessageCount > 0) {
      setNewMessageCount(0);
    }
  }, [isAtBottom, newMessageCount, throttleMs]);

  // Auto-scroll when new messages arrive
  useEffect(() => {
    const currentMessageCount = messages.length;
    
    // Skip if no new messages or initial load
    if (currentMessageCount <= lastMessageCountRef.current || isLoading) {
      lastMessageCountRef.current = currentMessageCount;
      return;
    }

    const newMessagesAdded = currentMessageCount - lastMessageCountRef.current;
    
    if (isUserScrolledUp && enableNotifications) {
      // User is scrolled up - show notification instead of auto-scroll
      setNewMessageCount(prev => prev + newMessagesAdded);
    } else {
      // User is at bottom or notifications disabled - auto-scroll
      scrollToBottom();
      setNewMessageCount(0);
    }
    
    lastMessageCountRef.current = currentMessageCount;
  }, [messages.length, isUserScrolledUp, enableNotifications, scrollToBottom, isLoading]);

  // Auto-scroll on conversation change
  useEffect(() => {
    if (messages.length > 0 && !isLoading) {
      // Reset scroll state for new conversation
      setIsUserScrolledUp(false);
      setNewMessageCount(0);
      
      // Scroll to bottom with slight delay to ensure DOM is ready
      setTimeout(() => scrollToBottom(false), 50);
    }
  }, [messages.length > 0 ? messages[0]?.conversation_id : null, isLoading, scrollToBottom]);

  // Clear new messages manually
  const clearNewMessages = useCallback(() => {
    setNewMessageCount(0);
  }, []);

  // Reset scroll state (useful when switching conversations)
  const resetScrollState = useCallback(() => {
    setIsUserScrolledUp(false);
    setNewMessageCount(0);
    lastMessageCountRef.current = messages.length;
  }, [messages.length]);

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, []);

  return {
    messagesEndRef,
    chatContainerRef,
    isUserScrolledUp,
    newMessageCount,
    scrollToBottom,
    handleScroll,
    clearNewMessages,
    resetScrollState
  };
}