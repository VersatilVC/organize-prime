import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { useAppInstallations } from '@/hooks/database/useMarketplaceApps';
import { Icons } from '@/components/ui/icons';
import { Link } from 'react-router-dom';
import { ArrowLeft, Save } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function AppSettings() {
  const { slug } = useParams<{ slug: string }>();
  const { data: appInstallations = [], isLoading } = useAppInstallations();
  const [settings, setSettings] = useState<Record<string, any>>({});
  const [isDirty, setIsDirty] = useState(false);
  const { toast } = useToast();

  const installation = appInstallations.find(
    inst => inst.marketplace_apps.slug === slug
  );

  React.useEffect(() => {
    if (installation?.app_settings) {
      setSettings(installation.app_settings);
    }
  }, [installation]);

  const handleSettingChange = (key: string, value: any) => {
    setSettings(prev => ({ ...prev, [key]: value }));
    setIsDirty(true);
  };

  const handleSaveSettings = async () => {
    // TODO: Implement actual settings save functionality
    toast({
      title: 'Settings saved',
      description: 'App settings have been updated successfully.',
    });
    setIsDirty(false);
  };

  if (isLoading) {
    return (
      <div className="container mx-auto py-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/3"></div>
          <div className="h-32 bg-muted rounded"></div>
        </div>
      </div>
    );
  }

  if (!installation) {
    return (
      <div className="container mx-auto py-6">
        <Card>
          <CardContent className="text-center py-8">
            <h2 className="text-xl font-semibold mb-2">App Not Found</h2>
            <p className="text-muted-foreground mb-4">
              The app "{slug}" is not installed in your organization.
            </p>
            <Button asChild>
              <Link to="/marketplace">Browse Marketplace</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const app = installation.marketplace_apps;
  const AppIcon = Icons[app.icon_name as keyof typeof Icons] || Icons.package;

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Back Navigation */}
      <div className="flex items-center space-x-4">
        <Button variant="outline" size="sm" asChild>
          <Link to={`/apps/${slug}`}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Link>
        </Button>
      </div>

      {/* App Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="w-16 h-16 rounded-lg bg-muted/50 flex items-center justify-center">
            <AppIcon className="h-8 w-8" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">{app.name} Settings</h1>
            <div className="flex items-center space-x-2 mt-1">
              <Badge variant="secondary">v{app.version}</Badge>
              <Badge variant="outline">{installation.status}</Badge>
            </div>
          </div>
        </div>
        <Button onClick={handleSaveSettings} disabled={!isDirty}>
          <Save className="h-4 w-4 mr-2" />
          Save Changes
        </Button>
      </div>

      {/* Settings Content */}
      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle>App Configuration</CardTitle>
            <CardDescription>
              Configure settings for {app.name}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Example Settings - These would be dynamic based on the app */}
            <div className="space-y-2">
              <Label htmlFor="app-name">App Display Name</Label>
              <Input
                id="app-name"
                value={settings.displayName || app.name}
                onChange={(e) => handleSettingChange('displayName', e.target.value)}
                placeholder="Enter app display name"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="app-description">Description</Label>
              <Textarea
                id="app-description"
                value={settings.description || ''}
                onChange={(e) => handleSettingChange('description', e.target.value)}
                placeholder="Describe how this app is used in your organization"
                rows={3}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Enable Notifications</Label>
                <p className="text-sm text-muted-foreground">
                  Receive notifications from this app
                </p>
              </div>
              <Switch
                checked={settings.notifications ?? true}
                onCheckedChange={(checked) => handleSettingChange('notifications', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Auto-sync Data</Label>
                <p className="text-sm text-muted-foreground">
                  Automatically synchronize data with external services
                </p>
              </div>
              <Switch
                checked={settings.autoSync ?? false}
                onCheckedChange={(checked) => handleSettingChange('autoSync', checked)}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Installation Information</CardTitle>
            <CardDescription>Details about this app installation</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium">Installed On</Label>
                  <p className="text-sm text-muted-foreground">
                    {new Date(installation.installed_at).toLocaleDateString()}
                  </p>
                </div>
                <div>
                  <Label className="text-sm font-medium">App Version</Label>
                  <p className="text-sm text-muted-foreground">v{app.version}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Status</Label>
                  <p className="text-sm text-muted-foreground">{installation.status}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">App ID</Label>
                  <p className="text-sm text-muted-foreground font-mono text-xs">
                    {installation.app_id}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Danger Zone */}
        <Card className="border-destructive">
          <CardHeader>
            <CardTitle className="text-destructive">Danger Zone</CardTitle>
            <CardDescription>
              Irreversible actions for this app installation
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium">Uninstall App</h4>
                <p className="text-sm text-muted-foreground">
                  Remove this app and all its data from your organization
                </p>
              </div>
              <Button variant="destructive" asChild>
                <Link to="/settings/company?tab=apps">
                  Manage in Settings
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}