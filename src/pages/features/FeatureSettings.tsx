import React, { useState } from 'react';
import { useFeatureContext } from '@/contexts/FeatureContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

export default function FeatureSettings() {
  const { feature, userRole } = useFeatureContext();
  const [settings, setSettings] = useState(feature?.settings || {});
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  if (!feature) {
    return <div>Loading settings...</div>;
  }

  const handleSettingChange = (key: string, value: any) => {
    setSettings(prev => ({ ...prev, [key]: value }));
    setHasUnsavedChanges(true);
  };

  const handleSave = () => {
    // In a real app, this would make an API call
    toast.success('Settings saved successfully!');
    setHasUnsavedChanges(false);
  };

  const handleReset = () => {
    setSettings(feature.settings);
    setHasUnsavedChanges(false);
  };

  const isAdmin = userRole === 'admin' || userRole === 'super_admin';

  const renderGeneralSettings = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium">General Configuration</h3>
        <p className="text-sm text-muted-foreground">
          Basic settings for {feature.displayName}
        </p>
      </div>
      <Separator />
      
      {feature.slug === 'knowledge-base' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Enable Search</Label>
              <p className="text-sm text-muted-foreground">
                Allow users to search through documents
              </p>
            </div>
            <Switch
              checked={settings.searchEnabled}
              onCheckedChange={(value) => handleSettingChange('searchEnabled', value)}
            />
          </div>
          
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Auto Index</Label>
              <p className="text-sm text-muted-foreground">
                Automatically index new documents
              </p>
            </div>
            <Switch
              checked={settings.autoIndex}
              onCheckedChange={(value) => handleSettingChange('autoIndex', value)}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="maxFileSize">Maximum File Size (MB)</Label>
            <Input
              id="maxFileSize"
              type="number"
              value={settings.maxFileSize}
              onChange={(e) => handleSettingChange('maxFileSize', parseInt(e.target.value))}
            />
          </div>
        </div>
      )}

      {feature.slug === 'content-creation' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Auto Save</Label>
              <p className="text-sm text-muted-foreground">
                Automatically save changes while editing
              </p>
            </div>
            <Switch
              checked={settings.autoSave}
              onCheckedChange={(value) => handleSettingChange('autoSave', value)}
            />
          </div>
          
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>AI Assistance</Label>
              <p className="text-sm text-muted-foreground">
                Enable AI-powered content suggestions
              </p>
            </div>
            <Switch
              checked={settings.aiAssistance}
              onCheckedChange={(value) => handleSettingChange('aiAssistance', value)}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="collaborationMode">Collaboration Mode</Label>
            <Select
              value={settings.collaborationMode}
              onValueChange={(value) => handleSettingChange('collaborationMode', value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="real-time">Real-time</SelectItem>
                <SelectItem value="async">Asynchronous</SelectItem>
                <SelectItem value="disabled">Disabled</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      )}

      {feature.slug === 'market-intel' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Real-time Alerts</Label>
              <p className="text-sm text-muted-foreground">
                Get notifications for market changes
              </p>
            </div>
            <Switch
              checked={settings.realTimeAlerts}
              onCheckedChange={(value) => handleSettingChange('realTimeAlerts', value)}
            />
          </div>
          
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Competitor Tracking</Label>
              <p className="text-sm text-muted-foreground">
                Monitor competitor activities
              </p>
            </div>
            <Switch
              checked={settings.competitorTracking}
              onCheckedChange={(value) => handleSettingChange('competitorTracking', value)}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="reportFrequency">Report Frequency</Label>
            <Select
              value={settings.reportFrequency}
              onValueChange={(value) => handleSettingChange('reportFrequency', value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="daily">Daily</SelectItem>
                <SelectItem value="weekly">Weekly</SelectItem>
                <SelectItem value="monthly">Monthly</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      )}
    </div>
  );

  const renderSecuritySettings = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium">Security & Access</h3>
        <p className="text-sm text-muted-foreground">
          Manage security and access controls
        </p>
      </div>
      <Separator />
      
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label>Two-Factor Authentication</Label>
            <p className="text-sm text-muted-foreground">
              Require 2FA for feature access
            </p>
          </div>
          <Switch disabled />
        </div>
        
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label>Audit Logging</Label>
            <p className="text-sm text-muted-foreground">
              Log all feature activities
            </p>
          </div>
          <Switch defaultChecked disabled />
        </div>
        
        <div className="space-y-2">
          <Label>Access Level</Label>
          <div className="flex items-center space-x-2">
            <Badge variant="secondary">Organization Wide</Badge>
            <span className="text-sm text-muted-foreground">All organization members have access</span>
          </div>
        </div>
      </div>
    </div>
  );

  const renderIntegrationSettings = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium">Integrations</h3>
        <p className="text-sm text-muted-foreground">
          Connect with external services
        </p>
      </div>
      <Separator />
      
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">API Access</CardTitle>
            <CardDescription>
              Generate API keys for external integrations
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline">Generate API Key</Button>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Webhooks</CardTitle>
            <CardDescription>
              Configure webhooks for real-time updates
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline">Add Webhook</Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );

  if (!isAdmin) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-semibold mb-2">Access Restricted</h2>
        <p className="text-muted-foreground">
          You need administrator privileges to access feature settings.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Settings</h2>
          <p className="text-muted-foreground">
            Configure {feature.displayName} to fit your organization's needs
          </p>
        </div>
        
        <div className="flex items-center space-x-2">
          {hasUnsavedChanges && (
            <Button variant="outline" onClick={handleReset}>
              Reset
            </Button>
          )}
          <Button onClick={handleSave} disabled={!hasUnsavedChanges}>
            Save Changes
          </Button>
        </div>
      </div>

      <Tabs defaultValue="general" className="space-y-4">
        <TabsList>
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
          <TabsTrigger value="integrations">Integrations</TabsTrigger>
        </TabsList>
        
        <TabsContent value="general" className="space-y-4">
          <Card>
            <CardContent className="pt-6">
              {renderGeneralSettings()}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="security" className="space-y-4">
          <Card>
            <CardContent className="pt-6">
              {renderSecuritySettings()}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="integrations" className="space-y-4">
          {renderIntegrationSettings()}
        </TabsContent>
      </Tabs>
    </div>
  );
}