import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { useOrganization } from '@/contexts/OrganizationContext';
import { useUserRole } from '@/hooks/useUserRole';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useMemo } from 'react';

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

interface UseInvitationsOptions {
  page?: number;
  pageSize?: number;
  organizationId?: string;
  enabled?: boolean;
}

export function useInvitations({
  page = 0,
  pageSize = 50,
  organizationId,
  enabled = true
}: UseInvitationsOptions = {}) {
  const { user } = useAuth();
  const { currentOrganization } = useOrganization();
  const { role, loading: roleLoading } = useUserRole();

  const targetOrgId = organizationId || currentOrganization?.id;

  const queryKey = useMemo(() => [
    'invitations',
    user?.id,
    targetOrgId,
    page,
    pageSize
  ], [user?.id, targetOrgId, page, pageSize]);

  const hasPermission = useMemo(() => {
    return role === 'super_admin' || role === 'admin';
  }, [role]);

  return useQuery({
    queryKey,
    queryFn: async (): Promise<InvitationsQueryResult> => {
      if (!user?.id || !targetOrgId) {
        throw new Error('User or organization not available');
      }

      const { data, error } = await supabase.rpc('get_invitations_optimized', {
        p_user_id: user.id,
        p_organization_id: targetOrgId,
        p_page: page,
        p_page_size: pageSize
      });

      if (error) throw error;

      if (!data || data.length === 0) {
        return { invitations: [], totalCount: 0 };
      }

      const invitations = data.map((row: any) => ({
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
        invited_by_name: row.invited_by_name
      }));

      return {
        invitations,
        totalCount: data[0]?.total_count || 0
      };
    },
    enabled: enabled && !!user?.id && !!targetOrgId && hasPermission && !roleLoading,
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
}

export function useCreateInvitationMutation() {
  const { user } = useAuth();
  const { currentOrganization } = useOrganization();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      email,
      role,
      message
    }: {
      email: string;
      role: string;
      message?: string;
    }) => {
      if (!user?.id || !currentOrganization?.id) {
        throw new Error('User or organization not available');
      }

      // Generate a secure token
      const token = crypto.randomUUID();
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7); // 7 days expiry

      const { data, error } = await supabase
        .from('invitations')
        .insert({
          email,
          role,
          token,
          message,
          organization_id: currentOrganization.id,
          invited_by: user.id,
          expires_at: expiresAt.toISOString()
        })
        .select()
        .maybeSingle();

      if (error) throw error;
      if (!data) throw new Error('No data returned after creating invitation');
      
      // Send invitation email via edge function
      const { error: emailError } = await supabase.functions.invoke('send-invitation-email', {
        body: {
          email,
          token,
          organization_name: currentOrganization.name,
          invited_by: user.email,
          role,
          message
        }
      });

      if (emailError) {
        console.error('Failed to send invitation email:', emailError);
        // Don't throw here as the invitation was created successfully
      }

      return data;
    },
    onSuccess: () => {
      toast({
        title: 'Success',
        description: 'Invitation sent successfully',
      });
      
      // Invalidate invitations queries
      queryClient.invalidateQueries({ 
        queryKey: ['invitations', user?.id, currentOrganization?.id] 
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: 'Failed to send invitation. Please try again.',
        variant: 'destructive',
      });
      console.error('Invitation create error:', error);
    }
  });
}

export function useResendInvitationMutation() {
  const { user } = useAuth();
  const { currentOrganization } = useOrganization();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (invitation: Invitation) => {
      if (!user?.id || !currentOrganization?.id) {
        throw new Error('User or organization not available');
      }

      // Extend expiry date
      const newExpiresAt = new Date();
      newExpiresAt.setDate(newExpiresAt.getDate() + 7);

      const { error } = await supabase
        .from('invitations')
        .update({ expires_at: newExpiresAt.toISOString() })
        .eq('id', invitation.invitation_id);

      if (error) throw error;

      // Resend invitation email
      const { error: emailError } = await supabase.functions.invoke('send-invitation-email', {
        body: {
          email: invitation.email,
          token: invitation.token,
          organization_name: currentOrganization.name,
          invited_by: user.email,
          role: invitation.role,
          message: invitation.message
        }
      });

      if (emailError) {
        console.error('Failed to resend invitation email:', emailError);
      }
    },
    onSuccess: () => {
      toast({
        title: 'Success',
        description: 'Invitation resent successfully',
      });
      
      queryClient.invalidateQueries({ 
        queryKey: ['invitations', user?.id, currentOrganization?.id] 
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: 'Failed to resend invitation. Please try again.',
        variant: 'destructive',
      });
      console.error('Invitation resend error:', error);
    }
  });
}

export function useCancelInvitationMutation() {
  const { user } = useAuth();
  const { currentOrganization } = useOrganization();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (invitationId: string) => {
      const { error } = await supabase
        .from('invitations')
        .delete()
        .eq('id', invitationId);

      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: 'Success',
        description: 'Invitation cancelled successfully',
      });
      
      queryClient.invalidateQueries({ 
        queryKey: ['invitations', user?.id, currentOrganization?.id] 
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: 'Failed to cancel invitation. Please try again.',
        variant: 'destructive',
      });
      console.error('Invitation cancel error:', error);
    }
  });
}

export function useAcceptInvitationMutation() {
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (token: string) => {
      const { data: invitation, error: fetchError } = await supabase
        .from('invitations')
        .select('id, token, accepted_at, expires_at, email, role, organization_id')
        .eq('token', token)
        .maybeSingle();

      if (fetchError) throw fetchError;

      if (!invitation) {
        throw new Error('Invitation not found');
      }

      if (invitation.accepted_at) {
        throw new Error('Invitation already accepted');
      }

      if (new Date(invitation.expires_at) < new Date()) {
        throw new Error('Invitation has expired');
      }

      // Accept the invitation
      const { error: updateError } = await supabase
        .from('invitations')
        .update({ accepted_at: new Date().toISOString() })
        .eq('id', invitation.id);

      if (updateError) throw updateError;

      return invitation;
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: 'Failed to accept invitation. Please try again.',
        variant: 'destructive',
      });
      console.error('Invitation accept error:', error);
    }
  });
}