import * as React from 'react';
import { useProgressiveEnhancement, useAdaptiveLoading } from '@/hooks/useProgressiveEnhancement';
import { ComponentLoadingSkeleton } from '@/components/LoadingSkeletons';
import { cn } from '@/lib/utils';

interface ProgressiveLoaderProps {
  children: React.ReactNode;
  priority: 'high' | 'medium' | 'low';
  fallback?: React.ReactNode;
  className?: string;
  minLoadTime?: number; // Minimum time to show loading state
  enableIntersectionLoading?: boolean;
}

/**
 * Progressive loader that conditionally loads components based on
 * network conditions and device capabilities
 */
export function ProgressiveLoader({
  children,
  priority,
  fallback,
  className,
  minLoadTime = 0,
  enableIntersectionLoading = true
}: ProgressiveLoaderProps) {
  const { enableAdvancedFeatures, networkStatus } = useProgressiveEnhancement();
  const { shouldLoadComponent } = useAdaptiveLoading();
  
  const [shouldLoad, setShouldLoad] = React.useState(false);
  const [isInView, setIsInView] = React.useState(!enableIntersectionLoading);
  const [minTimeElapsed, setMinTimeElapsed] = React.useState(minLoadTime === 0);
  
  const containerRef = React.useRef<HTMLDivElement>(null);
  const loadStartTime = React.useRef<number>(0);

  // Determine if component should load based on priority and conditions
  const canLoad = shouldLoadComponent(priority);

  // Set up intersection observer for viewport-based loading
  React.useEffect(() => {
    if (!enableIntersectionLoading || isInView) return;

    if ('IntersectionObserver' in window && containerRef.current) {
      const observer = new IntersectionObserver(
        (entries) => {
          if (entries[0].isIntersecting) {
            setIsInView(true);
            observer.disconnect();
          }
        },
        { 
          rootMargin: '100px', // Load 100px before entering viewport
          threshold: 0.1 
        }
      );

      observer.observe(containerRef.current);

      return () => observer.disconnect();
    } else {
      // Fallback for browsers without IntersectionObserver
      setIsInView(true);
    }
  }, [enableIntersectionLoading, isInView]);

  // Handle minimum load time
  React.useEffect(() => {
    if (minLoadTime > 0 && canLoad && isInView && !minTimeElapsed) {
      loadStartTime.current = Date.now();
      
      const timer = setTimeout(() => {
        setMinTimeElapsed(true);
      }, minLoadTime);

      return () => clearTimeout(timer);
    }
  }, [canLoad, isInView, minLoadTime, minTimeElapsed]);

  // Determine when to actually load
  React.useEffect(() => {
    if (canLoad && isInView && minTimeElapsed) {
      setShouldLoad(true);
    }
  }, [canLoad, isInView, minTimeElapsed]);

  // Render different states
  if (!isInView) {
    return (
      <div 
        ref={containerRef} 
        className={cn('min-h-[100px]', className)}
        aria-label="Content loading"
      >
        {fallback || <ComponentLoadingSkeleton />}
      </div>
    );
  }

  if (!canLoad) {
    // Show simplified version for low-capability devices/networks
    return (
      <div className={cn('p-4 border rounded-lg bg-muted/50', className)}>
        <p className="text-sm text-muted-foreground">
          Content temporarily unavailable due to network conditions.
          {!networkStatus.online && ' Please check your internet connection.'}
        </p>
      </div>
    );
  }

  if (!shouldLoad) {
    return (
      <div 
        ref={containerRef} 
        className={cn(className)}
        aria-label="Content loading"
      >
        {fallback || <ComponentLoadingSkeleton />}
      </div>
    );
  }

  return (
    <div ref={containerRef} className={className}>
      {children}
    </div>
  );
}

/**
 * Heavy component wrapper that loads based on device capabilities
 */
export function HeavyComponentLoader({
  children,
  lightweightFallback,
  className
}: {
  children: React.ReactNode;
  lightweightFallback: React.ReactNode;
  className?: string;
}) {
  const { enableAdvancedFeatures, deviceCapabilities } = useProgressiveEnhancement();

  if (!enableAdvancedFeatures || deviceCapabilities.isLowEndDevice) {
    return <div className={className}>{lightweightFallback}</div>;
  }

  return <div className={className}>{children}</div>;
}

/**
 * Feature-gated component that loads based on browser capabilities
 */
export function FeatureGatedComponent({
  children,
  requiredFeatures,
  fallback,
  className
}: {
  children: React.ReactNode;
  requiredFeatures: string[];
  fallback: React.ReactNode;
  className?: string;
}) {
  const [hasRequiredFeatures, setHasRequiredFeatures] = React.useState(false);

  React.useEffect(() => {
    const checkFeatures = () => {
      const featureChecks: Record<string, boolean> = {
        intersectionObserver: 'IntersectionObserver' in window,
        webAnimations: 'animate' in document.createElement('div'),
        cssGrid: CSS.supports('display', 'grid'),
        cssCustomProperties: CSS.supports('color', 'var(--test)'),
        fetch: 'fetch' in window,
        serviceWorker: 'serviceWorker' in navigator,
        webWorker: 'Worker' in window,
        indexedDB: 'indexedDB' in window,
        localStorage: 'localStorage' in window,
        sessionStorage: 'sessionStorage' in window,
        geolocation: 'geolocation' in navigator,
        notification: 'Notification' in window,
        webRTC: 'RTCPeerConnection' in window,
        webGL: (() => {
          try {
            const canvas = document.createElement('canvas');
            return !!(canvas.getContext('webgl') || canvas.getContext('experimental-webgl'));
          } catch {
            return false;
          }
        })()
      };

      const allSupported = requiredFeatures.every(feature => featureChecks[feature] !== false);
      setHasRequiredFeatures(allSupported);
    };

    checkFeatures();
  }, [requiredFeatures]);

  if (!hasRequiredFeatures) {
    return <div className={className}>{fallback}</div>;
  }

  return <div className={className}>{children}</div>;
}

/**
 * Adaptive content based on connection speed
 */
export function ConnectionAwareContent({
  highQualityContent,
  mediumQualityContent,
  lowQualityContent,
  className
}: {
  highQualityContent: React.ReactNode;
  mediumQualityContent: React.ReactNode;
  lowQualityContent: React.ReactNode;
  className?: string;
}) {
  const { networkStatus } = useProgressiveEnhancement();

  const getContent = () => {
    if (networkStatus.saveData || networkStatus.effectiveType === 'slow-2g') {
      return lowQualityContent;
    }
    if (networkStatus.effectiveType === '2g' || networkStatus.effectiveType === '3g') {
      return mediumQualityContent;
    }
    return highQualityContent;
  };

  return <div className={className}>{getContent()}</div>;
}

/**
 * Battery-aware component loading
 */
export function BatteryAwareLoader({
  children,
  lowBatteryFallback,
  className
}: {
  children: React.ReactNode;
  lowBatteryFallback: React.ReactNode;
  className?: string;
}) {
  const [batteryInfo, setBatteryInfo] = React.useState<{
    level: number;
    charging: boolean;
  }>({ level: 1, charging: true });

  React.useEffect(() => {
    const getBatteryInfo = async () => {
      if ('getBattery' in navigator) {
        try {
          const battery = await (navigator as any).getBattery();
          setBatteryInfo({
            level: battery.level,
            charging: battery.charging
          });

          const updateBattery = () => {
            setBatteryInfo({
              level: battery.level,
              charging: battery.charging
            });
          };

          battery.addEventListener('levelchange', updateBattery);
          battery.addEventListener('chargingchange', updateBattery);

          return () => {
            battery.removeEventListener('levelchange', updateBattery);
            battery.removeEventListener('chargingchange', updateBattery);
          };
        } catch (error) {
          console.warn('Battery API not available:', error);
        }
      }
    };

    getBatteryInfo();
  }, []);

  // Show fallback content if battery is low and not charging
  if (batteryInfo.level < 0.2 && !batteryInfo.charging) {
    return <div className={className}>{lowBatteryFallback}</div>;
  }

  return <div className={className}>{children}</div>;
}

/**
 * Memory-aware component loader
 */
export function MemoryAwareLoader({
  children,
  lowMemoryFallback,
  className
}: {
  children: React.ReactNode;
  lowMemoryFallback: React.ReactNode;
  className?: string;
}) {
  const { deviceCapabilities } = useProgressiveEnhancement();
  const [memoryPressure, setMemoryPressure] = React.useState(false);

  React.useEffect(() => {
    const checkMemoryPressure = () => {
      if ('memory' in performance) {
        const memory = (performance as any).memory;
        const usageRatio = memory.usedJSHeapSize / memory.jsHeapSizeLimit;
        setMemoryPressure(usageRatio > 0.8); // 80% memory usage threshold
      }
    };

    const interval = setInterval(checkMemoryPressure, 5000); // Check every 5 seconds
    checkMemoryPressure(); // Initial check

    return () => clearInterval(interval);
  }, []);

  if (deviceCapabilities.deviceMemory <= 2 || memoryPressure) {
    return <div className={className}>{lowMemoryFallback}</div>;
  }

  return <div className={className}>{children}</div>;
}