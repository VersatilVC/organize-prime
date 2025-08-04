# Testing Guide

## Overview

This application uses a comprehensive testing setup with Vitest, React Testing Library, and custom testing utilities for reliable and maintainable tests.

## Testing Stack

- **Vitest**: Fast test runner with native ES modules support
- **React Testing Library**: Testing utilities focused on user interactions
- **@testing-library/jest-dom**: Custom Jest matchers for DOM elements
- **@testing-library/user-event**: Advanced user interaction simulation
- **jsdom**: DOM environment for Node.js

## Running Tests

```bash
# Run all tests
npm run test

# Run tests with UI
npm run test:ui

# Run tests once (CI mode)
npm run test:run

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Run tests with coverage UI
npm run test:coverage:ui
```

## Testing Utilities

### Custom Render Functions

```typescript
import { renderWithProviders, renderWithAuth, renderWithAuthAndOrg } from '@/test-utils';

// Basic render with all providers
renderWithProviders(<MyComponent />);

// Render with authenticated user
renderWithAuth(<MyComponent />, mockUser);

// Render with auth and organization context
renderWithAuthAndOrg(<MyComponent />, mockUser, mockOrg);
```

### Mock Data Factories

```typescript
import { createMockUser, createMockOrganization } from '@/test-utils';

const user = createMockUser({ role: 'admin' });
const org = createMockOrganization({ name: 'Test Company' });
```

### Hook Mocking

```typescript
import { mockHooks } from '@/test-utils';

// Mock useAuth hook
mockHooks.useAuth({ user: mockUser, loading: false });

// Mock useUserManagement hook
mockHooks.useUserManagement({ users: [mockUser1, mockUser2] });
```

## Test Structure

### Component Tests

```typescript
describe('ComponentName', () => {
  describe('Rendering', () => {
    it('renders correctly', () => {
      // Test basic rendering
    });
  });

  describe('Interactions', () => {
    it('handles user clicks', async () => {
      // Test user interactions
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA labels', () => {
      // Test accessibility
    });
  });
});
```

### Integration Tests

```typescript
describe('Page Integration', () => {
  beforeEach(() => {
    // Setup mocks
  });

  it('loads data and displays correctly', async () => {
    // Test full page functionality
  });
});
```

## Best Practices

### 1. Test User Behavior, Not Implementation

```typescript
// ✅ Good - tests user behavior
await user.click(screen.getByRole('button', { name: /invite user/i }));
expect(screen.getByRole('dialog')).toBeInTheDocument();

// ❌ Bad - tests implementation details
expect(setDialogOpen).toHaveBeenCalledWith(true);
```

### 2. Use Semantic Queries

```typescript
// ✅ Good - accessible queries
screen.getByRole('button', { name: /submit/i });
screen.getByLabelText(/email address/i);

// ❌ Bad - brittle selectors
screen.getByTestId('submit-btn');
screen.getByClassName('email-input');
```

### 3. Mock External Dependencies

```typescript
// Mock Supabase
vi.mock('@/integrations/supabase/client', () => ({
  supabase: createMockSupabaseClient()
}));

// Mock navigation
vi.mock('react-router-dom', () => ({
  useNavigate: () => vi.fn()
}));
```

### 4. Test Error States

```typescript
it('handles errors gracefully', async () => {
  mockHooks.useUserManagement({ error: new Error('Network error') });
  
  renderWithProviders(<UsersPage />);
  
  expect(screen.getByText(/failed to load users/i)).toBeInTheDocument();
});
```

### 5. Test Loading States

```typescript
it('shows loading spinner', () => {
  mockHooks.useUserManagement({ isLoading: true });
  
  renderWithProviders(<UsersPage />);
  
  expect(screen.getByTestId('loading')).toBeInTheDocument();
});
```

## Custom Matchers

```typescript
// Check if element is visible
expect(element).toBeVisible();

// Check if element has loading state
expect(element).toHaveLoadingState();

// Check if element has error state
expect(element).toHaveErrorState();
```

## Debugging Tests

### 1. Use screen.debug()

```typescript
import { screen } from '@testing-library/react';

it('debugs DOM state', () => {
  renderWithProviders(<MyComponent />);
  screen.debug(); // Prints current DOM
});
```

### 2. Use logRoles()

```typescript
import { logRoles } from '@testing-library/react';

it('logs available roles', () => {
  const { container } = renderWithProviders(<MyComponent />);
  logRoles(container); // Shows all available roles
});
```

### 3. Use waitFor for Async Operations

```typescript
import { waitFor } from '@testing-library/react';

it('waits for async updates', async () => {
  renderWithProviders(<AsyncComponent />);
  
  await waitFor(() => {
    expect(screen.getByText('Loaded')).toBeInTheDocument();
  });
});
```

## Coverage Requirements

- **Branches**: 80%
- **Functions**: 80% 
- **Lines**: 80%
- **Statements**: 80%

## File Organization

```
src/
├── components/
│   └── __tests__/         # Component tests
├── pages/
│   └── __tests__/         # Integration tests
├── hooks/
│   └── __tests__/         # Hook tests
├── lib/
│   └── __tests__/         # Utility tests
└── test-utils/            # Testing utilities
    ├── index.ts          # Main utilities
    └── setup.ts          # Test setup
```

## Continuous Integration

Tests run automatically on:
- Pull requests
- Main branch pushes
- Release branches

Coverage reports are generated and can be viewed in the CI/CD pipeline.

## Common Issues

### 1. Act Warnings

```typescript
// Use userEvent for interactions
const user = userEvent.setup();
await user.click(button);

// Or wrap in act() for direct state updates
await act(async () => {
  fireEvent.click(button);
});
```

### 2. Timer Issues

```typescript
// Use fake timers
vi.useFakeTimers();

// Advance timers
vi.advanceTimersByTime(1000);

// Restore real timers
vi.useRealTimers();
```

### 3. Async Component Loading

```typescript
// Wait for lazy components
await waitFor(() => {
  expect(screen.getByText('Component Loaded')).toBeInTheDocument();
});
```

This testing infrastructure ensures high code quality and reliable functionality across the entire application.