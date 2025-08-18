import React from 'react';
import { Send, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';

interface ChatInputProps {
  value: string;
  onChange: (value: string) => void;
  onSend: (message: string) => void;
  disabled?: boolean;
  isLoading?: boolean;
  placeholder?: string;
  maxLength?: number;
  className?: string;
}

export function ChatInput({
  value,
  onChange,
  onSend,
  disabled = false,
  isLoading = false,
  placeholder = "Ask a question about your documents...",
  maxLength = 2000,
  className = ''
}: ChatInputProps) {
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea
  React.useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = Math.min(textarea.scrollHeight, 120) + 'px';
    }
  }, [value]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleSend = () => {
    const trimmedValue = value.trim();
    if (trimmedValue && !disabled && !isLoading) {
      onSend(trimmedValue);
    }
  };

  const remainingChars = maxLength - value.length;
  const isNearLimit = remainingChars < 100;

  return (
    <div className={`border-t bg-background p-4 ${className}`}>
      <div className="flex gap-3">
        <div className="flex-1 relative">
          <Textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={disabled || isLoading}
            maxLength={maxLength}
            className="min-h-[44px] max-h-[120px] resize-none pr-12"
            rows={1}
          />
          
          {/* Character counter */}
          {isNearLimit && (
            <div className="absolute bottom-2 right-2 text-xs text-muted-foreground">
              {remainingChars}
            </div>
          )}
        </div>
        
        <Button
          onClick={handleSend}
          disabled={!value.trim() || disabled || isLoading}
          size="default"
          className="gap-2 self-end"
        >
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Sending...
            </>
          ) : (
            <>
              <Send className="h-4 w-4" />
              Send
            </>
          )}
        </Button>
      </div>
      
      {/* Help text */}
      <p className="text-xs text-muted-foreground mt-2">
        Press Enter to send, Shift+Enter for new line
      </p>
    </div>
  );
}