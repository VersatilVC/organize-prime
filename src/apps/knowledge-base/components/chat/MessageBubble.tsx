import React from 'react';
import { format } from 'date-fns';
import { Bot, User, Copy, Check, AlertCircle, RotateCcw, Clock, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ChatMessage } from '../../hooks/useKBChat';

interface MessageBubbleProps {
  message: ChatMessage;
  isLatest: boolean;
  onSourceClick?: (source: any) => void;
  onRetry?: () => void;
}

export function MessageBubble({ message, isLatest, onSourceClick, onRetry }: MessageBubbleProps) {
  const [copied, setCopied] = React.useState(false);
  const isUser = message.message_type === 'user';
  const isAssistant = message.message_type === 'assistant';

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(message.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy message:', error);
    }
  };

  const formatTime = (timestamp: string) => {
    try {
      return format(new Date(timestamp), 'h:mm a');
    } catch {
      return 'now';
    }
  };

  // Get status icon and color
  const getStatusDisplay = () => {
    const status = message.status || 'delivered';
    
    switch (status) {
      case 'sending':
        return { icon: Clock, color: 'text-yellow-500', text: 'Sending...' };
      case 'sent':
        return { icon: CheckCircle, color: 'text-blue-500', text: 'Sent' };
      case 'delivered':
        return { icon: CheckCircle, color: 'text-green-500', text: 'Delivered' };
      case 'failed':
        return { icon: AlertCircle, color: 'text-red-500', text: 'Failed' };
      case 'retrying':
        return { icon: RotateCcw, color: 'text-yellow-500', text: 'Retrying...' };
      default:
        return null;
    }
  };

  const statusDisplay = getStatusDisplay();

  return (
    <div className={`flex gap-3 group ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
      {/* Avatar */}
      <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
        isUser 
          ? 'bg-primary text-primary-foreground' 
          : 'bg-muted border border-border'
      }`}>
        {isUser ? (
          <User className="h-4 w-4" />
        ) : (
          <Bot className="h-4 w-4" />
        )}
      </div>

      {/* Message Content */}
      <div className={`flex-1 max-w-[70%] ${isUser ? 'text-right' : 'text-left'}`}>
        {/* Message Bubble */}
        <div className={`inline-block px-4 py-3 rounded-lg relative ${
          isUser
            ? 'bg-primary text-primary-foreground ml-auto'
            : 'bg-muted border border-border'
        }`}>
          {/* Message Text */}
          <div className="text-sm leading-relaxed whitespace-pre-wrap break-words">
            {message.content}
          </div>

          {/* Copy Button */}
          <Button
            variant="ghost"
            size="sm"
            className={`absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity h-6 w-6 p-0 ${
              isUser ? 'text-primary-foreground/70 hover:text-primary-foreground' : ''
            }`}
            onClick={handleCopy}
          >
            {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
          </Button>
        </div>

        {/* Message Metadata */}
        <div className={`flex items-center gap-2 mt-1 text-xs text-muted-foreground ${
          isUser ? 'justify-end' : 'justify-start'
        }`}>
          <span>{formatTime(message.created_at)}</span>
          
          {/* Message Status for User Messages */}
          {isUser && statusDisplay && (
            <div className={`flex items-center gap-1 ${statusDisplay.color}`}>
              <statusDisplay.icon className="h-3 w-3" />
              <span>{statusDisplay.text}</span>
            </div>
          )}
          
          {/* Retry Button for Failed Messages */}
          {isUser && message.status === 'failed' && onRetry && (
            <Button
              variant="outline"
              size="sm"
              className="h-5 px-2 py-0 text-xs"
              onClick={onRetry}
            >
              <RotateCcw className="h-3 w-3 mr-1" />
              Retry
            </Button>
          )}
          
          {/* Error Message */}
          {message.error_message && (
            <span className="text-red-500 text-xs">
              {message.error_message}
            </span>
          )}
          
          {/* Assistant-specific metadata */}
          {isAssistant && (
            <>
              {message.confidence_score && (
                <Badge variant="outline" className="text-xs px-1 py-0">
                  {Math.round(message.confidence_score * 100)}% confidence
                </Badge>
              )}
              {message.response_time_ms && (
                <span className="text-xs">
                  {(message.response_time_ms / 1000).toFixed(1)}s
                </span>
              )}
              {message.metadata?.tokens_used && (
                <span className="text-xs">
                  {message.metadata.tokens_used} tokens
                </span>
              )}
            </>
          )}
        </div>

        {/* Sources */}
        {isAssistant && message.sources && message.sources.length > 0 && (
          <div className="mt-2 space-y-1">
            <p className="text-xs text-muted-foreground">Sources:</p>
            <div className="flex flex-wrap gap-1">
              {message.sources.map((source: any, index: number) => (
                <Button
                  key={index}
                  variant="outline"
                  size="sm"
                  className="h-6 text-xs px-2 py-0"
                  onClick={() => onSourceClick?.(source)}
                >
                  {source.title || source.filename || `Source ${index + 1}`}
                </Button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}