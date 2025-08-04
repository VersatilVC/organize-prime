// Standardized user management hook using base patterns
import { useCallback, useState, useMemo } from 'react';
import { useBaseQuery } from '@/hooks/base/useBaseQuery';
import { useBaseMutation } from '@/hooks/base/useBaseMutation';
import { userService } from '@/services';
import { User, InvitationRequest } from '@/types/api';
import { QUERY_KEYS, MUTATION_KEYS } from '@/constants';
import { useAuth } from '@/contexts/AuthContext';
import { useOrganizationData } from '@/contexts/OrganizationContext';

// User management filters
export interface UserFilters {
  search?: string;
  role?: 'admin' | 'user' | 'all';
  status?: 'active' | 'inactive' | 'all';
  department?: string;
}

// User management state
export interface UserManagementState {
  selectedUsers: string[];
  filters: UserFilters;
  sortBy: 'name' | 'email' | 'role' | 'lastLogin';
  sortOrder: 'asc' | 'desc';
}

// User management hook
export const useUserManagement = (organizationId?: string) => {
  const { user } = useAuth();
  const { currentOrganization } = useOrganizationData();
  
  // Use the organization from props or context
  const targetOrgId = organizationId || currentOrganization?.id;

  // Local state management
  const [state, setState] = useState<UserManagementState>({
    selectedUsers: [],
    filters: {
      search: '',
      role: 'all',
      status: 'all',
      department: ''
    },
    sortBy: 'name',
    sortOrder: 'asc'
  });

  // Fetch users with standardized hook
  const {
    data: users = [],
    isLoading,
    error,
    refetch
  } = useBaseQuery({
    queryKey: [QUERY_KEYS.USERS, targetOrgId, state.filters, state.sortBy, state.sortOrder],
    queryFn: () => userService.getUsersByOrganization(targetOrgId!),
    enabled: !!targetOrgId && !!user,
    context: 'User Management - Fetch Users',
    staleTime: 2 * 60 * 1000, // 2 minutes
  });

  // Filter and sort users
  const filteredUsers = useMemo(() => {
    let filtered = [...users];

    // Apply search filter
    if (state.filters.search) {
      const searchLower = state.filters.search.toLowerCase();
      filtered = filtered.filter(user => 
        user.full_name.toLowerCase().includes(searchLower) ||
        user.email.toLowerCase().includes(searchLower) ||
        user.username.toLowerCase().includes(searchLower)
      );
    }

    // Apply role filter
    if (state.filters.role && state.filters.role !== 'all') {
      filtered = filtered.filter(user => user.role === state.filters.role);
    }

    // Apply status filter
    if (state.filters.status && state.filters.status !== 'all') {
      filtered = filtered.filter(user => user.status === state.filters.status);
    }

    // Apply department filter
    if (state.filters.department) {
      filtered = filtered.filter(user => user.department === state.filters.department);
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let aValue: any, bValue: any;
      
      switch (state.sortBy) {
        case 'name':
          aValue = a.full_name;
          bValue = b.full_name;
          break;
        case 'email':
          aValue = a.email;
          bValue = b.email;
          break;
        case 'role':
          aValue = a.role;
          bValue = b.role;
          break;
        case 'lastLogin':
          aValue = a.lastLoginAt ? new Date(a.lastLoginAt) : new Date(0);
          bValue = b.lastLoginAt ? new Date(b.lastLoginAt) : new Date(0);
          break;
        default:
          return 0;
      }

      if (aValue < bValue) return state.sortOrder === 'asc' ? -1 : 1;
      if (aValue > bValue) return state.sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    return filtered;
  }, [users, state.filters, state.sortBy, state.sortOrder]);

  // Get unique departments for filter dropdown
  const departments = useMemo(() => {
    const depts = users
      .map(user => user.department)
      .filter(Boolean)
      .filter((dept, index, arr) => arr.indexOf(dept) === index);
    return depts.sort();
  }, [users]);

  // Invite user mutation
  const inviteUserMutation = useBaseMutation({
    mutationFn: (data: InvitationRequest) => userService.inviteUser(data),
    invalidateQueries: [[QUERY_KEYS.USERS, targetOrgId], [QUERY_KEYS.INVITATIONS, targetOrgId]],
    successMessage: (data, variables) => `Invitation sent to ${variables.email}`,
    context: 'User Management - Invite User'
  });

  // Update user mutation
  const updateUserMutation = useBaseMutation({
    mutationFn: ({ userId, data }: { userId: string; data: Partial<User> }) =>
      userService.updateUserProfile(userId, data),
    invalidateQueries: [[QUERY_KEYS.USERS, targetOrgId]],
    optimisticUpdate: {
      queryKey: [QUERY_KEYS.USERS, targetOrgId],
      updater: (oldUsers: User[], { userId, data }) =>
        oldUsers.map(user => user.id === userId ? { ...user, ...data } : user)
    },
    successMessage: 'User updated successfully',
    context: 'User Management - Update User'
  });

  // Remove user mutation
  const removeUserMutation = useBaseMutation({
    mutationFn: (userId: string) => userService.removeUserFromOrganization(userId, targetOrgId!),
    invalidateQueries: [[QUERY_KEYS.USERS, targetOrgId]],
    optimisticUpdate: {
      queryKey: [QUERY_KEYS.USERS, targetOrgId],
      updater: (oldUsers: User[], userId: string) =>
        oldUsers.filter(user => user.id !== userId)
    },
    successMessage: 'User removed successfully',
    context: 'User Management - Remove User'
  });

  // Update role mutation
  const updateRoleMutation = useBaseMutation({
    mutationFn: ({ userId, role }: { userId: string; role: 'admin' | 'user' }) =>
      userService.updateUserRole(userId, targetOrgId!, role),
    invalidateQueries: [[QUERY_KEYS.USERS, targetOrgId]],
    optimisticUpdate: {
      queryKey: [QUERY_KEYS.USERS, targetOrgId],
      updater: (oldUsers: User[], { userId, role }) =>
        oldUsers.map(user => user.id === userId ? { ...user, role } : user)
    },
    successMessage: 'User role updated successfully',
    context: 'User Management - Update Role'
  });

  // Action handlers
  const handleUserSelect = useCallback((userId: string, selected: boolean) => {
    setState(prev => ({
      ...prev,
      selectedUsers: selected 
        ? [...prev.selectedUsers, userId]
        : prev.selectedUsers.filter(id => id !== userId)
    }));
  }, []);

  const handleSelectAll = useCallback((selected: boolean) => {
    setState(prev => ({
      ...prev,
      selectedUsers: selected ? filteredUsers.map(user => user.id) : []
    }));
  }, [filteredUsers]);

  const updateFilter = useCallback(<K extends keyof UserFilters>(
    key: K, 
    value: UserFilters[K]
  ) => {
    setState(prev => ({
      ...prev,
      filters: { ...prev.filters, [key]: value },
      selectedUsers: [] // Clear selection when filters change
    }));
  }, []);

  const updateSort = useCallback((sortBy: UserManagementState['sortBy']) => {
    setState(prev => ({
      ...prev,
      sortBy,
      sortOrder: prev.sortBy === sortBy && prev.sortOrder === 'asc' ? 'desc' : 'asc'
    }));
  }, []);

  const clearSelection = useCallback(() => {
    setState(prev => ({ ...prev, selectedUsers: [] }));
  }, []);

  // Bulk actions
  const handleBulkAction = useCallback(async (action: 'activate' | 'deactivate' | 'remove') => {
    if (state.selectedUsers.length === 0) return;

    try {
      switch (action) {
        case 'activate':
          await Promise.all(
            state.selectedUsers.map(userId => 
              updateUserMutation.mutateAsync({ userId, data: { status: 'active' } })
            )
          );
          break;
        case 'deactivate':
          await Promise.all(
            state.selectedUsers.map(userId => 
              updateUserMutation.mutateAsync({ userId, data: { status: 'inactive' } })
            )
          );
          break;
        case 'remove':
          await Promise.all(
            state.selectedUsers.map(userId => removeUserMutation.mutateAsync(userId))
          );
          break;
      }
      clearSelection();
    } catch (error) {
      // Error handling is done by the mutation hooks
    }
  }, [state.selectedUsers, updateUserMutation, removeUserMutation, clearSelection]);

  return {
    // Data
    users: filteredUsers,
    totalUsers: users.length,
    filteredCount: filteredUsers.length,
    selectedUsers: state.selectedUsers,
    departments,
    filters: state.filters,
    sortBy: state.sortBy,
    sortOrder: state.sortOrder,
    
    // State
    isLoading,
    error,
    isInviting: inviteUserMutation.isPending,
    isUpdating: updateUserMutation.isPending,
    isRemoving: removeUserMutation.isPending,
    
    // Actions
    handleUserSelect,
    handleSelectAll,
    updateFilter,
    updateSort,
    clearSelection,
    handleBulkAction,
    refetch,
    
    // Mutations
    inviteUser: inviteUserMutation.mutateAsync,
    updateUser: updateUserMutation.mutateAsync,
    removeUser: removeUserMutation.mutateAsync,
    updateUserRole: updateRoleMutation.mutateAsync,
  };
};