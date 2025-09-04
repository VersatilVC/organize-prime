import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'jsr:@supabase/supabase-js@2';

// Scheduled processing result
interface ScheduledProcessingResult {
  success: boolean;
  processed: number;
  failed: number;
  total_pending: number;
  processing_time_ms: number;
  errors: string[];
  trigger_source: string;
}

Deno.serve(async (req: Request) => {
  const startTime = Date.now();
  
  // Initialize Supabase client with service role key
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  // In Edge Functions, the service role key is available as SUPABASE_SERVICE_ROLE_KEY
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  
  if (!supabaseServiceKey) {
    console.error('❌ SUPABASE_SERVICE_ROLE_KEY environment variable not found');
    return new Response(JSON.stringify({
      success: false,
      error: 'Service role key not configured'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
  
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    console.log('🔄 Scheduled extraction processor started');
    
    // Handle CORS
    if (req.method === 'OPTIONS') {
      return new Response(null, {
        status: 200,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization, apikey',
        },
      });
    }

    // Allow GET for health checks
    if (req.method === 'GET') {
      const { data: queueStats } = await supabase
        .from('extraction_queue')
        .select('status', { count: 'exact' });
      
      const pendingCount = queueStats?.filter(item => item.status === 'pending').length || 0;
      const processingCount = queueStats?.filter(item => item.status === 'processing').length || 0;
      
      return new Response(JSON.stringify({
        success: true,
        status: 'healthy',
        queue_stats: {
          pending: pendingCount,
          processing: processingCount,
          total: queueStats?.length || 0
        },
        timestamp: new Date().toISOString()
      }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Reset stuck items (processing for more than 5 minutes)
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    const { data: stuckItems, error: resetError } = await supabase
      .from('extraction_queue')
      .update({
        status: 'pending',
        updated_at: new Date().toISOString(),
        error_message: 'Reset from stuck processing state'
      })
      .eq('status', 'processing')
      .lt('last_attempt_at', fiveMinutesAgo)
      .select('id, content_type_id');

    if (resetError) {
      console.error('❌ Error resetting stuck items:', resetError);
    } else if (stuckItems && stuckItems.length > 0) {
      console.log(`🔄 Reset ${stuckItems.length} stuck processing items`);
    }

    // Get pending extraction requests
    const { data: pendingItems, error } = await supabase
      .from('extraction_queue')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: true })
      .limit(10); // Process up to 10 items per run

    if (error) {
      console.error('❌ Error fetching extraction queue:', error);
      return new Response(JSON.stringify({
        success: false,
        error: 'Failed to fetch queue items'
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const totalPending = pendingItems?.length || 0;
    
    if (totalPending === 0) {
      return new Response(JSON.stringify({
        success: true,
        processed: 0,
        failed: 0,
        total_pending: 0,
        processing_time_ms: Date.now() - startTime,
        message: 'No pending items to process',
        trigger_source: 'scheduled'
      }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    console.log(`📋 Processing ${totalPending} pending items`);
    
    const result: ScheduledProcessingResult = {
      success: true,
      processed: 0,
      failed: 0,
      total_pending: totalPending,
      processing_time_ms: 0,
      errors: [],
      trigger_source: 'scheduled'
    };

    // Process each item by calling the existing extraction-queue-processor
    for (const item of pendingItems) {
      try {
        const isContentIdea = !!item.content_idea_id;
        const entityId = item.content_type_id || item.content_idea_id;
        const entityType = isContentIdea ? 'content_idea_id' : 'content_type_id';
        
        console.log(`🔄 Processing extraction for ${entityType}: ${entityId}`);
        
        // Call the extraction-queue-processor with this specific item
        const requestBody = {
          trigger_source: 'scheduled_batch',
          organization_id: item.organization_id
        };
        
        // Add the appropriate ID field
        if (isContentIdea) {
          requestBody.content_idea_id = item.content_idea_id;
        } else {
          requestBody.content_type_id = item.content_type_id;
        }
        
        const response = await fetch(`${supabaseUrl}/functions/v1/extraction-queue-processor`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${supabaseServiceKey}`,
            'apikey': supabaseServiceKey,
          },
          body: JSON.stringify(requestBody)
        });

        if (response.ok) {
          const processingResult = await response.json();
          if (processingResult.success && processingResult.processed > 0) {
            result.processed++;
            console.log(`✅ Successfully processed ${entityType}: ${entityId}`);
          } else {
            result.failed++;
            result.errors.push(`${entityId}: Processing returned no results`);
          }
        } else {
          const errorText = await response.text();
          result.failed++;
          result.errors.push(`${entityId}: HTTP ${response.status} - ${errorText}`);
          console.error(`❌ HTTP error processing ${entityId}:`, response.status, errorText);
        }

      } catch (error) {
        result.failed++;
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        result.errors.push(`${entityId}: ${errorMessage}`);
        console.error(`❌ Exception processing ${entityId}:`, error);
      }
    }

    result.processing_time_ms = Date.now() - startTime;
    
    console.log(`✅ Scheduled processing completed: ${result.processed} processed, ${result.failed} failed in ${result.processing_time_ms}ms`);

    return new Response(JSON.stringify(result), {
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('❌ Scheduled processor error:', error);
    
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown scheduled processor error',
      processing_time_ms: Date.now() - startTime,
      trigger_source: 'scheduled'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});