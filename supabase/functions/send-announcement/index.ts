import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface AnnouncementRequest {
  title: string;
  message: string;
  recipientType: 'all_users' | 'org_users' | 'org_admins' | 'specific_users';
  organizationId?: string;
  specificUsers: string[];
  scheduleFor?: string;
  senderRole: string;
  currentOrganizationId?: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get the JWT token from the request
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    // Verify the user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    const requestData: AnnouncementRequest = await req.json();
    const { 
      title, 
      message, 
      recipientType, 
      organizationId, 
      specificUsers, 
      senderRole,
      currentOrganizationId 
    } = requestData;

    console.log('Processing announcement request:', { 
      title, 
      recipientType, 
      senderRole, 
      recipientCount: specificUsers?.length 
    });

    // Determine recipients based on type and sender role
    let recipientUserIds: string[] = [];

    switch (recipientType) {
      case 'all_users':
        if (senderRole !== 'super_admin') {
          throw new Error('Only super admins can send to all users');
        }
        // Get all user IDs
        const { data: allUsers, error: allUsersError } = await supabase
          .from('profiles')
          .select('id');
        
        if (allUsersError) throw allUsersError;
        recipientUserIds = allUsers.map(u => u.id);
        break;

      case 'org_users':
        const targetOrgId = organizationId || currentOrganizationId;
        if (!targetOrgId) {
          throw new Error('Organization ID required for org users');
        }
        
        // Get all users in the organization
        const { data: orgUsers, error: orgUsersError } = await supabase
          .from('memberships')
          .select('user_id')
          .eq('organization_id', targetOrgId)
          .eq('status', 'active');
        
        if (orgUsersError) throw orgUsersError;
        recipientUserIds = orgUsers.map(m => m.user_id);
        break;

      case 'org_admins':
        const adminOrgId = organizationId || currentOrganizationId;
        if (!adminOrgId) {
          throw new Error('Organization ID required for org admins');
        }
        
        // Get admin users in the organization
        const { data: orgAdmins, error: orgAdminsError } = await supabase
          .from('memberships')
          .select('user_id')
          .eq('organization_id', adminOrgId)
          .eq('role', 'admin')
          .eq('status', 'active');
        
        if (orgAdminsError) throw orgAdminsError;
        recipientUserIds = orgAdmins.map(m => m.user_id);
        break;

      case 'specific_users':
        recipientUserIds = specificUsers;
        break;

      default:
        throw new Error('Invalid recipient type');
    }

    if (recipientUserIds.length === 0) {
      throw new Error('No recipients found');
    }

    console.log(`Sending notification to ${recipientUserIds.length} users`);

    // Create notifications for each recipient
    const notifications = recipientUserIds.map(userId => ({
      user_id: userId,
      organization_id: organizationId || currentOrganizationId,
      type: 'system_announcement',
      category: 'announcement',
      title,
      message,
      created_at: new Date().toISOString(),
      read: false,
      data: {
        sender_id: user.id,
        sender_role: senderRole,
        announcement_type: recipientType
      }
    }));

    // Insert notifications in batches
    const batchSize = 100;
    let insertedCount = 0;
    
    for (let i = 0; i < notifications.length; i += batchSize) {
      const batch = notifications.slice(i, i + batchSize);
      const { error: insertError } = await supabase
        .from('notifications')
        .insert(batch);
      
      if (insertError) {
        console.error('Error inserting notification batch:', insertError);
        throw insertError;
      }
      
      insertedCount += batch.length;
    }

    console.log(`Successfully sent ${insertedCount} notifications`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        recipientCount: insertedCount,
        message: `Announcement sent to ${insertedCount} users`
      }),
      { 
        headers: { 
          'Content-Type': 'application/json',
          ...corsHeaders 
        } 
      }
    );

  } catch (error) {
    console.error('Error in send-announcement function:', error);
    
    return new Response(
      JSON.stringify({ 
        error: error.message || 'An unexpected error occurred',
        success: false 
      }),
      { 
        status: 400,
        headers: { 
          'Content-Type': 'application/json',
          ...corsHeaders 
        } 
      }
    );
  }
});