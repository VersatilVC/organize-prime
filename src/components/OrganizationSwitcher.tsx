import React, { useState, useCallback, useMemo } from 'react';
import { useOrganization } from '@/contexts/OrganizationContext';
import { useOptimizedUserRole } from '@/hooks/database/useOptimizedUserRole';
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
  // All hooks at the top - no conditional calls
  const { currentOrganization, organizations, loading: orgLoading, setCurrentOrganization } = useOrganization();
  const { role, loading: roleLoading } = useOptimizedUserRole();
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);

  // Memoize derived values to prevent unnecessary recalculations
  const canInviteUsers = useMemo(() => {
    return role === 'admin' || role === 'super_admin';
  }, [role]);

  const handleOrganizationSwitch = useCallback((orgId: string) => {
    const selectedOrg = organizations.find(org => org.id === orgId);
    if (selectedOrg) {
      setCurrentOrganization(selectedOrg);
    }
  }, [organizations, setCurrentOrganization]);

  const handleInviteClick = useCallback(() => {
    setInviteDialogOpen(true);
  }, []);

  // Show loading state if any data is still loading or missing
  if (orgLoading || roleLoading || !currentOrganization) {
    return (
      <div className="flex items-center gap-2 px-2">
        <div className="h-6 w-6 rounded bg-muted animate-pulse" />
        <div className="h-4 w-20 bg-muted animate-pulse rounded" />
      </div>
    );
  }

  return (
    <>
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
              <DropdownMenuItem onClick={handleInviteClick}>
                <Icons.userPlus className="h-4 w-4 mr-2" />
                Invite Users
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
      
      <InviteUserDialog 
        open={inviteDialogOpen} 
        onOpenChange={setInviteDialogOpen} 
      />
    </>
  );
}