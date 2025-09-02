import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useEffectiveOrganization } from '@/hooks/useEffectiveOrganization';
import { useToast } from '@/hooks/use-toast';
import { KBFile } from '../services/fileUploadApi';

export function useFileSubscription() {
  const { effectiveOrganizationId } = useEffectiveOrganization();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  useEffect(() => {
    if (!effectiveOrganizationId) return;

    // Subscribe to file status changes
    const channel = supabase
      .channel(`kb-files-${effectiveOrganizationId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'kb_files',
          filter: `organization_id=eq.${effectiveOrganizationId}`
        },
        (payload) => {
          console.log('File status update:', payload);

          // Handle different types of changes
          if (payload.eventType === 'UPDATE') {
            const oldRecord = payload.old as KBFile;
            const newRecord = payload.new as KBFile;

            // Check if status changed
            if (oldRecord.status !== newRecord.status) {
              handleStatusChange(oldRecord, newRecord);
            }

            // Invalidate and refetch relevant queries
            queryClient.invalidateQueries({ queryKey: ['kb-files'] });
            queryClient.invalidateQueries({ queryKey: ['file-stats'] });
          }

          if (payload.eventType === 'INSERT') {
            // New file uploaded
            queryClient.invalidateQueries({ queryKey: ['kb-files'] });
            queryClient.invalidateQueries({ queryKey: ['file-stats'] });
          }

          if (payload.eventType === 'DELETE') {
            // File deleted
            queryClient.invalidateQueries({ queryKey: ['kb-files'] });
            queryClient.invalidateQueries({ queryKey: ['file-stats'] });
          }
        }
      )
      .subscribe();

    // Cleanup subscription on unmount
    return () => {
      supabase.removeChannel(channel);
    };
  }, [effectiveOrganizationId, queryClient, toast]);

  const handleStatusChange = (oldRecord: KBFile, newRecord: KBFile) => {
    const statusMessages = {
      processing: {
        title: 'Processing started',
        description: `${newRecord.file_name} is being processed`,
        variant: 'default' as const
      },
      completed: {
        title: 'Processing completed',
        description: `${newRecord.file_name} has been successfully processed`,
        variant: 'default' as const
      },
      error: {
        title: 'Processing failed',
        description: `${newRecord.file_name} failed to process`,
        variant: 'destructive' as const
      }
    };

    const message = statusMessages[newRecord.status as keyof typeof statusMessages];
    
    if (message && oldRecord.status !== newRecord.status) {
      toast({
        title: message.title,
        description: message.description,
        variant: message.variant,
      });
    }
  };
}

export function useFileStatusSubscription(fileId: string, onStatusChange?: (status: string) => void) {
  const { currentOrganization } = useOrganization();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!effectiveOrganizationId || !fileId) return;

    const channel = supabase
      .channel(`file-${fileId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'kb_files',
          filter: `id=eq.${fileId}`
        },
        (payload) => {
          const newRecord = payload.new as KBFile;
          onStatusChange?.(newRecord.status);
          
          // Update specific file queries
          queryClient.invalidateQueries({ 
            queryKey: ['kb-files'],
            exact: false 
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fileId, effectiveOrganizationId, onStatusChange, queryClient]);
}