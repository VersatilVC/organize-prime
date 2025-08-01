import { useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useOrganization } from '@/contexts/OrganizationContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export function useOrganizationCreation() {
  const { user } = useAuth();
  const { organizations, loading: orgLoading } = useOrganization();
  const { toast } = useToast();

  useEffect(() => {
    if (!user || !user.email || orgLoading) return;

    // Only proceed if user has no organizations
    if (organizations.length > 0) return;

    const handleMissingOrganization = async () => {
      const domain = user.email!.split('@')[1];
      const businessDomains = ['versatil.vc', 'verss.ai'];

      if (businessDomains.includes(domain)) {
        console.log(`User ${user.email} has no organizations, checking if we need to create one for domain ${domain}`);

        // Check if organization exists for this domain
        const { data: existingOrg } = await supabase
          .from('organizations')
          .select('id, name')
          .eq('slug', domain)
          .maybeSingle();

        if (!existingOrg) {
          // Create organization for this domain
          const orgName = domain === 'versatil.vc' ? 'Versatil VC' : 
                          domain === 'verss.ai' ? 'Verss AI' : 
                          domain.split('.')[0].charAt(0).toUpperCase() + domain.split('.')[0].slice(1);

          console.log(`Creating organization ${orgName} for domain ${domain}`);

          const { data: newOrg, error: orgError } = await supabase
            .from('organizations')
            .insert({
              name: orgName,
              slug: domain,
              is_active: true,
            })
            .select()
            .single();

          if (newOrg && !orgError) {
            // Create admin membership
            const { error: membershipError } = await supabase.from('memberships').insert({
              user_id: user.id,
              organization_id: newOrg.id,
              role: 'admin',
              status: 'active',
              joined_at: new Date().toISOString(),
            });

            if (!membershipError) {
              console.log(`Successfully created organization ${orgName} and admin membership for ${user.email}`);
              toast({
                title: "Organization Created!",
                description: `Welcome to ${orgName}! You're now the Company Admin.`,
              });
              
              // Refresh organizations
              window.location.reload();
            } else {
              console.error('Error creating membership:', membershipError);
            }
          } else {
            console.error('Error creating organization:', orgError);
          }
        } else {
          // Organization exists but user isn't a member - check for invitation
          const { data: invitation } = await supabase
            .from('invitations')
            .select('id, role, organization_id')
            .eq('email', user.email)
            .eq('organization_id', existingOrg.id)
            .is('accepted_at', null)
            .maybeSingle();

          if (invitation) {
            console.log(`Found pending invitation for ${user.email} to join ${existingOrg.name}`);
            // Accept invitation
            await supabase.from('invitations').update({
              accepted_at: new Date().toISOString(),
            }).eq('id', invitation.id);

            await supabase.from('memberships').insert({
              user_id: user.id,
              organization_id: invitation.organization_id,
              role: invitation.role,
              status: 'active',
              joined_at: new Date().toISOString(),
            });

            toast({
              title: "Welcome!",
              description: `You've joined ${existingOrg.name}`,
            });

            // Refresh organizations
            window.location.reload();
          } else {
            console.log(`User ${user.email} needs to contact admin for ${existingOrg.name}`);
            toast({
              title: "Contact Admin",
              description: `Please contact your company admin at ${existingOrg.name} for an invitation.`,
              variant: "default",
            });
          }
        }
      }
    };

    // Add a small delay to ensure all initial loading is complete
    const timer = setTimeout(handleMissingOrganization, 1000);
    return () => clearTimeout(timer);
  }, [user, organizations, orgLoading, toast]);
}