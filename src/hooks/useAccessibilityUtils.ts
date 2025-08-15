import { useEffect, useRef, useCallback } from 'react';
import { useAccessibility } from '@/components/accessibility/AccessibilityProvider';

/**
 * Custom hook for common accessibility utilities and patterns
 */
export function useAccessibilityUtils() {
  const { announceToScreenReader } = useAccessibility();

  /**
   * Announce status changes to screen readers
   */
  const announceStatus = useCallback((message: string, priority: 'polite' | 'assertive' = 'polite') => {
    announceToScreenReader(message, priority);
  }, [announceToScreenReader]);

  /**
   * Focus management for dynamic content
   */
  const focusElement = useCallback((selector: string | HTMLElement) => {
    const element = typeof selector === 'string' ? document.querySelector(selector) : selector;
    if (element && element instanceof HTMLElement) {
      element.focus();
    }
  }, []);

  /**
   * Trap focus within a container (useful for modals)
   */
  const useFocusTrap = (containerRef: React.RefObject<HTMLElement>, isActive: boolean = true) => {
    useEffect(() => {
      if (!isActive || !containerRef.current) return;

      const container = containerRef.current;
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
              lastFocusable?.focus();
            }
          } else {
            if (document.activeElement === lastFocusable) {
              e.preventDefault();
              firstFocusable?.focus();
            }
          }
        }
        
        if (e.key === 'Escape') {
          // Let parent components handle escape
          container.dispatchEvent(new CustomEvent('escape-pressed', { bubbles: true }));
        }
      };

      container.addEventListener('keydown', handleKeyDown);
      firstFocusable?.focus();

      return () => {
        container.removeEventListener('keydown', handleKeyDown);
      };
    }, [containerRef, isActive]);
  };

  /**
   * Manage aria-expanded state for collapsible content
   */
  const useAriaExpanded = (isExpanded: boolean) => {
    return {
      'aria-expanded': isExpanded,
      'aria-pressed': isExpanded
    };
  };

  /**
   * Generate unique IDs for accessibility relationships
   */
  const useUniqueId = (prefix: string = 'id') => {
    const idRef = useRef<string>();
    
    if (!idRef.current) {
      idRef.current = `${prefix}-${Math.random().toString(36).substr(2, 9)}`;
    }
    
    return idRef.current;
  };

  /**
   * Handle roving tabindex for composite widgets
   */
  const useRovingTabIndex = (
    containerRef: React.RefObject<HTMLElement>,
    activeIndex: number,
    setActiveIndex: (index: number) => void
  ) => {
    useEffect(() => {
      if (!containerRef.current) return;

      const items = Array.from(
        containerRef.current.querySelectorAll('[role="tab"], [role="menuitem"], [role="option"]')
      ) as HTMLElement[];

      items.forEach((item, index) => {
        item.tabIndex = index === activeIndex ? 0 : -1;
      });

      const handleKeyDown = (e: KeyboardEvent) => {
        const { key } = e;
        let newIndex = activeIndex;

        switch (key) {
          case 'ArrowLeft':
          case 'ArrowUp':
            e.preventDefault();
            newIndex = activeIndex > 0 ? activeIndex - 1 : items.length - 1;
            break;
          case 'ArrowRight':
          case 'ArrowDown':
            e.preventDefault();
            newIndex = activeIndex < items.length - 1 ? activeIndex + 1 : 0;
            break;
          case 'Home':
            e.preventDefault();
            newIndex = 0;
            break;
          case 'End':
            e.preventDefault();
            newIndex = items.length - 1;
            break;
        }

        if (newIndex !== activeIndex) {
          setActiveIndex(newIndex);
          items[newIndex]?.focus();
        }
      };

      containerRef.current.addEventListener('keydown', handleKeyDown);

      return () => {
        containerRef.current?.removeEventListener('keydown', handleKeyDown);
      };
    }, [containerRef, activeIndex, setActiveIndex]);
  };

  /**
   * Announce loading states
   */
  const announceLoading = useCallback((isLoading: boolean, loadingMessage = 'Loading...', completeMessage = 'Content loaded') => {
    if (isLoading) {
      announceStatus(loadingMessage, 'polite');
    } else {
      announceStatus(completeMessage, 'polite');
    }
  }, [announceStatus]);

  /**
   * Announce form validation errors
   */
  const announceFormErrors = useCallback((errors: string[]) => {
    if (errors.length > 0) {
      const message = errors.length === 1 
        ? `Error: ${errors[0]}` 
        : `${errors.length} errors found: ${errors.join(', ')}`;
      announceStatus(message, 'assertive');
    }
  }, [announceStatus]);

  /**
   * Generate ARIA attributes for form controls
   */
  const getFormControlProps = (
    id: string,
    options: {
      required?: boolean;
      invalid?: boolean;
      describedBy?: string;
      label?: string;
    } = {}
  ) => {
    const props: Record<string, any> = {
      id,
      'aria-required': options.required || undefined,
      'aria-invalid': options.invalid || undefined,
      'aria-describedby': options.describedBy || undefined,
      'aria-label': options.label || undefined
    };

    // Clean up undefined values
    Object.keys(props).forEach(key => {
      if (props[key] === undefined) {
        delete props[key];
      }
    });

    return props;
  };

  /**
   * Create live region for dynamic content announcements
   */
  const useLiveRegion = () => {
    const liveRegionRef = useRef<HTMLDivElement>(null);

    const announce = useCallback((message: string, priority: 'off' | 'polite' | 'assertive' = 'polite') => {
      if (liveRegionRef.current) {
        liveRegionRef.current.setAttribute('aria-live', priority);
        liveRegionRef.current.textContent = message;
        
        // Clear after announcement
        setTimeout(() => {
          if (liveRegionRef.current) {
            liveRegionRef.current.textContent = '';
          }
        }, 1000);
      }
    }, []);

    const LiveRegion = useCallback(() => (
      <div
        ref={liveRegionRef}
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
        role="status"
      />
    ), []);

    return { announce, LiveRegion };
  };

  return {
    announceStatus,
    focusElement,
    useFocusTrap,
    useAriaExpanded,
    useUniqueId,
    useRovingTabIndex,
    announceLoading,
    announceFormErrors,
    getFormControlProps,
    useLiveRegion
  };
}

/**
 * Hook for keyboard navigation shortcuts
 */
export function useKeyboardShortcuts() {
  const addShortcut = useCallback((
    key: string,
    callback: () => void,
    options: { ctrl?: boolean; alt?: boolean; shift?: boolean } = {}
  ) => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const { ctrl = false, alt = false, shift = false } = options;
      
      if (
        e.key.toLowerCase() === key.toLowerCase() &&
        e.ctrlKey === ctrl &&
        e.altKey === alt &&
        e.shiftKey === shift
      ) {
        e.preventDefault();
        callback();
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  return { addShortcut };
}

/**
 * Hook for managing reduced motion preferences
 */
export function useReducedMotion() {
  const prefersReducedMotion = useRef(
    typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const handleChange = (e: MediaQueryListEvent) => {
      prefersReducedMotion.current = e.matches;
    };

    mediaQuery.addListener(handleChange);

    return () => {
      mediaQuery.removeListener(handleChange);
    };
  }, []);

  return prefersReducedMotion.current;
}

/**
 * Hook for managing high contrast preferences
 */
export function useHighContrast() {
  const prefersHighContrast = useRef(
    typeof window !== 'undefined' && window.matchMedia('(prefers-contrast: high)').matches
  );

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const mediaQuery = window.matchMedia('(prefers-contrast: high)');
    const handleChange = (e: MediaQueryListEvent) => {
      prefersHighContrast.current = e.matches;
    };

    mediaQuery.addListener(handleChange);

    return () => {
      mediaQuery.removeListener(handleChange);
    };
  }, []);

  return prefersHighContrast.current;
}