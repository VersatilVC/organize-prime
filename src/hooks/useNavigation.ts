import { useCallback } from 'react';
import { prefetchByPath } from '@/lib/route-prefetch';

export function useNavigation() {
  const navigateTo = useCallback((path: string) => {
    // Close mobile menu if open
    window.dispatchEvent(new CustomEvent('mobile-sidebar-close'));
    
    // Navigate to new path
    window.location.href = path;
  }, []);

  const prefetchRoute = useCallback((path: string) => {
    prefetchByPath(path);
  }, []);

  const isActivePath = useCallback((path: string, currentPath?: string) => {
    const current = currentPath || window.location.pathname;
    
    // Exact match
    if (path === current) {
      return true;
    }
    
    // Parent-child relationship (but not for root paths)
    if (current.startsWith(path + '/') && path !== '/' && path !== '/dashboard') {
      const childPath = current.replace(path + '/', '');
      // Only active if there's exactly one more segment (direct child)
      return !childPath.includes('/');
    }
    
    return false;
  }, []);

  return {
    navigateTo,
    prefetchRoute,
    isActivePath
  };
}