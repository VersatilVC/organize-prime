import React, { useState } from 'react';
import { MessageSquare, MoreVertical, Pencil, Trash2, Archive } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { cn } from '@/lib/utils';
import { type Conversation } from '@/services/SimpleChatService';
import { useConversationCRUD } from '@/hooks/useConversationCRUD';

interface ConversationListItemProps {
  conversation: Conversation;
  isActive?: boolean;
  onClick?: () => void;
}

export function ConversationListItem({ conversation, isActive, onClick }: ConversationListItemProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(conversation.title);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  
  const { updateConversation, deleteConversation, archiveConversation, isUpdating, isDeleting } = useConversationCRUD();

  const handleSaveEdit = () => {
    if (editTitle.trim() && editTitle !== conversation.title) {
      updateConversation.mutate(
        { id: conversation.id, title: editTitle.trim() },
        {
          onSuccess: () => setIsEditing(false),
        }
      );
    } else {
      setIsEditing(false);
      setEditTitle(conversation.title);
    }
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditTitle(conversation.title);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSaveEdit();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      handleCancelEdit();
    }
  };

  const handleDelete = () => {
    deleteConversation.mutate(conversation.id, {
      onSuccess: () => setShowDeleteDialog(false),
    });
  };

  const handleArchive = () => {
    archiveConversation.mutate(conversation.id);
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 1) {
      const minutes = Math.floor(diffInHours * 60);
      return `${minutes}m ago`;
    } else if (diffInHours < 24) {
      const hours = Math.floor(diffInHours);
      return `${hours}h ago`;
    } else if (diffInHours < 24 * 7) {
      const days = Math.floor(diffInHours / 24);
      return `${days}d ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  return (
    <>
      <div
        className={cn(
          "group relative p-2 rounded-lg border transition-all duration-300 cursor-pointer hover:bg-gradient-to-r hover:from-muted/30 hover:to-transparent hover:shadow-md hover:scale-[1.01] active:scale-[0.99]",
          isActive 
            ? "bg-gradient-to-r from-primary/5 to-primary/10 border-l-4 border-l-primary border-r border-t border-b border-primary/20 shadow-lg" 
            : "border-border/50 hover:border-primary/20"
        )}
        onClick={!isEditing ? onClick : undefined}
      >
        {/* Main Content */}
        <div className="flex items-start gap-1">
          <div className="flex-shrink-0 mt-0.5">
            <div className={cn(
              "p-1 rounded-md transition-all duration-200",
              isActive 
                ? "bg-primary/20 border border-primary/30" 
                : "bg-muted/50 border border-muted group-hover:bg-primary/10 group-hover:border-primary/20"
            )}>
              <MessageSquare className={cn(
                "h-3 w-3 transition-colors",
                isActive ? "text-primary" : "text-muted-foreground group-hover:text-primary/80"
              )} />
            </div>
          </div>
          
          <div className="flex-1 min-w-0 pr-6">
            {isEditing ? (
              <Input
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                onKeyDown={handleKeyPress}
                onBlur={handleSaveEdit}
                className="h-8 text-sm font-medium"
                autoFocus
                disabled={isUpdating}
              />
            ) : (
              <div>
                <h3 className={cn(
                  "text-xs font-medium truncate mb-0.5 transition-colors max-w-[140px]",
                  isActive ? "text-foreground" : "text-foreground/90 group-hover:text-foreground"
                )}>
                  {conversation.title}
                </h3>
                
                {conversation.message_preview && (
                  <p className="text-xs text-muted-foreground truncate leading-tight mb-1 group-hover:text-muted-foreground/80 max-w-[140px]">
                    {conversation.message_preview}
                  </p>
                )}
                
                <div className="flex items-center justify-start gap-1">
                  <div className="flex items-center gap-1">
                    <span className={cn(
                      "text-xs font-medium px-1 py-0.5 rounded-full",
                      isActive 
                        ? "bg-primary/20 text-primary" 
                        : "bg-muted text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary/80"
                    )}>
                      {formatTime(conversation.last_activity_at)}
                    </span>
                  </div>
                  {conversation.message_count > 0 && (
                    <div className={cn(
                      "text-xs font-medium px-1 py-0.5 rounded-full border ml-auto",
                      isActive
                        ? "bg-primary/10 text-primary border-primary/20"
                        : "bg-muted/50 text-muted-foreground border-muted group-hover:border-primary/20 group-hover:text-primary/70"
                    )}>
                      {conversation.message_count}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Actions Menu */}
          {!isEditing && (
            <div className="absolute top-1 right-1 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-5 w-5 p-0 hover:bg-accent rounded-md"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <MoreVertical className="h-3 w-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-32">
                  <DropdownMenuItem
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsEditing(true);
                    }}
                    disabled={isUpdating}
                  >
                    <Pencil className="h-3 w-3 mr-2" />
                    Rename
                  </DropdownMenuItem>
                  
                  <DropdownMenuItem
                    onClick={(e) => {
                      e.stopPropagation();
                      handleArchive();
                    }}
                  >
                    <Archive className="h-3 w-3 mr-2" />
                    Archive
                  </DropdownMenuItem>
                  
                  <DropdownMenuSeparator />
                  
                  <DropdownMenuItem
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowDeleteDialog(true);
                    }}
                    className="text-red-600 focus:text-red-600 focus:bg-red-50"
                  >
                    <Trash2 className="h-3 w-3 mr-2" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Conversation</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{conversation.title}"? This will permanently delete 
              the conversation and all its messages. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
            >
              {isDeleting ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}