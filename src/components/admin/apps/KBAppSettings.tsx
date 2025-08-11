import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { AlertTriangle, Settings, Webhook, Activity } from 'lucide-react';

interface KBAppSettingsProps {
  app: {
    id: string;
    name: string;
    slug: string;
    description: string;
    version: string;
    icon_name: string;
  };
}

export function KBAppSettings({ app }: KBAppSettingsProps) {
  // TODO: Remove marketplace functionality - replaced with new feature system
  console.log('KB App Settings requested for app:', app);

  const isKb = useMemo(() => 
    (app.slug || '').includes('knowledge') || app.name.toLowerCase().includes('knowledge'), 
    [app.slug, app.name]
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Settings className="h-5 w-5" />
        <h3 className="text-lg font-semibold">KB App Settings</h3>
        {isKb && <Badge variant="secondary">Knowledge Base</Badge>}
      </div>

      {/* App Info */}
      <Card>
        <CardHeader>
          <CardTitle>App Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Name:</span>
              <span className="text-sm font-medium">{app.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Version:</span>
              <span className="text-sm font-medium">{app.version}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Description:</span>
              <span className="text-sm font-medium">{app.description}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Marketplace Functionality Removed Notice */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-yellow-500" />
            Marketplace Functionality Removed
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            The marketplace app functionality has been replaced with the new simplified feature system.
            KB app settings, analytics, and webhook configurations are no longer available through this interface.
          </p>
          <Separator className="my-4" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center gap-3 p-3 border rounded-lg">
              <Webhook className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Webhook Logs</p>
                <p className="text-xs text-muted-foreground">Not available</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 border rounded-lg">
              <Activity className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">System Usage</p>
                <p className="text-xs text-muted-foreground">Not available</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}