import React, { useState, useMemo } from 'react';
import {
  MoreHorizontal,
  Star,
  Bookmark,
  Trash2,
  Edit3,
  Archive,
  Download,
  Copy,
  Calendar,
  MessageSquare,
  Clock,
  Filter,
  Grid,
  List,
  SortAsc,
  SortDesc,
  Search,
  Tag,
  FolderOpen,
  Pin
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import { useChatSessions } from '../hooks/useChatSessions';
import { useToast } from '@/hooks/use-toast';
import { GlobalChatSearch } from './GlobalChatSearch';

export interface ConversationItem {
  id: string;
  title: string;
  message_count: number;
  created_at: string;
  updated_at: string;
  is_bookmarked?: boolean;
  is_pinned?: boolean;
  is_archived?: boolean;
  tags?: string[];
  kb_ids?: string[];
  last_message_preview?: string;
  model_config?: {
    model: string;
    temperature: number;
  };
}

interface ConversationManagerProps {
  onSelectConversation: (conversationId: string) => void;
  onCreateConversation: () => void;
  activeConversationId?: string;
  className?: string;
  showSearch?: boolean;
  showFilters?: boolean;
  allowBulkActions?: boolean;
}

type ViewMode = 'list' | 'grid';
type SortField = 'updated' | 'created' | 'title' | 'messages';
type SortOrder = 'asc' | 'desc';
type FilterTab = 'all' | 'bookmarked' | 'pinned' | 'archived';

export function ConversationManager({
  onSelectConversation,
  onCreateConversation,
  activeConversationId,
  className,
  showSearch = true,
  showFilters = true,
  allowBulkActions = true
}: ConversationManagerProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [sortField, setSortField] = useState<SortField>('updated');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [activeTab, setActiveTab] = useState<FilterTab>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [showBulkActions, setShowBulkActions] = useState(false);

  const { conversations, updateTitle, deleteConversation } = useChatSessions();
  const { toast } = useToast();

  // Filter and sort conversations - simplified for debugging
  const filteredConversations = useMemo(() => {
    if (!conversations) {
      console.log('📋 No conversations data');
      return [];
    }

    console.log('📋 Processing conversations:', conversations.length);
    
    // For now, just return all active conversations sorted by creation date
    const filtered = conversations
      .filter(conv => conv.is_active !== false) // Show all active conversations
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()); // Newest first
    
    console.log('📋 Filtered result:', filtered.length);
    return filtered;
  }, [conversations]);

  // Debug logging for conversations data
  React.useEffect(() => {
    console.log('📋 ConversationManager received conversations:', conversations?.length || 0);
    console.log('📋 Conversations data:', conversations);
    console.log('📋 Filtered conversations:', filteredConversations?.length || 0);
    console.log('📋 Active tab:', activeTab);
    console.log('📋 Search query:', searchQuery);
  }, [conversations, filteredConversations, activeTab, searchQuery]);

  // Handle conversation actions
  const handleToggleBookmark = async (conversationId: string, currentState: boolean) => {
    // For now, just show a placeholder toast - this feature can be implemented later
    toast({
      title: 'Feature Coming Soon',
      description: 'Bookmark functionality will be available in a future update.',
    });
  };

  const handleTogglePin = async (conversationId: string, currentState: boolean) => {
    // For now, just show a placeholder toast - this feature can be implemented later
    toast({
      title: 'Feature Coming Soon',
      description: 'Pin functionality will be available in a future update.',
    });
  };

  const handleArchive = async (conversationId: string) => {
    // For now, just show a placeholder toast - this feature can be implemented later
    toast({
      title: 'Feature Coming Soon',
      description: 'Archive functionality will be available in a future update.',
    });
  };

  const handleDelete = async (conversationId: string) => {
    try {
      await deleteConversation(conversationId);
      
      toast({
        title: 'Deleted',
        description: 'Conversation has been deleted.',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete conversation.',
        variant: 'destructive',
      });
    }
  };

  // Bulk actions - simplified for clean interface
  const handleSelectAll = () => {
    // Bulk actions disabled for clean interface
  };

  const handleBulkAction = async (action: 'bookmark' | 'archive' | 'delete') => {
    // Bulk actions disabled for clean interface
  };

  const getTabCounts = () => {
    if (!conversations) return { all: 0, bookmarked: 0, pinned: 0, archived: 0 };
    
    return {
      all: conversations.filter(conv => !conv.is_archived).length,
      bookmarked: conversations.filter(conv => conv.is_bookmarked && !conv.is_archived).length,
      pinned: conversations.filter(conv => conv.is_pinned && !conv.is_archived).length,
      archived: conversations.filter(conv => conv.is_archived).length
    };
  };

  const tabCounts = getTabCounts();

  return (
    <div className={cn("flex flex-col h-full", className)}>
      {/* Header */}
      <div className="p-4 border-b space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-lg">Conversations</h2>
          <Button onClick={onCreateConversation} size="sm">
            <MessageSquare className="h-4 w-4 mr-2" />
            New Chat
          </Button>
        </div>

        {/* Search - removed duplicate, using GlobalChatSearch below */}

        {/* Global Search Component */}
        {showSearch && (
          <GlobalChatSearch
            onSelectConversation={onSelectConversation}
            maxResults={10}
            showFilters={false}
          />
        )}
      </div>

      {/* Simplified Filters - Only show when enabled */}
      {showFilters && (
        <div className="p-4 border-b space-y-4">
          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as FilterTab)}>
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="all" className="relative">
                All
                {tabCounts.all > 0 && (
                  <Badge variant="secondary" className="ml-1 text-xs">
                    {tabCounts.all}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="bookmarked">
                <Bookmark className="h-3 w-3 mr-1" />
                Bookmarked
                {tabCounts.bookmarked > 0 && (
                  <Badge variant="secondary" className="ml-1 text-xs">
                    {tabCounts.bookmarked}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="pinned">
                <Pin className="h-3 w-3 mr-1" />
                Pinned
                {tabCounts.pinned > 0 && (
                  <Badge variant="secondary" className="ml-1 text-xs">
                    {tabCounts.pinned}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="archived">
                <Archive className="h-3 w-3 mr-1" />
                Archived
                {tabCounts.archived > 0 && (
                  <Badge variant="secondary" className="ml-1 text-xs">
                    {tabCounts.archived}
                  </Badge>
                )}
              </TabsTrigger>
            </TabsList>
          </Tabs>

          {/* Sort and View Controls */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {/* Sort Controls */}
              <Select value={sortField} onValueChange={(value) => setSortField(value as SortField)}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="updated">Updated</SelectItem>
                  <SelectItem value="created">Created</SelectItem>
                  <SelectItem value="title">Title</SelectItem>
                  <SelectItem value="messages">Messages</SelectItem>
                </SelectContent>
              </Select>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
              >
                {sortOrder === 'asc' ? <SortAsc className="h-4 w-4" /> : <SortDesc className="h-4 w-4" />}
              </Button>
            </div>

            <div className="flex items-center gap-2">
              {/* Bulk Actions */}
              {allowBulkActions && selectedItems.size > 0 && (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">
                    {selectedItems.size} selected
                  </span>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm">
                        Actions
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                      <DropdownMenuItem onClick={() => handleBulkAction('bookmark')}>
                        <Bookmark className="h-4 w-4 mr-2" />
                        Bookmark All
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleBulkAction('archive')}>
                        <Archive className="h-4 w-4 mr-2" />
                        Archive All
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem 
                        onClick={() => handleBulkAction('delete')}
                        className="text-red-600"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete All
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              )}

              {/* View Mode Toggle */}
              <div className="flex items-center border rounded-lg">
                <Button
                  variant={viewMode === 'list' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('list')}
                  className="rounded-r-none"
                >
                  <List className="h-4 w-4" />
                </Button>
                <Button
                  variant={viewMode === 'grid' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('grid')}
                  className="rounded-l-none"
                >
                  <Grid className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>

          {/* Select All for Bulk Actions */}
          {allowBulkActions && filteredConversations.length > 0 && (
            <div className="flex items-center gap-2">
              <Checkbox
                checked={selectedItems.size === filteredConversations.length}
                onCheckedChange={handleSelectAll}
              />
              <span className="text-sm text-muted-foreground">
                Select all conversations
              </span>
            </div>
          )}
        </div>
      )}

      {/* Conversations List */}
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-1">
          {filteredConversations.length === 0 ? (
            <div className="text-center py-8">
              <MessageSquare className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
              <h3 className="font-medium mb-2">No conversations found</h3>
              <p className="text-sm text-muted-foreground mb-4">
                {searchQuery ? 'Try adjusting your search terms' : 'Start a new conversation to get started'}
              </p>
              <Button onClick={onCreateConversation}>
                <MessageSquare className="h-4 w-4 mr-2" />
                New Conversation
              </Button>
            </div>
          ) : (
            filteredConversations.map((conversation) => (
              <ConversationCard
                key={conversation.id}
                conversation={conversation}
                isActive={activeConversationId === conversation.id}
                isSelected={false}
                viewMode="list"
                allowSelection={false}
                onSelect={() => onSelectConversation(conversation.id)}
                onToggleSelection={() => {}}
                onToggleBookmark={(state) => handleToggleBookmark(conversation.id, state)}
                onTogglePin={(state) => handleTogglePin(conversation.id, state)}
                onArchive={() => handleArchive(conversation.id)}
                onDelete={() => handleDelete(conversation.id)}
              />
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

// Conversation Card Component
interface ConversationCardProps {
  conversation: ConversationItem;
  isActive: boolean;
  isSelected: boolean;
  viewMode: ViewMode;
  allowSelection: boolean;
  onSelect: () => void;
  onToggleSelection: (selected: boolean) => void;
  onToggleBookmark: (currentState: boolean) => void;
  onTogglePin: (currentState: boolean) => void;
  onArchive: () => void;
  onDelete: () => void;
}

function ConversationCard({
  conversation,
  isActive,
  isSelected,
  viewMode,
  allowSelection,
  onSelect,
  onToggleSelection,
  onToggleBookmark,
  onTogglePin,
  onArchive,
  onDelete
}: ConversationCardProps) {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
    
    if (diffInHours < 24) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (diffInHours < 24 * 7) {
      return date.toLocaleDateString([], { weekday: 'short' });
    } else {
      return date.toLocaleDateString();
    }
  };

  return (
    <div 
      className={cn(
        "group cursor-pointer transition-all duration-200 rounded-lg p-3 hover:bg-accent/50",
        isActive && "bg-accent border-l-2 border-primary"
      )}
      onClick={onSelect}
    >
      <div className="flex items-start gap-3">
        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            {conversation.is_pinned && (
              <Pin className="h-3 w-3 text-orange-500 fill-current" />
            )}
            {conversation.is_bookmarked && (
              <Bookmark className="h-3 w-3 text-yellow-500 fill-current" />
            )}
            <h3 className="font-medium text-sm truncate flex-1">
              {conversation.title}
            </h3>
          </div>

          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>{formatDate(conversation.updated_at || conversation.created_at)}</span>
          </div>
        </div>

        {/* Simple Actions Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
            <Button variant="ghost" size="sm" className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity">
              <MoreHorizontal className="h-3 w-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onToggleBookmark(!!conversation.is_bookmarked)}>
              <Bookmark className="h-4 w-4 mr-2" />
              {conversation.is_bookmarked ? 'Remove Bookmark' : 'Bookmark'}
            </DropdownMenuItem>
            
            <DropdownMenuItem onClick={() => onTogglePin(!!conversation.is_pinned)}>
              <Pin className="h-4 w-4 mr-2" />
              {conversation.is_pinned ? 'Unpin' : 'Pin'}
            </DropdownMenuItem>

            <DropdownMenuSeparator />

            <DropdownMenuItem onClick={onDelete} className="text-red-600">
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}