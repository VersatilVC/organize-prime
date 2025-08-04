// Example integration test for the Users page
import { describe, it, expect, beforeEach, vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import {
  renderWithAuthAndOrg,
  createMockUser,
  createMockOrganization,
  mockHooks,
  testUtils
} from '@/test-utils';
import { render, waitFor } from '@testing-library/react';
import { screen } from '@testing-library/dom';
import UsersComposed from '@/pages/UsersComposed';

// Mock the user management hook
const mockUserManagement = {
  users: [
    createMockUser({ id: 'user-1', full_name: 'John Doe', email: 'john@example.com', role: 'admin' }),
    createMockUser({ id: 'user-2', full_name: 'Jane Smith', email: 'jane@example.com', role: 'user' }),
    createMockUser({ id: 'user-3', full_name: 'Bob Johnson', email: 'bob@example.com', role: 'user', status: 'inactive' })
  ],
  totalUsers: 3,
  filteredCount: 3,
  selectedUsers: [],
  departments: ['Engineering', 'Marketing'],
  filters: { search: '', role: 'all', status: 'all', department: 'all' },
  sortBy: 'name',
  sortOrder: 'asc',
  isLoading: false,
  error: null,
  isInviting: false,
  isUpdating: false,
  isRemoving: false,
  handleUserSelect: vi.fn(),
  handleSelectAll: vi.fn(),
  updateFilter: vi.fn(),
  updateSort: vi.fn(),
  clearSelection: vi.fn(),
  clearAllFilters: vi.fn(),
  handleBulkAction: vi.fn(),
  handleUserAction: vi.fn(),
  handleInviteUser: vi.fn(),
  inviteUser: vi.fn(),
  updateUser: vi.fn(),
  removeUser: vi.fn(),
  updateUserRole: vi.fn(),
  refetch: vi.fn()
};

describe('UsersComposed Integration Tests', () => {
  const adminUser = createMockUser({ role: 'admin' });
  const organization = createMockOrganization();

  beforeEach(() => {
    vi.clearAllMocks();
    mockHooks.useUserManagement(mockUserManagement);
  });

  describe('Page Rendering', () => {
    it('renders users page with all components', async () => {
      renderWithAuthAndOrg(<UsersComposed />, adminUser, organization);

      // Check header
      expect(screen.getByText('Users')).toBeInTheDocument();
      expect(screen.getByText('3 users total')).toBeInTheDocument();

      // Check filters
      expect(screen.getByPlaceholderText(/search users/i)).toBeInTheDocument();
      expect(screen.getByRole('combobox', { name: /all roles/i })).toBeInTheDocument();

      // Check user table
      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('jane@example.com')).toBeInTheDocument();
      expect(screen.getByText('Bob Johnson')).toBeInTheDocument();
    });

    it('shows loading state initially', () => {
      mockHooks.useUserManagement({ ...mockUserManagement, isLoading: true });
      
      renderWithAuthAndOrg(<UsersComposed />, adminUser, organization);

      expect(screen.getByTestId('loading')).toBeInTheDocument();
    });

    it('shows error state when there is an error', () => {
      mockHooks.useUserManagement({ 
        ...mockUserManagement, 
        error: new Error('Failed to load users') 
      });
      
      renderWithAuthAndOrg(<UsersComposed />, adminUser, organization);

      expect(screen.getByText(/failed to load users/i)).toBeInTheDocument();
    });
  });

  describe('User Interactions', () => {
    it('opens invite dialog when invite button is clicked', async () => {
      const user = userEvent.setup();
      
      renderWithAuthAndOrg(<UsersComposed />, adminUser, organization);

      const inviteButton = screen.getByRole('button', { name: /invite user/i });
      await user.click(inviteButton);

      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByText(/invite user/i)).toBeInTheDocument();
    });

    it('filters users when search input is used', async () => {
      const user = userEvent.setup();
      const updateFilter = vi.fn();
      mockHooks.useUserManagement({ ...mockUserManagement, updateFilter });
      
      renderWithAuthAndOrg(<UsersComposed />, adminUser, organization);

      const searchInput = screen.getByPlaceholderText(/search users/i);
      await user.type(searchInput, 'john');

      expect(updateFilter).toHaveBeenCalledWith('search', 'john');
    });

    it('selects users and shows bulk actions', async () => {
      const user = userEvent.setup();
      const handleUserSelect = vi.fn();
      mockHooks.useUserManagement({ 
        ...mockUserManagement, 
        handleUserSelect,
        selectedUsers: ['user-1'] 
      });
      
      renderWithAuthAndOrg(<UsersComposed />, adminUser, organization);

      // Find and click checkbox for first user
      const checkboxes = screen.getAllByRole('checkbox');
      await user.click(checkboxes[1]); // Skip header checkbox

      expect(handleUserSelect).toHaveBeenCalledWith('user-1', true);
    });

    it('performs bulk actions on selected users', async () => {
      const user = userEvent.setup();
      const handleBulkAction = vi.fn();
      mockHooks.useUserManagement({ 
        ...mockUserManagement, 
        handleBulkAction,
        selectedUsers: ['user-1', 'user-2'] 
      });
      
      renderWithAuthAndOrg(<UsersComposed />, adminUser, organization);

      // Open bulk actions menu
      const bulkActionsButton = screen.getByRole('button', { name: /bulk actions/i });
      await user.click(bulkActionsButton);

      // Click activate action
      const activateButton = screen.getByRole('menuitem', { name: /activate users/i });
      await user.click(activateButton);

      expect(handleBulkAction).toHaveBeenCalledWith('activate');
    });
  });

  describe('User Management Actions', () => {
    it('handles user removal', async () => {
      const user = userEvent.setup();
      const handleUserAction = vi.fn();
      mockHooks.useUserManagement({ ...mockUserManagement, handleUserAction });
      
      renderWithAuthAndOrg(<UsersComposed />, adminUser, organization);

      // Find user row actions
      const actionButtons = screen.getAllByRole('button', { name: /more options/i });
      await user.click(actionButtons[0]);

      // Click remove option
      const removeButton = screen.getByRole('menuitem', { name: /remove user/i });
      await user.click(removeButton);

      expect(handleUserAction).toHaveBeenCalledWith('user-1', 'remove');
    });

    it('handles role changes', async () => {
      const user = userEvent.setup();
      const handleUserAction = vi.fn();
      mockHooks.useUserManagement({ ...mockUserManagement, handleUserAction });
      
      renderWithAuthAndOrg(<UsersComposed />, adminUser, organization);

      // Find user row actions
      const actionButtons = screen.getAllByRole('button', { name: /more options/i });
      await user.click(actionButtons[0]);

      // Click edit option
      const editButton = screen.getByRole('menuitem', { name: /edit user/i });
      await user.click(editButton);

      expect(handleUserAction).toHaveBeenCalledWith('user-1', 'edit');
    });
  });

  describe('Responsive Behavior', () => {
    it('adapts to mobile viewport', () => {
      testUtils.mockMatchMedia(true); // Simulate mobile
      
      renderWithAuthAndOrg(<UsersComposed />, adminUser, organization);

      // Check that mobile-specific elements are present
      const filters = screen.getByTestId('user-filters');
      expect(filters).toHaveClass('flex-col'); // Mobile layout
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA labels and roles', () => {
      renderWithAuthAndOrg(<UsersComposed />, adminUser, organization);

      // Check table accessibility
      expect(screen.getByRole('table')).toBeInTheDocument();
      expect(screen.getAllByRole('columnheader')).toHaveLength(7);
      expect(screen.getAllByRole('row')).toHaveLength(4); // Header + 3 users

      // Check form accessibility
      const searchInput = screen.getByLabelText(/search users/i);
      expect(searchInput).toBeInTheDocument();
    });

    it('supports keyboard navigation', async () => {
      const user = userEvent.setup();
      
      renderWithAuthAndOrg(<UsersComposed />, adminUser, organization);

      // Tab through interactive elements
      await user.tab(); // Search input
      expect(screen.getByPlaceholderText(/search users/i)).toHaveFocus();

      await user.tab(); // Role filter
      expect(screen.getByRole('combobox', { name: /all roles/i })).toHaveFocus();

      await user.tab(); // Status filter
      expect(screen.getByRole('combobox', { name: /all status/i })).toHaveFocus();
    });
  });

  describe('Error Handling', () => {
    it('shows user-friendly error messages', () => {
      mockHooks.useUserManagement({ 
        ...mockUserManagement, 
        error: new Error('Network connection failed') 
      });
      
      renderWithAuthAndOrg(<UsersComposed />, adminUser, organization);

      expect(screen.getByText(/failed to load users/i)).toBeInTheDocument();
    });

    it('handles invitation errors gracefully', async () => {
      const user = userEvent.setup();
      const handleInviteUser = vi.fn().mockRejectedValue(new Error('Email already exists'));
      mockHooks.useUserManagement({ ...mockUserManagement, handleInviteUser });
      
      renderWithAuthAndOrg(<UsersComposed />, adminUser, organization);

      // Open invite dialog
      const inviteButton = screen.getByRole('button', { name: /invite user/i });
      await user.click(inviteButton);

      // Fill form and submit
      const emailInput = screen.getByLabelText(/email/i);
      await user.type(emailInput, 'existing@example.com');

      const submitButton = screen.getByRole('button', { name: /send invitation/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(handleInviteUser).toHaveBeenCalled();
      });
    });
  });
});