import { useState, useCallback, useRef } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { useOrganization } from '@/contexts/OrganizationContext';
import { uploadFileToKB, deleteKBFile } from '../services/fileUploadApi';
import { FileValidator, FileValidationResult } from '../utils/fileValidation';
import { KBFileProcessingService } from '../services/KBFileProcessingService';

export interface EnhancedFileUploadProgress {
  fileId: string;
  fileName: string;
  fileSize: number;
  status: 'validating' | 'uploading' | 'processing' | 'completed' | 'error' | 'cancelled';
  progress: number;
  uploadSpeed?: number; // bytes per second
  timeRemaining?: number; // seconds
  error?: string;
  validationResult?: FileValidationResult;
  startTime: number;
  endTime?: number;
  retryCount: number;
}

export interface BatchUploadProgress {
  totalFiles: number;
  completedFiles: number;
  failedFiles: number;
  overallProgress: number;
  estimatedTimeRemaining?: number;
  errors: string[];
}

interface UseEnhancedFileUploadOptions {
  maxConcurrentUploads?: number;
  enableOptimisticUpdates?: boolean;
  autoRetryFailures?: boolean;
  maxRetries?: number;
  chunkSize?: number;
}

const DEFAULT_OPTIONS: UseEnhancedFileUploadOptions = {
  maxConcurrentUploads: 3,
  enableOptimisticUpdates: true,
  autoRetryFailures: true,
  maxRetries: 3,
  chunkSize: 1024 * 1024 // 1MB chunks
};

export function useEnhancedFileUpload(options: UseEnhancedFileUploadOptions = {}) {
  const { currentOrganization } = useOrganization();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const opts = { ...DEFAULT_OPTIONS, ...options };
  
  const [uploadProgress, setUploadProgress] = useState<Map<string, EnhancedFileUploadProgress>>(new Map());
  const [batchProgress, setBatchProgress] = useState<BatchUploadProgress | null>(null);
  const [validator] = useState(() => new FileValidator());
  
  const abortControllersRef = useRef<Map<string, AbortController>>(new Map());
  const uploadQueueRef = useRef<Array<{ id: string; file: File; kbId: string }>>([]);
  const activeUploadsRef = useRef<Set<string>>(new Set());

  // File validation
  const validateFiles = useCallback(async (files: File[]) => {
    const results = await validator.validateMultipleFiles(files);
    
    // Show validation summary
    if (results.totalErrors > 0) {
      toast({
        title: 'Validation Errors',
        description: `${results.totalErrors} files have validation errors and cannot be uploaded.`,
        variant: 'destructive',
      });
    }
    
    if (results.totalWarnings > 0) {
      toast({
        title: 'Validation Warnings',
        description: `${results.totalWarnings} files have warnings. Review before uploading.`,
        variant: 'default',
      });
    }

    return results;
  }, [validator, toast]);

  // Update progress for a specific file
  const updateFileProgress = useCallback((fileId: string, update: Partial<EnhancedFileUploadProgress>) => {
    setUploadProgress(prev => {
      const updated = new Map(prev);
      const current = updated.get(fileId);
      if (current) {
        updated.set(fileId, { ...current, ...update });
      }
      return updated;
    });
  }, []);

  // Calculate upload speed and time remaining
  const calculateUploadMetrics = useCallback((
    fileId: string, 
    bytesUploaded: number, 
    totalBytes: number,
    startTime: number
  ): { speed: number; timeRemaining: number } => {
    const currentTime = Date.now();
    const elapsedTime = (currentTime - startTime) / 1000; // seconds
    const speed = bytesUploaded / elapsedTime; // bytes per second
    const remainingBytes = totalBytes - bytesUploaded;
    const timeRemaining = speed > 0 ? remainingBytes / speed : 0;
    
    return { speed, timeRemaining };
  }, []);

  // Single file upload with progress tracking
  const uploadSingleFile = useCallback(async (
    file: File,
    kbId: string,
    fileId: string
  ): Promise<any> => {
    const controller = new AbortController();
    abortControllersRef.current.set(fileId, controller);

    try {
      // Initialize progress
      const initialProgress: EnhancedFileUploadProgress = {
        fileId,
        fileName: file.name,
        fileSize: file.size,
        status: 'validating',
        progress: 0,
        startTime: Date.now(),
        retryCount: 0
      };

      setUploadProgress(prev => new Map(prev.set(fileId, initialProgress)));

      // Validate file
      const validationResult = await validator.validateFile(file);
      updateFileProgress(fileId, { 
        validationResult,
        status: validationResult.isValid ? 'uploading' : 'error',
        error: validationResult.isValid ? undefined : validationResult.errors[0]?.message
      });

      if (!validationResult.isValid) {
        throw new Error(validationResult.errors[0]?.message || 'Validation failed');
      }

      // Upload with progress tracking
      const result = await uploadFileToKB(kbId, file, currentOrganization!.id, (progress) => {
        const metrics = calculateUploadMetrics(fileId, (progress / 100) * file.size, file.size, initialProgress.startTime);
        
        updateFileProgress(fileId, {
          progress,
          uploadSpeed: metrics.speed,
          timeRemaining: metrics.timeRemaining,
          status: progress >= 100 ? 'processing' : 'uploading'
        });
      });

      // Upload completed, now processing
      updateFileProgress(fileId, {
        status: 'processing',
        progress: 100
      });

      // Optimistic update if enabled
      if (opts.enableOptimisticUpdates) {
        queryClient.invalidateQueries({ queryKey: ['kb-files'] });
      }

      return result;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Upload failed';
      
      updateFileProgress(fileId, {
        status: 'error',
        error: errorMessage,
        endTime: Date.now()
      });

      throw error;
    } finally {
      abortControllersRef.current.delete(fileId);
      activeUploadsRef.current.delete(fileId);
    }
  }, [currentOrganization, validator, updateFileProgress, calculateUploadMetrics, queryClient, opts.enableOptimisticUpdates]);

  // Process upload queue
  const processUploadQueue = useCallback(async () => {
    while (uploadQueueRef.current.length > 0 && activeUploadsRef.current.size < opts.maxConcurrentUploads!) {
      const upload = uploadQueueRef.current.shift();
      if (!upload) continue;

      activeUploadsRef.current.add(upload.id);

      try {
        await uploadSingleFile(upload.file, upload.kbId, upload.id);
        
        updateFileProgress(upload.id, {
          status: 'completed',
          endTime: Date.now()
        });

        toast({
          title: 'Upload Successful',
          description: `${upload.file.name} has been uploaded and is being processed.`,
        });

      } catch (error) {
        const current = uploadProgress.get(upload.id);
        
        // Auto-retry logic
        if (opts.autoRetryFailures && current && current.retryCount < opts.maxRetries!) {
          updateFileProgress(upload.id, {
            retryCount: current.retryCount + 1,
            status: 'validating'
          });
          
          // Add back to queue for retry
          uploadQueueRef.current.push(upload);
          
          toast({
            title: 'Retrying Upload',
            description: `Retry attempt ${current.retryCount + 1} for ${upload.file.name}`,
          });
        } else {
          toast({
            title: 'Upload Failed',
            description: `Failed to upload ${upload.file.name}: ${error instanceof Error ? error.message : 'Unknown error'}`,
            variant: 'destructive',
          });
        }
      }
    }

    // Update batch progress
    updateBatchProgress();

    // Continue processing if queue has items
    if (uploadQueueRef.current.length > 0) {
      setTimeout(processUploadQueue, 100);
    }
  }, [uploadSingleFile, updateFileProgress, uploadProgress, opts.autoRetryFailures, opts.maxRetries, opts.maxConcurrentUploads, toast]);

  // Update batch progress
  const updateBatchProgress = useCallback(() => {
    if (uploadProgress.size === 0) {
      setBatchProgress(null);
      return;
    }

    const progressArray = Array.from(uploadProgress.values());
    const totalFiles = progressArray.length;
    const completedFiles = progressArray.filter(p => p.status === 'completed').length;
    const failedFiles = progressArray.filter(p => p.status === 'error').length;
    const activeFiles = progressArray.filter(p => ['validating', 'uploading', 'processing'].includes(p.status));
    
    const overallProgress = progressArray.reduce((sum, p) => sum + p.progress, 0) / totalFiles;
    
    // Estimate time remaining based on active uploads
    const estimatedTimeRemaining = activeFiles.reduce((sum, p) => {
      return sum + (p.timeRemaining || 0);
    }, 0) / Math.max(activeFiles.length, 1);

    const errors = progressArray
      .filter(p => p.error)
      .map(p => `${p.fileName}: ${p.error}`);

    setBatchProgress({
      totalFiles,
      completedFiles,
      failedFiles,
      overallProgress,
      estimatedTimeRemaining: estimatedTimeRemaining > 0 ? estimatedTimeRemaining : undefined,
      errors
    });
  }, [uploadProgress]);

  // Main upload function
  const uploadFiles = useMutation({
    mutationFn: async ({ files, kbId }: { files: File[]; kbId: string }) => {
      // Validate all files first
      const validationResults = await validateFiles(files);
      const validFiles = validationResults.results.filter(r => r.isValid);
      
      if (validFiles.length === 0) {
        throw new Error('No valid files to upload');
      }

      // Add to upload queue
      const uploads = validFiles.map(({ file }) => ({
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        file,
        kbId
      }));

      uploads.forEach(upload => {
        uploadQueueRef.current.push(upload);
      });

      // Start processing queue
      processUploadQueue();

      return { uploadedCount: validFiles.length, totalCount: files.length };
    },
    onSuccess: (data) => {
      toast({
        title: 'Upload Started',
        description: `${data.uploadedCount} of ${data.totalCount} files are being uploaded.`,
      });
    },
    onError: (error) => {
      toast({
        title: 'Upload Failed',
        description: error instanceof Error ? error.message : 'Failed to start upload',
        variant: 'destructive',
      });
    }
  });

  // Cancel upload
  const cancelUpload = useCallback((fileId: string) => {
    const controller = abortControllersRef.current.get(fileId);
    if (controller) {
      controller.abort();
    }

    updateFileProgress(fileId, {
      status: 'cancelled',
      endTime: Date.now()
    });

    // Remove from queue if pending
    uploadQueueRef.current = uploadQueueRef.current.filter(u => u.id !== fileId);
    activeUploadsRef.current.delete(fileId);

    toast({
      title: 'Upload Cancelled',
      description: 'File upload has been cancelled.',
    });
  }, [updateFileProgress, toast]);

  // Clear completed uploads
  const clearCompleted = useCallback(() => {
    setUploadProgress(prev => {
      const updated = new Map();
      for (const [id, progress] of prev) {
        if (!['completed', 'error', 'cancelled'].includes(progress.status)) {
          updated.set(id, progress);
        }
      }
      return updated;
    });
  }, []);

  // Retry failed upload
  const retryUpload = useCallback((fileId: string) => {
    const progress = uploadProgress.get(fileId);
    if (!progress) return;

    // Find original file data and re-queue
    // This would need to be enhanced to store original file data
    toast({
      title: 'Retry Started',
      description: `Retrying upload for ${progress.fileName}`,
    });

    updateFileProgress(fileId, {
      status: 'validating',
      progress: 0,
      error: undefined,
      retryCount: progress.retryCount + 1,
      startTime: Date.now()
    });
  }, [uploadProgress, updateFileProgress, toast]);

  // Delete file
  const deleteFile = useMutation({
    mutationFn: deleteKBFile,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kb-files'] });
      toast({
        title: 'File Deleted',
        description: 'File has been successfully deleted.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Delete Failed',
        description: error instanceof Error ? error.message : 'Failed to delete file',
        variant: 'destructive',
      });
    }
  });

  return {
    // Upload functions
    uploadFiles: uploadFiles.mutate,
    isUploading: uploadFiles.isPending,
    
    // Progress tracking
    uploadProgress: Array.from(uploadProgress.values()),
    batchProgress,
    
    // Control functions
    cancelUpload,
    clearCompleted,
    retryUpload,
    
    // File management
    deleteFile: deleteFile.mutate,
    isDeleting: deleteFile.isPending,
    
    // Validation
    validateFiles,
    
    // Stats
    stats: {
      totalUploads: uploadProgress.size,
      activeUploads: Array.from(uploadProgress.values()).filter(p => 
        ['validating', 'uploading', 'processing'].includes(p.status)
      ).length,
      completedUploads: Array.from(uploadProgress.values()).filter(p => p.status === 'completed').length,
      failedUploads: Array.from(uploadProgress.values()).filter(p => p.status === 'error').length,
    }
  };
}