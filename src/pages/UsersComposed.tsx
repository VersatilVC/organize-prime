// Refactored Users page using component composition
import React, { useState } from 'react';
import { useUserManagement } from '@/hooks/useUserManagement';
import { useAuth } from '@/contexts/AuthContext';
import { useOrganizationData } from '@/contexts/OrganizationContext';
import { 
  ListHeader, 
  ListFilters, 
  DataTable, 
  EmptyState,
  type TableColumn 
} from '@/components/composition';
import { InviteUserDialog } from '@/components/InviteUserDialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { MoreHorizontal, Users, UserPlus } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { User } from '@/types/api';
import { cn } from '@/lib/utils';

const UsersPage = () => {
  const { user } = useAuth();
  const { currentOrganization } = useOrganizationData();
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);

  const {
    users,
    totalUsers,
    filteredCount,
    selectedUsers,
    departments,
    filters,
    sortBy,
    sortOrder,
    isLoading,
    error,
    isInviting,
    handleUserSelect,
    handleSelectAll,
    updateFilter,
    updateSort,
    clearSelection,
    handleBulkAction,
    inviteUser,
    updateUser,
    removeUser,
    updateUserRole,
    refetch
  } = useUserManagement();

  // Check if user can manage users (admin or super_admin)
  const canManageUsers = (user as any)?.is_super_admin || (currentOrganization as any)?.userRole === 'admin';

  // Table columns configuration
  const columns: TableColumn<User>[] = [
    {
      key: 'user',
      label: 'User',
      sortable: true,
      render: (user) => (
        <div className="flex items-center gap-3">
          <Avatar className="h-8 w-8">
            <AvatarImage src={user.avatar_url || undefined} alt={user.full_name} />
            <AvatarFallback>
              {user.full_name.split(' ').map(n => n[0]).join('').toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="space-y-1">
            <div className="font-medium">{user.full_name}</div>
            <div className="text-sm text-muted-foreground">{user.email}</div>
          </div>
        </div>
      )
    },
    {
      key: 'role',
      label: 'Role',
      sortable: true,
      render: (user) => (
        <Badge variant={user.role === 'admin' ? 'default' : 'secondary'}>
          {user.role === 'admin' ? 'Admin' : 'User'}
        </Badge>
      )
    },
    {
      key: 'department',
      label: 'Department',
      sortable: true,
      render: (user) => user.department || '-'
    },
    {
      key: 'status',
      label: 'Status',
      sortable: true,
      render: (user) => (
        <Badge 
          variant={user.status === 'active' ? 'default' : 'secondary'}
          className={cn(
            user.status === 'active' && 'bg-green-100 text-green-800 border-green-200',
            user.status === 'inactive' && 'bg-gray-100 text-gray-800 border-gray-200'
          )}
        >
          {user.status === 'active' ? 'Active' : 'Inactive'}
        </Badge>
      )
    },
    {
      key: 'lastLogin',
      label: 'Last Active',
      sortable: true,
      render: (user) => (
        <span className="text-sm">
          {user.lastLoginAt 
            ? formatDistanceToNow(new Date(user.lastLoginAt), { addSuffix: true })
            : 'Never'
          }
        </span>
      )
    },
    {
      key: 'actions',
      label: '',
      width: '50px',
      render: (user) => canManageUsers && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => handleEditUser(user)}>
              Edit User
            </DropdownMenuItem>
            <DropdownMenuItem 
              onClick={() => handleToggleRole(user)}
              disabled={user.id === user.id}
            >
              {user.role === 'admin' ? 'Make User' : 'Make Admin'}
            </DropdownMenuItem>
            <DropdownMenuItem 
              onClick={() => handleToggleStatus(user)}
              disabled={user.id === user.id}
            >
              {user.status === 'active' ? 'Deactivate' : 'Activate'}
            </DropdownMenuItem>
            <DropdownMenuItem 
              onClick={() => handleRemoveUser(user)}
              className="text-destructive focus:text-destructive"
              disabled={user.id === user.id}
            >
              Remove User
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )
    }
  ];

  // Filter options
  const filterOptions = [
    {
      key: 'role',
      label: 'Role',
      value: filters.role || 'all',
      options: [
        { value: 'admin', label: 'Admin' },
        { value: 'user', label: 'User' }
      ],
      onChange: (value: string) => updateFilter('role', value as any)
    },
    {
      key: 'status', 
      label: 'Status',
      value: filters.status || 'all',
      options: [
        { value: 'active', label: 'Active' },
        { value: 'inactive', label: 'Inactive' }
      ],
      onChange: (value: string) => updateFilter('status', value as any)
    },
    ...(departments.length > 0 ? [{
      key: 'department',
      label: 'Department', 
      value: filters.department || 'all',
      options: departments.map(dept => ({ value: dept, label: dept })),
      onChange: (value: string) => updateFilter('department', value)
    }] : [])
  ];

  // Bulk actions
  const bulkActions = [
    { key: 'activate', label: 'Activate Users' },
    { key: 'deactivate', label: 'Deactivate Users' },
    { key: 'remove', label: 'Remove Users', variant: 'destructive' as const }
  ];

  // Action handlers
  const handleInviteUser = async (invitationData: any) => {
    try {
      await inviteUser(invitationData);
      setInviteDialogOpen(false);
    } catch (error) {
      // Error handled by mutation hook
    }
  };

  const handleEditUser = (user: User) => {
    // TODO: Open edit user dialog
    console.log('Edit user:', user);
  };

  const handleToggleRole = async (user: User) => {
    const newRole = user.role === 'admin' ? 'user' : 'admin';
    await updateUserRole({ userId: user.id, role: newRole });
  };

  const handleToggleStatus = async (user: User) => {
    const newStatus = user.status === 'active' ? 'inactive' : 'active';
    await updateUser({ userId: user.id, data: { status: newStatus } });
  };

  const handleRemoveUser = async (user: User) => {
    if (confirm(`Are you sure you want to remove ${user.full_name}?`)) {
      await removeUser(user.id);
    }
  };

  const hasActiveFilters = Object.values(filters).some(value => 
    value && value !== 'all' && value !== ''
  );

  const clearFilters = () => {
    updateFilter('search', '');
    updateFilter('role', 'all');
    updateFilter('status', 'all');
    updateFilter('department', '');
  };

  if (error) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center text-destructive">
          Error loading users: {error.message}
          <Button onClick={() => refetch()} className="ml-4">
            Retry
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <ListHeader
        title="Users"
        subtitle={`Manage users in ${currentOrganization?.name || 'your organization'}`}
        totalCount={totalUsers}
        selectedCount={selectedUsers.length}
        canCreate={canManageUsers}
        createLabel="Invite User"
        onCreateClick={() => setInviteDialogOpen(true)}
        onBulkAction={handleBulkAction}
        bulkActions={bulkActions}
      />

      {/* Filters */}
      <ListFilters
        searchValue={filters.search || ''}
        onSearchChange={(value) => updateFilter('search', value)}
        searchPlaceholder="Search users by name, email, or username..."
        filters={filterOptions}
        hasActiveFilters={hasActiveFilters}
        onClearFilters={clearFilters}
      />

      {/* Data Table */}
      {filteredCount === 0 && !isLoading ? (
        <EmptyState
          icon={Users}
          title={hasActiveFilters ? "No users found" : "No users yet"}
          description={
            hasActiveFilters 
              ? "Try adjusting your search criteria"
              : canManageUsers 
                ? "Get started by inviting your first user"
                : "No users have been added to this organization yet"
          }
          action={canManageUsers && !hasActiveFilters ? {
            label: "Invite User",
            onClick: () => setInviteDialogOpen(true)
          } : undefined}
        />
      ) : (
        <DataTable
          data={users}
          columns={columns}
          selectedItems={selectedUsers}
          onItemSelect={handleUserSelect}
          onSelectAll={handleSelectAll}
          sortBy={sortBy}
          sortOrder={sortOrder}
          onSort={updateSort}
          isLoading={isLoading}
          emptyMessage="No users found"
        />
      )}

      {/* Invite User Dialog */}
      <InviteUserDialog
        open={inviteDialogOpen}
        onOpenChange={setInviteDialogOpen}
      />
    </div>
  );
};

export default UsersPage;