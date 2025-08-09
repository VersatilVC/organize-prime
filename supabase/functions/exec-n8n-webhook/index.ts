import { createClient } from "https://esm.sh/@supabase/supabase-js@2.53.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
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

    // Validate URL scope
    const baseUrl = Deno.env.get("N8N_BASE_URL");
    const apiKey = Deno.env.get("N8N_API_KEY");
    if (!baseUrl || !apiKey) {
      throw new Error("N8N secrets not configured");
    }
    if (!webhookUrl || !webhookUrl.startsWith(baseUrl)) {
      return new Response(JSON.stringify({ error: "Invalid webhook URL" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
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

    // Build request
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "X-N8N-API-KEY": apiKey,
    };

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);

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

    return new Response(JSON.stringify({ success: true, data: respData, status: response.status }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error: any) {
    console.error("exec-n8n-webhook error:", error);
    return new Response(JSON.stringify({ error: error.message || "Internal error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
