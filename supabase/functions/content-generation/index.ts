// Content Generation Edge Function - N8N Webhook Handler
// Handles callback from N8N workflow when content generation is complete

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

interface N8NCallbackPayload {
  brief_id: string;
  success: boolean;
  content_item?: {
    title: string;
    content: string;
    content_type: string;
    metadata?: Record<string, any>;
  };
  execution_id?: string;
  error?: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Validate request method
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Method not allowed' }),
        { 
          status: 405, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Parse request body
    const payload: N8NCallbackPayload = await req.json()
    console.log('N8N callback payload:', payload)

    // Validate required fields
    if (!payload.brief_id) {
      return new Response(
        JSON.stringify({ error: 'Missing required field: brief_id' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Get the brief to validate and get organization info
    const { data: brief, error: briefError } = await supabase
      .from('content_briefs')
      .select('*')
      .eq('id', payload.brief_id)
      .single()

    if (briefError || !brief) {
      console.error('Brief not found:', briefError)
      return new Response(
        JSON.stringify({ error: 'Brief not found' }),
        { 
          status: 404, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    if (payload.success && payload.content_item) {
      // Create content item from N8N response
      const { data: newItem, error: itemError } = await supabase
        .from('content_items')
        .insert({
          brief_id: payload.brief_id,
          organization_id: brief.organization_id,
          title: payload.content_item.title,
          content: payload.content_item.content,
          content_type: payload.content_item.content_type,
          status: 'draft',
          is_major_item: true,
          derivatives_count: 0,
          generation_method: 'n8n_workflow',
          generation_metadata: {
            n8n_execution_id: payload.execution_id,
            generated_at: new Date().toISOString(),
            source_brief_id: payload.brief_id,
            ...payload.content_item.metadata
          },
          created_by: brief.created_by
        })
        .select()
        .single()

      if (itemError) {
        console.error('Failed to create content item:', itemError)
        
        // Update brief with error status
        await supabase
          .from('content_briefs')
          .update({
            generation_status: 'error',
            generation_completed_at: new Date().toISOString(),
            generation_error: `Failed to create content item: ${itemError.message}`
          })
          .eq('id', payload.brief_id)

        return new Response(
          JSON.stringify({ error: 'Failed to create content item', details: itemError.message }),
          { 
            status: 500, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }

      // Update brief status to completed
      const { error: updateError } = await supabase
        .from('content_briefs')
        .update({
          generation_status: 'completed',
          generation_completed_at: new Date().toISOString(),
          generation_error: null,
          status: 'completed'
        })
        .eq('id', payload.brief_id)

      if (updateError) {
        console.error('Failed to update brief status:', updateError)
        // Don't fail the request since the content item was created successfully
      }

      console.log('Content item created successfully:', newItem.id)
      return new Response(
        JSON.stringify({ 
          success: true, 
          content_item_id: newItem.id,
          message: 'Content item created successfully'
        }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )

    } else {
      // Handle error case
      const { error: updateError } = await supabase
        .from('content_briefs')
        .update({
          generation_status: 'error',
          generation_completed_at: new Date().toISOString(),
          generation_error: payload.error || 'N8N workflow failed without error details'
        })
        .eq('id', payload.brief_id)

      if (updateError) {
        console.error('Failed to update brief error status:', updateError)
      }

      console.log('N8N workflow failed:', payload.error)
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: payload.error || 'Content generation failed'
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

  } catch (error) {
    console.error('Content generation webhook error:', error)
    
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error', 
        details: error instanceof Error ? error.message : 'Unknown error'
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})