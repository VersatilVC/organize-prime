import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useOrganization } from '@/contexts/OrganizationContext';
import { useToast } from '@/hooks/use-toast';
import { KBFile } from '../services/fileUploadApi';

interface FileStatusUpdate {
  fileId: string;
  status: 'pending' | 'processing' | 'completed' | 'error';
  processingError?: string;
  chunkCount?: number;
  vectorCount?: number;
  updatedAt: string;
}

interface UseKBFileStatusReturn {
  fileStatuses: Map<string, FileStatusUpdate>;
  isConnected: boolean;
  connectionError: string | null;
  lastUpdateTime: Date | null;
  retryConnection: () => void;
  getFileStatus: (fileId: string) => FileStatusUpdate | null;
  clearFileStatus: (fileId: string) => void;
}

export function useKBFileStatus(organizationId?: string): UseKBFileStatusReturn {
  const { currentOrganization } = useOrganization();
  const { toast } = useToast();
  
  const [fileStatuses, setFileStatuses] = useState<Map<string, FileStatusUpdate>>(new Map());
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [lastUpdateTime, setLastUpdateTime] = useState<Date | null>(null);
  
  const channelRef = useRef<any>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);
  
  const orgId = organizationId || currentOrganization?.id;

  const updateFileStatus = useCallback((payload: any) => {
    if (!payload.new) return;

    const update: FileStatusUpdate = {
      fileId: payload.new.id,
      status: payload.new.status,
      processingError: payload.new.processing_error,
      chunkCount: payload.new.chunk_count,
      vectorCount: payload.new.vector_count,
      updatedAt: payload.new.updated_at,
    };

    setFileStatuses(prev => new Map(prev.set(update.fileId, update)));
    setLastUpdateTime(new Date());

    // Show toast notifications for status changes
    if (payload.old && payload.old.status !== payload.new.status) {
      const fileName = payload.new.file_name || 'File';
      
      switch (payload.new.status) {
        case 'processing':
          toast({
            title: 'Processing Started',
            description: `${fileName} is now being processed.`,
          });
          break;
        case 'completed':
          toast({
            title: 'Processing Complete',
            description: `${fileName} has been successfully processed.`,
          });
          break;
        case 'error':
          toast({
            title: 'Processing Failed',
            description: `${fileName} failed to process: ${payload.new.processing_error || 'Unknown error'}`,
            variant: 'destructive',
          });
          break;
      }
    }
  }, [toast]);

  const handleConnectionState = useCallback((status: string, error?: any) => {
    switch (status) {
      case 'SUBSCRIBED':
        setIsConnected(true);
        setConnectionError(null);
        reconnectAttemptsRef.current = 0;
        console.log('✅ KB file status subscription active');
        break;
      case 'CLOSED':
        setIsConnected(false);
        console.log('🔌 KB file status subscription closed');
        break;
      case 'CHANNEL_ERROR':
        setIsConnected(false);
        setConnectionError(error?.message || 'Subscription channel error');
        console.error('❌ KB file status subscription error:', error);
        break;
      case 'TIMED_OUT':
        setIsConnected(false);
        setConnectionError('Connection timed out');
        console.warn('⏱️ KB file status subscription timed out');
        break;
    }
  }, []);

  const retryConnection = useCallback(() => {
    if (!orgId) return;

    reconnectAttemptsRef.current += 1;
    const maxRetries = 5;
    const baseDelay = 2000;
    const delay = Math.min(baseDelay * Math.pow(2, reconnectAttemptsRef.current - 1), 30000);

    console.log(`🔄 Retrying KB file status connection (attempt ${reconnectAttemptsRef.current}/${maxRetries})`);

    if (reconnectAttemptsRef.current > maxRetries) {
      setConnectionError('Max reconnection attempts reached');
      toast({
        title: 'Connection Failed',
        description: 'Unable to establish real-time file status updates. Please refresh the page.',
        variant: 'destructive',
      });
      return;
    }

    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }

    reconnectTimeoutRef.current = setTimeout(() => {
      // Clean up existing channel
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }

      // Create new subscription
      const channel = supabase
        .channel(`kb-files-${orgId}-${Date.now()}`)
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'kb_files',
          filter: `organization_id=eq.${orgId}`
        }, updateFileStatus)
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'kb_processing_logs',
          filter: `organization_id=eq.${orgId}`
        }, (payload) => {
          // Update processing progress from logs
          if (payload.new?.file_id) {
            setLastUpdateTime(new Date());
          }
        });

      // Handle connection state changes
      channel.subscribe((status: string, error?: any) => {
        handleConnectionState(status, error);
        
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          retryConnection();
        }
      });

      channelRef.current = channel;
    }, delay);
  }, [orgId, updateFileStatus, handleConnectionState, toast]);

  // Initialize subscription
  useEffect(() => {
    if (!orgId) {
      setIsConnected(false);
      setConnectionError('No organization selected');
      return;
    }

    // Reset state
    setFileStatuses(new Map());
    setConnectionError(null);
    reconnectAttemptsRef.current = 0;

    // Create subscription channel
    const channel = supabase
      .channel(`kb-files-${orgId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'kb_files',
        filter: `organization_id=eq.${orgId}`
      }, updateFileStatus)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'kb_processing_logs',
        filter: `organization_id=eq.${orgId}`
      }, (payload) => {
        // Update processing progress from logs
        if (payload.new?.file_id) {
          setLastUpdateTime(new Date());
        }
      });

    // Subscribe and handle connection state
    channel.subscribe((status: string, error?: any) => {
      handleConnectionState(status, error);
      
      if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
        retryConnection();
      }
    });

    channelRef.current = channel;

    // Cleanup function
    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
      setIsConnected(false);
    };
  }, [orgId, updateFileStatus, handleConnectionState, retryConnection]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, []);

  const getFileStatus = useCallback((fileId: string): FileStatusUpdate | null => {
    return fileStatuses.get(fileId) || null;
  }, [fileStatuses]);

  const clearFileStatus = useCallback((fileId: string) => {
    setFileStatuses(prev => {
      const updated = new Map(prev);
      updated.delete(fileId);
      return updated;
    });
  }, []);

  return {
    fileStatuses,
    isConnected,
    connectionError,
    lastUpdateTime,
    retryConnection,
    getFileStatus,
    clearFileStatus,
  };
}