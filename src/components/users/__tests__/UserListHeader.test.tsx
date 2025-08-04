// Example test file demonstrating testing utilities usage
import { describe, it, expect, beforeEach, vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import { 
  renderWithProviders, 
  renderWithAuth, 
  renderWithAuthAndOrg,
  createMockUser, 
  createMockOrganization,
  mockHooks,
  testUtils
} from '@/test-utils';
import { render, waitFor } from '@testing-library/react';
import { screen } from '@testing-library/dom';
import { UserListHeader } from '@/components/users/UserListHeader';

describe('UserListHeader Component', () => {
  const defaultProps = {
    totalUsers: 10,
    selectedCount: 0,
    onInviteClick: vi.fn(),
    onBulkAction: vi.fn(),
    canInviteUsers: true
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Basic Rendering', () => {
    it('renders user count correctly', () => {
      renderWithProviders(<UserListHeader {...defaultProps} />);
      
      expect(screen.getByText('Users')).toBeInTheDocument();
      expect(screen.getByText('10 users total')).toBeInTheDocument();
    });

    it('renders singular user text when count is 1', () => {
      renderWithProviders(<UserListHeader {...defaultProps} totalUsers={1} />);
      
      expect(screen.getByText('1 user total')).toBeInTheDocument();
    });

    it('shows invite button when user can invite', () => {
      renderWithProviders(<UserListHeader {...defaultProps} />);
      
      expect(screen.getByRole('button', { name: /invite user/i })).toBeInTheDocument();
    });

    it('hides invite button when user cannot invite', () => {
      renderWithProviders(<UserListHeader {...defaultProps} canInviteUsers={false} />);
      
      expect(screen.queryByRole('button', { name: /invite user/i })).not.toBeInTheDocument();
    });
  });

  describe('User Interactions', () => {
    it('calls onInviteClick when invite button is clicked', async () => {
      const user = userEvent.setup();
      const onInviteClick = vi.fn();
      
      renderWithProviders(
        <UserListHeader {...defaultProps} onInviteClick={onInviteClick} />
      );
      
      const inviteButton = screen.getByRole('button', { name: /invite user/i });
      await user.click(inviteButton);
      
      expect(onInviteClick).toHaveBeenCalledTimes(1);
    });

    it('shows bulk actions when users are selected', () => {
      renderWithProviders(<UserListHeader {...defaultProps} selectedCount={3} />);
      
      expect(screen.getByText('3 selected')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /bulk actions/i })).toBeInTheDocument();
    });

    it('calls onBulkAction with correct action', async () => {
      const user = userEvent.setup();
      const onBulkAction = vi.fn();
      
      renderWithProviders(
        <UserListHeader {...defaultProps} selectedCount={2} onBulkAction={onBulkAction} />
      );
      
      // Open bulk actions menu
      const bulkActionsButton = screen.getByRole('button', { name: /bulk actions/i });
      await user.click(bulkActionsButton);
      
      // Click on activate action
      const activateButton = screen.getByRole('menuitem', { name: /activate users/i });
      await user.click(activateButton);
      
      expect(onBulkAction).toHaveBeenCalledWith('activate');
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA labels', () => {
      renderWithProviders(<UserListHeader {...defaultProps} />);
      
      const inviteButton = screen.getByRole('button', { name: /invite user/i });
      expect(inviteButton).toBeInTheDocument();
    });

    it('supports keyboard navigation', async () => {
      const user = userEvent.setup();
      renderWithProviders(<UserListHeader {...defaultProps} selectedCount={1} />);
      
      // Tab to bulk actions button
      await user.tab();
      expect(screen.getByRole('button', { name: /bulk actions/i })).toHaveFocus();
      
      // Open menu with Enter
      await user.keyboard('{Enter}');
      expect(screen.getByRole('menu')).toBeInTheDocument();
    });
  });
});

// Example of testing with authentication context
describe('UserListHeader with Auth Context', () => {
  it('renders correctly for admin user', () => {
    const adminUser = createMockUser({ role: 'admin' });
    
    renderWithAuth(
      <UserListHeader 
        totalUsers={5}
        selectedCount={0}
        onInviteClick={vi.fn()}
        onBulkAction={vi.fn()}
        canInviteUsers={true}
      />,
      adminUser
    );
    
    expect(screen.getByText('Users')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /invite user/i })).toBeInTheDocument();
  });

  it('renders correctly for regular user', () => {
    const regularUser = createMockUser({ role: 'user' });
    
    renderWithAuth(
      <UserListHeader 
        totalUsers={5}
        selectedCount={0}
        onInviteClick={vi.fn()}
        onBulkAction={vi.fn()}
        canInviteUsers={false}
      />,
      regularUser
    );
    
    expect(screen.getByText('Users')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /invite user/i })).not.toBeInTheDocument();
  });
});

// Example of testing with organization context
describe('UserListHeader with Organization Context', () => {
  it('works with organization context', () => {
    const user = createMockUser();
    const organization = createMockOrganization({ name: 'Test Company' });
    
    renderWithAuthAndOrg(
      <UserListHeader 
        totalUsers={15}
        selectedCount={0}
        onInviteClick={vi.fn()}
        onBulkAction={vi.fn()}
        canInviteUsers={true}
      />,
      user,
      organization
    );
    
    expect(screen.getByText('Users')).toBeInTheDocument();
    expect(screen.getByText('15 users total')).toBeInTheDocument();
  });
});

// Example of testing error states
describe('UserListHeader Error Handling', () => {
  it('handles errors gracefully', async () => {
    testUtils.mockConsole();
    
    const onInviteClick = vi.fn().mockRejectedValue(new Error('Network error'));
    
    renderWithProviders(
      <UserListHeader 
        totalUsers={5}
        selectedCount={0}
        onInviteClick={onInviteClick}
        onBulkAction={vi.fn()}
        canInviteUsers={true}
      />
    );
    
    const inviteButton = screen.getByRole('button', { name: /invite user/i });
    await userEvent.click(inviteButton);
    
    // The error should be handled gracefully
    expect(onInviteClick).toHaveBeenCalled();
  });
});