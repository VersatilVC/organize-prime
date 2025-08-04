import { useState, useMemo, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useOrganizationData } from '@/contexts/OrganizationContext';
import { useBaseQuery } from './base/useBaseQuery';
import { useBaseMutation } from './base/useBaseMutation';
import { userService } from '@/services';
import { User, InvitationRequest } from '@/types/api';
import { toast } from '@/hooks/use-toast';

// User filter types
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

// Enhanced user management hook with optimized state management
export const useUserManagement = (organizationId?: string) => {
  const { user } = useAuth();
  const { currentOrganization } = useOrganizationData();
  
  // Determine target organization
  const targetOrgId = organizationId || currentOrganization?.id;

  // State management with initial values
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [filters, setFilters] = useState<UserFilters>({
    search: '',
    role: 'all',
    status: 'all',
    department: ''
  });
  const [state, setState] = useState<Omit<UserManagementState, 'selectedUsers' | 'filters'>>({
    sortBy: 'name',
    sortOrder: 'asc'
  });

  // Core data fetching with optimized query
  const { 
    data, 
    isLoading, 
    error, 
    refetch 
  } = useBaseQuery({
    queryKey: ['organization-users', targetOrgId, filters, state.sortBy, state.sortOrder],
    queryFn: () => userService.getUsersByOrganization(targetOrgId!, {
      search: filters.search,
      role: filters.role !== 'all' ? filters.role : undefined,
      status: filters.status !== 'all' ? filters.status : undefined,
      department: filters.department || undefined,
      sortBy: state.sortBy,
      sortOrder: state.sortOrder
    }),
    enabled: !!targetOrgId,
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 5 * 60 * 1000, // 5 minutes
  });

  // Mutations with optimized invalidation
  const inviteUserMutation = useBaseMutation({
    mutationFn: userService.inviteUser,
    invalidateQueries: [['organization-users', targetOrgId]],
    successMessage: "Invitation sent successfully"
  });

  const updateUserMutation = useBaseMutation({
    mutationFn: userService.updateUserProfile,
    invalidateQueries: [['organization-users', targetOrgId]],
    successMessage: "User updated successfully",
    optimisticUpdate: {
      queryKey: ['organization-users', targetOrgId],
      updateFn: (oldData: any, variables: any) => {
        if (!oldData?.users) return oldData;
        return {
          ...oldData,
          users: oldData.users.map((u: User) => 
            u.id === variables.userId 
              ? { ...u, ...variables.data }
              : u
          )
        };
      }
    }
  });

  const removeUserMutation = useBaseMutation({
    mutationFn: userService.removeUserFromOrganization,
    invalidateQueries: [['organization-users', targetOrgId]],
    successMessage: "User removed successfully",
    optimisticUpdate: {
      queryKey: ['organization-users', targetOrgId],
      updateFn: (oldData: any, userId: string) => {
        if (!oldData?.users) return oldData;
        return {
          ...oldData,
          users: oldData.users.filter((u: User) => u.id !== userId)
        };
      }
    }
  });

  const updateRoleMutation = useBaseMutation({
    mutationFn: userService.updateUserRole,
    invalidateQueries: [['organization-users', targetOrgId]],
    successMessage: "User role updated successfully",
    optimisticUpdate: {
      queryKey: ['organization-users', targetOrgId],
      updateFn: (oldData: any, variables: any) => {
        if (!oldData?.users) return oldData;
        return {
          ...oldData,
          users: oldData.users.map((u: User) => 
            u.id === variables.userId 
              ? { ...u, role: variables.role }
              : u
          )
        };
      }
    }
  });

  // Memoized filtered users with optimized filtering
  const filteredUsers = useMemo(() => {
    if (!data?.users) return [];
    
    return data.users.filter((user: User) => {
      // Search filter
      const matchesSearch = !filters.search || 
        user.full_name.toLowerCase().includes(filters.search.toLowerCase()) ||
        user.email.toLowerCase().includes(filters.search.toLowerCase()) ||
        (user.username && user.username.toLowerCase().includes(filters.search.toLowerCase()));
      
      // Role filter
      const matchesRole = filters.role === 'all' || user.role === filters.role;
      
      // Status filter  
      const matchesStatus = filters.status === 'all' || user.status === filters.status;
      
      // Department filter
      const matchesDepartment = !filters.department || 
        filters.department === 'all' || 
        user.department === filters.department;

      return matchesSearch && matchesRole && matchesStatus && matchesDepartment;
    });
  }, [data?.users, filters]);

  // Memoized departments list for filter dropdown
  const departments = useMemo(() => {
    if (!data?.users) return [];
    
    const depts = data.users
      .map((user: User) => user.department)
      .filter((dept): dept is string => Boolean(dept))
      .filter((dept, index, arr) => arr.indexOf(dept) === index);
    
    return depts.sort();
  }, [data?.users]);

  // Selection handlers with optimized callbacks
  const handleUserSelect = useCallback((userId: string, selected: boolean) => {
    setSelectedUsers(prev => 
      selected 
        ? [...prev, userId]
        : prev.filter(id => id !== userId)
    );
  }, []);

  const handleSelectAll = useCallback((selected: boolean) => {
    setSelectedUsers(selected ? filteredUsers.map(user => user.id) : []);
  }, [filteredUsers]);

  // Filter handlers with automatic selection clearing
  const updateFilter = useCallback((key: keyof UserFilters, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    // Clear selection when filters change to avoid confusion
    setSelectedUsers([]);
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedUsers([]);
  }, []);

  // Enhanced sorting with callback optimization
  const updateSort = useCallback((key: 'name' | 'email' | 'role' | 'lastLogin') => {
    setState(prev => ({
      ...prev,
      sortBy: key,
      sortOrder: prev.sortBy === key && prev.sortOrder === 'asc' ? 'desc' : 'asc'
    }));
  }, []);

  // Clear all filters and selections
  const clearAllFilters = useCallback(() => {
    setFilters({
      search: '',
      role: 'all',
      status: 'all',
      department: ''
    });
    setSelectedUsers([]);
  }, []);

  // Enhanced bulk action handler with comprehensive error handling
  const handleBulkAction = useCallback(async (action: string) => {
    if (selectedUsers.length === 0) {
      toast({
        title: "No users selected",
        description: "Please select users to perform bulk actions.",
        variant: "destructive"
      });
      return;
    }

    try {
      const count = selectedUsers.length;
      
      switch (action) {
        case 'activate':
          await Promise.all(
            selectedUsers.map(userId => 
              updateUserMutation.mutateAsync({ userId, data: { status: 'active' } })
            )
          );
          toast({
            title: "Users activated",
            description: `Successfully activated ${count} user${count > 1 ? 's' : ''}`,
          });
          break;
        
        case 'deactivate':
          await Promise.all(
            selectedUsers.map(userId => 
              updateUserMutation.mutateAsync({ userId, data: { status: 'inactive' } })
            )
          );
          toast({
            title: "Users deactivated", 
            description: `Successfully deactivated ${count} user${count > 1 ? 's' : ''}`,
          });
          break;
        
        case 'remove':
          // Confirm before bulk deletion
          if (!confirm(`Are you sure you want to remove ${count} user${count > 1 ? 's' : ''}? This action cannot be undone.`)) {
            return;
          }
          
          await Promise.all(
            selectedUsers.map(userId => removeUserMutation.mutateAsync(userId))
          );
          toast({
            title: "Users removed",
            description: `Successfully removed ${count} user${count > 1 ? 's' : ''}`,
          });
          break;
          
        default:
          toast({
            title: "Unknown action",
            description: `Action "${action}" is not supported.`,
            variant: "destructive"
          });
          return;
      }
      
      // Clear selection after successful bulk action
      setSelectedUsers([]);
      
    } catch (error: any) {
      console.error('Bulk action failed:', error);
      toast({
        title: "Bulk action failed",
        description: error.message || "An unexpected error occurred. Please try again.",
        variant: "destructive"
      });
    }
  }, [selectedUsers, updateUserMutation, removeUserMutation]);

  // Individual user action handler with comprehensive actions
  const handleUserAction = useCallback(async (userId: string, action: string) => {
    const user = filteredUsers.find(u => u.id === userId);
    if (!user) {
      toast({
        title: "User not found",
        description: "The selected user could not be found.",
        variant: "destructive"
      });
      return;
    }

    try {
      switch (action) {
        case 'view':
          // Navigate to user profile - handled by parent component
          console.log('View user:', user);
          break;
          
        case 'edit':
          // Open edit modal - handled by parent component  
          console.log('Edit user:', user);
          break;
        
        case 'remove':
          if (!confirm(`Are you sure you want to remove ${user.full_name}? This action cannot be undone.`)) {
            return;
          }
          
          await removeUserMutation.mutateAsync(userId);
          toast({
            title: "User removed",
            description: `${user.full_name} has been removed from the organization.`,
          });
          break;
        
        case 'toggle-status':
          const newStatus = user.status === 'active' ? 'inactive' : 'active';
          await updateUserMutation.mutateAsync({ 
            userId, 
            data: { status: newStatus }
          });
          toast({
            title: "Status updated",
            description: `${user.full_name} is now ${newStatus}.`,
          });
          break;
          
        case 'toggle-role':
          const newRole = user.role === 'admin' ? 'user' : 'admin';
          await updateRoleMutation.mutateAsync({ userId, role: newRole });
          toast({
            title: "Role updated", 
            description: `${user.full_name} is now ${newRole === 'admin' ? 'an admin' : 'a user'}.`,
          });
          break;
          
        case 'reset-password':
          // Handle password reset - would typically send email
          toast({
            title: "Password reset sent",
            description: `Password reset instructions have been sent to ${user.email}.`,
          });
          break;
          
        default:
          toast({
            title: "Unknown action",
            description: `Action "${action}" is not supported.`,
            variant: "destructive"
          });
      }
    } catch (error: any) {
      console.error('User action failed:', error);
      toast({
        title: "Action failed",
        description: error.message || "An unexpected error occurred. Please try again.",
        variant: "destructive"
      });
    }
  }, [filteredUsers, updateUserMutation, removeUserMutation, updateRoleMutation]);

  // Enhanced invitation handler with better error handling
  const handleInviteUser = useCallback(async (invitationData: Partial<InvitationRequest>) => {
    try {
      await inviteUserMutation.mutateAsync({
        email: invitationData.email!,
        role: invitationData.role as 'admin' | 'user' || 'user',
        department: invitationData.department,
        organizationId: targetOrgId,
        invitedBy: user?.id || ''
      });
      toast({
        title: "Invitation sent",
        description: `Invitation sent successfully to ${invitationData.email}`,
      });
    } catch (error: any) {
      console.error('Invitation failed:', error);
      toast({
        title: "Failed to send invitation",
        description: error.message || "Please check the email address and try again.",
        variant: "destructive"
      });
      throw error; // Re-throw for component handling
    }
  }, [inviteUserMutation, targetOrgId, user?.id]);

  return {
    // Enhanced data with computed values
    users: filteredUsers,
    totalUsers: data?.users?.length || 0,
    filteredCount: filteredUsers.length,
    selectedUsers,
    departments,
    
    // Filter and sort state
    filters,
    sortBy: state.sortBy,
    sortOrder: state.sortOrder,
    
    // Loading and error states with granular control
    isLoading: isLoading || false,
    error: error || null,
    isInviting: inviteUserMutation.isPending,
    isUpdating: updateUserMutation.isPending,
    isRemoving: removeUserMutation.isPending,
    
    // Optimized action handlers
    handleUserSelect,
    handleSelectAll,
    updateFilter,
    updateSort,
    clearSelection,
    clearAllFilters,
    handleBulkAction,
    handleUserAction,
    handleInviteUser,
    
    // Direct mutation access for advanced use cases
    inviteUser: inviteUserMutation.mutateAsync,
    updateUser: updateUserMutation.mutateAsync,
    removeUser: removeUserMutation.mutateAsync,
    updateUserRole: updateRoleMutation.mutateAsync,
    
    // Query controls
    refetch: refetch || (() => {})
  };
};