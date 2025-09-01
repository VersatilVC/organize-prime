import { supabase } from '@/integrations/supabase/client';

/**
 * Automatic Extraction Service
 * Handles automatic content extraction triggered by database changes
 */

export interface ExtractionQueueItem {
  id: string;
  content_type_id?: string; // For content types (nullable now)
  content_idea_id?: string; // For content ideas
  organization_id: string;
  payload: {
    content_type_id?: string;
    content_idea_id?: string;
    organization_id: string;
    examples: Array<{
      type: 'file' | 'url';
      value: string;
      description?: string;
    }>;
    trigger_time: string;
  };
  status: 'pending' | 'processing' | 'completed' | 'failed';
  attempts: number;
  last_attempt_at?: string;
  error_message?: string;
  created_at: string;
  updated_at: string;
  processed_at?: string;
}

class AutomaticExtractionService {
  private isProcessing = false;
  private processingInterval: NodeJS.Timeout | null = null;

  constructor() {
    // Server-side processing with client-side triggers for immediate processing
    console.log('🔧 Automatic extraction service initialized (hybrid mode)');
    
    // Listen for queue changes and trigger server-side processing
    this.setupServerSideTriggerListener();
    
    // Start the queue processor automatically
    this.startQueueProcessor();
  }

  /**
   * Start the queue processor that calls our backend processor edge function
   */
  startQueueProcessor() {
    if (this.processingInterval) return;

    console.log('🚀 Starting automatic extraction queue processor (optimized)');
    
    // Check for pending work less frequently to reduce resource usage
    this.processingInterval = setInterval(async () => {
      if (!this.isProcessing) {
        await this.checkAndProcess();
      }
    }, 30000); // Reduced to every 30 seconds

    // Also process immediately
    setTimeout(() => this.checkAndProcess(), 1000);
  }

  /**
   * Check for pending work before calling the processor
   */
  private async checkAndProcess() {
    try {
      // First check if there are any pending items to avoid unnecessary calls
      const { data: pendingCount, error } = await supabase
        .from('extraction_queue')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'pending');

      if (error) {
        console.error('❌ Error checking queue status:', error);
        return;
      }

      // Only call the processor if there's work to do
      if (pendingCount && pendingCount > 0) {
        console.log(`📋 Found ${pendingCount} pending items, calling processor`);
        await this.callBackendProcessor();
      }
    } catch (error) {
      console.error('❌ Error in checkAndProcess:', error);
    }
  }

  /**
   * Process pending queue items by calling automatic-content-extraction directly
   */
  private async callBackendProcessor() {
    if (this.isProcessing) return;

    try {
      this.isProcessing = true;

      // Get pending extraction requests from queue
      const { data: pendingItems, error } = await supabase
        .from('extraction_queue')
        .select('*')
        .eq('status', 'pending')
        .order('created_at', { ascending: true })
        .limit(3); // Process up to 3 items at a time

      if (error) {
        console.error('❌ Error fetching extraction queue:', error);
        return;
      }

      if (!pendingItems || pendingItems.length === 0) {
        return; // No pending items
      }

      console.log(`📋 Processing ${pendingItems.length} extraction requests directly`);

      // Get the current session token
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        console.error('❌ No active session for extraction processing');
        return;
      }

      // Get Supabase URL for Edge Function
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      if (!supabaseUrl) {
        console.error('❌ Supabase URL not configured');
        return;
      }

      let processed = 0;

      // Process each pending item
      for (const item of pendingItems) {
        try {
          const itemType = item.content_type_id ? 'content_type' : 'content_idea';
          const itemId = item.content_type_id || item.content_idea_id;
          console.log(`🔄 Processing extraction for ${itemType}: ${itemId}`);
          
          // Update status to processing
          await supabase
            .from('extraction_queue')
            .update({
              status: 'processing',
              last_attempt_at: new Date().toISOString(),
              attempts: item.attempts + 1,
              updated_at: new Date().toISOString(),
            })
            .eq('id', item.id);

          // Call the automatic-content-extraction Edge Function directly
          const response = await fetch(`${supabaseUrl}/functions/v1/automatic-content-extraction`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${session.access_token}`,
              'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY || '',
            },
            body: JSON.stringify(item.payload)
          });

          if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Edge Function error: ${response.status} ${response.statusText} - ${errorText}`);
          }

          const result = await response.json();

          if (result.success) {
            // Mark queue item as completed
            await supabase
              .from('extraction_queue')
              .update({
                status: 'completed',
                processed_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              })
              .eq('id', item.id);

            processed++;
            console.log(`✅ Extraction completed for ${itemType}: ${itemId}`);
          } else {
            throw new Error(result.error || 'Extraction failed');
          }

        } catch (error) {
          const itemType = item.content_type_id ? 'content_type' : 'content_idea';
          const itemId = item.content_type_id || item.content_idea_id;
          console.error(`❌ Extraction failed for ${itemType} ${itemId}:`, error);

          // Update with error status
          const errorMessage = error instanceof Error ? error.message : 'Unknown extraction error';
          const maxAttempts = 3;
          const shouldRetry = item.attempts < maxAttempts;

          await supabase
            .from('extraction_queue')
            .update({
              status: shouldRetry ? 'pending' : 'failed',
              error_message: errorMessage,
              updated_at: new Date().toISOString(),
            })
            .eq('id', item.id);

          // Also update content type or content idea status if we're giving up
          if (!shouldRetry) {
            if (item.content_type_id) {
              await supabase
                .from('content_types')
                .update({
                  extraction_status: 'failed',
                  extraction_error: `Automatic extraction failed after ${maxAttempts} attempts: ${errorMessage}`,
                  updated_at: new Date().toISOString(),
                })
                .eq('id', item.content_type_id);
            } else if (item.content_idea_id) {
              await supabase
                .from('content_ideas')
                .update({
                  extraction_status: 'failed',
                  extraction_error: `Automatic extraction failed after ${maxAttempts} attempts: ${errorMessage}`,
                  updated_at: new Date().toISOString(),
                })
                .eq('id', item.content_idea_id);
            }
          }
        }
      }

      if (processed > 0) {
        console.log(`✅ Direct processing completed: ${processed} items processed`);
      }

    } catch (error) {
      console.error('❌ Error in direct queue processing:', error);
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Setup listener to trigger server-side processing when new items are added
   */
  private setupServerSideTriggerListener() {
    console.log('🔔 Setting up server-side trigger listener');
    
    // Listen for new queue items and trigger server-side processing
    const channel = supabase.channel('extraction-server-triggers')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'extraction_queue'
        },
        async (payload) => {
          console.log('📬 New extraction queue item detected, triggering server-side processing');
          const queueItem = payload.new as any;
          
          // Trigger server-side processing immediately
          setTimeout(async () => {
            try {
              await this.triggerServerSideProcessor(queueItem.organization_id);
            } catch (error) {
              console.error('❌ Failed to trigger server-side processor:', error);
            }
          }, 1000); // Small delay to ensure database consistency
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'extraction_queue'
        },
        (payload) => {
          console.log('📡 Extraction queue status update:', payload.new);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'content_types'
        },
        (payload) => {
          console.log('📡 Content type status update:', payload.new);
        }
      )
      .subscribe();
  }

  /**
   * Stop the queue processor
   */
  stopQueueProcessor() {
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
      this.processingInterval = null;
      console.log('⏹️ Stopped automatic extraction queue processor');
    }
  }

  /**
   * Process pending items in the extraction queue
   */
  private async processQueue() {
    if (this.isProcessing) return;

    try {
      this.isProcessing = true;

      // Get pending extraction requests
      const { data: pendingItems, error } = await supabase
        .from('extraction_queue')
        .select('*')
        .eq('status', 'pending')
        .order('created_at', { ascending: true })
        .limit(5); // Process up to 5 items at a time

      if (error) {
        console.error('❌ Error fetching extraction queue:', error);
        return;
      }

      if (!pendingItems || pendingItems.length === 0) {
        return; // No pending items
      }

      console.log(`📋 Processing ${pendingItems.length} extraction requests`);

      // Process each item
      for (const item of pendingItems) {
        await this.processExtractionRequest(item as ExtractionQueueItem);
      }

    } catch (error) {
      console.error('❌ Queue processing error:', error);
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Process a single extraction request
   */
  private async processExtractionRequest(item: ExtractionQueueItem) {
    const itemType = item.content_type_id ? 'content_type' : 'content_idea';
    const itemId = item.content_type_id || item.content_idea_id;
    console.log(`🔄 Processing extraction for ${itemType}: ${itemId}`);

    try {
      // Update status to processing
      await supabase
        .from('extraction_queue')
        .update({
          status: 'processing',
          last_attempt_at: new Date().toISOString(),
          attempts: item.attempts + 1,
          updated_at: new Date().toISOString(),
        })
        .eq('id', item.id);

      // Get the current session token
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('No active session for automatic extraction');
      }

      // Get Supabase URL for Edge Function
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      if (!supabaseUrl) {
        throw new Error('Supabase URL not configured');
      }

      // Call the automatic content extraction Edge Function
      const response = await fetch(`${supabaseUrl}/functions/v1/automatic-content-extraction`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
          'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY || '',
        },
        body: JSON.stringify(item.payload)
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Edge Function error: ${response.status} ${response.statusText} - ${errorText}`);
      }

      const result = await response.json();

      if (result.success) {
        // Mark as completed
        await supabase
          .from('extraction_queue')
          .update({
            status: 'completed',
            processed_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('id', item.id);

        console.log(`✅ Extraction completed for ${itemType}: ${itemId}`);
      } else {
        throw new Error(result.error || 'Extraction failed');
      }

    } catch (error) {
      console.error(`❌ Extraction failed for ${itemType} ${itemId}:`, error);

      // Update with error status
      const errorMessage = error instanceof Error ? error.message : 'Unknown extraction error';
      const maxAttempts = 3;
      const shouldRetry = item.attempts < maxAttempts;

      await supabase
        .from('extraction_queue')
        .update({
          status: shouldRetry ? 'pending' : 'failed',
          error_message: errorMessage,
          updated_at: new Date().toISOString(),
        })
        .eq('id', item.id);

      // Also update content type or content idea status if we're giving up
      if (!shouldRetry) {
        if (item.content_type_id) {
          await supabase
            .from('content_types')
            .update({
              extraction_status: 'failed',
              extraction_error: `Automatic extraction failed after ${maxAttempts} attempts: ${errorMessage}`,
              updated_at: new Date().toISOString(),
            })
            .eq('id', item.content_type_id);
        } else if (item.content_idea_id) {
          await supabase
            .from('content_ideas')
            .update({
              extraction_status: 'failed',
              extraction_error: `Automatic extraction failed after ${maxAttempts} attempts: ${errorMessage}`,
              updated_at: new Date().toISOString(),
            })
            .eq('id', item.content_idea_id);
        }
      }
    }
  }

  /**
   * Force refresh content types cache
   */
  forceRefreshCache() {
    // This will be called by components to force cache refresh
    console.log('🔄 Forcing content types cache refresh');
    window.dispatchEvent(new CustomEvent('force-content-types-refresh'));
  }

  /**
   * Trigger server-side extraction processor
   */
  async triggerServerSideProcessor(organizationId?: string): Promise<boolean> {
    try {
      console.log('🚀 Triggering server-side extraction processor');

      // Get the current session token
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        console.error('❌ No active session for server-side trigger');
        return false;
      }

      // Get Supabase URL for Edge Function
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      if (!supabaseUrl) {
        console.error('❌ Supabase URL not configured');
        return false;
      }

      // Call the extraction queue processor
      const response = await fetch(`${supabaseUrl}/functions/v1/extraction-queue-processor`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
          'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY || '',
        },
        body: JSON.stringify({
          trigger_source: 'manual_trigger',
          organization_id: organizationId
        })
      });

      if (!response.ok) {
        console.error('❌ Server-side processor failed:', response.status, response.statusText);
        return false;
      }

      const result = await response.json();
      console.log('✅ Server-side processor result:', result);
      
      return result.success;

    } catch (error) {
      console.error('❌ Server-side processor trigger failed:', error);
      return false;
    }
  }

  /**
   * Manually trigger extraction for a specific content type (legacy method)
   */
  async triggerManualExtraction(contentTypeId: string): Promise<boolean> {
    try {
      console.log(`🎯 Manual trigger for content_type_id: ${contentTypeId}`);

      // Get the content type details
      const { data: contentType, error } = await supabase
        .from('content_types')
        .select('*')
        .eq('id', contentTypeId)
        .single();

      if (error || !contentType) {
        console.error('❌ Content type not found:', error);
        return false;
      }

      // Check if there are extractable examples
      if (!contentType.examples || contentType.examples.length === 0) {
        console.log('⚠️ No examples to extract');
        return false;
      }

      // Create extraction queue item manually
      const payload = {
        content_type_id: contentTypeId,
        organization_id: contentType.organization_id,
        examples: contentType.examples,
        trigger_time: new Date().toISOString()
      };

      const { error: queueError } = await supabase
        .from('extraction_queue')
        .upsert({
          content_type_id: contentTypeId,
          organization_id: contentType.organization_id,
          payload,
          status: 'pending',
          attempts: 0,
        });

      if (queueError) {
        console.error('❌ Failed to queue extraction:', queueError);
        return false;
      }

      // Trigger immediate processing
      setTimeout(() => this.processQueue(), 100);

      return true;

    } catch (error) {
      console.error('❌ Manual extraction trigger failed:', error);
      return false;
    }
  }

  /**
   * Get extraction queue status for a content type
   */
  async getExtractionStatus(contentTypeId: string): Promise<ExtractionQueueItem | null> {
    try {
      const { data, error } = await supabase
        .from('extraction_queue')
        .select('*')
        .eq('content_type_id', contentTypeId)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 is "not found"
        console.error('❌ Error fetching extraction status:', error);
        return null;
      }

      return data as ExtractionQueueItem;
    } catch (error) {
      console.error('❌ Error in getExtractionStatus:', error);
      return null;
    }
  }

  /**
   * Subscribe to extraction queue changes for real-time updates
   */
  subscribeToExtractionUpdates(
    organizationId: string, 
    callback: (update: ExtractionQueueItem) => void
  ): (() => void) {
    console.log(`🔔 Subscribing to extraction updates for organization: ${organizationId}`);

    const channel = supabase.channel('extraction-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'extraction_queue',
          filter: `organization_id=eq.${organizationId}`
        },
        (payload) => {
          console.log('📡 Extraction queue update:', payload);
          if (payload.new) {
            callback(payload.new as ExtractionQueueItem);
          }
        }
      )
      .subscribe();

    // Return unsubscribe function
    return () => {
      console.log('🔕 Unsubscribing from extraction updates');
      channel.unsubscribe();
    };
  }
}

// Export singleton instance
export const automaticExtractionService = new AutomaticExtractionService();
export default automaticExtractionService;