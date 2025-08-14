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

  return null; // Component removed from header
}