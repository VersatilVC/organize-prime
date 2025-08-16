import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Send, Paperclip, Loader2, Square } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

interface ChatInputProps {
  onSendMessage: (message: string) => void;
  onAttachFile?: () => void;
  disabled?: boolean;
  isProcessing?: boolean;
  placeholder?: string;
  maxLength?: number;
  className?: string;
}

export function ChatInput({
  onSendMessage,
  onAttachFile,
  disabled = false,
  isProcessing = false,
  placeholder = "Type your message...",
  maxLength = 2000,
  className
}: ChatInputProps) {
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
      const maxHeight = 5 * 24; // 5 lines max (24px per line)
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
    // This would trigger stopping the current processing
    // Implementation depends on how you handle cancellation
    console.log('Stop processing requested');
  };

  return (
    <div className={cn("border-t bg-background p-4", className)}>
      <div className="flex items-end gap-2 max-w-4xl mx-auto">
        {/* Attach File Button */}
        {onAttachFile && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onAttachFile}
                  disabled={disabled || isProcessing}
                  className="flex-shrink-0"
                >
                  <Paperclip className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Attach file</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}

        {/* Message Input */}
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
            className="min-h-[44px] max-h-[120px] resize-none pr-12"
            style={{ height: '44px' }}
          />
          
          {/* Character count */}
          {message.length > maxLength * 0.8 && (
            <div className="absolute bottom-2 right-12 text-xs text-muted-foreground">
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
                  className="flex-shrink-0"
                >
                  <Square className="h-4 w-4" />
                </Button>
              ) : (
                <Button
                  onClick={handleSend}
                  disabled={!canSend}
                  size="sm"
                  className="flex-shrink-0"
                >
                  {disabled ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </Button>
              )}
            </TooltipTrigger>
            <TooltipContent>
              {isProcessing ? 'Stop generation' : 'Send message (Enter)'}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      {/* Input hints */}
      <div className="flex items-center justify-between text-xs text-muted-foreground mt-2 max-w-4xl mx-auto">
        <div className="flex items-center gap-4">
          <span>Press Enter to send, Shift+Enter for new line</span>
        </div>
        <div className="flex items-center gap-2">
          {isProcessing && (
            <span className="flex items-center gap-1">
              <div className="w-2 h-2 bg-current rounded-full animate-pulse"></div>
              AI is thinking...
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

interface ChatInputHook {
  message: string;
  setMessage: (message: string) => void;
  sendMessage: (message: string) => void;
  isProcessing: boolean;
  canSend: boolean;
  clear: () => void;
}

export function useChatInput(
  onSendMessage: (message: string) => void,
  isProcessing: boolean = false
): ChatInputHook {
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