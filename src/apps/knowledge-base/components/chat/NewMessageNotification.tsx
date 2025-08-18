import React from 'react';
import { Button } from '@/components/ui/button';
import { ArrowDown, MessageCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface NewMessageNotificationProps {
  isVisible: boolean;
  messageCount: number;
  onScrollToBottom: () => void;
  className?: string;
  position?: 'bottom-right' | 'bottom-center';
  showIcon?: boolean;
  animate?: boolean;
}

export function NewMessageNotification({ 
  isVisible, 
  messageCount, 
  onScrollToBottom, 
  className = '',
  position = 'bottom-right',
  showIcon = true,
  animate = true
}: NewMessageNotificationProps) {
  if (!isVisible || messageCount <= 0) return null;

  const positionClasses = {
    'bottom-right': 'right-4 bottom-20',
    'bottom-center': 'left-1/2 transform -translate-x-1/2 bottom-20'
  };

  return (
    <div
      className={cn(
        "fixed z-50 transition-all duration-300",
        positionClasses[position],
        animate && "animate-in fade-in-0 slide-in-from-bottom-2",
        className
      )}
    >
      <Button
        onClick={onScrollToBottom}
        variant="default"
        size="sm"
        className={cn(
          "shadow-lg hover:shadow-xl transition-all duration-200",
          "bg-primary text-primary-foreground",
          "flex items-center gap-2 px-3 py-2",
          "border border-border/20",
          animate && "hover:scale-105 active:scale-95"
        )}
      >
        {showIcon && <MessageCircle className="h-4 w-4" />}
        
        <span className="font-medium">
          {messageCount === 1 
            ? '1 new message' 
            : `${messageCount} new messages`
          }
        </span>
        
        <ArrowDown className="h-4 w-4" />
      </Button>
    </div>
  );
}