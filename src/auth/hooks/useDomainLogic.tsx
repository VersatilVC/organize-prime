import { useState } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

const PERSONAL_DOMAINS = [
  'gmail.com', 'outlook.com', 'yahoo.com', 'hotmail.com', 
  'icloud.com', 'aol.com', 'protonmail.com', 'mail.com'
];

export function useDomainLogic() {
  const [showOrgSetup, setShowOrgSetup] = useState(false);
  const [setupUser, setSetupUser] = useState<User | null>(null);
  const { toast } = useToast();

  const isPersonalDomain = (email: string): boolean => {
    const domain = email.split('@')[1]?.toLowerCase();
    return PERSONAL_DOMAINS.includes(domain);
  };

  const handlePostAuthSetup = async (user: User) => {
    if (!user.email) return;

    const domain = user.email.split('@')[1]?.toLowerCase();
    
    if (isPersonalDomain(user.email)) {
      // Personal domain - show organization setup modal
      setSetupUser(user);
      setShowOrgSetup(true);
    } else {
      // Business domain - check/create organization
      await handleBusinessDomain(user, domain);
    }
  };

  const handleBusinessDomain = async (user: User, domain: string) => {
    try {
      // Check if organization exists for this domain
      const { data: existingOrg } = await supabase
        .from('organizations')
        .select('id, name')
        .eq('slug', domain.replace(/\./g, '-'))
        .maybeSingle();

      if (!existingOrg) {
        // First user from this domain - create organization and make them admin
        await createOrganizationAndMembership(user, domain, 'admin');
        toast({
          title: "Welcome!",
          description: `Organization created for ${domain}. You are now an admin.`,
        });
      } else {
        // Organization exists - check for pending invitation
        const { data: invitation } = await supabase
          .from('invitations')
          .select('id, role, token')
          .eq('email', user.email)
          .eq('organization_id', existingOrg.id)
          .is('accepted_at', null)
          .gt('expires_at', new Date().toISOString())
          .maybeSingle();

        if (invitation) {
          // Accept the invitation
          await supabase.rpc('accept_invitation', { p_token: invitation.token });
          toast({
            title: "Welcome to the team!",
            description: `You've joined ${existingOrg.name} as ${invitation.role}.`,
          });
        } else {
          // Check if already a member
          const { data: membership } = await supabase
            .from('memberships')
            .select('role')
            .eq('user_id', user.id)
            .eq('organization_id', existingOrg.id)
            .eq('status', 'active')
            .maybeSingle();

          if (!membership) {
            // No invitation and not a member - show contact admin message
            toast({
              title: "Organization Access Required",
              description: `Please contact your ${existingOrg.name} administrator for access.`,
              variant: "destructive"
            });
          }
        }
      }
    } catch (error) {
      console.error('Error handling business domain:', error);
      toast({
        title: "Setup Error",
        description: "There was an issue setting up your organization access.",
        variant: "destructive"
      });
    }
  };

  const createOrganizationAndMembership = async (
    user: User, 
    domain: string, 
    role: 'admin' | 'user' = 'user'
  ) => {
    try {
      // Create organization
      const orgName = domain.split('.')[0].charAt(0).toUpperCase() + 
                     domain.split('.')[0].slice(1);

      const { data: org, error: orgError } = await supabase
        .from('organizations')
        .insert({
          name: orgName,
          slug: domain.replace(/\./g, '-'),
          subscription_plan: 'free',
          settings: {}
        })
        .select()
        .single();

      if (orgError) throw orgError;

      // Create profile if it doesn't exist
      const { error: profileError } = await supabase
        .from('profiles')
        .upsert({
          id: user.id,
          username: user.email?.split('@')[0] || 'user',
          full_name: user.user_metadata?.full_name || null,
          avatar_url: user.user_metadata?.avatar_url || null,
          first_login_completed: true
        });

      if (profileError) throw profileError;

      // Create membership
      const { error: membershipError } = await supabase
        .from('memberships')
        .insert({
          user_id: user.id,
          organization_id: org.id,
          role: role,
          status: 'active',
          joined_at: new Date().toISOString()
        });

      if (membershipError) throw membershipError;

      return org;
    } catch (error) {
      console.error('Error creating organization and membership:', error);
      throw error;
    }
  };

  const createPersonalOrganization = async (orgName: string) => {
    if (!setupUser) return;

    try {
      await createOrganizationAndMembership(setupUser, setupUser.email!, 'admin');
      
      // Update the organization name
      const { error } = await supabase
        .from('organizations')
        .update({ name: orgName })
        .eq('slug', setupUser.email!.split('@')[1].replace(/\./g, '-'));

      if (error) throw error;

      setShowOrgSetup(false);
      setSetupUser(null);
      
      toast({
        title: "Organization Created",
        description: `${orgName} has been created successfully.`,
      });

      // Refresh the page to update contexts
      window.location.reload();
    } catch (error) {
      console.error('Error creating personal organization:', error);
      toast({
        title: "Creation Failed",
        description: "Failed to create organization. Please try again.",
        variant: "destructive"
      });
    }
  };

  return {
    showOrgSetup,
    setupUser,
    setShowOrgSetup,
    handlePostAuthSetup,
    createPersonalOrganization,
    isPersonalDomain,
    // Backward compatibility
    showSetup: showOrgSetup,
    onSetupSuccess: () => { setShowOrgSetup(false); window.location.reload(); },
    onSetupOpenChange: setShowOrgSetup
  };
}