import React from 'react';
import { Bot } from 'lucide-react';

interface TypingIndicatorProps {
  show: boolean;
  className?: string;
}

export function TypingIndicator({ show, className = '' }: TypingIndicatorProps) {
  if (!show) return null;

  return (
    <div className={`flex gap-3 ${className}`}>
      {/* Avatar */}
      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-muted border border-border flex items-center justify-center">
        <Bot className="h-4 w-4" />
      </div>

      {/* Typing bubble */}
      <div className="bg-muted border border-border rounded-lg px-4 py-3">
        <div className="flex gap-1">
          <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
          <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
          <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
        </div>
      </div>
    </div>
  );
}