import React, { useEffect } from 'react';
import { Bot, Loader2 } from 'lucide-react';
import { Progress } from '@/components/ui/progress';

interface EnhancedTypingIndicatorProps {
  isVisible: boolean;
  message?: string;
  progress?: number; // 0-100 for progress bar
  autoScroll?: boolean; // Trigger scroll when shown
  onAutoScroll?: () => void;
  className?: string;
  variant?: 'dots' | 'progress' | 'spinner';
}

export function EnhancedTypingIndicator({ 
  isVisible, 
  message = "AI is thinking...",
  progress,
  autoScroll = true,
  onAutoScroll,
  className = '',
  variant = 'dots'
}: EnhancedTypingIndicatorProps) {
  // Auto-scroll when indicator becomes visible
  useEffect(() => {
    if (isVisible && autoScroll && onAutoScroll) {
      // Small delay to ensure DOM is updated
      const timeout = setTimeout(onAutoScroll, 100);
      return () => clearTimeout(timeout);
    }
  }, [isVisible, autoScroll, onAutoScroll]);

  if (!isVisible) return null;

  const TypingAnimation = () => {
    switch (variant) {
      case 'spinner':
        return <Loader2 className="h-4 w-4 animate-spin" />;
      
      case 'progress':
        return (
          <div className="w-24">
            <Progress value={progress || 0} className="h-1" />
          </div>
        );
      
      case 'dots':
      default:
        return (
          <div className="flex gap-1">
            <div 
              className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" 
              style={{ animationDelay: '0ms', animationDuration: '1.4s' }} 
            />
            <div 
              className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" 
              style={{ animationDelay: '200ms', animationDuration: '1.4s' }} 
            />
            <div 
              className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" 
              style={{ animationDelay: '400ms', animationDuration: '1.4s' }} 
            />
          </div>
        );
    }
  };

  return (
    <div className={`flex gap-3 animate-in fade-in-0 slide-in-from-bottom-2 duration-300 ${className}`}>
      {/* Avatar */}
      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-muted border border-border flex items-center justify-center">
        <Bot className="h-4 w-4" />
      </div>

      {/* Typing bubble */}
      <div className="bg-muted border border-border rounded-lg px-4 py-3 max-w-xs">
        <div className="flex flex-col gap-2">
          {/* Typing animation */}
          <TypingAnimation />
          
          {/* Optional message */}
          {message && variant !== 'dots' && (
            <p className="text-xs text-muted-foreground">{message}</p>
          )}
          
          {/* Progress percentage */}
          {variant === 'progress' && typeof progress === 'number' && (
            <p className="text-xs text-muted-foreground">
              {Math.round(progress)}% complete
            </p>
          )}
        </div>
      </div>
    </div>
  );
}