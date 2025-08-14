import { useCallback, useMemo } from 'react';
import { IframeUtils } from '@/lib/iframe-utils';

export interface IframeNavigationResult {
  navigateTo: (path: string) => void;
  iframeContext: ReturnType<typeof IframeUtils.getIframeContext>;
  isInIframe: boolean;
  isLovablePreview: boolean;
}

/**
 * Hook for iframe-aware navigation
 * Automatically detects iframe context and uses appropriate navigation method
 */
export function useIframeNavigation(): IframeNavigationResult {
  const iframeContext = useMemo(() => IframeUtils.getIframeContext(), []);
  
  const navigateTo = useCallback((path: string) => {
    console.log('useIframeNavigation - Navigation attempt:', { 
      path, 
      isInIframe: iframeContext.isInIframe,
      isLovablePreview: iframeContext.isLovablePreview
    });
    
    if (iframeContext.isInIframe) {
      console.log('Using iframe-aware navigation (openInParent)');
      IframeUtils.openInParent(path);
    } else {
      console.log('Using standard navigation (window.location.href)');
      window.location.href = path;
    }
  }, [iframeContext.isInIframe]);

  return {
    navigateTo,
    iframeContext,
    isInIframe: iframeContext.isInIframe,
    isLovablePreview: iframeContext.isLovablePreview
  };
}