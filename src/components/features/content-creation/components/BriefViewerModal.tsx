import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { BriefMarkdownViewer } from './BriefMarkdownViewer';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertTriangle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import type { ContentBriefWithDetails } from '@/types/content-creation';

interface BriefViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  briefId: string | null;
  onEdit?: (brief: ContentBriefWithDetails) => void;
}

export function BriefViewerModal({
  isOpen,
  onClose,
  briefId,
  onEdit
}: BriefViewerModalProps) {
  // Fetch brief data with generation status
  const { data: brief, isLoading, error } = useQuery({
    queryKey: ['content-brief-detailed', briefId],
    queryFn: async () => {
      if (!briefId) return null;
      
      const { data, error } = await supabase
        .from('content_briefs')
        .select(`
          *,
          content_ideas!inner(
            id,
            title,
            description,
            keywords,
            target_audience,
            content_type
          )
        `)
        .eq('id', briefId)
        .single();

      if (error) {
        throw new Error(`Failed to fetch brief: ${error.message}`);
      }

      return data as ContentBriefWithDetails & {
        brief_content?: string;
        generation_status?: 'pending' | 'processing' | 'completed' | 'failed';
        generation_error?: string;
        generation_started_at?: string;
        generation_completed_at?: string;
      };
    },
    enabled: !!briefId && isOpen,
    // Poll for updates if generation is in progress
    refetchInterval: (data) => {
      if (data?.generation_status === 'pending' || data?.generation_status === 'processing') {
        return 3000; // Poll every 3 seconds
      }
      return false;
    },
  });

  const handleClose = () => {
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center gap-2">
            Content Brief
            {brief?.generation_status === 'processing' && (
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 min-h-0 overflow-hidden">
          {isLoading && (
            <div className="space-y-4">
              <div className="flex items-center space-x-4">
                <Skeleton className="h-12 w-12 rounded" />
                <div className="space-y-2 flex-1">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                </div>
              </div>
              <div className="space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
              </div>
            </div>
          )}

          {error && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Failed to load brief: {error.message}
              </AlertDescription>
            </Alert>
          )}

          {brief && (
            <div className="h-full overflow-hidden">
              <BriefMarkdownViewer
                brief={brief}
                onEdit={onEdit}
                className="h-full border-0 shadow-none"
              />
            </div>
          )}

          {!isLoading && !error && !brief && briefId && (
            <div className="flex flex-col items-center justify-center h-40 text-center">
              <AlertTriangle className="h-12 w-12 text-muted-foreground mb-3" />
              <h3 className="text-lg font-medium mb-1">Brief Not Found</h3>
              <p className="text-muted-foreground">
                The content brief you're looking for doesn't exist or has been deleted.
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}