import { useState, useEffect, useCallback } from 'react';

interface NetworkStatus {
  online: boolean;
  effectiveType: string;
  downlink: number;
  rtt: number;
  saveData: boolean;
}

interface DeviceCapabilities {
  hasJavaScript: boolean;
  supportsIntersectionObserver: boolean;
  supportsServiceWorker: boolean;
  supportsWebP: boolean;
  supportsTouch: boolean;
  isLowEndDevice: boolean;
  deviceMemory: number;
  hardwareConcurrency: number;
}

interface ProgressiveEnhancementState {
  networkStatus: NetworkStatus;
  deviceCapabilities: DeviceCapabilities;
  shouldReduceAnimations: boolean;
  shouldLazyLoad: boolean;
  shouldPreload: boolean;
  imageFormat: 'webp' | 'jpg';
  enableAdvancedFeatures: boolean;
}

/**
 * Hook for progressive enhancement based on device and network capabilities
 */
export function useProgressiveEnhancement(): ProgressiveEnhancementState {
  const [networkStatus, setNetworkStatus] = useState<NetworkStatus>({
    online: navigator.onLine,
    effectiveType: 'unknown',
    downlink: 0,
    rtt: 0,
    saveData: false
  });

  const [deviceCapabilities, setDeviceCapabilities] = useState<DeviceCapabilities>({
    hasJavaScript: true, // Obviously true if this is running
    supportsIntersectionObserver: 'IntersectionObserver' in window,
    supportsServiceWorker: 'serviceWorker' in navigator,
    supportsWebP: false,
    supportsTouch: 'ontouchstart' in window,
    isLowEndDevice: false,
    deviceMemory: (navigator as any).deviceMemory || 4,
    hardwareConcurrency: navigator.hardwareConcurrency || 4
  });

  // Detect WebP support
  const detectWebPSupport = useCallback(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 1;
    canvas.height = 1;
    return canvas.toDataURL('image/webp').indexOf('data:image/webp') === 0;
  }, []);

  // Update network status
  useEffect(() => {
    const updateNetworkStatus = () => {
      const connection = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;
      
      setNetworkStatus({
        online: navigator.onLine,
        effectiveType: connection?.effectiveType || 'unknown',
        downlink: connection?.downlink || 0,
        rtt: connection?.rtt || 0,
        saveData: connection?.saveData || false
      });
    };

    const handleOnline = () => updateNetworkStatus();
    const handleOffline = () => updateNetworkStatus();
    const handleConnectionChange = () => updateNetworkStatus();

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    const connection = (navigator as any).connection;
    if (connection) {
      connection.addEventListener('change', handleConnectionChange);
    }

    // Initial update
    updateNetworkStatus();

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      if (connection) {
        connection.removeEventListener('change', handleConnectionChange);
      }
    };
  }, []);

  // Update device capabilities
  useEffect(() => {
    const updateDeviceCapabilities = () => {
      const memory = (navigator as any).deviceMemory || 4;
      const cores = navigator.hardwareConcurrency || 4;
      
      setDeviceCapabilities(prev => ({
        ...prev,
        supportsWebP: detectWebPSupport(),
        deviceMemory: memory,
        hardwareConcurrency: cores,
        isLowEndDevice: memory <= 2 || cores <= 2
      }));
    };

    updateDeviceCapabilities();
  }, [detectWebPSupport]);

  // Calculate progressive enhancement decisions
  const shouldReduceAnimations = 
    deviceCapabilities.isLowEndDevice || 
    networkStatus.effectiveType === 'slow-2g' || 
    networkStatus.effectiveType === '2g' ||
    networkStatus.saveData;

  const shouldLazyLoad = 
    deviceCapabilities.supportsIntersectionObserver && 
    (networkStatus.effectiveType === 'slow-2g' || 
     networkStatus.effectiveType === '2g' || 
     networkStatus.saveData);

  const shouldPreload = 
    networkStatus.online && 
    (networkStatus.effectiveType === '4g' || networkStatus.effectiveType === '3g') && 
    !networkStatus.saveData && 
    !deviceCapabilities.isLowEndDevice;

  const imageFormat = deviceCapabilities.supportsWebP ? 'webp' : 'jpg';

  const enableAdvancedFeatures = 
    !deviceCapabilities.isLowEndDevice && 
    networkStatus.online && 
    networkStatus.effectiveType !== 'slow-2g' && 
    networkStatus.effectiveType !== '2g';

  return {
    networkStatus,
    deviceCapabilities,
    shouldReduceAnimations,
    shouldLazyLoad,
    shouldPreload,
    imageFormat,
    enableAdvancedFeatures
  };
}

/**
 * Hook for adaptive loading based on network conditions
 */
export function useAdaptiveLoading() {
  const { networkStatus, deviceCapabilities } = useProgressiveEnhancement();

  const getImageQuality = useCallback(() => {
    if (networkStatus.saveData || networkStatus.effectiveType === 'slow-2g') {
      return 'low';
    }
    if (networkStatus.effectiveType === '2g' || deviceCapabilities.isLowEndDevice) {
      return 'medium';
    }
    return 'high';
  }, [networkStatus, deviceCapabilities]);

  const shouldLoadComponent = useCallback((priority: 'high' | 'medium' | 'low') => {
    if (!networkStatus.online) return false;
    
    switch (priority) {
      case 'high':
        return true;
      case 'medium':
        return networkStatus.effectiveType !== 'slow-2g' && !networkStatus.saveData;
      case 'low':
        return (networkStatus.effectiveType === '4g' || networkStatus.effectiveType === '3g') && 
               !networkStatus.saveData && 
               !deviceCapabilities.isLowEndDevice;
      default:
        return true;
    }
  }, [networkStatus, deviceCapabilities]);

  const getChunkLoadingStrategy = useCallback(() => {
    if (deviceCapabilities.isLowEndDevice || networkStatus.saveData) {
      return 'minimal'; // Load only essential chunks
    }
    if (networkStatus.effectiveType === 'slow-2g' || networkStatus.effectiveType === '2g') {
      return 'conservative'; // Load chunks on demand
    }
    return 'aggressive'; // Preload chunks
  }, [networkStatus, deviceCapabilities]);

  return {
    getImageQuality,
    shouldLoadComponent,
    getChunkLoadingStrategy
  };
}

/**
 * Hook for feature detection and polyfill loading
 */
export function useFeatureDetection() {
  const [features, setFeatures] = useState({
    intersectionObserver: 'IntersectionObserver' in window,
    webAnimations: 'animate' in document.createElement('div'),
    cssGrid: CSS.supports('display', 'grid'),
    cssCustomProperties: CSS.supports('color', 'var(--test)'),
    fetch: 'fetch' in window,
    promises: 'Promise' in window,
    asyncAwait: true, // If this code is running, async/await is supported
    modules: 'noModule' in document.createElement('script')
  });

  const loadPolyfill = useCallback(async (feature: string) => {
    switch (feature) {
      case 'intersectionObserver':
        if (!features.intersectionObserver) {
          await import('intersection-observer');
          setFeatures(prev => ({ ...prev, intersectionObserver: true }));
        }
        break;
      case 'fetch':
        if (!features.fetch) {
          await import('whatwg-fetch');
          setFeatures(prev => ({ ...prev, fetch: true }));
        }
        break;
      case 'promises':
        if (!features.promises) {
          await import('es6-promise/auto');
          setFeatures(prev => ({ ...prev, promises: true }));
        }
        break;
    }
  }, [features]);

  return {
    features,
    loadPolyfill
  };
}

/**
 * Hook for connection-aware data fetching
 */
export function useConnectionAwareQuery() {
  const { networkStatus } = useProgressiveEnhancement();

  const getQueryConfig = useCallback((priority: 'high' | 'medium' | 'low') => {
    const baseConfig = {
      retry: 1,
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000, // 10 minutes
    };

    if (networkStatus.saveData) {
      return {
        ...baseConfig,
        enabled: priority === 'high',
        retry: 0,
        staleTime: 30 * 60 * 1000, // 30 minutes
        gcTime: 60 * 60 * 1000, // 1 hour
        refetchOnWindowFocus: false,
        refetchOnReconnect: false,
      };
    }

    if (networkStatus.effectiveType === 'slow-2g' || networkStatus.effectiveType === '2g') {
      return {
        ...baseConfig,
        enabled: priority !== 'low',
        retry: priority === 'high' ? 1 : 0,
        staleTime: 15 * 60 * 1000, // 15 minutes
        refetchOnWindowFocus: false,
      };
    }

    if (!networkStatus.online) {
      return {
        ...baseConfig,
        enabled: false,
        retry: 0,
      };
    }

    return baseConfig;
  }, [networkStatus]);

  return { getQueryConfig };
}

/**
 * Hook for performance monitoring and adaptation
 */
export function usePerformanceMonitoring() {
  const [performanceMetrics, setPerformanceMetrics] = useState({
    renderTime: 0,
    interactionLatency: 0,
    memoryUsage: 0
  });

  useEffect(() => {
    // Monitor Core Web Vitals
    if ('web-vital' in window) {
      // This would integrate with web-vitals library if available
    }

    // Monitor memory usage
    const updateMemoryUsage = () => {
      if ('memory' in performance) {
        const memory = (performance as any).memory;
        setPerformanceMetrics(prev => ({
          ...prev,
          memoryUsage: memory.usedJSHeapSize / memory.jsHeapSizeLimit
        }));
      }
    };

    const interval = setInterval(updateMemoryUsage, 30000); // Every 30 seconds

    return () => clearInterval(interval);
  }, []);

  const reportPerformanceIssue = useCallback((metric: string, value: number) => {
    // In a real implementation, this would send data to analytics
    console.warn(`Performance issue detected: ${metric} = ${value}`);
  }, []);

  return {
    performanceMetrics,
    reportPerformanceIssue
  };
}