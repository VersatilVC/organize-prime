import React, { useState } from 'react';
import { format, formatDistanceToNow } from 'date-fns';
import {
  User,
  Bot,
  Info,
  Copy,
  RefreshCw,
  ThumbsUp,
  ThumbsDown,
  MoreHorizontal,
  ExternalLink,
  Clock,
  AlertCircle,
  Check
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarIcon } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import type { ChatMessage as ChatMessageType, MessageSource } from '../services/ChatMessageService';

interface ChatMessageProps {
  message: ChatMessageType;
  isLast?: boolean;
  onRegenerate?: (messageId: string, originalPrompt: string) => void;
  onReaction?: (messageId: string, reaction: 'up' | 'down') => void;
  className?: string;
}

export function ChatMessage({
  message,
  isLast = false,
  onRegenerate,
  onReaction,
  className
}: ChatMessageProps) {
  const { toast } = useToast();

  const handleCopyMessage = async () => {
    try {
      await navigator.clipboard.writeText(message.content);
      toast({
        title: 'Copied',
        description: 'Message copied to clipboard',
        duration: 2000,
      });
    } catch (error) {
      toast({
        title: 'Copy Failed',
        description: 'Failed to copy message to clipboard',
        variant: 'destructive',
      });
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
    
    if (diffInHours < 24) {
      return formatDistanceToNow(date, { addSuffix: true });
    } else {
      return format(date, 'MMM d, h:mm a');
    }
  };

  if (message.message_type === 'system') {
    return (
      <SystemMessage
        message={message}
        className={className}
      />
    );
  }

  if (message.message_type === 'user') {
    return (
      <UserMessage
        message={message}
        onCopy={handleCopyMessage}
        formatTimestamp={formatTimestamp}
        className={className}
      />
    );
  }

  return (
    <AssistantMessage
      message={message}
      isLast={isLast}
      onCopy={handleCopyMessage}
      onRegenerate={onRegenerate}
      onReaction={onReaction}
      formatTimestamp={formatTimestamp}
      className={className}
    />
  );
}

interface UserMessageProps {
  message: ChatMessageType;
  onCopy: () => void;
  formatTimestamp: (timestamp: string) => string;
  className?: string;
}

function UserMessage({ message, onCopy, formatTimestamp, className }: UserMessageProps) {
  return (
    <div className={cn("flex justify-end mb-6", className)}>
      <div className="flex items-start gap-3 max-w-[80%]">
        <div className="flex flex-col items-end gap-2">
          <div className="group relative">
            <div className="bg-primary text-primary-foreground rounded-2xl rounded-br-md px-4 py-3 shadow-sm">
              <p className="text-sm whitespace-pre-wrap break-words leading-relaxed">
                {message.content}
              </p>
            </div>
            
            {/* Hover actions */}
            <div className="absolute top-0 right-0 transform translate-x-full opacity-0 group-hover:opacity-100 transition-opacity duration-200">
              <div className="flex items-center gap-1 ml-2">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={onCopy}
                        className="h-7 w-7 p-0"
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Copy message</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            </div>
          </div>
          
          <span className="text-xs text-muted-foreground">
            {formatTimestamp(message.created_at)}
          </span>
        </div>

        <Avatar className="h-8 w-8">
          <AvatarFallback>
            <User className="h-4 w-4" />
          </AvatarFallback>
        </Avatar>
      </div>
    </div>
  );
}

interface AssistantMessageProps {
  message: ChatMessageType;
  isLast: boolean;
  onCopy: () => void;
  onRegenerate?: (messageId: string, originalPrompt: string) => void;
  onReaction?: (messageId: string, reaction: 'up' | 'down') => void;
  formatTimestamp: (timestamp: string) => string;
  className?: string;
}

function AssistantMessage({
  message,
  isLast,
  onCopy,
  onRegenerate,
  onReaction,
  formatTimestamp,
  className
}: AssistantMessageProps) {
  const [showSources, setShowSources] = useState(false);

  const getStatusIcon = () => {
    switch (message.processing_status) {
      case 'pending':
        return <Clock className="h-3 w-3 text-yellow-500" />;
      case 'processing':
        return <RefreshCw className="h-3 w-3 text-blue-500 animate-spin" />;
      case 'completed':
        return message.content ? <Check className="h-3 w-3 text-green-500" /> : null;
      case 'error':
        return <AlertCircle className="h-3 w-3 text-red-500" />;
      default:
        return null;
    }
  };

  const getMessageContent = () => {
    if (message.processing_status === 'processing' && !message.content) {
      return (
        <div className="flex items-center gap-2 text-muted-foreground">
          <div className="flex gap-1">
            <div className="w-2 h-2 bg-current rounded-full animate-pulse"></div>
            <div className="w-2 h-2 bg-current rounded-full animate-pulse delay-150"></div>
            <div className="w-2 h-2 bg-current rounded-full animate-pulse delay-300"></div>
          </div>
          <span className="text-sm">Thinking...</span>
        </div>
      );
    }

    if (message.processing_status === 'error') {
      return (
        <div className="text-red-600">
          <p className="text-sm">
            {message.error_message || 'An error occurred while processing your message.'}
          </p>
          {isLast && onRegenerate && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onRegenerate(message.id, 'Retry previous request')}
              className="mt-2"
            >
              <RefreshCw className="h-3 w-3 mr-1" />
              Retry
            </Button>
          )}
        </div>
      );
    }

    return (
      <p className="text-sm whitespace-pre-wrap break-words leading-relaxed">
        {message.content || 'No response available.'}
      </p>
    );
  };

  return (
    <div className={cn("flex justify-start mb-6", className)}>
      <div className="flex items-start gap-3 max-w-[85%]">
        <Avatar className="h-8 w-8 mt-1">
          <AvatarFallback>
            <Bot className="h-4 w-4" />
          </AvatarFallback>
        </Avatar>

        <div className="flex flex-col gap-2 flex-1">
          <div className="group relative">
            <div className="bg-muted/50 rounded-2xl rounded-bl-md px-4 py-3 shadow-sm">
              <div className="prose prose-sm max-w-none">
                {getMessageContent()}
              </div>
              
              {/* Status Icon Only */}
              {getStatusIcon() && (
                <div className="flex items-center gap-2 mt-2">
                  {getStatusIcon()}
                </div>
              )}
            </div>

            {/* Hover actions */}
            <div className="absolute top-0 left-0 transform -translate-x-full opacity-0 group-hover:opacity-100 transition-opacity duration-200">
              <div className="flex items-center gap-1 mr-2">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={onCopy}
                        className="h-7 w-7 p-0"
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Copy message</TooltipContent>
                  </Tooltip>
                </TooltipProvider>

                {isLast && onRegenerate && message.processing_status !== 'processing' && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onRegenerate(message.id, 'Regenerate response')}
                          className="h-7 w-7 p-0"
                        >
                          <RefreshCw className="h-3 w-3" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Regenerate response</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}

                {onReaction && message.processing_status === 'completed' && message.content && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0"
                      >
                        <MoreHorizontal className="h-3 w-3" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start">
                      <DropdownMenuItem onClick={() => onReaction(message.id, 'up')}>
                        <ThumbsUp className="h-4 w-4 mr-2" />
                        Good response
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onReaction(message.id, 'down')}>
                        <ThumbsDown className="h-4 w-4 mr-2" />
                        Poor response
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
            </div>
          </div>

          {/* Sources */}
          {message.sources && message.sources.length > 0 && (
            <div className="space-y-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowSources(!showSources)}
                className="text-xs h-auto p-1 text-muted-foreground hover:text-foreground"
              >
                {showSources ? 'Hide' : 'Show'} {message.sources.length} source{message.sources.length > 1 ? 's' : ''}
              </Button>

              {showSources && (
                <SourcesList sources={message.sources} />
              )}
            </div>
          )}

          <span className="text-xs text-muted-foreground">
            {formatTimestamp(message.created_at)}
          </span>
        </div>
      </div>
    </div>
  );
}

interface SystemMessageProps {
  message: ChatMessageType;
  className?: string;
}

function SystemMessage({ message, className }: SystemMessageProps) {
  return (
    <div className={cn("flex justify-center mb-4", className)}>
      <div className="flex items-center gap-2 text-muted-foreground">
        <Info className="h-4 w-4" />
        <span className="text-sm italic">
          {message.content}
        </span>
      </div>
    </div>
  );
}

interface SourcesListProps {
  sources: MessageSource[];
}

function SourcesList({ sources }: SourcesListProps) {
  return (
    <div className="space-y-2">
      {sources.map((source, index) => (
        <Card key={`${source.file_id}-${index}`} className="bg-background/50">
          <CardContent className="p-3">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h4 className="text-sm font-medium truncate">
                    {source.document_name}
                  </h4>
                  <Badge variant="secondary" className="text-xs">
                    {Math.round(source.confidence_score)}% match
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground line-clamp-2">
                  {source.chunk_text}
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0 flex-shrink-0"
              >
                <ExternalLink className="h-3 w-3" />
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}