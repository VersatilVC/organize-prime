import React, { memo } from 'react';
import { Table, TableBody, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { UserTableRow } from './UserTableRow';
import { TableLoadingSkeleton } from '@/components/LoadingSkeletons';
import { User } from '@/types/api';

interface UserTableProps {
  users: User[];
  selectedUsers: string[];
  onUserSelect: (userId: string, selected: boolean) => void;
  onSelectAll: (selected: boolean) => void;
  onUserAction: (userId: string, action: string) => void;
  isLoading: boolean;
}

export const UserTable = memo(({
  users,
  selectedUsers,
  onUserSelect,
  onSelectAll,
  onUserAction,
  isLoading
}: UserTableProps) => {
  const allSelected = users.length > 0 && selectedUsers.length === users.length;
  const someSelected = selectedUsers.length > 0 && selectedUsers.length < users.length;

  if (isLoading) {
    return <TableLoadingSkeleton />;
  }

  if (users.length === 0) {
    return (
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">
                <Checkbox disabled aria-label="Select all users" />
              </TableHead>
              <TableHead>User</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Department</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Last Active</TableHead>
              <TableHead className="w-12"></TableHead>
            </TableRow>
          </TableHeader>
        </Table>
        <div className="p-8 text-center text-muted-foreground">
          No users found
        </div>
      </div>
    );
  }

  return (
    <div className="border rounded-lg">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-12">
              <Checkbox
                checked={allSelected}
                onCheckedChange={onSelectAll}
                aria-label="Select all users"
                {...(someSelected && { "data-indeterminate": true })}
              />
            </TableHead>
            <TableHead>User</TableHead>
            <TableHead>Role</TableHead>
            <TableHead>Department</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Last Active</TableHead>
            <TableHead className="w-12"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.map((user) => (
            <UserTableRow
              key={user.id}
              user={user}
              selected={selectedUsers.includes(user.id)}
              onSelect={(selected) => onUserSelect(user.id, selected)}
              onAction={(action) => onUserAction(user.id, action)}
            />
          ))}
        </TableBody>
      </Table>
    </div>
  );
});

UserTable.displayName = 'UserTable';