import * as React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Icons } from '@/components/ui/icons';
import { useProgressiveEnhancement } from '@/hooks/useProgressiveEnhancement';
import { ProgressiveLoader, HeavyComponentLoader, ConnectionAwareContent } from '@/components/ui/progressive-loader';
import { AdaptiveImage } from '@/components/ui/adaptive-image';
import { getDeviceCapabilities, getNetworkStatus } from '@/utils/serviceWorker';

/**
 * Demo component showcasing progressive enhancement features
 * This would only be shown in development or demo mode
 */
export function ProgressiveEnhancementDemo() {
  const {
    networkStatus,
    deviceCapabilities,
    shouldReduceAnimations,
    shouldLazyLoad,
    shouldPreload,
    imageFormat,
    enableAdvancedFeatures
  } = useProgressiveEnhancement();

  const [showDemo, setShowDemo] = React.useState(false);
  const [deviceInfo, setDeviceInfo] = React.useState(getDeviceCapabilities());

  React.useEffect(() => {
    const interval = setInterval(() => {
      setDeviceInfo(getDeviceCapabilities());
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  if (process.env.NODE_ENV !== 'development') {
    return null;
  }

  const getConnectionBadgeVariant = (effectiveType: string) => {
    switch (effectiveType) {
      case '4g': return 'default';
      case '3g': return 'secondary';
      case '2g': return 'destructive';
      case 'slow-2g': return 'destructive';
      default: return 'outline';
    }
  };

  const getCapabilityIcon = (hasCapability: boolean) => {
    return hasCapability ? 
      <Icons.checkCircle className="h-4 w-4 text-green-500" /> : 
      <Icons.xCircle className="h-4 w-4 text-red-500" />;
  };

  return (
    <>
      {/* Floating demo toggle */}
      <Button
        onClick={() => setShowDemo(!showDemo)}
        className="fixed bottom-20 left-4 z-50 rounded-full h-12 w-12 p-0"
        variant="outline"
        title="Progressive Enhancement Demo"
      >
        <Icons.zap className="h-6 w-6" />
      </Button>

      {/* Demo panel */}
      {showDemo && (
        <div className="fixed bottom-36 left-4 z-50 w-96 max-h-96 overflow-auto space-y-4">
          {/* Network Status */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Icons.wifi className="h-4 w-4" />
                Network Status
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex items-center justify-between">
                <span>Online:</span>
                <Badge variant={networkStatus.online ? 'default' : 'destructive'}>
                  {networkStatus.online ? 'Online' : 'Offline'}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span>Connection:</span>
                <Badge variant={getConnectionBadgeVariant(networkStatus.effectiveType)}>
                  {networkStatus.effectiveType.toUpperCase()}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span>Save Data:</span>
                <Badge variant={networkStatus.saveData ? 'secondary' : 'outline'}>
                  {networkStatus.saveData ? 'Enabled' : 'Disabled'}
                </Badge>
              </div>
              {networkStatus.downlink > 0 && (
                <div className="flex items-center justify-between">
                  <span>Bandwidth:</span>
                  <span className="text-sm">{networkStatus.downlink} Mbps</span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Device Capabilities */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Icons.smartphone className="h-4 w-4" />
                Device Capabilities
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex items-center justify-between">
                <span>Memory:</span>
                <span className="text-sm">{deviceCapabilities.deviceMemory}GB</span>
              </div>
              <div className="flex items-center justify-between">
                <span>CPU Cores:</span>
                <span className="text-sm">{deviceCapabilities.hardwareConcurrency}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Low-end Device:</span>
                <Badge variant={deviceCapabilities.isLowEndDevice ? 'destructive' : 'default'}>
                  {deviceCapabilities.isLowEndDevice ? 'Yes' : 'No'}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span>Touch Support:</span>
                {getCapabilityIcon(deviceCapabilities.supportsTouch)}
              </div>
              <div className="flex items-center justify-between">
                <span>WebP Support:</span>
                {getCapabilityIcon(deviceCapabilities.supportsWebP)}
              </div>
              <div className="flex items-center justify-between">
                <span>Service Worker:</span>
                {getCapabilityIcon(deviceCapabilities.supportsServiceWorker)}
              </div>
            </CardContent>
          </Card>

          {/* Enhancement Decisions */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Icons.settings className="h-4 w-4" />
                Enhancement Decisions
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex items-center justify-between">
                <span>Reduce Animations:</span>
                <Badge variant={shouldReduceAnimations ? 'secondary' : 'outline'}>
                  {shouldReduceAnimations ? 'Yes' : 'No'}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span>Lazy Loading:</span>
                <Badge variant={shouldLazyLoad ? 'default' : 'outline'}>
                  {shouldLazyLoad ? 'Enabled' : 'Disabled'}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span>Preloading:</span>
                <Badge variant={shouldPreload ? 'default' : 'outline'}>
                  {shouldPreload ? 'Enabled' : 'Disabled'}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span>Image Format:</span>
                <Badge variant="outline">{imageFormat.toUpperCase()}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span>Advanced Features:</span>
                <Badge variant={enableAdvancedFeatures ? 'default' : 'secondary'}>
                  {enableAdvancedFeatures ? 'Enabled' : 'Disabled'}
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* Live Demo Examples */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Icons.eye className="h-4 w-4" />
                Live Examples
              </CardTitle>
              <CardDescription>
                See progressive enhancement in action
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Adaptive Image Example */}
              <div>
                <h4 className="font-medium mb-2">Adaptive Image:</h4>
                <AdaptiveImage
                  src="/placeholder.svg"
                  alt="Progressive enhancement demo"
                  width={100}
                  height={100}
                  className="rounded border"
                  priority="low"
                />
              </div>

              {/* Progressive Loader Example */}
              <div>
                <h4 className="font-medium mb-2">Progressive Loader:</h4>
                <ProgressiveLoader priority="medium" className="h-16 bg-muted rounded">
                  <div className="p-4 bg-primary/10 rounded">
                    <p className="text-sm">This content loads based on your connection!</p>
                  </div>
                </ProgressiveLoader>
              </div>

              {/* Connection-aware Content */}
              <div>
                <h4 className="font-medium mb-2">Connection-aware Content:</h4>
                <ConnectionAwareContent
                  highQualityContent={
                    <div className="p-3 bg-green-100 dark:bg-green-900 rounded">
                      <p className="text-sm">🚀 High-quality content for fast connections</p>
                    </div>
                  }
                  mediumQualityContent={
                    <div className="p-3 bg-yellow-100 dark:bg-yellow-900 rounded">
                      <p className="text-sm">⚡ Medium-quality content for 3G connections</p>
                    </div>
                  }
                  lowQualityContent={
                    <div className="p-3 bg-red-100 dark:bg-red-900 rounded">
                      <p className="text-sm">🐌 Low-quality content for slow connections</p>
                    </div>
                  }
                />
              </div>

              {/* Heavy Component Example */}
              <div>
                <h4 className="font-medium mb-2">Heavy Component Loader:</h4>
                <HeavyComponentLoader
                  lightweightFallback={
                    <div className="p-3 bg-muted rounded">
                      <p className="text-sm">Lightweight fallback for low-end devices</p>
                    </div>
                  }
                >
                  <div className="p-3 bg-primary/10 rounded">
                    <p className="text-sm">Heavy component for capable devices</p>
                    <div className="mt-2 space-x-1">
                      {[...Array(5)].map((_, i) => (
                        <span key={i} className="inline-block w-2 h-2 bg-primary rounded-full animate-pulse" />
                      ))}
                    </div>
                  </div>
                </HeavyComponentLoader>
              </div>
            </CardContent>
          </Card>

          {/* Close button */}
          <Button
            onClick={() => setShowDemo(false)}
            variant="outline"
            className="w-full"
          >
            <Icons.x className="h-4 w-4 mr-2" />
            Close Demo
          </Button>
        </div>
      )}
    </>
  );
}