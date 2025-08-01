import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";

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
    const { 
      email, 
      inviterName, 
      organizationName, 
      role, 
      message, 
      inviteToken,
      department,
      position 
    }: InvitationEmailRequest = await req.json();

    const inviteLink = `${req.headers.get('origin') || 'https://cjwgfoingscquolnfkhh.supabase.co'}/invite/${inviteToken}`;

    const emailHtml = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #ffffff;">
        <div style="text-align: center; margin-bottom: 32px;">
          <h1 style="color: #1a1a1a; font-size: 24px; font-weight: 600; margin: 0;">You're invited to join ${organizationName}</h1>
        </div>
        
        <div style="background-color: #f8f9fa; border-radius: 8px; padding: 24px; margin-bottom: 24px;">
          <p style="color: #374151; font-size: 16px; line-height: 1.5; margin: 0 0 16px 0;">
            <strong>${inviterName}</strong> has invited you to join <strong>${organizationName}</strong> as a <strong>${role === 'admin' ? 'Company Admin' : 'User'}</strong>.
          </p>
          
          ${department ? `<p style="color: #6b7280; font-size: 14px; margin: 0 0 8px 0;"><strong>Department:</strong> ${department}</p>` : ''}
          ${position ? `<p style="color: #6b7280; font-size: 14px; margin: 0 0 8px 0;"><strong>Position:</strong> ${position}</p>` : ''}
          
          ${message ? `
            <div style="margin-top: 16px; padding-top: 16px; border-top: 1px solid #e5e7eb;">
              <p style="color: #6b7280; font-size: 14px; margin: 0 0 8px 0;"><strong>Personal message:</strong></p>
              <p style="color: #374151; font-size: 14px; font-style: italic; margin: 0;">"${message}"</p>
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
          <p style="color: #6b7280; font-size: 14px; margin: 0 0 8px 0;">
            If the button doesn't work, copy and paste this link into your browser:
          </p>
          <p style="color: #2563eb; font-size: 14px; word-break: break-all; margin: 0;">
            ${inviteLink}
          </p>
        </div>

        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;">
        
        <div style="text-align: center;">
          <p style="color: #9ca3af; font-size: 12px; margin: 0;">
            This invitation will expire in 7 days. If you didn't expect this invitation, you can safely ignore this email.
          </p>
        </div>
      </div>
    `;

    const emailResponse = await resend.emails.send({
      from: "Team Invitations <onboarding@resend.dev>",
      to: [email],
      subject: `You're invited to join ${organizationName}`,
      html: emailHtml,
    });

    console.log("Invitation email sent successfully:", emailResponse);

    return new Response(JSON.stringify(emailResponse), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
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