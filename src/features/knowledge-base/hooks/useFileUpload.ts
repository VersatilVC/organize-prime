import { useState, useCallback, useRef } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffectiveOrganization } from '@/hooks/useEffectiveOrganization';
import { useOrganization } from '@/contexts/OrganizationContext';
import { useToast } from '@/hooks/use-toast';
import { useFileSubscription } from './useFileSubscription';
import { 
  uploadFileToKB, 
  getKBFiles, 
  deleteKBFile, 
  retryFileProcessing,
  getFileProcessingStats,
  KBFile,
  FileUploadProgress 
} from '../services/fileUploadApi';

export function useFileUpload() {
  const { effectiveOrganizationId } = useEffectiveOrganization();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [uploadProgress, setUploadProgress] = useState<Record<string, FileUploadProgress>>({});
  
  // Subscribe to real-time file status updates
  useFileSubscription();

  const uploadMutation = useMutation({
    mutationFn: async ({ kbId, file }: { kbId: string; file: File }) => {
      if (!effectiveOrganizationId) {
        throw new Error('No organization selected');
      }

      const fileId = `${Date.now()}_${file.name}`;
      
      // Add to progress tracking
      setUploadProgress(prev => ({
        ...prev,
        [fileId]: {
          fileId,
          fileName: file.name,
          progress: 0,
          status: 'uploading'
        }
      }));

      try {
        const result = await uploadFileToKB(
          kbId, 
          file, 
          effectiveOrganizationId,
          (progress) => {
            setUploadProgress(prev => ({
              ...prev,
              [fileId]: {
                ...prev[fileId],
                progress
              }
            }));
          }
        );

        // Update progress to processing
        setUploadProgress(prev => ({
          ...prev,
          [fileId]: {
            ...prev[fileId],
            progress: 100,
            status: 'processing'
          }
        }));

        return result;
      } catch (error) {
        setUploadProgress(prev => ({
          ...prev,
          [fileId]: {
            ...prev[fileId],
            status: 'error',
            error: error instanceof Error ? error.message : 'Upload failed'
          }
        }));
        throw error;
      }
    },
    onSuccess: (data) => {
      toast({
        title: 'File uploaded successfully',
        description: `${data.file_name} is being processed`,
      });
      
      // Invalidate and refetch file lists
      queryClient.invalidateQueries({ queryKey: ['kb-files'] });
      queryClient.invalidateQueries({ queryKey: ['file-stats'] });
      
      // Remove from progress after a delay
      setTimeout(() => {
        setUploadProgress(prev => {
          const newProgress = { ...prev };
          Object.keys(newProgress).forEach(key => {
            if (newProgress[key].status === 'processing') {
              delete newProgress[key];
            }
          });
          return newProgress;
        });
      }, 3000);
    },
    onError: (error: Error) => {
      toast({
        title: 'Upload failed',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteKBFile,
    onSuccess: () => {
      toast({
        title: 'File deleted',
        description: 'File has been successfully deleted',
      });
      queryClient.invalidateQueries({ queryKey: ['kb-files'] });
      queryClient.invalidateQueries({ queryKey: ['file-stats'] });
    },
    onError: (error: Error) => {
      toast({
        title: 'Delete failed',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const retryMutation = useMutation({
    mutationFn: retryFileProcessing,
    onSuccess: () => {
      toast({
        title: 'Processing restarted',
        description: 'File processing has been restarted',
      });
      queryClient.invalidateQueries({ queryKey: ['kb-files'] });
    },
    onError: (error: Error) => {
      toast({
        title: 'Retry failed',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const clearProgress = useCallback((fileId: string) => {
    setUploadProgress(prev => {
      const newProgress = { ...prev };
      delete newProgress[fileId];
      return newProgress;
    });
  }, []);

  return {
    uploadFile: uploadMutation.mutate,
    deleteFile: deleteMutation.mutate,
    retryProcessing: retryMutation.mutate,
    uploadProgress,
    clearProgress,
    isUploading: uploadMutation.isPending,
    isDeleting: deleteMutation.isPending,
    isRetrying: retryMutation.isPending,
  };
}

export function useKBFiles(kbId?: string, page: number = 0, pageSize: number = 50) {
  const { currentOrganization } = useOrganization();
  const { effectiveOrganizationId } = useEffectiveOrganization();

  return useQuery({
    queryKey: ['kb-files', effectiveOrganizationId, kbId, page, pageSize],
    queryFn: () => {
      if (!effectiveOrganizationId) {
        throw new Error('No organization selected');
      }
      return getKBFiles(effectiveOrganizationId, kbId, page * pageSize, pageSize);
    },
    enabled: !!effectiveOrganizationId,
    staleTime: 30 * 1000, // 30 seconds
    refetchOnWindowFocus: false,
  });
}

export function useFileStats() {
  const { currentOrganization } = useOrganization();
  const { effectiveOrganizationId } = useEffectiveOrganization();

  return useQuery({
    queryKey: ['file-stats', effectiveOrganizationId],
    queryFn: () => {
      if (!effectiveOrganizationId) {
        throw new Error('No organization selected');
      }
      return getFileProcessingStats(effectiveOrganizationId);
    },
    enabled: !!effectiveOrganizationId,
    staleTime: 60 * 1000, // 1 minute
    refetchInterval: 30 * 1000, // Refresh every 30 seconds
  });
}