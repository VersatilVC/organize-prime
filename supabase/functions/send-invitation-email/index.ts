import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.53.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface InvitationEmailRequest {
  email: string;
  inviterName: string;
  organizationName: string;
  role: string;
  message?: string;
  inviteToken: string;
  department?: string;
  position?: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Initialize Supabase client
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? '',
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ''
    );

    // Require auth
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Parse request body (support legacy payloads)
    const body = await req.json();
    const invitationId: string | undefined = body.invitation_id;
    const inviteToken: string | undefined = body.inviteToken || body.token;

    // Load invitation from DB to derive org and permissions
    const { data: invitation, error: invError } = await supabase
      .from('invitations')
      .select('id, email, role, message, organization_id, invited_by, expires_at, accepted_at')
      .or(`id.eq.${invitationId ?? ''},token.eq.${inviteToken ?? ''}`)
      .maybeSingle();

    if (invError || !invitation) {
      return new Response(JSON.stringify({ error: 'Invitation not found' }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Rate limit
    const { data: allowed } = await supabase.rpc('check_rate_limit', {
      p_identifier: user.id,
      p_action_type: 'send_invitation_email',
      p_limit: 50,
      p_window_minutes: 60,
    });
    if (allowed === false) {
      return new Response(JSON.stringify({ error: 'Rate limit exceeded' }), { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Permission: super admin OR org admin of the invitation's org
    const { data: profile } = await supabase
      .from('profiles')
      .select('is_super_admin')
      .eq('id', user.id)
      .maybeSingle();
    let authorized = !!profile?.is_super_admin;
    if (!authorized) {
      const { data: adminRows } = await supabase
        .from('memberships')
        .select('id')
        .eq('user_id', user.id)
        .eq('organization_id', invitation.organization_id)
        .eq('role', 'admin')
        .eq('status', 'active');
      authorized = Array.isArray(adminRows) && adminRows.length > 0;
    }
    if (!authorized) {
      return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Resolve organization and inviter names
    const [{ data: org }, { data: inviterProfile }] = await Promise.all([
      supabase.from('organizations').select('name').eq('id', invitation.organization_id).maybeSingle(),
      supabase.from('profiles').select('full_name, username').eq('id', invitation.invited_by).maybeSingle(),
    ]);
    const organizationName = org?.name ?? body.organizationName ?? 'Your organization';
    const inviterName = inviterProfile?.full_name || inviterProfile?.username || body.inviterName || 'An admin';

    // Build invite link from system setting if available
    let siteUrl = req.headers.get('origin') || `https://cjwgfoingscquolnfkhh.supabase.co`;
    const { data: siteSetting } = await supabase
      .from('system_settings')
      .select('value')
      .eq('key', 'site_url')
      .maybeSingle();
    const configuredUrl = siteSetting?.value?.value as string | undefined;
    if (configuredUrl) siteUrl = configuredUrl;

    const finalInviteToken = inviteToken || body.inviteToken || body.token;
    const inviteLink = `${siteUrl}/invite/${finalInviteToken}`;

    const emailHtml = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #ffffff;">
        <div style="text-align: center; margin-bottom: 32px;">
          <h1 style="color: #1a1a1a; font-size: 24px; font-weight: 600; margin: 0;">You're invited to join ${organizationName}</h1>
        </div>
        <div style="background-color: #f8f9fa; border-radius: 8px; padding: 24px; margin-bottom: 24px;">
          <p style="color: #374151; font-size: 16px; line-height: 1.5; margin: 0 0 16px 0;">
            <strong>${inviterName}</strong> has invited you to join <strong>${organizationName}</strong> as a <strong>${invitation.role === 'admin' ? 'Company Admin' : 'User'}</strong>.
          </p>
          ${invitation.message ? `
            <div style="margin-top: 16px; padding-top: 16px; border-top: 1px solid #e5e7eb;">
              <p style="color: #6b7280; font-size: 14px; margin: 0 0 8px 0;"><strong>Personal message:</strong></p>
              <p style="color: #374151; font-size: 14px; font-style: italic; margin: 0;">"${invitation.message}"</p>
            </div>
          ` : ''}
        </div>
        <div style="text-align: center; margin-bottom: 32px;">
          <a href="${inviteLink}" 
            style="display: inline-block; background-color: #2563eb; color: white; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-weight: 500; font-size: 16px;">
            Accept Invitation
          </a>
        </div>
        <div style="background-color: #f3f4f6; border-radius: 6px; padding: 16px; margin-bottom: 24px;">
          <p style="color: #6b7280; font-size: 14px; margin: 0 0 8px 0;">If the button doesn't work, copy and paste this link into your browser:</p>
          <p style="color: #2563eb; font-size: 14px; word-break: break-all; margin: 0;">${inviteLink}</p>
        </div>
        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;" />
        <div style="text-align: center;">
          <p style="color: #9ca3af; font-size: 12px; margin: 0;">This invitation will expire on ${new Date(invitation.expires_at).toLocaleDateString()}.</p>
        </div>
      </div>`;

    const emailResponse = await resend.emails.send({
      from: "Team Invitations <onboarding@resend.dev>",
      to: [invitation.email],
      subject: `You're invited to join ${organizationName}`,
      html: emailHtml,
    });

    return new Response(JSON.stringify(emailResponse), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error sending invitation email:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);