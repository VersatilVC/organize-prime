import React, { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useOrganization } from '@/contexts/OrganizationContext';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Icons } from '@/components/ui/icons';

interface InviteUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onInviteSent?: () => void;
  organizationOverride?: {
    id: string;
    name: string;
    slug: string;
    logo_url?: string | null;
    is_active: boolean;
    created_at: string;
    updated_at?: string;
  };
}

export const InviteUserDialog = React.memo(({ open, onOpenChange, onInviteSent, organizationOverride }: InviteUserDialogProps) => {
  const { user } = useAuth();
  const { currentOrganization } = useOrganization();
  const { toast } = useToast();
  
  // Memoize target organization to prevent unnecessary recalculations
  const targetOrganization = React.useMemo(() => 
    organizationOverride || currentOrganization, 
    [organizationOverride, currentOrganization]
  );
  
  const [loading, setLoading] = useState(false);
  const [invitationLink, setInvitationLink] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    email: '',
    role: 'user',
    department: '',
    position: '',
    message: ''
  });

  // Memoize token generation function
  const generateToken = React.useCallback(() => {
    return Array.from(crypto.getRandomValues(new Uint8Array(32)))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetOrganization) {
      toast({
        title: "Error",
        description: "No organization selected",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.email)) {
        throw new Error('Please enter a valid email address');
      }

      // Check if user is already a member
      const { data: existingMembership } = await supabase
        .from('memberships')
        .select('id')
        .eq('organization_id', targetOrganization.id)
        .eq('user_id', formData.email) // This would need to be changed to check by email
        .eq('status', 'active')
        .maybeSingle();

      // Check if there's already a pending invitation
      const { data: existingInvitation } = await supabase
        .from('invitations')
        .select('id')
        .eq('email', formData.email)
        .eq('organization_id', targetOrganization.id)
        .is('accepted_at', null)
        .gt('expires_at', new Date().toISOString())
        .maybeSingle();

      if (existingInvitation) {
        throw new Error('An invitation has already been sent to this email address');
      }

      // Generate invitation token and expiry date
      const token = generateToken();
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7); // 7 days from now

      if (!user) throw new Error('User not authenticated');

      // Get current user's profile for the inviter name
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name, username')
        .eq('id', user.id)
        .maybeSingle();

      const inviterName = profile?.full_name || profile?.username || 'Someone';

      // Create invitation record
      const { data: invitation, error } = await supabase
        .from('invitations')
        .insert({
          email: formData.email,
          role: formData.role,
          token,
          message: formData.message || null,
          expires_at: expiresAt.toISOString(),
          invited_by: user.id,
          organization_id: targetOrganization.id
        })
        .select()
        .maybeSingle();

      if (error) throw error;

      // Send invitation email via edge function
      try {
        const { data: emailResponse, error: emailError } = await supabase.functions.invoke('send-invitation-email', {
          body: {
            email: formData.email,
            inviterName,
            organizationName: targetOrganization.name,
            role: formData.role,
            message: formData.message,
            inviteToken: token,
            department: formData.department,
            position: formData.position
          }
        });

        if (emailError) {
          console.error('Email sending error:', emailError);
          // Don't throw here - the invitation was created, just email failed
          toast({
            title: "Invitation Created",
            description: `Invitation created but email failed to send. You can copy the link below to send manually.`,
            variant: "default",
          });
        } else {
          toast({
            title: "Invitation Sent",
            description: `Invitation email sent to ${formData.email}`,
          });
        }
      } catch (emailError) {
        console.error('Email function error:', emailError);
        toast({
          title: "Invitation Created",
          description: `Invitation created but email failed to send. You can copy the link below to send manually.`,
          variant: "default",
        });
      }

      // Generate invitation link for copying
      const inviteLink = `${window.location.origin}/invite/${token}`;
      setInvitationLink(inviteLink);

      onInviteSent?.();
    } catch (error: any) {
      console.error('Error sending invitation:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to send invitation",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };


  // Memoize form reset data to prevent object recreation
  const initialFormData = React.useMemo(() => ({
    email: '',
    role: 'user',
    department: '',
    position: '',
    message: ''
  }), []);

  // Memoize handlers to prevent unnecessary re-renders
  const handleClose = React.useCallback(() => {
    setFormData(initialFormData);
    setInvitationLink(null);
    onOpenChange(false);
  }, [initialFormData, onOpenChange]);

  const handleCopyLink = React.useCallback(async () => {
    if (invitationLink) {
      try {
        await navigator.clipboard.writeText(invitationLink);
        toast({
          title: "Copied",
          description: "Invitation link copied to clipboard",
        });
      } catch (err) {
        toast({
          title: "Error",
          description: "Failed to copy link to clipboard",
          variant: "destructive",
        });
      }
    }
  }, [invitationLink, toast]);

  if (invitationLink) {
    return (
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Invitation Sent Successfully</DialogTitle>
            <DialogDescription>
              The invitation has been created. You can copy the link below to send it manually.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label>Invitation Link</Label>
              <div className="flex items-center gap-2 mt-1">
                <Input
                  value={invitationLink}
                  readOnly
                  className="flex-1"
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCopyLink}
                  aria-label="Copy invitation link to clipboard"
                  title="Copy invitation link"
                >
                  <Icons.copy className="h-4 w-4" aria-hidden="true" />
                </Button>
              </div>
            </div>
            
            <div className="bg-muted p-3 rounded-lg">
              <p className="text-sm text-muted-foreground">
                The invitation will expire in 7 days. The invited user can access this link to join your organization.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button onClick={handleClose}>Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Invite User to {targetOrganization?.name}</DialogTitle>
          <DialogDescription>
            Send an invitation to join your organization. The user will receive a secure link to accept the invitation.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <div>
            <Label htmlFor="email">Email Address *</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
              placeholder="user@example.com"
              required
              aria-describedby="email-help"
              aria-invalid={formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)}
            />
            <div id="email-help" className="sr-only">
              Enter a valid email address for the person you want to invite
            </div>
          </div>

          <div>
            <Label htmlFor="role">Role *</Label>
            <Select
              value={formData.role}
              onValueChange={(value) => setFormData(prev => ({ ...prev, role: value }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="user">User</SelectItem>
                <SelectItem value="admin">Company Admin</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="department">Department</Label>
            <Input
              id="department"
              value={formData.department}
              onChange={(e) => setFormData(prev => ({ ...prev, department: e.target.value }))}
              placeholder="Engineering, Marketing, etc."
            />
          </div>

          <div>
            <Label htmlFor="position">Position/Title</Label>
            <Input
              id="position"
              value={formData.position}
              onChange={(e) => setFormData(prev => ({ ...prev, position: e.target.value }))}
              placeholder="Software Engineer, Manager, etc."
            />
          </div>

          <div>
            <Label htmlFor="message">Personal Message</Label>
            <Textarea
              id="message"
              value={formData.message}
              onChange={(e) => setFormData(prev => ({ ...prev, message: e.target.value }))}
              placeholder="Add a personal message to the invitation..."
              rows={3}
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={loading}
              aria-describedby={loading ? "sending-status" : undefined}
            >
              {loading ? (
                <>
                  <Icons.clock className="h-4 w-4 mr-2 animate-spin" aria-hidden="true" />
                  <span id="sending-status">Sending invitation...</span>
                </>
              ) : (
                <>
                  <Icons.mail className="h-4 w-4 mr-2" aria-hidden="true" />
                  Send Invitation
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
});

InviteUserDialog.displayName = 'InviteUserDialog';