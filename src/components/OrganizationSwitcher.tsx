import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { useOrganization } from '@/contexts/OrganizationContext';
import { useOptimizedUserRole } from '@/hooks/database/useOptimizedUserRole';
import { useImpersonation } from '@/contexts/ImpersonationContext';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Icons } from '@/components/ui/icons';
import { InviteUserDialog } from './InviteUserDialog';
import { getAllUsersInOrganization, toImpersonatedOrganization, toImpersonatedUser, UserWithMembership } from '@/services/superAdminService';

export function OrganizationSwitcher() {
  // All hooks at the top - no conditional calls
  const { currentOrganization, organizations, allOrganizations, loading: orgLoading, setCurrentOrganization, refreshAllOrganizations, getEffectiveOrganization } = useOrganization();
  const { role, isSuperAdmin, loading: roleLoading } = useOptimizedUserRole();
  const { impersonationState, startImpersonation, stopImpersonation } = useImpersonation();
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [selectedOrgForImpersonation, setSelectedOrgForImpersonation] = useState<string | null>(null);
  const [usersInSelectedOrg, setUsersInSelectedOrg] = useState<UserWithMembership[]>([]);

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

  // Load all organizations when super admin opens dropdown
  useEffect(() => {
    if (isSuperAdmin && allOrganizations.length === 0) {
      console.log('Loading all organizations for super admin...');
      refreshAllOrganizations();
    }
  }, [isSuperAdmin, allOrganizations.length, refreshAllOrganizations]);

  // Debug logging
  useEffect(() => {
    console.log('OrganizationSwitcher Debug:', {
      isSuperAdmin,
      allOrganizationsCount: allOrganizations.length,
      currentOrganization: currentOrganization?.name,
      role,
    });
  }, [isSuperAdmin, allOrganizations.length, currentOrganization, role]);

  // Load users when organization is selected for impersonation
  useEffect(() => {
    if (selectedOrgForImpersonation) {
      const loadUsers = async () => {
        try {
          const users = await getAllUsersInOrganization(selectedOrgForImpersonation);
          setUsersInSelectedOrg(users);
        } catch (error) {
          console.error('Failed to load users for organization:', error);
          setUsersInSelectedOrg([]);
        }
      };
      loadUsers();
    } else {
      setUsersInSelectedOrg([]);
    }
  }, [selectedOrgForImpersonation]);

  const handleStartImpersonation = useCallback(async (orgId: string, userId?: string) => {
    console.log('handleStartImpersonation called:', { orgId, userId });
    const org = allOrganizations.find(o => o.id === orgId);
    if (!org) {
      console.error('Organization not found:', orgId);
      return;
    }

    if (userId) {
      // User impersonation - impersonate both user and organization
      const user = usersInSelectedOrg.find(u => u.id === userId);
      if (!user) {
        console.error('User not found:', userId);
        return;
      }

      console.log('Starting user impersonation:', { org: org.name, user: user.full_name || user.username });
      await startImpersonation(
        toImpersonatedOrganization(org),
        toImpersonatedUser(user)
      );
    } else {
      // Organization-only impersonation - impersonate organization without specific user
      console.log('Starting organization impersonation:', org.name);
      await startImpersonation(
        toImpersonatedOrganization(org)
      );
    }
    
    setSelectedOrgForImpersonation(null);
  }, [allOrganizations, usersInSelectedOrg, startImpersonation]);

  const handleStopImpersonation = useCallback(async () => {
    await stopImpersonation();
    setSelectedOrgForImpersonation(null);
  }, [stopImpersonation]);

  // Get the effective organization (either current or impersonated)
  const effectiveOrganization = getEffectiveOrganization(impersonationState);

  // Show loading state if any data is still loading or missing
  if (orgLoading || roleLoading || !effectiveOrganization) {
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
          <Button 
            variant="outline" 
            size="sm" 
            className={`hidden sm:flex ${impersonationState.isImpersonating ? 'border-orange-500 bg-orange-50 text-orange-700' : ''}`}
          >
            <Avatar className="h-4 w-4 mr-2">
              <AvatarImage src={effectiveOrganization.logo_url || undefined} />
              <AvatarFallback className="text-xs">
                {effectiveOrganization.name.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <span className="max-w-32 truncate">
              {impersonationState.isImpersonating && impersonationState.impersonatedUser 
                ? `${effectiveOrganization.name} (${impersonationState.impersonatedUser.full_name || impersonationState.impersonatedUser.username})`
                : effectiveOrganization.name
              }
            </span>
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
              className={effectiveOrganization.id === org.id ? 'bg-accent' : ''}
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
              {effectiveOrganization.id === org.id && (
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
          
          {/* Super Admin Tools */}
          {isSuperAdmin && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuLabel className="text-orange-600 font-semibold">
                Super Admin Tools ({allOrganizations.length} orgs)
              </DropdownMenuLabel>
              
              {/* Show reset option if currently impersonating */}
              {impersonationState.isImpersonating && (
                <DropdownMenuItem 
                  onClick={handleStopImpersonation}
                  className="text-orange-600 focus:text-orange-700"
                >
                  <Icons.refresh className="h-4 w-4 mr-2" />
                  Exit Impersonation Mode
                </DropdownMenuItem>
              )}
              
              {/* Manual refresh option */}
              <DropdownMenuItem 
                onClick={() => refreshAllOrganizations()}
                className="text-blue-600"
              >
                <Icons.refresh className="h-4 w-4 mr-2" />
                Refresh Organizations ({allOrganizations.length})
              </DropdownMenuItem>
              
              {/* Organization Selection */}
              <DropdownMenuSub>
                <DropdownMenuSubTrigger>
                  <Icons.building className="h-4 w-4 mr-2" />
                  View as Organization
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent className="w-56">
                  {allOrganizations.length === 0 && (
                    <DropdownMenuItem disabled>
                      <Icons.loader className="h-4 w-4 mr-2" />
                      Loading organizations...
                    </DropdownMenuItem>
                  )}
                  {allOrganizations.map((org) => (
                    <DropdownMenuItem
                      key={org.id}
                      onClick={() => handleStartImpersonation(org.id)}
                    >
                      <Avatar className="h-4 w-4 mr-2">
                        <AvatarImage src={org.logo_url || undefined} />
                        <AvatarFallback className="text-xs">
                          {org.name.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex flex-col">
                        <span className="text-sm font-medium">{org.name}</span>
                        <span className="text-xs text-muted-foreground">Switch to this organization</span>
                      </div>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuSubContent>
              </DropdownMenuSub>
              
              {/* User Impersonation */}
              <DropdownMenuSub>
                <DropdownMenuSubTrigger>
                  <Icons.user className="h-4 w-4 mr-2" />
                  Impersonate User
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent className="w-56">
                  {allOrganizations.map((org) => (
                    <DropdownMenuSub key={org.id}>
                      <DropdownMenuSubTrigger>
                        <Avatar className="h-4 w-4 mr-2">
                          <AvatarImage src={org.logo_url || undefined} />
                          <AvatarFallback className="text-xs">
                            {org.name.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        {org.name}
                      </DropdownMenuSubTrigger>
                      <DropdownMenuSubContent className="w-48">
                        {selectedOrgForImpersonation === org.id ? (
                          usersInSelectedOrg.map((user) => (
                            <DropdownMenuItem
                              key={user.id}
                              onClick={() => handleStartImpersonation(org.id, user.id)}
                            >
                              <Avatar className="h-4 w-4 mr-2">
                                <AvatarImage src={user.avatar_url || undefined} />
                                <AvatarFallback className="text-xs">
                                  {(user.full_name || user.username || 'U').charAt(0).toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                              <div className="flex flex-col">
                                <span className="text-sm">{user.full_name || user.username}</span>
                                <span className="text-xs text-muted-foreground capitalize">{user.role}</span>
                              </div>
                            </DropdownMenuItem>
                          ))
                        ) : (
                          <DropdownMenuItem
                            onClick={() => setSelectedOrgForImpersonation(org.id)}
                          >
                            <Icons.loader className="h-4 w-4 mr-2" />
                            Load users...
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuSubContent>
                    </DropdownMenuSub>
                  ))}
                </DropdownMenuSubContent>
              </DropdownMenuSub>
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