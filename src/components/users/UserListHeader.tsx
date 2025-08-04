import React, { memo } from 'react';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Plus, ChevronDown } from 'lucide-react';

interface UserListHeaderProps {
  totalUsers: number;
  selectedCount: number;
  onInviteClick: () => void;
  onBulkAction: (action: string) => void;
  canInviteUsers: boolean;
}

export const UserListHeader = memo(({
  totalUsers,
  selectedCount,
  onInviteClick,
  onBulkAction,
  canInviteUsers
}: UserListHeaderProps) => (
  <div className="flex items-center justify-between mb-6">
    <div>
      <h1 className="text-2xl font-bold tracking-tight">Users</h1>
      <p className="text-muted-foreground">
        {totalUsers} {totalUsers === 1 ? 'user' : 'users'} total
        {selectedCount > 0 && ` • ${selectedCount} selected`}
      </p>
    </div>
    
    <div className="flex items-center gap-2">
      {selectedCount > 0 && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm">
              Bulk Actions <ChevronDown className="ml-2 h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onBulkAction('activate')}>
              Activate Users
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onBulkAction('deactivate')}>
              Deactivate Users
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem 
              onClick={() => onBulkAction('remove')}
              className="text-destructive focus:text-destructive"
            >
              Remove Users
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
      
      {canInviteUsers && (
        <Button onClick={onInviteClick} size="sm">
          <Plus className="mr-2 h-4 w-4" />
          Invite User
        </Button>
      )}
    </div>
  </div>
));

UserListHeader.displayName = 'UserListHeader';