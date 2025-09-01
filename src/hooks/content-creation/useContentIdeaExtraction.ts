// Content Idea Extraction Hooks
// React Query hooks for file/URL extraction and N8N processing

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { ContentIdeaExtractionService } from '@/services/ContentIdeaExtractionService';
import { useAuth } from '@/auth/AuthProvider';
import { contentCreationKeys } from './queryKeys';
import type {
  ExtractionStatusResponse,
  UseMutationOptions
} from '@/types/content-creation';
import type { N8NWebhookConfig } from '@/apps/shared/types/AppTypes';

// ========== QUERY HOOKS ==========

/**
 * Hook to get extraction status for a content idea
 */
export const useContentIdeaExtractionStatus = (
  ideaId: string,
  options: { enabled?: boolean } = {}
) => {
  const { user, organizationId } = useAuth();
  const queryClient = useQueryClient();
  const queryKey = contentCreationKeys.ideaExtractionStatus(ideaId);

  const query = useQuery({
    queryKey,
    queryFn: () => ContentIdeaExtractionService.getExtractionStatus(ideaId),
    enabled: !!ideaId && (options.enabled !== false),
    staleTime: 5 * 1000, // 5 seconds - frequent updates during extraction
    cacheTime: 30 * 1000, // 30 seconds
    refetchInterval: (data) => {
      // Auto-refetch while extraction or processing is in progress
      if (data?.extraction_status === 'processing' || 
          data?.processing_status === 'extracting' ||
          data?.processing_status === 'generating ideas') {
        return 3000; // Poll every 3 seconds
      }
      return false; // Stop polling when complete (ready, failed, etc.)
    },
    retry: (failureCount, error: any) => {
      // Don't retry if the idea doesn't exist
      if (error?.message?.includes('not found')) return false;
      return failureCount < 3;
    }
  });

  // Real-time subscription for content idea status updates (extraction and processing)
  useEffect(() => {
    if (!user || !organizationId || !ideaId) return;

    const channel = supabase
      .channel(`content-idea-extraction-${ideaId}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'content_ideas',
        filter: `id=eq.${ideaId}`
      }, (payload) => {
        console.log('Real-time extraction status update:', payload);
        
        // Check if extraction or processing status changed
        if (payload.new && (
          payload.old?.extraction_status !== payload.new.extraction_status ||
          payload.old?.processing_status !== payload.new.processing_status
        )) {
          // Immediately invalidate extraction status query
          queryClient.invalidateQueries({ queryKey });
          
          // Also invalidate main content ideas queries
          queryClient.invalidateQueries({ queryKey: contentCreationKeys.ideas() });
          queryClient.invalidateQueries({ 
            queryKey: contentCreationKeys.ideaDetail(ideaId) 
          });
        }
      })
      .subscribe((status) => {
        console.log(`Content idea extraction ${ideaId} subscription status:`, status);
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, organizationId, ideaId, queryClient]);

  return query;
};

// ========== MUTATION HOOKS ==========

/**
 * Hook to upload files and URLs for extraction
 */
export const useUploadAndExtract = (
  options: UseMutationOptions<
    { success: boolean; message: string; extractions?: string[] },
    Error,
    { ideaId: string; files: File[]; urls: string[] }
  > = {}
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ ideaId, files, urls }) =>
      ContentIdeaExtractionService.uploadAndExtract(ideaId, files, urls),
    onMutate: async ({ ideaId }) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ 
        queryKey: contentCreationKeys.ideaExtractionStatus(ideaId) 
      });
    },
    onSuccess: (data, { ideaId }) => {
      // Invalidate and refetch extraction status
      queryClient.invalidateQueries({ 
        queryKey: contentCreationKeys.ideaExtractionStatus(ideaId) 
      });
      
      // Also invalidate the main ideas list to show updated status
      queryClient.invalidateQueries({ 
        queryKey: contentCreationKeys.ideas() 
      });

      toast.success('File extraction started!', {
        description: data.message
      });
    },
    onError: (error, { ideaId }) => {
      // Invalidate to get fresh status
      queryClient.invalidateQueries({ 
        queryKey: contentCreationKeys.ideaExtractionStatus(ideaId) 
      });

      toast.error('Failed to start extraction', {
        description: error.message || 'Please try again later.'
      });
    },
    ...options
  });
};

/**
 * Hook to retry extraction for a specific file
 */
export const useRetryExtraction = (
  options: UseMutationOptions<
    { success: boolean; message: string },
    Error,
    { ideaId: string; fileName: string }
  > = {}
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ ideaId, fileName }) =>
      ContentIdeaExtractionService.retryExtraction(ideaId, fileName),
    onSuccess: (data, { ideaId }) => {
      // Invalidate and refetch extraction status
      queryClient.invalidateQueries({ 
        queryKey: contentCreationKeys.ideaExtractionStatus(ideaId) 
      });
      
      toast.success('Retrying extraction', {
        description: data.message
      });
    },
    onError: (error, { ideaId }) => {
      // Invalidate to get fresh status
      queryClient.invalidateQueries({ 
        queryKey: contentCreationKeys.ideaExtractionStatus(ideaId) 
      });

      toast.error('Failed to retry extraction', {
        description: error.message || 'Please try again later.'
      });
    },
    ...options
  });
};

/**
 * Hook to process content idea with N8N webhook
 */
export const useProcessWithN8N = (
  options: UseMutationOptions<
    { success: boolean; message: string },
    Error,
    { ideaId: string; webhookConfig: N8NWebhookConfig }
  > = {}
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ ideaId, webhookConfig }) =>
      ContentIdeaExtractionService.processWithN8N(ideaId, webhookConfig),
    onMutate: async ({ ideaId }) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ 
        queryKey: contentCreationKeys.ideaExtractionStatus(ideaId) 
      });

      // Optimistically update processing status
      const previousData = queryClient.getQueryData<ExtractionStatusResponse>(
        contentCreationKeys.ideaExtractionStatus(ideaId)
      );

      if (previousData) {
        queryClient.setQueryData<ExtractionStatusResponse>(
          contentCreationKeys.ideaExtractionStatus(ideaId),
          {
            ...previousData,
            processing_status: 'processing_ai'
          }
        );
      }

      return { previousData };
    },
    onError: (error, { ideaId }, context) => {
      // Revert optimistic update on error
      if (context?.previousData) {
        queryClient.setQueryData<ExtractionStatusResponse>(
          contentCreationKeys.ideaExtractionStatus(ideaId),
          context.previousData
        );
      }

      // Invalidate to get fresh status
      queryClient.invalidateQueries({ 
        queryKey: contentCreationKeys.ideaExtractionStatus(ideaId) 
      });

      toast.error('Failed to start AI processing', {
        description: error.message || 'Please try again later.'
      });
    },
    onSuccess: (data, { ideaId }) => {
      // Invalidate and refetch extraction status
      queryClient.invalidateQueries({ 
        queryKey: contentCreationKeys.ideaExtractionStatus(ideaId) 
      });
      
      // Also invalidate the main ideas list to show updated status
      queryClient.invalidateQueries({ 
        queryKey: contentCreationKeys.ideas() 
      });

      toast.success('AI processing started!', {
        description: data.message
      });
    },
    onSettled: ({ ideaId }) => {
      // Ensure fresh data regardless of success/error
      queryClient.invalidateQueries({ 
        queryKey: contentCreationKeys.ideaExtractionStatus(ideaId) 
      });
    },
    ...options
  });
};

// ========== UTILITY HOOKS ==========

/**
 * Hook to check if extraction is supported for a file type
 */
export const useExtractionSupport = () => {
  const supportedFileTypes = [
    '.pdf',
    '.docx', '.doc',
    '.pptx', '.ppt', 
    '.xlsx', '.xls',
    '.txt',
    '.rtf'
  ];

  const supportedMimeTypes = [
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-excel',
    'text/plain',
    'application/rtf'
  ];

  const isFileSupported = (file: File): boolean => {
    return supportedMimeTypes.includes(file.type) || 
           supportedFileTypes.some(ext => file.name.toLowerCase().endsWith(ext));
  };

  const isUrlSupported = (url: string): boolean => {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  };

  return {
    supportedFileTypes,
    supportedMimeTypes,
    isFileSupported,
    isUrlSupported
  };
};

/**
 * Hook for checking extraction configuration
 */
export const useExtractionConfig = () => {
  const isConfigured = true; // ConvertAPI is already configured
  
  return {
    isConfigured,
    supportedFormats: [
      'PDF documents',
      'Word documents (DOCX, DOC)',
      'PowerPoint presentations (PPTX, PPT)',
      'Excel spreadsheets (XLSX, XLS)',
      'Text files (TXT, RTF)',
      'Web pages (URLs)'
    ]
  };
};

