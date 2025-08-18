import React from 'react';
import { ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ScrollToBottomProps {
  show: boolean;
  onClick: () => void;
  newMessageCount?: number;
  className?: string;
}

export function ScrollToBottom({ 
  show, 
  onClick, 
  newMessageCount = 0,
  className = '' 
}: ScrollToBottomProps) {
  if (!show) return null;

  return (
    <div className={`absolute bottom-4 right-4 z-10 ${className}`}>
      <Button
        onClick={onClick}
        size="sm"
        className="rounded-full shadow-lg hover:shadow-xl transition-shadow gap-1"
        variant="secondary"
      >
        <ChevronDown className="h-4 w-4" />
        {newMessageCount > 0 ? (
          <span className="text-xs">
            {newMessageCount} new
          </span>
        ) : (
          'Scroll to bottom'
        )}
      </Button>
    </div>
  );
}