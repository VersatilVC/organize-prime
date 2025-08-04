import React, { useState } from 'react';
import { FeatureLayout } from '@/components/FeatureLayout';
import { InviteUserDialog } from '@/components/InviteUserDialog';
import { UserListHeader, UserListFilters, UserTable } from '@/components/users';
import { useUserManagement } from '@/hooks/useUserManagement';
import { toast } from '@/hooks/use-toast';

export default function UsersComposed() {
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const {
    users,
    totalUsers,
    filteredCount,
    departments,
    selectedUsers,
    filters,
    isLoading,
    error,
    isInviting,
    handleUserSelect,
    handleSelectAll,
    updateFilter,
    clearSelection,
    handleBulkAction,
    inviteUser,
    updateUser,
    removeUser,
    updateUserRole,
    refetch
  } = useUserManagement();

  // Note: The InviteUserDialog handles its own invitation logic
  // This handler would be used if we had a custom invitation flow

  const handleUserAction = async (userId: string, action: string) => {
    const user = users.find(u => u.id === userId);
    if (!user) return;

    switch (action) {
      case 'view':
        // Navigate to user profile
        break;
      case 'edit':
        // Open edit dialog
        break;
      case 'remove':
        try {
          await removeUser(userId);
          toast({
            title: "User removed",
            description: `${user.full_name} has been removed from the organization.`,
          });
        } catch (error) {
          toast({
            title: "Failed to remove user",
            description: "Please try again later.",
            variant: "destructive",
          });
        }
        break;
    }
  };

  const handleClearFilters = () => {
    updateFilter('search', '');
    updateFilter('role', 'all');
    updateFilter('status', 'all');
    updateFilter('department', 'all');
  };

  const hasActiveFilters = 
    filters.search || 
    filters.role !== 'all' || 
    filters.status !== 'all' || 
    filters.department !== 'all';

  if (error) {
    return (
      <FeatureLayout>
        <div className="text-center py-12">
          <p className="text-destructive">Failed to load users. Please try again.</p>
        </div>
      </FeatureLayout>
    );
  }

  return (
    <FeatureLayout>
      <div className="space-y-6">
        <UserListHeader
          totalUsers={totalUsers}
          selectedCount={selectedUsers.length}
          onInviteClick={() => setInviteDialogOpen(true)}
          onBulkAction={handleBulkAction}
          canInviteUsers={true}
        />

        <UserListFilters
          searchQuery={filters.search}
          onSearchChange={(search) => updateFilter('search', search)}
          roleFilter={filters.role}
          onRoleFilterChange={(role) => updateFilter('role', role as 'all' | 'admin' | 'user')}
          statusFilter={filters.status}
          onStatusFilterChange={(status) => updateFilter('status', status as 'all' | 'active' | 'inactive')}
          departmentFilter={filters.department}
          onDepartmentFilterChange={(department) => updateFilter('department', department)}
          departments={departments}
          onClearFilters={handleClearFilters}
          hasActiveFilters={!!hasActiveFilters}
        />

        <UserTable
          users={users}
          selectedUsers={selectedUsers}
          onUserSelect={handleUserSelect}
          onSelectAll={handleSelectAll}
          onUserAction={handleUserAction}
          isLoading={isLoading}
        />

        <InviteUserDialog
          open={inviteDialogOpen}
          onOpenChange={setInviteDialogOpen}
        />
      </div>
    </FeatureLayout>
  );
}