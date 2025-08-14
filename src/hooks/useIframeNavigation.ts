import { useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { IframeUtils } from '@/lib/iframe-utils';

export interface IframeNavigationResult {
  navigateTo: (path: string) => void;
  iframeContext: ReturnType<typeof IframeUtils.getIframeContext>;
  isInIframe: boolean;
  isLovablePreview: boolean;
}

/**
 * Hook for iframe-aware navigation
 * Uses React Router navigate for smooth in-app navigation
 * Falls back to iframe breaking for external scenarios
 */
export function useIframeNavigation(): IframeNavigationResult {
  const navigate = useNavigate();
  const iframeContext = useMemo(() => IframeUtils.getIframeContext(), []);
  
  const navigateTo = useCallback((path: string) => {
    console.log('useIframeNavigation - Navigation attempt:', { 
      path, 
      isInIframe: iframeContext.isInIframe,
      isLovablePreview: iframeContext.isLovablePreview
    });
    
    // For OAuth or external URLs, break out of iframe
    if (path.includes('/auth') && path.includes('provider=google')) {
      console.log('OAuth detected - breaking out of iframe');
      IframeUtils.breakOutOfIframe(path);
      return;
    }
    
    // For internal navigation, use React Router for smooth navigation
    if (path.startsWith('/') && !path.startsWith('http')) {
      console.log('Using React Router navigation for smooth transition');
      navigate(path);
    } else {
      // For external URLs or full URLs, use standard navigation
      console.log('External URL - using standard navigation');
      window.location.href = path;
    }
  }, [navigate, iframeContext]);

  return {
    navigateTo,
    iframeContext,
    isInIframe: iframeContext.isInIframe,
    isLovablePreview: iframeContext.isLovablePreview
  };
}