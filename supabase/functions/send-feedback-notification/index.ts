import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.53.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface NotificationRequest {
  feedbackId: string;
  title: string;
  message: string;
  senderRole: string;
  currentOrganizationId?: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { feedbackId, title, message, senderRole, currentOrganizationId }: NotificationRequest = await req.json();

    console.log('Processing feedback notification request:', {
      feedbackId,
      title,
      senderRole,
      currentOrganizationId
    });

    // Get feedback details and verify permissions
    const { data: feedback, error: feedbackError } = await supabase
      .from('feedback')
      .select('id, user_id, organization_id, subject, status')
      .eq('id', feedbackId)
      .single();

    if (feedbackError) {
      console.error('Error fetching feedback:', feedbackError);
      throw new Error('Feedback not found');
    }

    // Verify sender has permission to send notifications for this feedback
    if (senderRole === 'admin' && currentOrganizationId && feedback.organization_id !== currentOrganizationId) {
      throw new Error('Access denied - Admin can only send notifications for their organization');
    }

    if (senderRole !== 'super_admin' && senderRole !== 'admin') {
      throw new Error('Access denied - Only admins can send feedback notifications');
    }

    // Create notification for the feedback submitter
    const { error: notificationError } = await supabase
      .from('notifications')
      .insert({
        user_id: feedback.user_id,
        organization_id: feedback.organization_id,
        type: 'feedback_update',
        category: 'feedback',
        title: title || `Update on your feedback: ${feedback.subject}`,
        message: message || `Your feedback "${feedback.subject}" has been updated with status: ${feedback.status}`,
        data: {
          feedback_id: feedback.id,
          feedback_subject: feedback.subject,
          feedback_status: feedback.status
        },
        action_url: `/feedback/${feedback.id}`
      });

    if (notificationError) {
      console.error('Error creating notification:', notificationError);
      throw new Error('Failed to create notification');
    }

    console.log('Successfully sent feedback notification to user:', feedback.user_id);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Notification sent successfully',
        recipient_id: feedback.user_id
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('Error in send-feedback-notification function:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Internal server error',
        success: false 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});