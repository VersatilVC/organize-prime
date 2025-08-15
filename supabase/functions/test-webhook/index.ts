import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { webhookId, eventType = 'webhook.test' } = await req.json()
    
    if (!webhookId) {
      throw new Error('webhookId is required')
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    // Get webhook details
    const { data: webhook, error: webhookError } = await supabase
      .from('feature_webhooks')
      .select('*')
      .eq('id', webhookId)
      .single()

    if (webhookError || !webhook) {
      throw new Error(`Webhook not found: ${webhookError?.message}`)
    }

    // Get the webhook URL (try both url and endpoint_url columns)
    const webhookUrl = webhook.url || webhook.endpoint_url
    if (!webhookUrl) {
      throw new Error('Webhook URL not found')
    }

    // Create test payload
    const testPayload = {
      event_type: eventType,
      webhook_id: webhookId,
      timestamp: new Date().toISOString(),
      data: {
        message: 'This is a test webhook call from OrganizePrime',
        test: true,
        webhook_name: webhook.name
      }
    }

    // Generate HMAC signature if secret key is provided
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'User-Agent': 'OrganizePrime-Webhook-Test/1.0',
      'X-Event-Type': eventType,
      'X-Webhook-ID': webhookId,
      'X-Timestamp': testPayload.timestamp,
      'X-Test': 'true'
    }

    if (webhook.secret_key) {
      // Generate HMAC signature
      const encoder = new TextEncoder()
      const keyData = encoder.encode(webhook.secret_key)
      const messageData = encoder.encode(JSON.stringify(testPayload))
      
      const key = await crypto.subtle.importKey(
        'raw',
        keyData,
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['sign']
      )
      
      const signature = await crypto.subtle.sign('HMAC', key, messageData)
      const hashArray = Array.from(new Uint8Array(signature))
      const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
      
      headers['X-Signature'] = `sha256=${hashHex}`
      headers['X-Signature-Version'] = 'v1'
    }

    // Make the webhook request with timeout
    const startTime = Date.now()
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), (webhook.timeout_seconds || 30) * 1000)

    let testResult
    try {
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify(testPayload),
        signal: controller.signal
      })

      clearTimeout(timeoutId)
      const endTime = Date.now()
      const responseTime = endTime - startTime

      // Get response body
      let responseBody
      try {
        const contentType = response.headers.get('content-type') || ''
        if (contentType.includes('application/json')) {
          responseBody = await response.json()
        } else {
          responseBody = await response.text()
        }
      } catch {
        responseBody = 'Could not parse response'
      }

      // Determine success/failure
      const isSuccess = response.status >= 200 && response.status < 300

      testResult = {
        status: isSuccess ? 'success' : 'failed',
        status_code: response.status,
        response_time: responseTime,
        response_body: responseBody,
        error_message: isSuccess ? undefined : `HTTP ${response.status}: ${response.statusText}`,
        request_headers: headers,
        payload_size: JSON.stringify(testPayload).length
      }

    } catch (error) {
      clearTimeout(timeoutId)
      const endTime = Date.now()
      const responseTime = endTime - startTime

      testResult = {
        status: error.name === 'AbortError' ? 'timeout' : 'failed',
        response_time: responseTime,
        error_message: error.name === 'AbortError' 
          ? `Request timeout after ${webhook.timeout_seconds || 30}s`
          : `Network error: ${error.message}`,
        request_headers: headers,
        payload_size: JSON.stringify(testPayload).length
      }
    }

    // Log the test result to webhook_logs table
    try {
      await supabase
        .from('webhook_logs')
        .insert({
          webhook_id: webhookId,
          event_type: eventType,
          status: testResult.status,
          status_code: testResult.status_code,
          response_time_ms: testResult.response_time,
          error_message: testResult.error_message,
          payload_size: testResult.payload_size,
          retry_count: 0,
          is_test: true,
          request_headers: testResult.request_headers,
          request_body: testPayload,
          response_body: testResult.response_body
        })
    } catch (logError) {
      console.warn('Failed to log webhook test:', logError)
      // Don't fail the entire test if logging fails
    }

    return new Response(
      JSON.stringify(testResult),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    )

  } catch (error) {
    console.error('Webhook test error:', error)
    
    return new Response(
      JSON.stringify({ 
        status: 'failed',
        error_message: error.message,
        response_time: 0
      }),
      { 
        status: 400, 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    )
  }
})