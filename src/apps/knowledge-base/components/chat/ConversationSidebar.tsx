import React from 'react';
import { Plus, MessageSquare, Trash2, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { format, formatDistanceToNow } from 'date-fns';
import { ChatConversation } from '../../hooks/useKBChat';

interface ConversationSidebarProps {
  conversations: ChatConversation[];
  currentConversationId: string | null;
  onConversationSelect: (id: string) => void;
  onNewConversation: () => void;
  onDeleteConversation?: (id: string) => void;
  isLoading?: boolean;
  className?: string;
}

export function ConversationSidebar({
  conversations,
  currentConversationId,
  onConversationSelect,
  onNewConversation,
  onDeleteConversation,
  isLoading = false,
  className = ''
}: ConversationSidebarProps) {
  const [searchQuery, setSearchQuery] = React.useState('');

  // Filter conversations based on search
  const filteredConversations = React.useMemo(() => {
    if (!searchQuery.trim()) return conversations;
    
    const query = searchQuery.toLowerCase();
    return conversations.filter(conv => 
      conv.title?.toLowerCase().includes(query) ||
      conv.id.toLowerCase().includes(query)
    );
  }, [conversations, searchQuery]);

  const formatLastActivity = (lastMessageAt?: string, createdAt?: string) => {
    const timestamp = lastMessageAt || createdAt;
    if (!timestamp) return 'No activity';
    
    try {
      const date = new Date(timestamp);
      const now = new Date();
      const diffHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
      
      if (diffHours < 24) {
        return formatDistanceToNow(date, { addSuffix: true });
      } else {
        return format(date, 'MMM d, h:mm a');
      }
    } catch {
      return 'Unknown';
    }
  };

  return (
    <div className={`w-80 flex-shrink-0 flex flex-col gap-4 ${className}`}>
      <Card className="flex-1 flex flex-col">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              Conversations
            </CardTitle>
            <Button 
              size="sm" 
              onClick={onNewConversation}
              disabled={isLoading}
              className="gap-1"
            >
              <Plus className="h-4 w-4" />
              New Chat
            </Button>
          </div>
          
          {/* Search Input */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search conversations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
        </CardHeader>
        
        <CardContent className="flex-1 min-h-0 p-0">
          <ScrollArea className="h-full">
            <div className="p-4 space-y-2">
              {isLoading ? (
                // Loading skeleton
                <div className="space-y-2">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="p-3 rounded-lg border animate-pulse">
                      <div className="h-4 bg-muted rounded w-3/4 mb-2" />
                      <div className="h-3 bg-muted rounded w-1/2" />
                    </div>
                  ))}
                </div>
              ) : filteredConversations.length === 0 ? (
                // Empty state
                <div className="text-center py-8">
                  <MessageSquare className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">
                    {searchQuery ? 'No conversations found' : 'No conversations yet'}
                  </p>
                  {!searchQuery && (
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={onNewConversation}
                      className="mt-2"
                    >
                      Start your first chat
                    </Button>
                  )}
                </div>
              ) : (
                // Conversation list
                filteredConversations.map((conversation) => (
                  <div
                    key={conversation.id}
                    className={`p-3 rounded-lg border cursor-pointer transition-colors group relative ${
                      currentConversationId === conversation.id
                        ? 'bg-primary/10 border-primary'
                        : 'hover:bg-muted/50'
                    }`}
                    onClick={() => onConversationSelect(conversation.id)}
                  >
                    {/* Delete button */}
                    {onDeleteConversation && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity h-6 w-6 p-0"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteConversation(conversation.id);
                        }}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    )}
                    
                    {/* Conversation title */}
                    <p className="text-sm font-medium truncate pr-8">
                      {conversation.title || 'Untitled Conversation'}
                    </p>
                    
                    {/* Metadata */}
                    <div className="flex items-center justify-between mt-2">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs px-1 py-0">
                          {conversation.message_count || 0} messages
                        </Badge>
                        {conversation.total_tokens_used > 0 && (
                          <Badge variant="secondary" className="text-xs px-1 py-0">
                            {conversation.total_tokens_used} tokens
                          </Badge>
                        )}
                      </div>
                    </div>
                    
                    {/* Last activity */}
                    <p className="text-xs text-muted-foreground mt-1">
                      {formatLastActivity(conversation.last_message_at, conversation.created_at)}
                    </p>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}