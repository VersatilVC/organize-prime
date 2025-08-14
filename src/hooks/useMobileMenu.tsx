import { useState, useEffect } from 'react';

export function useMobileMenu() {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const handleToggle = () => {
      setIsOpen(prev => !prev);
    };

    const handleClose = () => {
      setIsOpen(false);
    };

    // Listen for custom toggle events
    window.addEventListener('mobile-sidebar-toggle', handleToggle);
    window.addEventListener('mobile-sidebar-close', handleClose);

    // Close on route change
    const handleRouteChange = () => {
      setIsOpen(false);
    };

    window.addEventListener('popstate', handleRouteChange);

    return () => {
      window.removeEventListener('mobile-sidebar-toggle', handleToggle);
      window.removeEventListener('mobile-sidebar-close', handleClose);
      window.removeEventListener('popstate', handleRouteChange);
    };
  }, []);

  const toggleMenu = () => {
    setIsOpen(prev => !prev);
  };

  const closeMenu = () => {
    setIsOpen(false);
  };

  return {
    isOpen,
    toggleMenu,
    closeMenu,
    setIsOpen
  };
}