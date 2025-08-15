import * as React from 'react';

interface AccessibilityContextType {
  announceToScreenReader: (message: string, priority?: 'polite' | 'assertive') => void;
  setFocusToMain: () => void;
  skipToContent: () => void;
}

const AccessibilityContext = React.createContext<AccessibilityContextType | null>(null);

export function AccessibilityProvider({ children }: { children: React.ReactNode }) {
  const announceRef = React.useRef<HTMLDivElement>(null);
  const mainRef = React.useRef<HTMLElement>(null);

  const announceToScreenReader = (message: string, priority: 'polite' | 'assertive' = 'polite') => {
    if (announceRef.current) {
      announceRef.current.setAttribute('aria-live', priority);
      announceRef.current.textContent = message;
      
      // Clear after announcement
      setTimeout(() => {
        if (announceRef.current) {
          announceRef.current.textContent = '';
        }
      }, 1000);
    }
  };

  const setFocusToMain = () => {
    if (mainRef.current) {
      mainRef.current.focus();
    }
  };

  const skipToContent = () => {
    const mainContent = document.querySelector('main');
    if (mainContent) {
      mainContent.focus();
      mainContent.scrollIntoView({ behavior: 'smooth' });
    }
  };

  React.useEffect(() => {
    // Set main ref to the main element
    const mainElement = document.querySelector('main');
    if (mainElement) {
      mainRef.current = mainElement as HTMLElement;
    }
  }, []);

  return (
    <AccessibilityContext.Provider 
      value={{ 
        announceToScreenReader, 
        setFocusToMain, 
        skipToContent 
      }}
    >
      {children}
      {/* Screen reader announcements */}
      <div
        ref={announceRef}
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
        role="status"
      />
    </AccessibilityContext.Provider>
  );
}

export function useAccessibility() {
  const context = React.useContext(AccessibilityContext);
  if (!context) {
    throw new Error('useAccessibility must be used within AccessibilityProvider');
  }
  return context;
}

// Skip to content link component
export function SkipToContent() {
  const { skipToContent } = useAccessibility();

  return (
    <a
      href="#main-content"
      onClick={(e) => {
        e.preventDefault();
        skipToContent();
      }}
      className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 bg-primary text-primary-foreground px-4 py-2 rounded-md font-medium"
    >
      Skip to main content
    </a>
  );
}

// Focus management hook
export function useFocusManagement() {
  const focusHistory = React.useRef<HTMLElement[]>([]);

  const saveFocus = () => {
    const activeElement = document.activeElement as HTMLElement;
    if (activeElement && activeElement !== document.body) {
      focusHistory.current.push(activeElement);
    }
  };

  const restoreFocus = () => {
    const lastFocused = focusHistory.current.pop();
    if (lastFocused && lastFocused.focus) {
      lastFocused.focus();
    }
  };

  const trapFocus = (containerRef: React.RefObject<HTMLElement>) => {
    const container = containerRef.current;
    if (!container) return;

    const focusableElements = container.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    
    const firstFocusable = focusableElements[0] as HTMLElement;
    const lastFocusable = focusableElements[focusableElements.length - 1] as HTMLElement;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Tab') {
        if (e.shiftKey) {
          if (document.activeElement === firstFocusable) {
            e.preventDefault();
            lastFocusable.focus();
          }
        } else {
          if (document.activeElement === lastFocusable) {
            e.preventDefault();
            firstFocusable.focus();
          }
        }
      }
    };

    container.addEventListener('keydown', handleKeyDown);
    firstFocusable?.focus();

    return () => {
      container.removeEventListener('keydown', handleKeyDown);
    };
  };

  return { saveFocus, restoreFocus, trapFocus };
}

// Keyboard navigation hook
export function useKeyboardNavigation() {
  const handleKeyDown = (e: KeyboardEvent, callbacks: Record<string, () => void>) => {
    const key = e.key.toLowerCase();
    const callback = callbacks[key];
    
    if (callback) {
      e.preventDefault();
      callback();
    }
  };

  const addGlobalKeyboardShortcuts = () => {
    const shortcuts = {
      '/': () => {
        // Focus search
        const searchInput = document.querySelector('input[type="search"]') as HTMLInputElement;
        if (searchInput) {
          searchInput.focus();
        }
      },
      'g h': () => {
        // Go to home/dashboard
        window.location.href = '/';
      },
      'g u': () => {
        // Go to users
        window.location.href = '/users';
      },
      'g s': () => {
        // Go to settings
        window.location.href = '/settings/profile';
      },
      'escape': () => {
        // Close modals/menus
        const activeElement = document.activeElement as HTMLElement;
        if (activeElement) {
          activeElement.blur();
        }
      }
    };

    let keySequence = '';
    let keyTimeout: NodeJS.Timeout;

    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      // Clear timeout and add key to sequence
      clearTimeout(keyTimeout);
      keySequence += e.key.toLowerCase() + ' ';
      
      // Check for matches
      Object.entries(shortcuts).forEach(([shortcut, callback]) => {
        if (keySequence.trim() === shortcut) {
          e.preventDefault();
          callback();
          keySequence = '';
          return;
        }
      });

      // Reset sequence after 1 second
      keyTimeout = setTimeout(() => {
        keySequence = '';
      }, 1000);
    };

    document.addEventListener('keydown', handleGlobalKeyDown);

    return () => {
      document.removeEventListener('keydown', handleGlobalKeyDown);
      clearTimeout(keyTimeout);
    };
  };

  return { handleKeyDown, addGlobalKeyboardShortcuts };
}

// ARIA live region hook
export function useAriaLiveRegion() {
  const liveRegionRef = React.useRef<HTMLDivElement>(null);

  const announce = (message: string, priority: 'off' | 'polite' | 'assertive' = 'polite') => {
    if (liveRegionRef.current) {
      liveRegionRef.current.setAttribute('aria-live', priority);
      liveRegionRef.current.textContent = message;
    }
  };

  const LiveRegion = () => (
    <div
      ref={liveRegionRef}
      aria-live="polite"
      aria-atomic="true"
      className="sr-only"
    />
  );

  return { announce, LiveRegion };
}

// Screen reader only text component
export function ScreenReaderOnly({ children }: { children: React.ReactNode }) {
  return (
    <span className="sr-only">
      {children}
    </span>
  );
}