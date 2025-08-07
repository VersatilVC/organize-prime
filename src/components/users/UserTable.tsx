import React, { memo, useRef } from 'react';
import { Table, TableBody, TableHead, TableHeader, TableRow, TableCell } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { UserTableRow } from './UserTableRow';
import { TableLoadingSkeleton } from '@/components/LoadingSkeletons';
import { User } from '@/types/api';
import { useVirtualizer } from '@tanstack/react-virtual';

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

  const parentRef = useRef<HTMLDivElement>(null);
  const rowVirtualizer = useVirtualizer({
    count: users.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 56, // approximate row height
    overscan: 8,
  });
  const virtualRows = rowVirtualizer.getVirtualItems();
  const paddingTop = virtualRows.length > 0 ? virtualRows[0].start : 0;
  const paddingBottom = virtualRows.length > 0 ? rowVirtualizer.getTotalSize() - virtualRows[virtualRows.length - 1].end : 0;
  const COL_COUNT = 7;
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
    <div ref={parentRef} className="border rounded-lg overflow-auto max-h-[640px]">
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
          {paddingTop > 0 && (
            <TableRow>
              <TableCell colSpan={COL_COUNT} style={{ height: paddingTop }} />
            </TableRow>
          )}

          {virtualRows.map((virtualRow) => {
            const user = users[virtualRow.index];
            return (
              <UserTableRow
                key={user.id}
                user={user}
                selected={selectedUsers.includes(user.id)}
                onSelect={(selected) => onUserSelect(user.id, selected)}
                onAction={(action) => onUserAction(user.id, action)}
              />
            );
          })}

          {paddingBottom > 0 && (
            <TableRow>
              <TableCell colSpan={COL_COUNT} style={{ height: paddingBottom }} />
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
});

UserTable.displayName = 'UserTable';