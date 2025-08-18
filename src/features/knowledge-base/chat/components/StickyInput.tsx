import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Send, Loader2, Square, Paperclip } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

interface StickyInputProps {
  conversationId: string;
  onSendMessage: (message: string) => void;
  onAttachFile?: () => void;
  disabled?: boolean;
  isProcessing?: boolean;
  placeholder?: string;
  maxLength?: number;
  className?: string;
}

export function StickyInput({
  conversationId,
  onSendMessage,
  onAttachFile,
  disabled = false,
  isProcessing = false,
  placeholder = "Type your message...",
  maxLength = 2000,
  className
}: StickyInputProps) {
  const [message, setMessage] = useState('');
  const [isComposing, setIsComposing] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const canSend = message.trim().length > 0 && !disabled && !isProcessing;

  // Auto-resize textarea
  const adjustTextareaHeight = useCallback(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      const scrollHeight = textarea.scrollHeight;
      const maxHeight = 6 * 24; // 6 lines max (24px per line)
      textarea.style.height = Math.min(scrollHeight, maxHeight) + 'px';
    }
  }, []);

  useEffect(() => {
    adjustTextareaHeight();
  }, [message, adjustTextareaHeight]);

  // Focus input on mount and when processing completes
  useEffect(() => {
    if (!isProcessing && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [isProcessing]);

  const handleSend = useCallback(() => {
    if (!canSend) return;

    const trimmedMessage = message.trim();
    if (trimmedMessage) {
      onSendMessage(trimmedMessage);
      setMessage('');
      
      // Reset textarea height
      setTimeout(() => {
        adjustTextareaHeight();
      }, 0);
    }
  }, [message, canSend, onSendMessage, adjustTextareaHeight]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Handle Enter key (send message)
    if (e.key === 'Enter' && !e.shiftKey && !isComposing) {
      e.preventDefault();
      handleSend();
    }
    
    // Handle Escape key (clear input)
    if (e.key === 'Escape') {
      setMessage('');
      textareaRef.current?.blur();
    }
  }, [handleSend, isComposing]);

  const handleCompositionStart = () => {
    setIsComposing(true);
  };

  const handleCompositionEnd = () => {
    setIsComposing(false);
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    if (value.length <= maxLength) {
      setMessage(value);
    }
  };

  const handleStop = () => {
    console.log('Stop processing requested for conversation:', conversationId);
  };

  return (
    <div className={cn("sticky-input border-t bg-background", className)}>
      <div className="max-w-4xl mx-auto p-4">
        <div className="flex items-end gap-3 bg-background">
          {/* Attach File Button */}
          {onAttachFile && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={onAttachFile}
                    disabled={disabled || isProcessing}
                    className="flex-shrink-0 h-10 w-10 p-0"
                  >
                    <Paperclip className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top">Attach file</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}

          {/* Message Input Container */}
          <div className="flex-1 relative">
            <Textarea
              ref={textareaRef}
              value={message}
              onChange={handleChange}
              onKeyDown={handleKeyDown}
              onCompositionStart={handleCompositionStart}
              onCompositionEnd={handleCompositionEnd}
              placeholder={isProcessing ? "AI is responding..." : placeholder}
              disabled={disabled || isProcessing}
              className={cn(
                "min-h-[50px] max-h-[144px] resize-none pr-12",
                "border-input bg-background text-foreground",
                "focus:border-primary focus:ring-1 focus:ring-primary",
                "placeholder:text-muted-foreground",
                disabled || isProcessing ? "opacity-50 cursor-not-allowed" : ""
              )}
              style={{ height: '50px' }}
            />
            
            {/* Character count */}
            {message.length > maxLength * 0.8 && (
              <div className="absolute bottom-2 right-14 text-xs text-muted-foreground bg-background px-1">
                {message.length}/{maxLength}
              </div>
            )}
          </div>

          {/* Send/Stop Button */}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                {isProcessing ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleStop}
                    className="flex-shrink-0 h-10 w-10 p-0"
                  >
                    <Square className="h-4 w-4" />
                  </Button>
                ) : (
                  <Button
                    onClick={handleSend}
                    disabled={!canSend}
                    size="sm"
                    className="flex-shrink-0 h-10 w-10 p-0"
                  >
                    {disabled ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                  </Button>
                )}
              </TooltipTrigger>
              <TooltipContent side="top">
                {isProcessing ? 'Stop generation' : canSend ? 'Send message (Enter)' : 'Type a message'}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>

        {/* Input hints */}
        <div className="flex items-center justify-between text-xs text-muted-foreground mt-2">
          <div className="flex items-center gap-4">
            <span>Press Enter to send, Shift+Enter for new line</span>
          </div>
          <div className="flex items-center gap-2">
            {isProcessing && (
              <span className="flex items-center gap-1">
                <div className="w-2 h-2 bg-primary rounded-full animate-pulse"></div>
                AI is thinking...
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Enhanced hook for sticky input management
export function useStickyInput(
  onSendMessage: (message: string) => void,
  isProcessing: boolean = false
) {
  const [message, setMessage] = useState('');

  const sendMessage = useCallback((message: string) => {
    const trimmedMessage = message.trim();
    if (trimmedMessage && !isProcessing) {
      onSendMessage(trimmedMessage);
      setMessage('');
    }
  }, [onSendMessage, isProcessing]);

  const clear = useCallback(() => {
    setMessage('');
  }, []);

  const canSend = message.trim().length > 0 && !isProcessing;

  return {
    message,
    setMessage,
    sendMessage,
    isProcessing,
    canSend,
    clear,
  };
}