import React, { useState, useMemo } from 'react';
import { format, formatDistanceToNow } from 'date-fns';
import {
  Plus,
  Search,
  MoreHorizontal,
  Edit3,
  Trash2,
  MessageSquare,
  Loader2,
  Filter,
  X
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { useChatSessions } from '../hooks/useChatSessions';
import { useKnowledgeBases } from '../../hooks/useKnowledgeBases';
import { SessionRenameDialog } from './SessionRenameDialog';
import { SessionDeleteDialog } from './SessionDeleteDialog';
import type { ChatSession } from '../services/ChatSessionService';

interface ChatSidebarProps {
  activeSessionId?: string;
  onSessionSelect: (sessionId: string) => void;
  onNewChat: () => void;
  className?: string;
}

export function ChatSidebar({
  activeSessionId,
  onSessionSelect,
  onNewChat,
  className
}: ChatSidebarProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedKbFilter, setSelectedKbFilter] = useState<string>('all');
  const [renameSession, setRenameSession] = useState<ChatSession | null>(null);
  const [deleteSession, setDeleteSession] = useState<ChatSession | null>(null);

  const {
    conversations,
    isLoading,
    error,
    createConversation,
    updateTitle,
    deleteConversation,
    isCreating,
    isDeleting
  } = useChatSessions();

  const { data: knowledgeBases } = useKnowledgeBases();

  // Filter conversations based on search and KB filter
  const filteredConversations = useMemo(() => {
    let filtered = conversations;

    // Apply search filter
    if (searchTerm.trim()) {
      filtered = filtered.filter(conv =>
        conv.title.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Apply knowledge base filter
    if (selectedKbFilter !== 'all') {
      filtered = filtered.filter(conv =>
        conv.kb_ids.includes(selectedKbFilter)
      );
    }

    return filtered;
  }, [conversations, searchTerm, selectedKbFilter]);

  const handleNewChat = async () => {
    try {
      const conversationId = await createConversation({
        title: 'New Chat',
        kbIds: selectedKbFilter !== 'all' ? [selectedKbFilter] : []
      });
      
      onNewChat();
      if (conversationId) {
        onSessionSelect(conversationId);
      }
    } catch (error) {
      console.error('Failed to create new chat:', error);
    }
  };

  const handleRename = async (sessionId: string, newTitle: string) => {
    try {
      await updateTitle({ conversationId: sessionId, title: newTitle });
      setRenameSession(null);
    } catch (error) {
      console.error('Failed to rename session:', error);
    }
  };

  const handleDelete = async (sessionId: string) => {
    try {
      await deleteConversation(sessionId);
      setDeleteSession(null);
      
      // If deleted session was active, clear selection
      if (activeSessionId === sessionId) {
        onSessionSelect('');
      }
    } catch (error) {
      console.error('Failed to delete session:', error);
    }
  };

  const formatLastActivity = (updatedAt: string) => {
    const date = new Date(updatedAt);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
    
    if (diffInHours < 24) {
      return formatDistanceToNow(date, { addSuffix: true });
    } else {
      return format(date, 'MMM d');
    }
  };

  return (
    <Card className={cn("flex flex-col h-full", className)}>
      {/* Header */}
      <div className="p-4 border-b">
        <div className="space-y-3">
          {/* New Chat Button */}
          <Button
            onClick={handleNewChat}
            disabled={isCreating}
            className="w-full justify-start gap-2"
          >
            {isCreating ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Plus className="h-4 w-4" />
            )}
            New Chat
          </Button>

          {/* Search Input */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search chats..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 pr-8"
            />
            {searchTerm && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSearchTerm('')}
                className="absolute right-1 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0"
              >
                <X className="h-3 w-3" />
              </Button>
            )}
          </div>

          {/* Knowledge Base Filter */}
          {knowledgeBases && knowledgeBases.length > 0 && (
            <Select value={selectedKbFilter} onValueChange={setSelectedKbFilter}>
              <SelectTrigger className="w-full">
                <div className="flex items-center gap-2">
                  <Filter className="h-4 w-4" />
                  <SelectValue placeholder="All Knowledge Bases" />
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Knowledge Bases</SelectItem>
                {knowledgeBases.map((kb) => (
                  <SelectItem key={kb.id} value={kb.id}>
                    {kb.display_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      </div>

      {/* Session List */}
      <ScrollArea className="flex-1">
        <div className="p-2">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : error ? (
            <div className="text-center py-8 text-muted-foreground">
              <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Failed to load chats</p>
              <Button variant="ghost" size="sm" className="mt-2">
                Try again
              </Button>
            </div>
          ) : filteredConversations.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">
                {searchTerm || selectedKbFilter !== 'all'
                  ? 'No chats match your filters'
                  : 'No chats yet'}
              </p>
              <p className="text-xs mt-1">
                {searchTerm || selectedKbFilter !== 'all'
                  ? 'Try adjusting your search or filters'
                  : 'Start a new conversation to get going'}
              </p>
            </div>
          ) : (
            <div className="space-y-1">
              {filteredConversations.map((session) => (
                <SessionItem
                  key={session.id}
                  session={session}
                  isActive={activeSessionId === session.id}
                  onClick={() => onSessionSelect(session.id)}
                  onRename={() => setRenameSession(session)}
                  onDelete={() => setDeleteSession(session)}
                  formatLastActivity={formatLastActivity}
                  isDeleting={isDeleting}
                />
              ))}
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Rename Dialog */}
      <SessionRenameDialog
        session={renameSession}
        isOpen={!!renameSession}
        onClose={() => setRenameSession(null)}
        onConfirm={handleRename}
      />

      {/* Delete Confirmation Dialog */}
      <SessionDeleteDialog
        session={deleteSession}
        isOpen={!!deleteSession}
        onClose={() => setDeleteSession(null)}
        onConfirm={handleDelete}
      />
    </Card>
  );
}

interface SessionItemProps {
  session: ChatSession;
  isActive: boolean;
  onClick: () => void;
  onRename: () => void;
  onDelete: () => void;
  formatLastActivity: (date: string) => string;
  isDeleting: boolean;
}

function SessionItem({
  session,
  isActive,
  onClick,
  onRename,
  onDelete,
  formatLastActivity,
  isDeleting
}: SessionItemProps) {
  return (
    <div
      className={cn(
        "group relative rounded-lg p-3 cursor-pointer transition-colors",
        "hover:bg-muted/50",
        isActive && "bg-muted border-l-2 border-l-primary"
      )}
      onClick={onClick}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <h4 className={cn(
            "font-medium text-sm truncate",
            isActive && "text-primary"
          )}>
            {session.title}
          </h4>
          
          <div className="flex items-center gap-2 mt-1">
            <span className="text-xs text-muted-foreground">
              {formatLastActivity(session.updated_at)}
            </span>
            
            {session.message_count > 0 && (
              <Badge variant="secondary" className="text-xs">
                {session.message_count}
              </Badge>
            )}
          </div>
          
          {session.kb_ids.length > 0 && (
            <div className="flex items-center gap-1 mt-1">
              <div className="w-2 h-2 rounded-full bg-blue-500" />
              <span className="text-xs text-muted-foreground">
                {session.kb_ids.length} KB{session.kb_ids.length > 1 ? 's' : ''}
              </span>
            </div>
          )}
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="opacity-0 group-hover:opacity-100 h-6 w-6 p-0"
              onClick={(e) => e.stopPropagation()}
            >
              <MoreHorizontal className="h-3 w-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onRename(); }}>
              <Edit3 className="h-4 w-4 mr-2" />
              Rename
            </DropdownMenuItem>
            <DropdownMenuItem 
              onClick={(e) => { e.stopPropagation(); onDelete(); }}
              className="text-red-600"
              disabled={isDeleting}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}