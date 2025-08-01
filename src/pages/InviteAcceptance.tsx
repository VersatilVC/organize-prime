import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Icons } from '@/components/ui/icons';

interface InvitationData {
  id: string;
  email: string;
  role: string;
  message: string | null;
  expires_at: string;
  accepted_at: string | null;
  organization_id: string;
  organization_name: string;
  invited_by_name: string;
}

export default function InviteAcceptance() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [invitation, setInvitation] = useState<InvitationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);

  useEffect(() => {
    if (token) {
      fetchInvitation();
      checkCurrentUser();
    }
  }, [token]);

  const checkCurrentUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setCurrentUser(user);
  };

  const fetchInvitation = async () => {
    try {
      console.log('🔍 Fetching invitation with token:', token);
      
      if (!token) {
        console.error('❌ No token provided');
        setError('Invalid invitation link');
        return;
      }

      // Fetch invitation details first
      const { data: invitationData, error: invitationError } = await supabase
        .from('invitations')
        .select(`
          id,
          email,
          role,
          message,
          expires_at,
          accepted_at,
          organization_id,
          invited_by
        `)
        .eq('token', token)
        .maybeSingle();

      console.log('📋 Invitation query result:', { invitationData, invitationError });

      if (invitationError) {
        console.error('❌ Invitation fetch error:', invitationError);
        setError(`Invitation lookup failed: ${invitationError.message}`);
        return;
      }

      if (!invitationData) {
        console.error('❌ No invitation data found for token');
        setError('Invitation not found');
        return;
      }

      // Check if invitation is expired
      const expirationDate = new Date(invitationData.expires_at);
      const now = new Date();
      if (expirationDate < now) {
        console.error('❌ Invitation expired:', { expirationDate, now });
        setError('This invitation has expired');
        return;
      }

      // Check if invitation is already accepted
      if (invitationData.accepted_at) {
        console.error('❌ Invitation already accepted:', invitationData.accepted_at);
        setError('This invitation has already been accepted');
        return;
      }

      console.log('✅ Invitation data processed successfully');

      // Fetch organization and inviter details with graceful fallbacks
      let organizationName = 'Unknown Organization';
      let inviterName = 'Unknown User';

      try {
        const { data: orgData, error: orgError } = await supabase
          .from('organizations')
          .select('name')
          .eq('id', invitationData.organization_id)
          .maybeSingle();
        
        if (orgError) {
          console.warn('⚠️ Could not fetch organization name:', orgError);
        } else if (orgData) {
          organizationName = orgData.name;
        }
      } catch (error) {
        console.warn('⚠️ Organization fetch failed:', error);
      }

      try {
        const { data: inviterData, error: inviterError } = await supabase
          .from('profiles')
          .select('full_name, username')
          .eq('id', invitationData.invited_by)
          .maybeSingle();
        
        if (inviterError) {
          console.warn('⚠️ Could not fetch inviter name:', inviterError);
        } else if (inviterData) {
          inviterName = inviterData.full_name || inviterData.username || 'Unknown User';
        }
      } catch (error) {
        console.warn('⚠️ Inviter fetch failed:', error);
      }

      setInvitation({
        ...invitationData,
        organization_name: organizationName,
        invited_by_name: inviterName
      });

    } catch (error) {
      console.error('💥 Unexpected error fetching invitation:', error);
      setError('Failed to load invitation. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptInvitation = async () => {
    if (!invitation || !currentUser) return;

    setAccepting(true);
    try {
      // Check if user already has membership in this organization
      const { data: existingMembership } = await supabase
        .from('memberships')
        .select('id, status')
        .eq('user_id', currentUser.id)
        .eq('organization_id', invitation.organization_id)
        .single();

      if (existingMembership) {
        if (existingMembership.status === 'active') {
          throw new Error('You are already a member of this organization');
        } else {
          // Reactivate existing membership
          const { error: updateError } = await supabase
            .from('memberships')
            .update({
              status: 'active',
              role: invitation.role,
              joined_at: new Date().toISOString()
            })
            .eq('id', existingMembership.id);

          if (updateError) throw updateError;
        }
      } else {
        // Create new membership
        const { error: membershipError } = await supabase
          .from('memberships')
          .insert({
            user_id: currentUser.id,
            organization_id: invitation.organization_id,
            role: invitation.role,
            status: 'active',
            joined_at: new Date().toISOString()
          });

        if (membershipError) throw membershipError;
      }

      // Mark invitation as accepted
      const { error: invitationError } = await supabase
        .from('invitations')
        .update({
          accepted_at: new Date().toISOString()
        })
        .eq('id', invitation.id);

      if (invitationError) throw invitationError;

      toast({
        title: "Welcome to the team!",
        description: `You've successfully joined ${invitation.organization_name}`,
      });

      // Redirect to dashboard
      navigate('/dashboard');

    } catch (error: any) {
      console.error('Error accepting invitation:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to accept invitation",
        variant: "destructive",
      });
    } finally {
      setAccepting(false);
    }
  };

  const handleSignIn = () => {
    // Store invitation token in session storage to redirect back after sign in
    if (token) {
      sessionStorage.setItem('invitation_token', token);
    }
    navigate('/auth');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading invitation...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
              <Icons.xCircle className="h-6 w-6 text-destructive" />
            </div>
            <CardTitle>Invalid Invitation</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              onClick={() => navigate('/')}
              className="w-full"
            >
              Go to Homepage
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!invitation) {
    return null;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <Icons.mail className="h-6 w-6 text-primary" />
          </div>
          <CardTitle>You're invited to join</CardTitle>
          <CardDescription className="text-xl font-semibold text-foreground">
            {invitation.organization_name}
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Invited by:</span>
              <span className="text-sm font-medium">{invitation.invited_by_name}</span>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Role:</span>
              <Badge variant={invitation.role === 'admin' ? 'default' : 'secondary'}>
                {invitation.role === 'admin' ? 'Company Admin' : 'User'}
              </Badge>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Email:</span>
              <span className="text-sm font-medium">{invitation.email}</span>
            </div>

            {invitation.message && (
              <div className="space-y-2">
                <span className="text-sm text-muted-foreground">Personal message:</span>
                <div className="p-3 bg-muted rounded-lg">
                  <p className="text-sm">{invitation.message}</p>
                </div>
              </div>
            )}
          </div>

          <div className="space-y-3">
            {currentUser ? (
              <div className="space-y-3">
                <div className="p-3 bg-muted rounded-lg">
                  <p className="text-sm text-center">
                    Signed in as <span className="font-medium">{currentUser.email}</span>
                  </p>
                </div>
                <Button
                  onClick={handleAcceptInvitation}
                  disabled={accepting}
                  className="w-full"
                  size="lg"
                >
                  {accepting ? (
                    <>
                      <Icons.clock className="h-4 w-4 mr-2 animate-spin" />
                      Accepting...
                    </>
                  ) : (
                    <>
                      <Icons.checkCircle className="h-4 w-4 mr-2" />
                      Accept Invitation
                    </>
                  )}
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                <Button
                  onClick={handleSignIn}
                  className="w-full"
                  size="lg"
                >
                  <Icons.logOut className="h-4 w-4 mr-2" />
                  Sign In to Accept
                </Button>
                <div className="text-center">
                  <p className="text-xs text-muted-foreground">
                    Don't have an account?{' '}
                    <button
                      onClick={handleSignIn}
                      className="text-primary hover:underline"
                    >
                      Sign up here
                    </button>
                  </p>
                </div>
              </div>
            )}
          </div>

          <div className="text-center pt-4 border-t">
            <p className="text-xs text-muted-foreground">
              This invitation expires on{' '}
              {new Date(invitation.expires_at).toLocaleDateString()}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}