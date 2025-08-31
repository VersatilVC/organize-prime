import { useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { KBContentExtractionService, KBFile, KBExtractionLog } from '../services/KBContentExtractionService';

export function useKBExtractionStatus(fileId: string | null) {
  const [realtimeFile, setRealtimeFile] = useState<KBFile | null>(null);
  const [realtimeLogs, setRealtimeLogs] = useState<KBExtractionLog[]>([]);

  // Query for initial data
  const query = useQuery({
    queryKey: ['kb-extraction-status', fileId],
    queryFn: () => fileId ? KBContentExtractionService.getExtractionStatus(fileId) : null,
    enabled: !!fileId,
    refetchInterval: (data) => {
      // Auto-refresh if extraction is in progress
      const file = data?.file;
      const isProcessing = file?.extraction_status === 'processing' || file?.embedding_status === 'processing';
      return isProcessing ? 2000 : false; // Refresh every 2 seconds while processing
    }
  });

  // Set up real-time subscriptions
  useEffect(() => {
    if (!fileId) return;

    let fileUnsubscribe: (() => void) | null = null;
    let logsUnsubscribe: (() => void) | null = null;

    // Subscribe to file updates
    fileUnsubscribe = KBContentExtractionService.subscribeToFileUpdates(
      fileId,
      (updatedFile) => {
        setRealtimeFile(updatedFile);
      }
    );

    // Subscribe to extraction log updates
    logsUnsubscribe = KBContentExtractionService.subscribeToExtractionLogs(
      fileId,
      (newLog) => {
        setRealtimeLogs(prev => {
          // Check if log already exists
          const existing = prev.find(log => log.id === newLog.id);
          if (existing) {
            // Update existing log
            return prev.map(log => log.id === newLog.id ? newLog : log);
          } else {
            // Add new log
            return [newLog, ...prev].sort((a, b) => 
              new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
            );
          }
        });
      }
    );

    return () => {
      fileUnsubscribe?.();
      logsUnsubscribe?.();
    };
  }, [fileId]);

  // Merge real-time data with query data
  const file = realtimeFile || query.data?.file;
  const logs = realtimeLogs.length > 0 ? realtimeLogs : (query.data?.logs || []);

  return {
    file,
    logs,
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
    
    // Helper properties
    isExtracting: file?.extraction_status === 'processing',
    isEmbedding: file?.embedding_status === 'processing',
    hasCompleted: file?.extraction_status === 'completed' && file?.embedding_status === 'completed',
    hasFailed: file?.extraction_status === 'failed' || file?.embedding_status === 'failed',
    
    // Progress calculation
    progress: (() => {
      if (!file) return 0;
      
      let progress = 0;
      
      // Extraction progress (50% of total)
      if (file.extraction_status === 'completed') {
        progress += 50;
      } else if (file.extraction_status === 'processing') {
        progress += 25; // Partial extraction progress
      }
      
      // Embedding progress (50% of total)
      if (file.embedding_status === 'completed') {
        progress += 50;
      } else if (file.embedding_status === 'processing') {
        progress += 25; // Partial embedding progress
      }
      
      return progress;
    })(),
    
    // Status message
    statusMessage: (() => {
      if (!file) return 'Unknown status';
      
      if (file.extraction_status === 'processing') {
        return 'Extracting content...';
      } else if (file.embedding_status === 'processing') {
        return 'Generating embeddings...';
      } else if (file.extraction_status === 'completed' && file.embedding_status === 'completed') {
        return `Complete - ${file.chunk_count} chunks, ${file.embedding_count} embeddings`;
      } else if (file.extraction_status === 'failed') {
        return 'Content extraction failed';
      } else if (file.embedding_status === 'failed') {
        return 'Embedding generation failed';
      } else {
        return 'Pending processing';
      }
    })(),
  };
}

// Hook for multiple files status
export function useKBFilesStatus(fileIds: string[]) {
  return useQuery({
    queryKey: ['kb-files-status', fileIds],
    queryFn: async () => {
      const results = await Promise.all(
        fileIds.map(fileId => 
          KBContentExtractionService.getExtractionStatus(fileId)
        )
      );
      return results;
    },
    enabled: fileIds.length > 0,
    refetchInterval: (data) => {
      // Auto-refresh if any file is processing
      const hasProcessing = data?.some(result => 
        result.file.extraction_status === 'processing' || 
        result.file.embedding_status === 'processing'
      );
      return hasProcessing ? 3000 : false; // Refresh every 3 seconds while any file is processing
    }
  });
}