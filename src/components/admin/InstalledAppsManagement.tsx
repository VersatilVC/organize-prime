import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
// import { useAppInstallations, useUninstallApp } from '@/hooks/database/useMarketplaceApps'; // Removed - marketplace functionality
import { useOrganizationFeatureConfigs } from '@/hooks/useOrganizationFeatureConfigs';
import { Separator } from '@/components/ui/separator';
import { Settings, Trash2, ExternalLink } from 'lucide-react';
import { Icons } from '@/components/ui/icons';
import { useToast } from '@/hooks/use-toast';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Link } from 'react-router-dom';

export function InstalledAppsManagement() {
  // Mock data for development - replace with actual API when available
  const appInstallations: any[] = [];
  const isLoading = false;
  
  // const { configs, updateConfig, isUpdating } = useOrganizationFeatureConfigs(); // Removed - not available
  const { toast } = useToast();
  const [selectedApp, setSelectedApp] = useState<string | null>(null);

  const handleToggleApp = async (appSlug: string, isEnabled: boolean) => {
    try {
      // Mock toggle functionality
      toast({
        title: 'App Status Updated',
        description: `App has been ${isEnabled ? 'enabled' : 'disabled'}.`,
      });
    } catch (error) {
      toast({
        title: 'Failed to update app status',
        description: error instanceof Error ? error.message : 'An unexpected error occurred',
        variant: 'destructive',
      });
    }
  };

  const handleUninstallApp = async (appId: string, appName: string) => {
    try {
      // Mock uninstall functionality
      toast({
        title: 'App uninstalled',
        description: `${appName} has been removed from your organization.`,
      });
      setSelectedApp(null);
    } catch (error) {
      toast({
        title: 'Failed to uninstall app',
        description: error instanceof Error ? error.message : 'An unexpected error occurred',
        variant: 'destructive',
      });
    }
  };

  const isAppEnabled = (appSlug: string) => {
    // Mock - default to enabled
    return true;
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Installed Apps</CardTitle>
          <CardDescription>Loading installed marketplace apps...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="flex items-center space-x-4 p-4 border rounded-lg animate-pulse">
                <div className="w-12 h-12 bg-muted rounded-lg"></div>
                <div className="flex-1">
                  <div className="h-4 bg-muted rounded w-1/3 mb-2"></div>
                  <div className="h-3 bg-muted rounded w-2/3"></div>
                </div>
                <div className="w-16 h-8 bg-muted rounded"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (appInstallations.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Installed Apps</CardTitle>
          <CardDescription>
            Manage marketplace applications installed in your organization.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center py-8">
          <div className="text-muted-foreground mb-4">
            No apps are currently installed in your organization.
          </div>
          <Button asChild>
            <Link to="/marketplace">Browse Marketplace</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Installed Apps</CardTitle>
        <CardDescription>
          Manage marketplace applications installed in your organization.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {appInstallations.map((installation) => {
          const app = installation.marketplace_apps;
          const AppIcon = Icons[app.icon_name as keyof typeof Icons] || Icons.package;
          const appEnabled = isAppEnabled(app.slug);

          return (
            <div key={installation.id} className="border rounded-lg p-4">
              <div className="flex items-center space-x-4">
                {/* App Icon */}
                <div className="w-12 h-12 rounded-lg bg-muted/50 flex items-center justify-center">
                  <AppIcon className="h-6 w-6" />
                </div>

                {/* App Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2 mb-1">
                    <h3 className="font-medium truncate">{app.name}</h3>
                    <Badge variant="secondary" className="text-xs">
                      v{app.version}
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      {installation.status}
                    </Badge>
                    <Badge variant={appEnabled ? "default" : "secondary"} className="text-xs">
                      {appEnabled ? "Enabled" : "Disabled"}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Installed on {new Date(installation.installed_at).toLocaleDateString()}
                  </p>
                </div>

                {/* Enable/Disable Toggle */}
                <div className="flex items-center space-x-2">
                  <div className="flex items-center space-x-2">
                    <Label htmlFor={`enable-${app.slug}`} className="text-sm">
                      Enable
                    </Label>
                    <Switch
                      id={`enable-${app.slug}`}
                      checked={appEnabled}
                      onCheckedChange={(checked) => handleToggleApp(app.slug, checked)}
                    />
                  </div>

                  <Separator orientation="vertical" className="h-8" />

                  {/* App Dashboard Link */}
                  <Button 
                    variant="outline" 
                    size="sm" 
                    asChild
                    disabled={!appEnabled}
                  >
                    <Link to={`/features/${app.slug}`}>
                      <ExternalLink className="h-4 w-4 mr-1" />
                      Open
                    </Link>
                  </Button>

                  {/* App Settings Link */}
                  <Button 
                    variant="outline" 
                    size="sm" 
                    asChild
                    disabled={!appEnabled}
                  >
                    <Link to={`/features/${app.slug}/settings`}>
                      <Settings className="h-4 w-4 mr-1" />
                      Settings
                    </Link>
                  </Button>

                  <Separator orientation="vertical" className="h-8" />

                  {/* Uninstall Button */}
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button 
                        variant="outline" 
                        size="sm"
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4 mr-1" />
                        Uninstall
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Uninstall {app.name}?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This will remove the app from your organization and delete all associated data. 
                          This action cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => handleUninstallApp(installation.app_id, app.name)}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          Uninstall
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>

              {/* App Configuration Status */}
              {installation.app_settings && Object.keys(installation.app_settings).length > 0 && (
                <div className="mt-3 pt-3 border-t">
                  <div className="text-sm text-muted-foreground">
                    <Badge variant="outline" className="text-xs">
                      Configured
                    </Badge>
                    <span className="ml-2">Custom settings applied</span>
                  </div>
                </div>
              )}
            </div>
          );
        })}

        <div className="mt-6 pt-4 border-t">
          <div className="text-center">
            <Button variant="outline" asChild>
              <Link to="/marketplace">Browse More Apps</Link>
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}