import { useState, useCallback } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganization } from '@/contexts/OrganizationContext';
import { useAuth } from '@/auth/AuthProvider';
import { contentExtractionService, ExtractionResult, ExtractionOptions } from '../services/contentExtractionService';
import { toast } from 'sonner';

export interface ContentExtractionLog {
  id: string;
  organization_id: string;
  content_type_id: string;
  file_name: string;
  file_size: number | null;
  file_type: string;
  extraction_method: string;
  status: 'started' | 'processing' | 'completed' | 'failed';
  markdown_content: string | null;
  extraction_metadata: Record<string, any>;
  processing_time_ms: number | null;
  error_message: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface UseContentExtractionResult {
  extractFromFile: (file: File, contentTypeId: string, options?: ExtractionOptions) => Promise<ExtractionResult>;
  extractFromUrl: (url: string, contentTypeId: string, options?: ExtractionOptions) => Promise<ExtractionResult>;
  updateContentTypeExtraction: (contentTypeId: string, result: ExtractionResult) => Promise<void>;
  isExtracting: boolean;
  extractionLogs: ContentExtractionLog[];
  isLoadingLogs: boolean;
  isConfigured: boolean;
  supportedFileTypes: string[];
}

export const useContentExtraction = (): UseContentExtractionResult => {
  const { currentOrganization } = useOrganization();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isExtracting, setIsExtracting] = useState(false);

  // Query extraction logs
  const { data: extractionLogs = [], isLoading: isLoadingLogs } = useQuery({
    queryKey: ['content-extraction-logs', currentOrganization?.id],
    queryFn: async () => {
      if (!currentOrganization?.id) return [];

      const { data, error } = await supabase
        .from('content_extraction_logs')
        .select('*')
        .eq('organization_id', currentOrganization.id)
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      return data as ContentExtractionLog[];
    },
    enabled: !!currentOrganization?.id,
    staleTime: 30000, // 30 seconds
  });

  // Create extraction log entry
  const createExtractionLog = useCallback(async (
    contentTypeId: string,
    fileName: string,
    fileSize: number | null,
    fileType: string
  ): Promise<string> => {
    if (!currentOrganization?.id || !user?.id) {
      throw new Error('Missing organization or user context');
    }

    const { data, error } = await supabase
      .from('content_extraction_logs')
      .insert({
        organization_id: currentOrganization.id,
        content_type_id: contentTypeId,
        file_name: fileName,
        file_size: fileSize,
        file_type: fileType,
        status: 'started',
        created_by: user.id,
      })
      .select('id')
      .single();

    if (error) throw error;
    return data.id;
  }, [currentOrganization?.id, user?.id]);

  // Update extraction log
  const updateExtractionLog = useCallback(async (
    logId: string,
    status: 'processing' | 'completed' | 'failed',
    result?: ExtractionResult
  ) => {
    const updateData: Partial<ContentExtractionLog> = {
      status,
      updated_at: new Date().toISOString(),
    };

    if (result) {
      updateData.markdown_content = result.markdown;
      updateData.extraction_metadata = result.metadata;
      updateData.processing_time_ms = result.metadata.extractionTime;
      if (result.error) {
        updateData.error_message = result.error;
      }
    }

    const { error } = await supabase
      .from('content_extraction_logs')
      .update(updateData)
      .eq('id', logId);

    if (error) throw error;
  }, []);

  // Extract content from file
  const extractFromFile = useCallback(async (
    file: File,
    contentTypeId: string,
    options: ExtractionOptions = {}
  ): Promise<ExtractionResult> => {
    setIsExtracting(true);

    try {
      console.log('🚀 Starting file extraction:', file.name, 'for content type:', contentTypeId);
      
      // Perform extraction - Edge Function handles all logging
      const result = await contentExtractionService.extractFromFile(file, contentTypeId, options);

      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['content-extraction-logs'] });
      queryClient.invalidateQueries({ predicate: (query) => query.queryKey[0] === 'content-types' });

      if (result.success) {
        toast.success(`Successfully extracted content from ${file.name}`);
      } else {
        toast.error(`Failed to extract content: ${result.error}`);
      }

      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      toast.error(`Extraction failed: ${errorMessage}`);
      throw error;
    } finally {
      setIsExtracting(false);
    }
  }, [queryClient]);

  // Extract content from URL
  const extractFromUrl = useCallback(async (
    url: string,
    contentTypeId: string,
    options: ExtractionOptions = {}
  ): Promise<ExtractionResult> => {
    console.log('🌐 HOOK: extractFromUrl called');
    console.log('🌐 URL:', url);
    console.log('🌐 Content Type ID:', contentTypeId);
    console.log('🌐 Options:', options);
    
    setIsExtracting(true);

    try {
      console.log('🚀 HOOK: Starting URL extraction via service');
      
      // Perform extraction - Edge Function handles all logging
      const result = await contentExtractionService.extractFromUrl(url, contentTypeId, options);
      console.log('📥 HOOK: Service returned result:', {
        success: result.success,
        error: result.error,
        markdownLength: result.markdown?.length || 0
      });

      // Invalidate queries to refresh data
      console.log('🔄 HOOK: Invalidating queries...');
      try {
        await queryClient.invalidateQueries({ queryKey: ['content-extraction-logs'] });
        await queryClient.invalidateQueries({ 
          queryKey: ['content-types'], 
          exact: false 
        });
        console.log('✅ HOOK: Queries invalidated');
      } catch (invalidateError) {
        console.error('❌ HOOK: Query invalidation failed:', invalidateError);
      }

      if (result.success) {
        console.log('✅ HOOK: Showing success toast');
        toast.success(`Successfully extracted content from URL`);
      } else {
        console.log('❌ HOOK: Showing error toast');
        toast.error(`Failed to extract content: ${result.error}`);
      }

      console.log('🏁 HOOK: URL extraction completed');
      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      console.error('❌ HOOK: URL extraction exception:', error);
      toast.error(`URL extraction failed: ${errorMessage}`);
      throw error;
    } finally {
      console.log('🧹 HOOK: Setting isExtracting to false');
      setIsExtracting(false);
    }
  }, [queryClient]);

  // Update content type with extraction results
  const updateContentTypeExtraction = useCallback(async (
    contentTypeId: string,
    result: ExtractionResult
  ) => {
    if (!result.success) return;

    const { error } = await supabase
      .from('content_types')
      .update({
        extracted_content: {
          markdown: result.markdown,
          wordCount: result.metadata.wordCount || 0,
          lastUpdate: new Date().toISOString(),
        },
        extraction_status: 'completed',
        extraction_error: null,
        last_extracted_at: new Date().toISOString(),
        extraction_metadata: result.metadata,
        updated_at: new Date().toISOString(),
      })
      .eq('id', contentTypeId);

    if (error) throw error;
  }, []);

  return {
    extractFromFile,
    extractFromUrl,
    updateContentTypeExtraction,
    isExtracting,
    extractionLogs,
    isLoadingLogs,
    isConfigured: contentExtractionService.isConfigured(),
    supportedFileTypes: contentExtractionService.getSupportedFileTypes(),
  };
};