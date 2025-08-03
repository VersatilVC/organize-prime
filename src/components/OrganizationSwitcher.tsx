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

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button 
            variant="ghost" 
            className="flex items-center gap-2 px-2 py-1 h-auto max-w-48 justify-start"
          >
            <Avatar className="h-6 w-6">
              <AvatarImage src={currentOrganization.logo_url || undefined} />
              <AvatarFallback className="text-xs">
                {currentOrganization.name.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <span className="truncate text-sm font-medium">
              {currentOrganization.name}
            </span>
            <Icons.chevronDown className="ml-auto h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </DropdownMenuTrigger>
        
        <DropdownMenuContent className="w-64" align="start">
          <DropdownMenuLabel className="font-normal">
            <div className="flex flex-col space-y-1">
              <p className="text-sm font-medium leading-none">
                {currentOrganization.name}
              </p>
              <p className="text-xs text-muted-foreground">
                Current organization
              </p>
            </div>
          </DropdownMenuLabel>
          
          {organizations.length > 1 && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuLabel className="text-xs text-muted-foreground uppercase tracking-wider">
                Switch Organization
              </DropdownMenuLabel>
              {organizations
                .filter(org => org.id !== currentOrganization.id)
                .map((org) => (
                  <DropdownMenuItem
                    key={org.id}
                    onClick={() => setCurrentOrganization(org)}
                    className="flex items-center gap-2"
                  >
                    <Avatar className="h-4 w-4">
                      <AvatarImage src={org.logo_url || undefined} />
                      <AvatarFallback className="text-xs">
                        {org.name.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <span className="truncate">{org.name}</span>
                  </DropdownMenuItem>
                ))}
            </>
          )}
          
          {canInviteUsers && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setInviteDialogOpen(true)}>
                <Icons.mail className="mr-2 h-4 w-4" />
                Invite User
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <InviteUserDialog
        open={inviteDialogOpen}
        onOpenChange={setInviteDialogOpen}
        onInviteSent={() => {
          // Optional: Add any additional logic after invitation is sent
        }}
      />
    </>
  );
}