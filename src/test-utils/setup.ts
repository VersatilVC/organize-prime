// Test setup file - runs before all tests
import '@testing-library/jest-dom';
import { beforeAll, afterEach, beforeEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';
import { testUtils } from './index';

// Setup global test environment
beforeAll(() => {
  // Mock environment variables
  vi.stubEnv('NODE_ENV', 'test');
  vi.stubEnv('VITE_SUPABASE_URL', 'https://test.supabase.co');
  vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'sb_publishable_test_key_for_testing_environment_12345');

  // Mock browser APIs that might not be available in jsdom
  testUtils.mockMatchMedia();
  testUtils.mockIntersectionObserver();

  // Mock window.scrollTo
  window.scrollTo = vi.fn();

  // Mock ResizeObserver
  global.ResizeObserver = vi.fn().mockImplementation(() => ({
    observe: vi.fn(),
    unobserve: vi.fn(),
    disconnect: vi.fn(),
  }));

  // Mock fetch for tests that might make network requests
  global.fetch = vi.fn();

  // Mock crypto for UUID generation
  Object.defineProperty(global, 'crypto', {
    value: {
      getRandomValues: vi.fn().mockReturnValue(new Uint8Array(16)),
      randomUUID: vi.fn().mockReturnValue('mock-uuid-1234')
    }
  });

  // Mock URL.createObjectURL
  global.URL.createObjectURL = vi.fn().mockReturnValue('mock-object-url');
  global.URL.revokeObjectURL = vi.fn();

  // Mock File and FileReader
  global.File = class MockFile {
    name: string;
    size: number;
    type: string;
    lastModified: number;

    constructor(bits: any[], name: string, options: any = {}) {
      this.name = name;
      this.size = options.size || 0;
      this.type = options.type || '';
      this.lastModified = options.lastModified || Date.now();
    }
  } as any;

  global.FileReader = class MockFileReader {
    result: any = null;
    error: any = null;
    readyState: number = 0;
    onload: any = null;
    onerror: any = null;
    onloadend: any = null;

    readAsText = vi.fn();
    readAsDataURL = vi.fn().mockImplementation(() => {
      this.readyState = 2;
      this.result = 'data:text/plain;base64,dGVzdA==';
      this.onload?.();
      this.onloadend?.();
    });
    abort = vi.fn();
  } as any;
});

// Cleanup after each test
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  vi.clearAllTimers();
  
  // Reset any dom changes
  document.body.innerHTML = '';
  document.head.innerHTML = '';
});

// Setup before each test
beforeEach(() => {
  // Reset fetch mock
  if (global.fetch) {
    (global.fetch as any).mockClear();
  }
  
  // Clear any stored data
  localStorage.clear();
  sessionStorage.clear();
  
  // Reset console mocks if they were set up
  if (vi.isMockFunction(console.error)) {
    (console.error as any).mockClear();
  }
  if (vi.isMockFunction(console.warn)) {
    (console.warn as any).mockClear();
  }
  if (vi.isMockFunction(console.log)) {
    (console.log as any).mockClear();
  }
});

// Global error handler for unhandled test errors
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// Increase timeout for slow tests
vi.setConfig({ testTimeout: 10000 });

// Mock Supabase client globally
vi.mock('@/integrations/supabase/client', () => {
  const { createMockSupabaseClient } = require('./index');
  return {
    supabase: createMockSupabaseClient()
  };
});

// Mock error handling module to prevent console noise
vi.mock('@/lib/error-handling', () => ({
  useErrorHandler: () => ({
    handleError: vi.fn(),
    withErrorHandling: (fn: any) => fn,
    withErrorHandlingSync: (fn: any) => fn
  }),
  ErrorHandler: {
    getInstance: () => ({
      handleError: vi.fn(),
      getUserFriendlyMessage: vi.fn().mockReturnValue('Test error message')
    })
  },
  setupGlobalErrorHandling: vi.fn(),
  ErrorSeverity: {
    LOW: 'low',
    MEDIUM: 'medium',
    HIGH: 'high',
    CRITICAL: 'critical'
  }
}));

// Mock react-router-dom to prevent navigation during tests
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => vi.fn(),
    useLocation: () => ({ pathname: '/', search: '', hash: '', state: null }),
    useParams: () => ({}),
    useSearchParams: () => [new URLSearchParams(), vi.fn()]
  };
});

// Mock next-themes
vi.mock('next-themes', () => ({
  ThemeProvider: ({ children }: { children: React.ReactNode }) => children,
  useTheme: () => ({
    theme: 'light',
    setTheme: vi.fn(),
    themes: ['light', 'dark'],
    systemTheme: 'light'
  })
}));

// Extend expect with custom matchers  
import { expect } from 'vitest';
expect.extend({
  toBeVisible(element: HTMLElement) {
    const isVisible = element.offsetWidth > 0 && element.offsetHeight > 0;
    return {
      pass: isVisible,
      message: () => `Expected element to ${isVisible ? 'not ' : ''}be visible`
    };
  },

  toHaveLoadingState(element: HTMLElement) {
    const hasLoading = element.getAttribute('aria-busy') === 'true' || 
                     element.querySelector('[data-testid="loading"]') !== null ||
                     element.querySelector('.animate-pulse') !== null;
    return {
      pass: hasLoading,
      message: () => `Expected element to ${hasLoading ? 'not ' : ''}have loading state`
    };
  },

  toHaveErrorState(element: HTMLElement) {
    const hasError = element.getAttribute('aria-invalid') === 'true' ||
                    element.querySelector('[role="alert"]') !== null ||
                    element.classList.contains('error');
    return {
      pass: hasError,
      message: () => `Expected element to ${hasError ? 'not ' : ''}have error state`
    };
  }
});

// Declare custom matchers for TypeScript
declare global {
  namespace Vi {
    interface Assertion<T = any> {
      toBeVisible(): T;
      toHaveLoadingState(): T;
      toHaveErrorState(): T;
    }
  }
}