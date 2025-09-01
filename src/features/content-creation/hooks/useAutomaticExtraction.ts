import { useState, useEffect, useCallback } from 'react';
import { useOrganization } from '@/contexts/OrganizationContext';
import { automaticExtractionService, type ExtractionQueueItem } from '../services/automaticExtractionService';
import { supabase } from '@/integrations/supabase/client';

/**
 * Hook for managing automatic content extraction
 */
export function useAutomaticExtraction() {
  const { currentOrganization } = useOrganization();
  const [isProcessing, setIsProcessing] = useState(false);
  const [extractionStatuses, setExtractionStatuses] = useState<Record<string, ExtractionQueueItem>>({});

  // Subscribe to real-time updates
  useEffect(() => {
    if (!currentOrganization?.id) return;

    const unsubscribe = automaticExtractionService.subscribeToExtractionUpdates(
      currentOrganization.id,
      (update) => {
        // Handle both content types and content ideas
        const key = update.content_type_id || update.content_idea_id;
        if (key) {
          setExtractionStatuses(prev => ({
            ...prev,
            [key]: update
          }));
        }
      }
    );

    return unsubscribe;
  }, [currentOrganization?.id]);

  /**
   * Trigger manual extraction for a content type
   */
  const triggerExtraction = useCallback(async (contentTypeId: string) => {
    setIsProcessing(true);
    try {
      const success = await automaticExtractionService.triggerManualExtraction(contentTypeId);
      if (success) {
        // Update local status to show processing
        setExtractionStatuses(prev => ({
          ...prev,
          [contentTypeId]: {
            ...prev[contentTypeId],
            status: 'pending',
            updated_at: new Date().toISOString()
          } as ExtractionQueueItem
        }));
      }
      return success;
    } finally {
      setIsProcessing(false);
    }
  }, []);

  /**
   * Get extraction status for a content type
   */
  const getExtractionStatus = useCallback(async (contentTypeId: string) => {
    const status = await automaticExtractionService.getExtractionStatus(contentTypeId);
    if (status) {
      setExtractionStatuses(prev => ({
        ...prev,
        [contentTypeId]: status
      }));
    }
    return status;
  }, []);

  /**
   * Get extraction status from local state (for real-time updates)
   * Also checks the content_types table for actual status
   */
  const getLocalExtractionStatus = useCallback(async (contentTypeId: string) => {
    // First check local queue status
    const queueStatus = extractionStatuses[contentTypeId];
    
    // Also check the actual content type status from database
    try {
      const { data: contentType, error } = await supabase
        .from('content_types')
        .select('extraction_status, last_extracted_at')
        .eq('id', contentTypeId)
        .single();
      
      if (!error && contentType) {
        console.log(`📊 Database extraction status for ${contentTypeId}:`, contentType.extraction_status);
        
        // If database shows completed but queue doesn't, prioritize database
        if (contentType.extraction_status === 'completed' && queueStatus?.status !== 'completed') {
          console.log(`🔄 Syncing queue status with database status for ${contentTypeId}`);
          const syncedStatus: ExtractionQueueItem = {
            ...queueStatus,
            id: queueStatus?.id || 'synced',
            content_type_id: contentTypeId,
            organization_id: queueStatus?.organization_id || '',
            payload: queueStatus?.payload || { examples: [], content_type_id: contentTypeId, organization_id: '', trigger_time: new Date().toISOString() },
            status: 'completed',
            attempts: queueStatus?.attempts || 1,
            created_at: queueStatus?.created_at || new Date().toISOString(),
            updated_at: new Date().toISOString(),
            processed_at: contentType.last_extracted_at || new Date().toISOString()
          };
          
          // Update local state
          setExtractionStatuses(prev => ({
            ...prev,
            [contentTypeId]: syncedStatus
          }));
          
          return syncedStatus;
        }
      }
    } catch (error) {
      console.error('Error checking database extraction status:', error);
    }
    
    return queueStatus || null;
  }, [extractionStatuses]);
  
  /**
   * Get extraction status synchronously from local state only
   */
  const getLocalExtractionStatusSync = useCallback((contentTypeId: string) => {
    return extractionStatuses[contentTypeId] || null;
  }, [extractionStatuses]);

  /**
   * Check if extraction is in progress for a content type
   */
  const isExtractionInProgress = useCallback((contentTypeId: string) => {
    const status = extractionStatuses[contentTypeId];
    return status?.status === 'pending' || status?.status === 'processing';
  }, [extractionStatuses]);

  /**
   * Check if extraction is completed for a content type
   */
  const isExtractionCompleted = useCallback((contentTypeId: string) => {
    const status = extractionStatuses[contentTypeId];
    return status?.status === 'completed';
  }, [extractionStatuses]);

  /**
   * Check if extraction failed for a content type
   */
  const isExtractionFailed = useCallback((contentTypeId: string) => {
    const status = extractionStatuses[contentTypeId];
    return status?.status === 'failed';
  }, [extractionStatuses]);

  return {
    // Actions
    triggerExtraction,
    getExtractionStatus,
    
    // Status checks
    isProcessing,
    isExtractionInProgress,
    isExtractionCompleted,
    isExtractionFailed,
    getLocalExtractionStatus,
    getLocalExtractionStatusSync,
    
    // Data
    extractionStatuses,
  };
}