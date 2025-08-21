import React, { useState } from 'react';
import { Plus, Search, MessageSquare, Loader2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { useConversations } from '@/hooks/useConversations';
import { useConversationCRUD } from '@/hooks/useConversationCRUD';
import { ConversationListItem } from '@/components/ConversationListItem';
import { SimpleChatService } from '@/services/SimpleChatService';

interface ConversationSidebarProps {
  activeConversationId?: string;
  onConversationSelect: (conversationId: string) => void;
  onConversationCreate?: (conversationId: string) => void;
  className?: string;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

export function ConversationSidebar({ 
  activeConversationId, 
  onConversationSelect, 
  onConversationCreate,
  className,
  isCollapsed = false,
  onToggleCollapse
}: ConversationSidebarProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  
  const { conversations, isLoading, error } = useConversations();
  const { createConversation, isCreating } = useConversationCRUD();

  // Handle search with debouncing
  React.useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    const timeoutId = setTimeout(async () => {
      setIsSearching(true);
      try {
        const results = await SimpleChatService.searchConversations(searchQuery);
        setSearchResults(results);
      } catch (error) {
        console.error('Search failed:', error);
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchQuery]);

  const handleCreateConversation = () => {
    const title = `New Chat ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    createConversation.mutate(title, {
      onSuccess: (conversationId) => {
        onConversationCreate?.(conversationId);
        onConversationSelect(conversationId);
      },
    });
  };

  const clearSearch = () => {
    setSearchQuery('');
    setSearchResults([]);
  };

  const displayConversations = searchQuery.trim() ? searchResults : conversations;

  if (isCollapsed) {
    return (
      <div className={cn("w-16 border-r bg-background/95 backdrop-blur-sm", className)}>
        <div className="p-4 space-y-4">
          <Button
            variant="outline"
            size="sm"
            className="w-8 h-8 p-0"
            onClick={onToggleCollapse}
          >
            <MessageSquare className="h-4 w-4" />
          </Button>
          <Button
            variant="default"
            size="sm"
            className="w-8 h-8 p-0"
            onClick={handleCreateConversation}
            disabled={isCreating}
          >
            {isCreating ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Plus className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <Card className={cn("w-80 h-full border-r-2 border-l-0 border-t-0 border-b-0 rounded-none", className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-primary" />
            Conversations
          </h2>
          {onToggleCollapse && (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={onToggleCollapse}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
        
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search conversations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 pr-10"
          />
          {searchQuery && (
            <Button
              variant="ghost"
              size="sm"
              className="absolute right-1 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0 hover:bg-transparent"
              onClick={clearSearch}
            >
              <X className="h-3 w-3" />
            </Button>
          )}
        </div>
        
        {/* New Conversation Button */}
        <Button 
          onClick={handleCreateConversation}
          disabled={isCreating}
          className="w-full"
        >
          {isCreating ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Creating...
            </>
          ) : (
            <>
              <Plus className="h-4 w-4 mr-2" />
              New Conversation
            </>
          )}
        </Button>
      </CardHeader>

      <CardContent className="p-0 flex-1">
        <ScrollArea className="h-[calc(100vh-16rem)]">
          <div className="p-3 space-y-2">
            {isLoading && !searchQuery ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : error ? (
              <div className="text-center py-8">
                <p className="text-sm text-red-500">Failed to load conversations</p>
              </div>
            ) : isSearching ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground mr-2" />
                <span className="text-sm text-muted-foreground">Searching...</span>
              </div>
            ) : displayConversations.length === 0 ? (
              <div className="text-center py-8">
                {searchQuery ? (
                  <div>
                    <Search className="h-8 w-8 mx-auto mb-3 text-muted-foreground opacity-50" />
                    <p className="text-sm text-muted-foreground">
                      No conversations found for "{searchQuery}"
                    </p>
                  </div>
                ) : (
                  <div>
                    <MessageSquare className="h-8 w-8 mx-auto mb-3 text-muted-foreground opacity-50" />
                    <p className="text-sm text-muted-foreground mb-2">No conversations yet</p>
                    <p className="text-xs text-muted-foreground">
                      Create your first conversation to get started
                    </p>
                  </div>
                )}
              </div>
            ) : (
              displayConversations.map((conversation) => (
                <ConversationListItem
                  key={conversation.id}
                  conversation={conversation}
                  isActive={conversation.id === activeConversationId}
                  onClick={() => onConversationSelect(conversation.id)}
                />
              ))
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}