// Comprehensive testing utilities for the application
import React, { ReactElement } from 'react';
import { render, RenderOptions, RenderResult } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { ThemeProvider } from 'next-themes';
import { vi } from 'vitest';
import { User, Organization, InvitationRequest } from '@/types/api';
import { UserRole, UserStatus } from '@/types/api';

// Mock data factories for consistent test data
export const createMockUser = (overrides?: Partial<User>): User => ({
  id: 'user-1',
  full_name: 'John Doe',
  username: 'johndoe',
  email: 'john@example.com',
  role: 'user' as UserRole,
  status: 'active' as UserStatus,
  avatar_url: null,
  department: 'Engineering',
  position: 'Software Developer',
  phone_number: null,
  bio: null,
  joinedAt: new Date().toISOString(),
  lastLoginAt: new Date().toISOString(),
  first_login_completed: true,
  mfa_enabled: false,
  preferences: {},
  ...overrides
});

export const createMockOrganization = (overrides?: Partial<Organization>): Organization => ({
  id: 'org-1',
  name: 'Test Organization',
  slug: 'test-org',
  logo_url: null,
  userRole: 'admin' as UserRole,
  memberCount: 5,
  createdAt: new Date().toISOString(),
  ...overrides
});

export const createMockInvitation = (overrides?: Partial<InvitationRequest>): InvitationRequest => ({
  email: 'newuser@example.com',
  role: 'user' as UserRole,
  organizationId: 'org-1',
  invitedBy: 'user-1',
  message: 'Welcome to our organization!',
  department: 'Engineering',
  ...overrides
});

// Mock profile data
export const createMockProfile = (overrides?: any) => ({
  id: 'user-1',
  full_name: 'John Doe',
  username: 'johndoe',
  avatar_url: null,
  phone_number: null,
  bio: null,
  last_login_at: new Date().toISOString(),
  first_login_completed: true,
  mfa_enabled: false,
  is_super_admin: false,
  preferences: {},
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  ...overrides
});

// Mock Supabase auth user
export const createMockAuthUser = (overrides?: any) => ({
  id: 'user-1',
  email: 'john@example.com',
  user_metadata: {
    full_name: 'John Doe',
    avatar_url: null
  },
  app_metadata: {},
  aud: 'authenticated',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  ...overrides
});

// Mock session
export const createMockSession = (user?: any) => ({
  access_token: 'mock-access-token',
  refresh_token: 'mock-refresh-token',
  expires_in: 3600,
  expires_at: Date.now() + 3600 * 1000,
  token_type: 'bearer',
  user: user || createMockAuthUser()
});

// Testing configuration options
interface TestWrapperOptions {
  initialRoute?: string;
  queryClientOptions?: any;
  authContext?: {
    user?: User | null;
    loading?: boolean;
    session?: any;
  };
  organizationContext?: {
    currentOrganization?: Organization | null;
    userOrganizations?: Organization[];
    loading?: boolean;
  };
  themeProviderProps?: any;
}

// Create test query client with disabled retries and caching
const createTestQueryClient = (options?: any) => {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        staleTime: 0,
        gcTime: 0,
        ...options?.queries
      },
      mutations: {
        retry: false,
        ...options?.mutations
      }
    },
    ...options
  });
};

// Test providers wrapper component
const createTestWrapper = (options: TestWrapperOptions = {}) => {
  const {
    initialRoute = '/',
    queryClientOptions,
    themeProviderProps
  } = options;

  const queryClient = createTestQueryClient(queryClientOptions);

  return function TestWrapper({ children }: { children: React.ReactNode }) {
    return React.createElement(
      QueryClientProvider,
      { client: queryClient },
      React.createElement(
        MemoryRouter,
        { initialEntries: [initialRoute] },
        React.createElement(
          ThemeProvider,
          {
            attribute: "class",
            defaultTheme: "light",
            enableSystem: false,
            ...themeProviderProps
          },
          children
        )
      )
    );
  };
};

// Custom render function
export const renderWithProviders = (
  ui: ReactElement,
  options: TestWrapperOptions & Omit<RenderOptions, 'wrapper'> = {}
): RenderResult => {
  const { initialRoute, queryClientOptions, authContext, organizationContext, themeProviderProps, ...renderOptions } = options;

  const Wrapper = createTestWrapper({
    initialRoute,
    queryClientOptions,
    themeProviderProps
  });

  return render(ui, { wrapper: Wrapper, ...renderOptions });
};

// Utility to render with authenticated user
export const renderWithAuth = (
  ui: ReactElement,
  user: User = createMockUser(),
  options: Omit<TestWrapperOptions, 'authContext'> & Omit<RenderOptions, 'wrapper'> = {}
): RenderResult => {
  return renderWithProviders(ui, {
    ...options,
    authContext: {
      user,
      loading: false,
      session: createMockSession(createMockAuthUser({ id: user.id, email: user.email }))
    }
  });
};

// Utility to render with organization context
export const renderWithOrganization = (
  ui: ReactElement,
  organization: Organization = createMockOrganization(),
  options: Omit<TestWrapperOptions, 'organizationContext'> & Omit<RenderOptions, 'wrapper'> = {}
): RenderResult => {
  return renderWithProviders(ui, {
    ...options,
    organizationContext: {
      currentOrganization: organization,
      userOrganizations: [organization],
      loading: false
    }
  });
};

// Utility to render with both auth and organization
export const renderWithAuthAndOrg = (
  ui: ReactElement,
  user: User = createMockUser(),
  organization: Organization = createMockOrganization(),
  options: Omit<TestWrapperOptions, 'authContext' | 'organizationContext'> & Omit<RenderOptions, 'wrapper'> = {}
): RenderResult => {
  return renderWithProviders(ui, {
    ...options,
    authContext: {
      user,
      loading: false,
      session: createMockSession(createMockAuthUser({ id: user.id, email: user.email }))
    },
    organizationContext: {
      currentOrganization: organization,
      userOrganizations: [organization],
      loading: false
    }
  });
};

// Mock implementations for common hooks
export const mockHooks = {
  useAuth: (mockData?: any) => {
    const defaultMock = {
      user: null,
      loading: false,
      session: null,
      signIn: vi.fn(),
      signOut: vi.fn(),
      signUp: vi.fn(),
      resetPassword: vi.fn(),
      updateProfile: vi.fn(),
      uploadAvatar: vi.fn()
    };

    return vi.spyOn(require('@/auth/AuthProvider'), 'useAuth')
      .mockReturnValue({ ...defaultMock, ...mockData });
  },

  useOrganizationData: (mockData?: any) => {
    const defaultMock = {
      currentOrganization: null,
      userOrganizations: [],
      loading: false,
      error: null,
      switchOrganization: vi.fn(),
      refetch: vi.fn(),
      createOrganization: vi.fn()
    };

    return vi.spyOn(require('@/contexts/OrganizationContext'), 'useOrganizationData')
      .mockReturnValue({ ...defaultMock, ...mockData });
  },

  useUserManagement: (mockData?: any) => {
    const defaultMock = {
      users: [],
      totalUsers: 0,
      filteredCount: 0,
      selectedUsers: [],
      departments: [],
      filters: { search: '', role: 'all', status: 'all', department: '' },
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

    return vi.spyOn(require('@/hooks/useUserManagement'), 'useUserManagement')
      .mockReturnValue({ ...defaultMock, ...mockData });
  }
};

// Mock Supabase client
export const createMockSupabaseClient = () => {
  const mockClient = {
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
      getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
      signInWithPassword: vi.fn(),
      signUp: vi.fn(),
      signOut: vi.fn(),
      resetPasswordForEmail: vi.fn(),
      updateUser: vi.fn(),
      onAuthStateChange: vi.fn().mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } })
    },
    from: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    neq: vi.fn().mockReturnThis(),
    gt: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
    lt: vi.fn().mockReturnThis(),
    lte: vi.fn().mockReturnThis(),
    like: vi.fn().mockReturnThis(),
    ilike: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    contains: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    range: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: null, error: null }),
    maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
    then: vi.fn().mockResolvedValue({ data: [], error: null }),
    rpc: vi.fn().mockResolvedValue({ data: [], error: null }),
    storage: {
      from: vi.fn().mockReturnValue({
        upload: vi.fn().mockResolvedValue({ data: null, error: null }),
        download: vi.fn().mockResolvedValue({ data: null, error: null }),
        remove: vi.fn().mockResolvedValue({ data: null, error: null }),
        createSignedUrl: vi.fn().mockResolvedValue({ data: { signedUrl: 'https://example.com/file' }, error: null })
      })
    },
    functions: {
      invoke: vi.fn().mockResolvedValue({ data: null, error: null })
    }
  };

  return mockClient;
};

// Test utilities for common testing patterns
export const testUtils = {
  // Wait for loading states to resolve
  waitForLoadingToFinish: async () => {
    await new Promise(resolve => setTimeout(resolve, 100));
  },

  // Get element by test id with better error messages
  getByTestId: (testId: string) => {
    try {
      return document.querySelector(`[data-testid="${testId}"]`);
    } catch (error) {
      console.error(`Element with testId "${testId}" not found`);
      throw error;
    }
  },

  // Check if element exists without throwing
  queryByTestId: (testId: string) => {
    return document.querySelector(`[data-testid="${testId}"]`);
  },

  // Wait for element to appear
  waitForTestId: async (testId: string, timeout = 1000) => {
    await new Promise(resolve => setTimeout(resolve, timeout));
    return document.querySelector(`[data-testid="${testId}"]`);
  },

  // Mock window.matchMedia for responsive tests
  mockMatchMedia: (matches = false) => {
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation(query => ({
        matches,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });
  },

  // Mock intersection observer for infinite scroll tests
  mockIntersectionObserver: () => {
    const mockIntersectionObserver = vi.fn();
    mockIntersectionObserver.mockReturnValue({
      observe: () => null,
      unobserve: () => null,
      disconnect: () => null
    });
    window.IntersectionObserver = mockIntersectionObserver;
    window.IntersectionObserverEntry = vi.fn();
  },

  // Mock console methods for testing
  mockConsole: () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'log').mockImplementation(() => {});
  }
};

// Custom matchers for common assertions
export const customMatchers = {
  toBeVisible: (element: HTMLElement) => {
    const isVisible = element.offsetWidth > 0 && element.offsetHeight > 0;
    return {
      pass: isVisible,
      message: () => `Expected element to ${isVisible ? 'not ' : ''}be visible`
    };
  },

  toHaveLoadingState: (element: HTMLElement) => {
    const hasLoading = element.getAttribute('aria-busy') === 'true' || 
                     element.querySelector('[data-testid="loading"]') !== null;
    return {
      pass: hasLoading,
      message: () => `Expected element to ${hasLoading ? 'not ' : ''}have loading state`
    };
  }
};

// Re-export testing library utilities
export * from '@testing-library/react';
export { vi } from 'vitest';
export { default as userEvent } from '@testing-library/user-event';