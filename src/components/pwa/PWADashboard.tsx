import React, { memo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Download, 
  Smartphone, 
  Wifi, 
  WifiOff, 
  RefreshCw, 
  Bell,
  Shield,
  Zap,
  Globe
} from 'lucide-react';
import { usePWAInstall, useNetworkStatus, useAppUpdate, usePushNotifications } from '@/hooks/usePWAFeatures';
import { toast } from 'sonner';

const PWAInstallCard = memo(function PWAInstallCard() {
  const { isInstallable, isInstalled, install } = usePWAInstall();

  const handleInstall = async () => {
    const success = await install();
    if (success) {
      toast.success('App installed successfully!');
    } else {
      toast.error('Installation cancelled or failed');
    }
  };

  if (isInstalled) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Smartphone className="h-5 w-5" />
            App Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="bg-green-100 text-green-800">
              <Shield className="h-3 w-3 mr-1" />
              Installed
            </Badge>
            <span className="text-sm text-muted-foreground">
              App is installed and ready to use offline
            </span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!isInstallable) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Download className="h-5 w-5" />
          Install App
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Install OrganizePrime as a desktop app for faster access and offline functionality.
        </p>
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm">
            <Zap className="h-4 w-4 text-green-600" />
            Faster startup and performance
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Shield className="h-4 w-4 text-blue-600" />
            Works offline with cached data
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Bell className="h-4 w-4 text-purple-600" />
            Native notifications
          </div>
        </div>
        <Button onClick={handleInstall} className="w-full">
          <Download className="h-4 w-4 mr-2" />
          Install App
        </Button>
      </CardContent>
    </Card>
  );
});

const NetworkStatusCard = memo(function NetworkStatusCard() {
  const { isOnline, connectionType } = useNetworkStatus();

  const getConnectionColor = (type: string) => {
    switch (type) {
      case '4g':
        return 'text-green-600';
      case '3g':
        return 'text-yellow-600';
      case '2g':
        return 'text-red-600';
      default:
        return 'text-blue-600';
    }
  };

  const getConnectionSpeed = (type: string) => {
    const speeds = {
      'slow-2g': '< 50 kbps',
      '2g': '50-250 kbps',
      '3g': '250-750 kbps',
      '4g': '> 750 kbps',
    };
    return speeds[type as keyof typeof speeds] || 'Unknown';
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {isOnline ? (
            <Wifi className="h-5 w-5 text-green-600" />
          ) : (
            <WifiOff className="h-5 w-5 text-red-600" />
          )}
          Network Status
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm">Connection:</span>
          <Badge variant={isOnline ? 'secondary' : 'destructive'}>
            {isOnline ? 'Online' : 'Offline'}
          </Badge>
        </div>
        
        {isOnline && connectionType !== 'unknown' && (
          <>
            <div className="flex items-center justify-between">
              <span className="text-sm">Type:</span>
              <Badge variant="outline" className={getConnectionColor(connectionType)}>
                {connectionType.toUpperCase()}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Speed:</span>
              <span className="text-sm text-muted-foreground">
                {getConnectionSpeed(connectionType)}
              </span>
            </div>
          </>
        )}

        {!isOnline && (
          <div className="text-sm text-muted-foreground">
            You're currently offline. Cached data is available for viewing.
          </div>
        )}
      </CardContent>
    </Card>
  );
});

const AppUpdateCard = memo(function AppUpdateCard() {
  const { updateAvailable, applyUpdate } = useAppUpdate();

  if (!updateAvailable) {
    return null;
  }

  return (
    <Card className="border-blue-200 bg-blue-50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-blue-800">
          <RefreshCw className="h-5 w-5" />
          Update Available
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-blue-700">
          A new version of OrganizePrime is available with improvements and bug fixes.
        </p>
        <Button onClick={applyUpdate} className="w-full">
          <RefreshCw className="h-4 w-4 mr-2" />
          Update Now
        </Button>
      </CardContent>
    </Card>
  );
});

const NotificationsCard = memo(function NotificationsCard() {
  const { 
    permission, 
    subscription, 
    isSupported, 
    requestPermission, 
    subscribe, 
    unsubscribe 
  } = usePushNotifications();

  if (!isSupported) {
    return null;
  }

  const handleToggleNotifications = async () => {
    if (subscription) {
      await unsubscribe();
      toast.success('Notifications disabled');
    } else {
      if (permission !== 'granted') {
        const granted = await requestPermission();
        if (!granted) {
          toast.error('Notification permission denied');
          return;
        }
      }
      
      const newSubscription = await subscribe();
      if (newSubscription) {
        toast.success('Notifications enabled');
      } else {
        toast.error('Failed to enable notifications');
      }
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="h-5 w-5" />
          Push Notifications
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-sm">Status:</span>
          <Badge variant={subscription ? 'secondary' : 'outline'}>
            {subscription ? 'Enabled' : 'Disabled'}
          </Badge>
        </div>
        
        <div className="flex items-center justify-between">
          <span className="text-sm">Permission:</span>
          <Badge 
            variant={permission === 'granted' ? 'secondary' : 
                    permission === 'denied' ? 'destructive' : 'outline'}
          >
            {permission}
          </Badge>
        </div>

        <p className="text-sm text-muted-foreground">
          Get notified about important updates, feedback responses, and system announcements.
        </p>

        <Button 
          onClick={handleToggleNotifications} 
          className="w-full"
          disabled={permission === 'denied'}
        >
          {subscription ? 'Disable' : 'Enable'} Notifications
        </Button>
      </CardContent>
    </Card>
  );
});

export const PWADashboard = memo(function PWADashboard() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Globe className="h-6 w-6" />
        <h2 className="text-2xl font-bold">Progressive Web App</h2>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <PWAInstallCard />
        <NetworkStatusCard />
        <AppUpdateCard />
        <NotificationsCard />
      </div>
    </div>
  );
});

export default PWADashboard;