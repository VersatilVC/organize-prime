import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

interface SimpleChatInputProps {
  conversationId: string;
  onSendMessage: (message: string) => void;
  disabled?: boolean;
  isProcessing?: boolean;
  placeholder?: string;
  className?: string;
}

export function SimpleChatInput({
  conversationId,
  onSendMessage,
  disabled = false,
  isProcessing = false,
  placeholder = "Type your message...",
  className
}: SimpleChatInputProps) {
  const [message, setMessage] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea
  const adjustTextareaHeight = useCallback(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      const newHeight = Math.min(textarea.scrollHeight, 120); // Max height of ~6 lines
      textarea.style.height = `${newHeight}px`;
    }
  }, []);

  useEffect(() => {
    adjustTextareaHeight();
  }, [message, adjustTextareaHeight]);

  // Handle send message
  const handleSend = () => {
    if (!message.trim() || disabled || isProcessing) return;
    
    onSendMessage(message.trim());
    setMessage('');
  };

  // Handle key press
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className={cn("flex items-end gap-2", className)}>
      <div className="flex-1 relative">
        <Textarea
          ref={textareaRef}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={handleKeyPress}
          placeholder={placeholder}
          disabled={disabled || isProcessing}
          className="min-h-[40px] max-h-[120px] resize-none rounded-2xl border-2 focus:border-primary/50 pr-12"
          rows={1}
        />
      </div>
      
      <Button 
        onClick={handleSend}
        disabled={!message.trim() || disabled || isProcessing}
        size="icon"
        className="h-10 w-10 rounded-full shrink-0"
      >
        <Send className="h-4 w-4" />
      </Button>
    </div>
  );
}