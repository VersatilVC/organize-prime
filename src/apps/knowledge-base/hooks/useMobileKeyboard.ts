import { useState, useEffect, useCallback } from 'react';

interface UseMobileKeyboardReturn {
  keyboardOpen: boolean;
  keyboardHeight: number;
  viewportHeight: number;
  adjustedHeight: number;
  isLandscape: boolean;
  isMobile: boolean;
}

export function useMobileKeyboard(): UseMobileKeyboardReturn {
  const [keyboardOpen, setKeyboardOpen] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [viewportHeight, setViewportHeight] = useState(window.innerHeight);
  const [isLandscape, setIsLandscape] = useState(window.innerWidth > window.innerHeight);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  // Initial viewport height (before keyboard)
  const initialViewportHeightRef = useState(() => window.visualViewport?.height || window.innerHeight)[0];

  // Check if device is mobile
  const checkMobile = useCallback(() => {
    const mobile = window.innerWidth < 768;
    const landscape = window.innerWidth > window.innerHeight;
    setIsMobile(mobile);
    setIsLandscape(landscape);
  }, []);

  // Handle viewport changes (keyboard show/hide)
  const handleViewportChange = useCallback(() => {
    const currentHeight = window.visualViewport?.height || window.innerHeight;
    const heightDifference = initialViewportHeightRef - currentHeight;
    
    setViewportHeight(currentHeight);
    
    // Detect keyboard on mobile devices
    if (isMobile && heightDifference > 150) {
      setKeyboardOpen(true);
      setKeyboardHeight(heightDifference);
    } else {
      setKeyboardOpen(false);
      setKeyboardHeight(0);
    }
  }, [isMobile, initialViewportHeightRef]);

  // Handle orientation change
  const handleOrientationChange = useCallback(() => {
    // Small delay to ensure viewport has updated
    setTimeout(() => {
      checkMobile();
      handleViewportChange();
    }, 100);
  }, [checkMobile, handleViewportChange]);

  // Set up event listeners
  useEffect(() => {
    // Initial check
    checkMobile();
    handleViewportChange();

    // Visual Viewport API (better for keyboard detection)
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', handleViewportChange);
    } else {
      // Fallback for older browsers
      window.addEventListener('resize', handleViewportChange);
    }

    // Orientation change
    window.addEventListener('orientationchange', handleOrientationChange);
    
    // Regular resize for desktop
    window.addEventListener('resize', checkMobile);

    return () => {
      if (window.visualViewport) {
        window.visualViewport.removeEventListener('resize', handleViewportChange);
      } else {
        window.removeEventListener('resize', handleViewportChange);
      }
      window.removeEventListener('orientationchange', handleOrientationChange);
      window.removeEventListener('resize', checkMobile);
    };
  }, [checkMobile, handleViewportChange, handleOrientationChange]);

  // Additional mobile-specific optimizations
  useEffect(() => {
    if (isMobile && keyboardOpen) {
      // Prevent body scroll when keyboard is open
      document.body.style.position = 'fixed';
      document.body.style.top = '0';
      document.body.style.left = '0';
      document.body.style.right = '0';
      document.body.style.bottom = '0';
    } else {
      // Restore normal scrolling
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.left = '';
      document.body.style.right = '';
      document.body.style.bottom = '';
    }

    return () => {
      // Cleanup on unmount
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.left = '';
      document.body.style.right = '';
      document.body.style.bottom = '';
    };
  }, [isMobile, keyboardOpen]);

  return {
    keyboardOpen,
    keyboardHeight,
    viewportHeight,
    adjustedHeight: keyboardOpen ? viewportHeight : initialViewportHeightRef,
    isLandscape,
    isMobile
  };
}