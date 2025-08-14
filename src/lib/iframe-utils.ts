// Iframe detection and management utilities for OAuth compatibility
export class IframeUtils {
  /**
   * Detect if the current context is inside an iframe
   */
  static isInIframe(): boolean {
    try {
      return window.self !== window.top;
    } catch (e) {
      // In some cases, accessing window.top throws an error due to cross-origin restrictions
      return true;
    }
  }

  /**
   * Detect if this is a Lovable preview environment
   */
  static isLovablePreview(): boolean {
    try {
      const currentOrigin = window.location.origin;
      const parentOrigin = document.referrer ? new URL(document.referrer).origin : '';
      
      return (
        currentOrigin.includes('lovableproject.com') ||
        parentOrigin.includes('lovable.dev') ||
        parentOrigin.includes('lovable.app') ||
        this.isInIframe()
      );
    } catch (e) {
      return false;
    }
  }

  /**
   * Get iframe context information for debugging
   */
  static getIframeContext() {
    const context = {
      isInIframe: this.isInIframe(),
      isLovablePreview: this.isLovablePreview(),
      currentOrigin: window.location.origin,
      currentUrl: window.location.href,
      parentOrigin: null as string | null,
      userAgent: navigator.userAgent,
      timestamp: new Date().toISOString()
    };

    try {
      if (document.referrer) {
        context.parentOrigin = new URL(document.referrer).origin;
      }
    } catch (e) {
      console.debug('Could not determine parent origin:', e);
    }

    return context;
  }

  /**
   * Get the appropriate redirect URL based on iframe context
   */
  static getRedirectUrl(): string {
    const context = this.getIframeContext();
    
    if (context.isInIframe && context.parentOrigin) {
      // For iframe context, try to use parent window origin
      return `${context.parentOrigin}/auth/callback`;
    }
    
    // Fallback to current window origin
    return `${window.location.origin}/auth/callback`;
  }

  /**
   * Navigate within iframe context or break out when appropriate
   * For iframe preview: use internal navigation to maintain preview experience
   * For OAuth/external: break out of iframe
   */
  static openInParent(url: string): void {
    try {
      if (this.isInIframe()) {
        // For iframe preview, prefer internal navigation to maintain preview experience
        console.log('🖼️ Iframe navigation - staying within iframe for preview');
        window.location.href = url;
      } else {
        console.log('📱 Standard navigation');
        window.location.href = url;
      }
    } catch (e) {
      console.error('❌ Navigation failed:', e);
      window.location.href = url;
    }
  }

  /**
   * Break out of iframe (for OAuth, external links, etc.)
   * This is for specific cases where we need to escape the iframe
   */
  static breakOutOfIframe(url: string): void {
    try {
      if (this.isInIframe() && window.parent) {
        console.log('🚀 Breaking out of iframe to parent:', url);
        
        // Use postMessage for secure iframe-to-parent communication
        window.parent.postMessage({
          type: 'LOVABLE_NAVIGATE',
          url: url,
          source: 'iframe-app',
          timestamp: Date.now()
        }, '*');
        
        // Fallback: open in new tab if postMessage doesn't work
        setTimeout(() => {
          console.log('⚠️ PostMessage timeout - opening in new tab');
          window.open(url, '_blank');
        }, 1000);
        
      } else {
        window.location.href = url;
      }
    } catch (e) {
      console.error('❌ Failed to break out of iframe:', e);
      window.open(url, '_blank');
    }
  }

  /**
   * Post message to parent window for OAuth coordination
   */
  static postToParent(data: any): void {
    try {
      if (this.isInIframe() && window.parent) {
        window.parent.postMessage({
          type: 'iframe-oauth',
          ...data
        }, '*');
      }
    } catch (e) {
      console.error('Failed to post message to parent:', e);
    }
  }

  /**
   * Create "Open in New Tab" URL for OAuth
   */
  static createNewTabUrl(): string {
    const baseUrl = window.location.origin;
    return `${baseUrl}/auth?oauth=google&context=newtab`;
  }

  /**
   * Handle OAuth in new tab (escape iframe restrictions)
   */
  static handleOAuthInNewTab(): Promise<{ error: Error | null }> {
    return new Promise((resolve) => {
      try {
        const newTabUrl = this.createNewTabUrl();
        const newTab = window.open(newTabUrl, '_blank', 'width=500,height=600,scrollbars=yes,resizable=yes');
        
        if (!newTab) {
          resolve({ error: new Error('Popup blocked. Please allow popups and try again.') });
          return;
        }

        // Listen for OAuth completion message
        const messageListener = (event: MessageEvent) => {
          if (event.data.type === 'oauth-complete') {
            window.removeEventListener('message', messageListener);
            newTab.close();
            
            if (event.data.success) {
              // Reload current page to pick up the new session
              window.location.reload();
            } else {
              resolve({ error: new Error(event.data.error || 'OAuth failed') });
            }
          }
        };

        window.addEventListener('message', messageListener);

        // Timeout after 2 minutes
        setTimeout(() => {
          window.removeEventListener('message', messageListener);
          newTab.close();
          resolve({ error: new Error('OAuth timeout - please try again') });
        }, 120000);

      } catch (error) {
        resolve({ error: error as Error });
      }
    });
  }

  /**
   * Log iframe context for debugging
   */
  static logIframeContext(): void {
    const context = this.getIframeContext();
    
    console.log('🖼️ Iframe Context:', context);
    
    if (context.isInIframe) {
      console.log('📱 Running in iframe - OAuth may need special handling');
    }
    
    if (context.isLovablePreview) {
      console.log('💜 Lovable preview detected - iframe OAuth fallbacks available');
    }
  }
}

// Global iframe debugging functions
if (typeof window !== 'undefined') {
  (window as any).iframeDebug = {
    context: () => IframeUtils.getIframeContext(),
    isIframe: () => IframeUtils.isInIframe(),
    isLovable: () => IframeUtils.isLovablePreview(),
    log: () => IframeUtils.logIframeContext()
  };
}