import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface ChatWebhookResponse {
  success: boolean;
  message_id: string;
  response?: string;
  sources?: Array<{
    document_name: string;
    chunk_text: string;
    confidence_score: number;
    file_id: string;
  }>;
  metadata?: {
    tokens_used: number;
    processing_time: number;
    model_used: string;
  };
  error?: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const body = await req.json() as ChatWebhookResponse
    console.log('Webhook response received:', { 
      messageId: body.message_id, 
      success: body.success,
      hasResponse: !!body.response
    })

    // Validate required fields
    if (!body.message_id) {
      throw new Error('message_id is required')
    }

    // Prepare update data based on success/failure
    const updateData: any = {
      updated_at: new Date().toISOString()
    }

    if (body.success && body.response) {
      // Successful response
      updateData.content = body.response
      updateData.processing_status = 'completed'
      updateData.error_message = null
      
      if (body.sources && Array.isArray(body.sources)) {
        updateData.sources = body.sources
      }
      
      if (body.metadata) {
        updateData.metadata = body.metadata
      }
    } else {
      // Error response
      updateData.processing_status = 'error'
      updateData.error_message = body.error || 'Processing failed in N8N workflow'
    }

    // Update message in database
    const { error: updateError } = await supabaseClient
      .from('kb_messages')
      .update(updateData)
      .eq('id', body.message_id)

    if (updateError) {
      console.error('Failed to update message:', updateError)
      throw new Error(`Database update failed: ${updateError.message}`)
    }

    console.log(`✅ Updated message ${body.message_id} with webhook response`)

    // Send real-time notification
    const { error: channelError } = await supabaseClient
      .channel(`chat_message_${body.message_id}`)
      .send({
        type: 'broadcast',
        event: 'message_updated',
        payload: {
          message_id: body.message_id,
          status: updateData.processing_status,
          content: updateData.content || '',
          error: updateData.error_message
        }
      })

    if (channelError) {
      console.warn('Failed to send real-time notification:', channelError)
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Message updated successfully',
        message_id: body.message_id
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )

  } catch (error) {
    console.error('Webhook processing error:', error)
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
})