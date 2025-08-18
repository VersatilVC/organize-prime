import React from 'react';
import { cn } from '@/lib/utils';
import { useMobileKeyboard } from '../../hooks/useMobileKeyboard';

interface ChatLayoutProps {
  header: React.ReactNode;
  sidebar?: React.ReactNode;
  messages: React.ReactNode;
  input: React.ReactNode;
  isLoading?: boolean;
  sidebarOpen?: boolean;
  className?: string;
}

export function ChatLayout({ 
  header, 
  sidebar, 
  messages, 
  input, 
  isLoading = false,
  sidebarOpen = true,
  className = '' 
}: ChatLayoutProps) {
  const { keyboardOpen, adjustedHeight, isMobile } = useMobileKeyboard();

  return (
    <div 
      className={cn(
        "flex bg-background",
        className
      )}
      style={{ 
        height: isMobile ? `${adjustedHeight}px` : '100vh',
        minHeight: isMobile ? `${adjustedHeight}px` : '100vh',
        maxHeight: isMobile ? `${adjustedHeight}px` : '100vh'
      }}
    >
      {/* Sidebar - Mobile overlay */}
      {sidebar && sidebarOpen && (
        <>
          {/* Mobile overlay */}
          {isMobile && (
            <div className="fixed inset-0 bg-black/50 z-40 md:hidden" />
          )}
          
          {/* Sidebar content */}
          <div className={cn(
            "flex-shrink-0 bg-background border-r",
            isMobile 
              ? "fixed left-0 top-0 z-50 h-full w-80" 
              : "relative w-80",
            "transition-transform duration-300"
          )}>
            {sidebar}
          </div>
        </>
      )}

      {/* Main chat area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header - Fixed at top */}
        {header && (
          <div className="flex-shrink-0 border-b bg-background">
            {header}
          </div>
        )}

        {/* Messages area - Flexible scrollable */}
        <div className="flex-1 relative min-h-0 overflow-hidden">
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center space-y-4">
                <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full mx-auto" />
                <p className="text-muted-foreground">Loading messages...</p>
              </div>
            </div>
          ) : (
            messages
          )}
        </div>

        {/* Input area - Fixed at bottom */}
        <div className={cn(
          "flex-shrink-0 bg-background",
          keyboardOpen && isMobile ? "pb-safe" : ""
        )}>
          {input}
        </div>
      </div>
    </div>
  );
}