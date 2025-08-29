import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'jsr:@supabase/supabase-js@2';

// Queue processing result
interface ProcessingResult {
  processed: number;
  failed: number;
  errors: string[];
  trigger_source?: string;
}

// Request body interface
interface ProcessorRequest {
  trigger_source?: 'database_trigger' | 'manual_trigger' | 'scheduled';
  organization_id?: string;
  content_type_id?: string;
  pending_count?: number;
}

Deno.serve(async (req: Request) => {
  const startTime = Date.now();
  
  // Initialize Supabase client
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    // Parse request body for trigger information
    let requestBody: ProcessorRequest = {};
    if (req.method === 'POST') {
      try {
        requestBody = await req.json();
      } catch {
        // Empty body is fine, use defaults
      }
    }

    const triggerSource = requestBody.trigger_source || 'manual';
    console.log(`🔄 Extraction queue processor started (${triggerSource})`);
    
    // Handle CORS preflight request
    if (req.method === 'OPTIONS') {
      return new Response(null, {
        status: 200,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization, apikey',
          'Access-Control-Max-Age': '86400',
        },
      });
    }

    // Allow GET for health checks
    if (req.method === 'GET') {
      const { data: queueStatus } = await supabase
        .from('extraction_queue')
        .select('status', { count: 'exact' });
      
      return new Response(JSON.stringify({
        success: true,
        status: 'healthy',
        pending_count: queueStatus?.filter(item => item.status === 'pending').length || 0,
        total_queue_size: queueStatus?.length || 0
      }), {
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      });
    }

    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ success: false, error: 'Method not allowed' }),
        { 
          status: 405, 
          headers: { 
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          } 
        }
      );
    }

    // Build query for pending items
    let query = supabase
      .from('extraction_queue')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: true });

    // Filter by organization if specified
    if (requestBody.organization_id) {
      query = query.eq('organization_id', requestBody.organization_id);
    }

    // Filter by content_type_id if specified
    if (requestBody.content_type_id) {
      query = query.eq('content_type_id', requestBody.content_type_id);
    }

    // Limit batch size (more for database triggers, fewer for manual)
    const batchSize = triggerSource === 'database_trigger' ? 3 : 10;
    query = query.limit(batchSize);

    const { data: pendingItems, error } = await query;

    if (error) {
      console.error('❌ Error fetching extraction queue:', error);
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to fetch queue items' }),
        { 
          status: 500, 
          headers: { 
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          } 
        }
      );
    }

    if (!pendingItems || pendingItems.length === 0) {
      console.log('📋 No pending extraction items found');
      return new Response(JSON.stringify({
        success: true,
        processed: 0,
        failed: 0,
        message: 'No pending items to process'
      }), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      });
    }

    console.log(`📋 Processing ${pendingItems.length} extraction requests (${triggerSource})`);
    
    const result: ProcessingResult = {
      processed: 0,
      failed: 0,
      errors: [],
      trigger_source: triggerSource
    };

    // Process each item
    for (const item of pendingItems) {
      console.log(`🔄 Processing extraction for content_type_id: ${item.content_type_id}`);
      
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

        // Call the automatic content extraction Edge Function
        const response = await fetch(`${supabaseUrl}/functions/v1/automatic-content-extraction`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${supabaseServiceKey}`,
            'apikey': supabaseServiceKey,
          },
          body: JSON.stringify(item.payload)
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Edge Function error: ${response.status} ${response.statusText} - ${errorText}`);
        }

        const extractionResult = await response.json();

        if (extractionResult.success) {
          // Mark as completed
          await supabase
            .from('extraction_queue')
            .update({
              status: 'completed',
              processed_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            })
            .eq('id', item.id);

          result.processed++;
          console.log(`✅ Extraction completed for content_type_id: ${item.content_type_id}`);
        } else {
          throw new Error(extractionResult.error || 'Extraction failed');
        }

      } catch (error) {
        console.error(`❌ Extraction failed for ${item.content_type_id}:`, error);

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

        // Also update content type status if we're giving up
        if (!shouldRetry) {
          await supabase
            .from('content_types')
            .update({
              extraction_status: 'failed',
              extraction_error: `Automatic extraction failed after ${maxAttempts} attempts: ${errorMessage}`,
              updated_at: new Date().toISOString(),
            })
            .eq('id', item.content_type_id);
        }

        result.failed++;
        result.errors.push(`${item.content_type_id}: ${errorMessage}`);
      }
    }

    const processingTime = Date.now() - startTime;
    console.log(`✅ Queue processing completed (${triggerSource}): ${result.processed} processed, ${result.failed} failed in ${processingTime}ms`);

    return new Response(JSON.stringify({
      success: true,
      processed: result.processed,
      failed: result.failed,
      errors: result.errors,
      processingTime,
      trigger_source: triggerSource
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });

  } catch (error) {
    console.error('❌ Queue processor error:', error);
    
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown queue processor error'
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  }
});