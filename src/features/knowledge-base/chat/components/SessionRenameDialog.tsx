import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { ChatSession } from '../services/ChatSessionService';

interface SessionRenameDialogProps {
  session: ChatSession | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (sessionId: string, newTitle: string) => Promise<void>;
}

export function SessionRenameDialog({
  session,
  isOpen,
  onClose,
  onConfirm
}: SessionRenameDialogProps) {
  const [title, setTitle] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Reset form when dialog opens/closes
  useEffect(() => {
    if (isOpen && session) {
      setTitle(session.title);
      setError('');
    } else {
      setTitle('');
      setError('');
    }
  }, [isOpen, session]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!session) return;

    const trimmedTitle = title.trim();
    
    // Validation
    if (!trimmedTitle) {
      setError('Title cannot be empty');
      return;
    }
    
    if (trimmedTitle.length > 100) {
      setError('Title cannot exceed 100 characters');
      return;
    }
    
    if (trimmedTitle === session.title) {
      onClose();
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      await onConfirm(session.id, trimmedTitle);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to rename chat');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Rename Chat</DialogTitle>
          <DialogDescription>
            Enter a new title for this chat session.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Chat Title</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => {
                  setTitle(e.target.value);
                  if (error) setError('');
                }}
                onKeyDown={handleKeyDown}
                placeholder="Enter chat title..."
                maxLength={100}
                autoFocus
                disabled={isSubmitting}
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{error && <span className="text-red-600">{error}</span>}</span>
                <span>{title.length}/100</span>
              </div>
            </div>
          </div>

          <DialogFooter className="mt-6">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || !title.trim() || title.trim() === session?.title}
            >
              {isSubmitting ? 'Renaming...' : 'Rename'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}