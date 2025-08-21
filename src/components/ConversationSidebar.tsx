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
      <div className={cn("w-20 border-r-2 border-r-primary/20 bg-gradient-to-b from-background/95 to-muted/10 backdrop-blur-xl shadow-2xl", className)}>
        <div className="p-3 space-y-4 flex flex-col items-center">
          <Button
            variant="outline"
            size="sm"
            className="w-10 h-10 p-0 rounded-xl border border-primary/20 bg-background/50 backdrop-blur-sm hover:bg-primary/10 hover:border-primary/40 transition-all duration-300 hover:scale-110"
            onClick={onToggleCollapse}
          >
            <MessageSquare className="h-4 w-4 text-primary" />
          </Button>
          <Button
            variant="default"
            size="sm"
            className="w-10 h-10 p-0 rounded-xl bg-gradient-to-br from-primary to-primary/80 hover:from-primary/90 hover:to-primary shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-110 active:scale-95"
            onClick={handleCreateConversation}
            disabled={isCreating}
          >
            {isCreating ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Plus className="h-4 w-4" />
            )}
          </Button>
          {conversations.length > 0 && (
            <div className="text-xs font-bold text-primary bg-primary/10 rounded-full w-6 h-6 flex items-center justify-center border border-primary/20">
              {conversations.length}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <Card className={cn("w-64 h-full border-r-2 border-l-4 border-l-primary/20 border-t-0 border-b-0 rounded-none bg-gradient-to-b from-background to-muted/5", className)}>
      <CardHeader className="pb-3 border-b border-border/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-primary/10 border border-primary/20">
              <MessageSquare className="h-4 w-4 text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-bold tracking-tight">Conversations</h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                {conversations.length} conversations
              </p>
            </div>
          </div>
          {onToggleCollapse && (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0"
              onClick={onToggleCollapse}
            >
              <X className="h-3 w-3" />
            </Button>
          )}
        </div>
        
        {/* Search */}
        <div className="relative mt-3">
          <div className="absolute left-2 top-1/2 transform -translate-y-1/2 p-1 rounded-md bg-primary/10">
            <Search className="h-3 w-3 text-primary" />
          </div>
          <Input
            placeholder="Search conversations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8 pr-8 h-9 bg-background/50 backdrop-blur-sm border border-border/50 focus:border-primary/50 transition-all duration-200 placeholder:text-muted-foreground/70 text-sm"
          />
          {searchQuery && (
            <Button
              variant="ghost"
              size="sm"
              className="absolute right-1 top-1/2 transform -translate-y-1/2 h-5 w-5 p-0 hover:bg-transparent"
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
          className="w-full h-9 bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.98] text-sm"
        >
          {isCreating ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              <span className="font-semibold">Creating...</span>
            </>
          ) : (
            <>
              <Plus className="h-4 w-4 mr-2" />
              <span className="font-semibold">New Conversation</span>
            </>
          )}
        </Button>
      </CardHeader>

      <CardContent className="p-0 flex-1">
        <ScrollArea className="h-[calc(100vh-14rem)]">
          <div className="p-1 space-y-1">
            {isLoading && !searchQuery ? (
              <div className="flex items-center justify-center py-6">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : error ? (
              <div className="text-center py-6">
                <p className="text-sm text-red-500">Failed to load conversations</p>
              </div>
            ) : isSearching ? (
              <div className="flex items-center justify-center py-6">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground mr-2" />
                <span className="text-sm text-muted-foreground">Searching...</span>
              </div>
            ) : displayConversations.length === 0 ? (
              <div className="text-center py-6">
                {searchQuery ? (
                  <div>
                    <Search className="h-6 w-6 mx-auto mb-2 text-muted-foreground opacity-50" />
                    <p className="text-sm text-muted-foreground">
                      No conversations found for "{searchQuery}"
                    </p>
                  </div>
                ) : (
                  <div>
                    <MessageSquare className="h-6 w-6 mx-auto mb-2 text-muted-foreground opacity-50" />
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