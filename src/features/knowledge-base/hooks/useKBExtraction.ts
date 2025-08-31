import { useState, useCallback } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { KBContentExtractionService } from '../services/KBContentExtractionService';

export interface FileExtractionProgress {
  id: string; // Unique identifier for tracking
  fileId?: string;
  fileName: string;
  status: 'pending' | 'uploading' | 'processing' | 'completed' | 'failed';
  progress: number;
  message: string;
  error?: string;
  chunks?: number;
  embeddings?: number;
}

export interface ExtractionOptions {
  chunkSize?: number;
  chunkOverlap?: number;
  generateEmbeddings?: boolean;
}

export function useKBExtraction() {
  const [extractions, setExtractions] = useState<FileExtractionProgress[]>([]);
  const [isExtracting, setIsExtracting] = useState(false);
  const queryClient = useQueryClient();

  // File upload and extraction mutation
  const fileExtractionMutation = useMutation({
    mutationFn: async ({
      file,
      kbId,
      options
    }: {
      file: File;
      kbId: string;
      options?: ExtractionOptions;
    }) => {
      const fileName = file.name;
      const extractionId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}-${fileName}`;
      
      // Add initial progress entry
      setExtractions(prev => [...prev, {
        id: extractionId,
        fileName,
        status: 'uploading',
        progress: 0,
        message: 'Uploading file...'
      }]);

      // Update progress to processing
      setExtractions(prev => prev.map(ext => 
        ext.id === extractionId 
          ? { ...ext, status: 'processing', progress: 50, message: 'Extracting content...' }
          : ext
      ));

      const result = await KBContentExtractionService.uploadAndExtractFile(file, kbId, options);

      // Update progress to completed
      setExtractions(prev => prev.map(ext => 
        ext.id === extractionId 
          ? { 
              ...ext, 
              fileId: result.fileId,
              status: 'completed', 
              progress: 100, 
              message: result.message 
            }
          : ext
      ));

      return result;
    },
    onError: (error: Error, variables) => {
      const fileName = variables.file.name;
      
      setExtractions(prev => prev.map(ext => 
        ext.fileName === fileName && !ext.fileId // Only update the one that failed
          ? { 
              ...ext, 
              status: 'failed', 
              progress: 0, 
              message: 'Extraction failed',
              error: error.message 
            }
          : ext
      ));

      toast.error(`Failed to extract ${fileName}: ${error.message}`);
    },
    onSuccess: (result, variables) => {
      toast.success(`Successfully extracted content from ${variables.file.name}`);
      queryClient.invalidateQueries({ queryKey: ['kb-files'] });
    }
  });

  // URL extraction mutation
  const urlExtractionMutation = useMutation({
    mutationFn: async ({
      url,
      kbId,
      filename,
      options
    }: {
      url: string;
      kbId: string;
      filename?: string;
      options?: ExtractionOptions;
    }) => {
      const displayName = filename || new URL(url).hostname;
      const extractionId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}-${displayName}`;
      
      // Add initial progress entry
      setExtractions(prev => [...prev, {
        id: extractionId,
        fileName: displayName,
        status: 'processing',
        progress: 50,
        message: 'Extracting content from URL...'
      }]);

      const result = await KBContentExtractionService.uploadAndExtractUrl(url, kbId, filename, options);

      // Update progress to completed
      setExtractions(prev => prev.map(ext => 
        ext.id === extractionId 
          ? { 
              ...ext, 
              fileId: result.fileId,
              status: 'completed', 
              progress: 100, 
              message: result.message 
            }
          : ext
      ));

      return result;
    },
    onError: (error: Error, variables) => {
      const displayName = variables.filename || new URL(variables.url).hostname;
      
      setExtractions(prev => prev.map(ext => 
        ext.fileName === displayName && !ext.fileId // Only update the one that failed
          ? { 
              ...ext, 
              status: 'failed', 
              progress: 0, 
              message: 'URL extraction failed',
              error: error.message 
            }
          : ext
      ));

      toast.error(`Failed to extract content from URL: ${error.message}`);
    },
    onSuccess: (result, variables) => {
      const displayName = variables.filename || new URL(variables.url).hostname;
      toast.success(`Successfully extracted content from ${displayName}`);
      queryClient.invalidateQueries({ queryKey: ['kb-files'] });
    }
  });

  // Retry extraction mutation
  const retryExtractionMutation = useMutation({
    mutationFn: async ({
      fileId,
      fileName,
      options
    }: {
      fileId: string;
      fileName: string;
      options?: ExtractionOptions;
    }) => {
      // Update progress entry
      setExtractions(prev => {
        const existing = prev.find(ext => ext.fileId === fileId);
        if (existing) {
          return prev.map(ext => 
            ext.fileId === fileId 
              ? { ...ext, status: 'processing', progress: 50, message: 'Retrying extraction...' }
              : ext
          );
        } else {
          const extractionId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}-${fileName}`;
          return [...prev, {
            id: extractionId,
            fileId,
            fileName,
            status: 'processing',
            progress: 50,
            message: 'Retrying extraction...'
          }];
        }
      });

      const result = await KBContentExtractionService.retryExtraction(fileId, options);

      // Update progress to completed
      setExtractions(prev => prev.map(ext => 
        ext.fileId === fileId 
          ? { 
              ...ext, 
              status: 'completed', 
              progress: 100, 
              message: result.message 
            }
          : ext
      ));

      return result;
    },
    onError: (error: Error, variables) => {
      setExtractions(prev => prev.map(ext => 
        ext.fileId === variables.fileId 
          ? { 
              ...ext, 
              status: 'failed', 
              progress: 0, 
              message: 'Retry failed',
              error: error.message 
            }
          : ext
      ));

      toast.error(`Retry failed for ${variables.fileName}: ${error.message}`);
    },
    onSuccess: (result, variables) => {
      toast.success(`Successfully retried extraction for ${variables.fileName}`);
      queryClient.invalidateQueries({ queryKey: ['kb-files'] });
    }
  });

  // Extract multiple files
  const extractFiles = useCallback(async (
    files: File[],
    kbId: string,
    options?: ExtractionOptions
  ) => {
    if (!kbId) {
      toast.error('Please select a knowledge base first');
      return;
    }

    setIsExtracting(true);
    
    try {
      // Process files sequentially to avoid overwhelming the system
      for (const file of files) {
        await fileExtractionMutation.mutateAsync({ file, kbId, options });
      }
    } catch (error) {
      console.error('Batch extraction error:', error);
    } finally {
      setIsExtracting(false);
    }
  }, [fileExtractionMutation]);

  // Extract from URL
  const extractUrl = useCallback(async (
    url: string,
    kbId: string,
    filename?: string,
    options?: ExtractionOptions
  ) => {
    if (!kbId) {
      toast.error('Please select a knowledge base first');
      return;
    }

    setIsExtracting(true);
    
    try {
      await urlExtractionMutation.mutateAsync({ url, kbId, filename, options });
    } catch (error) {
      console.error('URL extraction error:', error);
    } finally {
      setIsExtracting(false);
    }
  }, [urlExtractionMutation]);

  // Retry extraction
  const retryExtraction = useCallback(async (
    fileId: string,
    fileName: string,
    options?: ExtractionOptions
  ) => {
    await retryExtractionMutation.mutateAsync({ fileId, fileName, options });
  }, [retryExtractionMutation]);

  // Clear completed extractions
  const clearCompleted = useCallback(() => {
    setExtractions(prev => prev.filter(ext => ext.status !== 'completed'));
  }, []);

  // Clear all extractions
  const clearAll = useCallback(() => {
    setExtractions([]);
  }, []);

  // Remove specific extraction by ID
  const removeExtraction = useCallback((extractionId: string) => {
    setExtractions(prev => prev.filter(ext => ext.id !== extractionId));
  }, []);

  // Get extraction stats
  const stats = {
    total: extractions.length,
    completed: extractions.filter(ext => ext.status === 'completed').length,
    failed: extractions.filter(ext => ext.status === 'failed').length,
    processing: extractions.filter(ext => 
      ['pending', 'uploading', 'processing'].includes(ext.status)
    ).length,
  };

  return {
    // State
    extractions,
    isExtracting: isExtracting || fileExtractionMutation.isPending || urlExtractionMutation.isPending,
    stats,

    // Actions
    extractFiles,
    extractUrl,
    retryExtraction,
    clearCompleted,
    clearAll,
    removeExtraction,

    // Individual mutations (for advanced usage)
    fileExtraction: fileExtractionMutation,
    urlExtraction: urlExtractionMutation,
    retryMutation: retryExtractionMutation,
  };
}