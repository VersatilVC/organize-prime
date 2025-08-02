import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useOrganization } from '@/contexts/OrganizationContext';
import { useToast } from './use-toast';

export interface Invitation {
  invitation_id: string;
  email: string;
  role: string;
  token: string;
  message: string | null;
  created_at: string;
  expires_at: string;
  accepted_at: string | null;
  invited_by: string;
  organization_id: string;
  invited_by_name?: string;
}

interface InvitationsQueryResult {
  invitations: Invitation[];
  totalCount: number;
}

interface UseInvitationsQueryOptions {
  page?: number;
  pageSize?: number;
}

export function useInvitationsQuery({ page = 0, pageSize = 50 }: UseInvitationsQueryOptions = {}) {
  const { user } = useAuth();
  const { currentOrganization } = useOrganization();

  return useQuery({
    queryKey: ['invitations', user?.id, currentOrganization?.id, page, pageSize],
    queryFn: async (): Promise<InvitationsQueryResult> => {
      if (!user || !currentOrganization) throw new Error('User or organization not available');
      
      const { data, error } = await supabase.rpc('get_invitations_optimized', {
        p_user_id: user.id,
        p_organization_id: currentOrganization.id,
        p_page: page,
        p_page_size: pageSize,
      });

      if (error) throw error;

      const invitations = (data || []).map((row: any) => ({
        invitation_id: row.invitation_id,
        email: row.email,
        role: row.role,
        token: row.token,
        message: row.message,
        created_at: row.created_at,
        expires_at: row.expires_at,
        accepted_at: row.accepted_at,
        invited_by: row.invited_by,
        organization_id: row.organization_id,
        invited_by_name: row.invited_by_name,
      }));

      const totalCount = data?.[0]?.total_count || 0;

      return { invitations, totalCount };
    },
    enabled: !!user && !!currentOrganization,
    staleTime: 2 * 60 * 1000, // 2 minutes
    retry: 2,
  });
}

export function useResendInvitationMutation() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();
  const { currentOrganization } = useOrganization();

  return useMutation({
    mutationFn: async (invitation: Invitation) => {
      // Generate new token and expiry
      const newToken = Array.from(crypto.getRandomValues(new Uint8Array(32)))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
      
      const newExpiresAt = new Date();
      newExpiresAt.setDate(newExpiresAt.getDate() + 7);

      // Update the invitation record
      const { error } = await supabase
        .from('invitations')
        .update({
          token: newToken,
          expires_at: newExpiresAt.toISOString(),
          created_at: new Date().toISOString()
        })
        .eq('id', invitation.invitation_id);

      if (error) throw error;

      // Get current user's profile for the inviter name
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name, username')
        .eq('id', invitation.invited_by)
        .single();

      const inviterName = profile?.full_name || profile?.username || 'Someone';

      // Send the invitation email via edge function
      try {
        const { error: emailError } = await supabase.functions.invoke('send-invitation-email', {
          body: {
            email: invitation.email,
            inviterName,
            organizationName: currentOrganization?.name || 'Organization',
            role: invitation.role,
            message: invitation.message,
            inviteToken: newToken
          }
        });

        return { emailSent: !emailError, invitation };
      } catch (emailError) {
        return { emailSent: false, invitation };
      }
    },
    onSuccess: ({ emailSent, invitation }) => {
      if (emailSent) {
        toast({
          title: "Invitation Resent",
          description: `New invitation email sent to ${invitation.email}`,
        });
      } else {
        toast({
          title: "Invitation Updated",
          description: `Invitation updated but email failed to send. You can copy the link manually.`,
          variant: "default",
        });
      }
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to resend invitation",
        variant: "destructive",
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ 
        queryKey: ['invitations', user?.id, currentOrganization?.id] 
      });
    },
  });
}

export function useCancelInvitationMutation() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();
  const { currentOrganization } = useOrganization();

  return useMutation({
    mutationFn: async (invitationId: string) => {
      const { error } = await supabase
        .from('invitations')
        .delete()
        .eq('id', invitationId);

      if (error) throw error;
      return invitationId;
    },
    onMutate: async (invitationId) => {
      await queryClient.cancelQueries({ 
        queryKey: ['invitations', user?.id, currentOrganization?.id] 
      });

      const queryKey = ['invitations', user?.id, currentOrganization?.id, 0, 50];
      const previousData = queryClient.getQueryData<InvitationsQueryResult>(queryKey);

      if (previousData) {
        const optimisticData = {
          ...previousData,
          invitations: previousData.invitations.filter(inv => inv.invitation_id !== invitationId),
          totalCount: previousData.totalCount - 1,
        };
        queryClient.setQueryData(queryKey, optimisticData);
      }

      return { previousData, queryKey };
    },
    onError: (error, variables, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(context.queryKey, context.previousData);
      }
      
      toast({
        title: "Error",
        description: "Failed to cancel invitation",
        variant: "destructive",
      });
    },
    onSuccess: (invitationId, variables, context) => {
      const invitationData = context?.previousData?.invitations.find(inv => inv.invitation_id === invitationId);
      toast({
        title: "Invitation Cancelled",
        description: `Invitation for ${invitationData?.email} has been cancelled`,
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ 
        queryKey: ['invitations', user?.id, currentOrganization?.id] 
      });
    },
  });
}