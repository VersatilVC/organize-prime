import React, { useState } from 'react';
import { useOrganizationData, useOrganizationMethods } from '@/contexts/OrganizationContext';
import { useUserRole } from '@/hooks/useUserRole';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Icons } from '@/components/ui/icons';
import { InviteUserDialog } from './InviteUserDialog';
import { logger } from '@/lib/secure-logger';

export function OrganizationSwitcher() {
  const { currentOrganization, organizations, loading } = useOrganizationData();
  const { setCurrentOrganization } = useOrganizationMethods();
  const { role } = useUserRole();
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);

  if (loading || !currentOrganization) {
    return (
      <div className="flex items-center gap-2 px-2">
        <div className="h-6 w-6 rounded bg-muted animate-pulse" />
        <div className="h-4 w-20 bg-muted animate-pulse rounded" />
      </div>
    );
  }

  const canInviteUsers = role === 'admin' || role === 'super_admin';
  
  logger.debug('OrganizationSwitcher state', {
    component: 'OrganizationSwitcher',
    action: 'state_check'
  });

  const handleOrganizationSwitch = (orgId: string) => {
    const selectedOrg = organizations.find(org => org.id === orgId);
    if (selectedOrg) {
      setCurrentOrganization(selectedOrg);
      logger.debug('Organization switched', {
        component: 'OrganizationSwitcher',
        action: 'switch_organization'
      });
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="hidden sm:flex">
          <Avatar className="h-4 w-4 mr-2">
            <AvatarImage src={currentOrganization.logo_url || undefined} />
            <AvatarFallback className="text-xs">
              {currentOrganization.name.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <span className="max-w-32 truncate">{currentOrganization.name}</span>
          <Icons.chevronDown className="h-3 w-3 ml-1" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="start">
        <DropdownMenuLabel>Switch Organization</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {organizations.map((org) => (
          <DropdownMenuItem
            key={org.id}
            onClick={() => handleOrganizationSwitch(org.id)}
            className={currentOrganization.id === org.id ? 'bg-accent' : ''}
          >
            <Avatar className="h-6 w-6 mr-2">
              <AvatarImage src={org.logo_url || undefined} />
              <AvatarFallback className="text-xs">
                {org.name.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex flex-col">
              <span className="text-sm font-medium">{org.name}</span>
              <span className="text-xs text-muted-foreground">Organization</span>
            </div>
            {currentOrganization.id === org.id && (
              <Icons.check className="h-4 w-4 ml-auto" />
            )}
          </DropdownMenuItem>
        ))}
        {canInviteUsers && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => setInviteDialogOpen(true)}>
              <Icons.userPlus className="h-4 w-4 mr-2" />
              Invite Users
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
      <InviteUserDialog 
        open={inviteDialogOpen} 
        onOpenChange={setInviteDialogOpen} 
      />
    </DropdownMenu>
  );
}