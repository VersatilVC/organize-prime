import React from 'react';
import { useParams } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useAppInstallations } from '@/hooks/database/useMarketplaceApps';
import { Icons } from '@/components/ui/icons';
import { Link } from 'react-router-dom';
import { Settings, ExternalLink } from 'lucide-react';

export default function AppDashboard() {
  const { slug } = useParams<{ slug: string }>();
  const { data: appInstallations = [], isLoading } = useAppInstallations();

  const installation = appInstallations.find(
    inst => inst.marketplace_apps.slug === slug
  );

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
      {/* App Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="w-16 h-16 rounded-lg bg-muted/50 flex items-center justify-center">
            <AppIcon className="h-8 w-8" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">{app.name}</h1>
            <div className="flex items-center space-x-2 mt-1">
              <Badge variant="secondary">v{app.version}</Badge>
              <Badge variant="outline">{installation.status}</Badge>
            </div>
          </div>
        </div>
        <Button asChild>
          <Link to={`/apps/${slug}/settings`}>
            <Settings className="h-4 w-4 mr-2" />
            Settings
          </Link>
        </Button>
      </div>

      {/* App Dashboard Content */}
      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Welcome to {app.name}</CardTitle>
            <CardDescription>
              Installed on {new Date(installation.installed_at).toLocaleDateString()}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8">
              <AppIcon className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-semibold mb-2">App Dashboard</h3>
              <p className="text-muted-foreground mb-4">
                This is the main dashboard for {app.name}. App-specific content would be displayed here.
              </p>
              <div className="flex justify-center space-x-4">
                <Button variant="outline" asChild>
                  <Link to={`/apps/${slug}/settings`}>
                    <Settings className="h-4 w-4 mr-2" />
                    Configure App
                  </Link>
                </Button>
                <Button variant="outline" asChild>
                  <Link to="/marketplace">
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Browse More Apps
                  </Link>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* App Settings Preview */}
        {installation.app_settings && Object.keys(installation.app_settings).length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>App Configuration</CardTitle>
              <CardDescription>Current app settings</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {Object.entries(installation.app_settings).map(([key, value]) => (
                  <div key={key} className="flex justify-between items-center">
                    <span className="text-sm font-medium">{key}</span>
                    <span className="text-sm text-muted-foreground">
                      {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}