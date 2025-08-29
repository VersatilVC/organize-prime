import "jsr:@supabase/functions-js/edge-runtime.d.ts";

// Simple webhook that triggers the scheduled processor
// This can be called by external cron services like GitHub Actions, Zapier, etc.
Deno.serve({ 
  verifyJwt: false // Disable JWT verification for external webhooks
}, async (req: Request) => {
  try {
    // Handle CORS
    if (req.method === 'OPTIONS') {
      return new Response(null, {
        status: 200,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Webhook-Secret',
        },
      });
    }

    // Simple authentication via webhook secret
    const webhookSecret = req.headers.get('X-Webhook-Secret');
    const expectedSecret = Deno.env.get('WEBHOOK_SECRET') || 'default-secret';
    
    if (webhookSecret !== expectedSecret) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Invalid webhook secret'
      }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    console.log('🔗 Webhook triggered, calling scheduled processor');

    // Get Supabase URL
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    // Call the scheduled extraction processor
    const response = await fetch(`${supabaseUrl}/functions/v1/scheduled-extraction-processor`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseServiceKey}`,
        'apikey': supabaseServiceKey,
      },
      body: JSON.stringify({
        trigger_source: 'webhook',
        webhook_timestamp: new Date().toISOString()
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Scheduled processor failed:', response.status, errorText);
      
      return new Response(JSON.stringify({
        success: false,
        error: `Scheduled processor failed: ${response.status} ${errorText}`
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const result = await response.json();
    console.log('✅ Webhook processing completed:', result);

    return new Response(JSON.stringify({
      success: true,
      webhook_triggered: true,
      processing_result: result,
      timestamp: new Date().toISOString()
    }), {
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('❌ Webhook error:', error);
    
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown webhook error'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});