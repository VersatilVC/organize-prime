import { createClient } from "https://esm.sh/@supabase/supabase-js@2.53.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-environment, x-app-version",
};

interface ExecRequest {
  webhookUrl: string;
  method?: "GET" | "POST" | "PUT" | "DELETE";
  payload?: Record<string, any>;
  appId?: string;
  webhookId?: string;
  organizationId?: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    // Auth
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { webhookUrl, method = "POST", payload = {}, appId, webhookId, organizationId }: ExecRequest = await req.json();

    // Validate URL - allow all HTTPS webhooks for flexibility
    if (!webhookUrl || !webhookUrl.startsWith('https://')) {
      return new Response(JSON.stringify({ error: "Invalid webhook URL - must be HTTPS" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Enforce organization membership if provided
    if (organizationId) {
      const { data: rows, error: membershipErr } = await supabase
        .from("memberships")
        .select("id")
        .eq("user_id", user.id)
        .eq("organization_id", organizationId)
        .eq("status", "active");
      if (membershipErr || !rows || rows.length === 0) {
        return new Response(JSON.stringify({ error: "Forbidden - Not a member of organization" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
    }

    // Rate limit
    const actionType = `exec_n8n_webhook:${webhookId || "generic"}`;
    const { data: allowed } = await supabase.rpc("check_rate_limit", {
      p_identifier: user.id,
      p_action_type: actionType,
      p_limit: 60,
      p_window_minutes: 10,
    });
    if (allowed === false) {
      return new Response(JSON.stringify({ error: "Rate limit exceeded" }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Build request headers
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "User-Agent": "OrganizePrime-Webhook/1.0",
    };

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 90000); // 90 seconds for long-running AI workflows

    let response: Response;
    try {
      response = await fetch(webhookUrl, {
        method,
        headers,
        body: method === "GET" || method === "DELETE" ? undefined : JSON.stringify(payload),
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeout);
    }

    const contentType = response.headers.get("content-type") || "";
    const respData = contentType.includes("application/json") ? await response.json().catch(() => ({})) : await response.text();

    // Log analytics (best effort)
    if (appId && organizationId) {
      await supabase.from("marketplace_app_analytics").insert({
        app_id: appId,
        organization_id: organizationId,
        user_id: user.id,
        event_type: response.ok ? "webhook_success" : "webhook_failure",
        event_category: "n8n_integration",
        event_data: {
          webhook_id: webhookId,
          status: response.status,
        },
      });
    }

    if (!response.ok) {
      return new Response(JSON.stringify({ error: "Webhook failed", status: response.status, data: respData }), { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Handle chat webhook responses by updating the message directly
    // Look for message_id in the payload body (matching our SimpleChatService format)
    const messageId = payload.body?.message_id || payload.message_id;
    const conversationId = payload.body?.conversation_id || payload.conversation_id;
    
    if (messageId && conversationId && respData) {
      try {
        console.log(`Processing chat response for message: ${messageId}, conversation: ${conversationId}`);
        console.log(`Response data type: ${typeof respData}`);
        console.log(`Response data:`, JSON.stringify(respData));
        
        // Handle N8N AI Agent response format
        let aiOutput = null;
        
        if (typeof respData === 'string') {
          // Direct string response from N8N AI Agent
          aiOutput = respData;
          console.log(`Using direct string response: ${aiOutput}`);
        } else if (Array.isArray(respData) && respData.length > 0) {
          // N8N returns array: handle first item
          const firstItem = respData[0];
          if (typeof firstItem === 'string') {
            aiOutput = firstItem;
          } else if (firstItem.output) {
            aiOutput = firstItem.output;
          } else if (firstItem.text) {
            aiOutput = firstItem.text;
          }
          console.log(`Extracted output from array: ${aiOutput}`);
        } else if (typeof respData === 'object' && respData.output) {
          // N8N returns object: {"output": "..."}
          aiOutput = respData.output;
          console.log(`Extracted output from object: ${aiOutput}`);
        } else {
          console.log(`No recognizable AI output found in response`);
        }
        
        if (aiOutput) {
          // Find the pending assistant message and update it
          const { data: assistantMessages, error: findError } = await supabase
            .from('kb_messages')
            .select('id')
            .eq('conversation_id', conversationId)
            .eq('message_type', 'assistant')
            .eq('processing_status', 'processing')
            .order('created_at', { ascending: false })
            .limit(1);

          if (findError) {
            console.error('Error finding assistant message:', findError);
            return;
          }

          if (assistantMessages && assistantMessages.length > 0) {
            const assistantMessageId = assistantMessages[0].id;
            
            console.log(`🎯 Updating assistant message ${assistantMessageId} with AI response`);

            const { error: updateError } = await supabase
              .from('kb_messages')
              .update({
                content: aiOutput,
                processing_status: 'completed',
                metadata: {
                  completed_at: new Date().toISOString(),
                  model_used: 'gpt-4',
                  response_to_message_id: messageId
                }
              })
              .eq('id', assistantMessageId);

            if (updateError) {
              console.error('Failed to update assistant message:', updateError);
            } else {
              console.log(`✅ Updated assistant message ${assistantMessageId} with AI response`);
            }
          } else {
            console.log('No pending assistant message found to update');
          }
        } else {
          console.log('No AI output found, marking assistant message as error');
          
          // Find and mark assistant message as error
          const { data: assistantMessages } = await supabase
            .from('kb_messages')
            .select('id')
            .eq('conversation_id', conversationId)
            .eq('message_type', 'assistant')
            .eq('processing_status', 'processing')
            .order('created_at', { ascending: false })
            .limit(1);

          if (assistantMessages && assistantMessages.length > 0) {
            await supabase
              .from('kb_messages')
              .update({
                content: 'Sorry, I could not generate a response. Please try again.',
                processing_status: 'error',
                error_message: 'No valid response from AI agent'
              })
              .eq('id', assistantMessages[0].id);
          }
        }
      } catch (chatError) {
        console.error('Error processing chat response:', chatError);
      }
    }

    return new Response(JSON.stringify({ success: true, data: respData, status: response.status }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error: any) {
    console.error("exec-n8n-webhook error:", error);
    return new Response(JSON.stringify({ error: error.message || "Internal error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
