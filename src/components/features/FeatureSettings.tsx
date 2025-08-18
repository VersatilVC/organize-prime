import React from 'react';
import { useSimpleFeatureContext } from '@/contexts/SimpleFeatureContext';
import { DynamicSettingsForm } from './DynamicSettingsForm';
import { useFeatureSettings } from '@/hooks/useFeatureSettings';
import { getFeatureSettings } from '@/lib/feature-settings-schemas';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, AlertTriangle, Lock, Settings } from 'lucide-react';
import { useUserRole } from '@/hooks/useUserRole';

export function FeatureSettings() {
  const { config, slug } = useSimpleFeatureContext();
  const { role } = useUserRole();
  const {
    settings,
    isLoading,
    updateSettings,
    isUpdating,
    resetSettings,
    isResetting,
    error
  } = useFeatureSettings(slug || '');

  if (!config) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 p-3 rounded-full bg-red-100 w-fit">
              <AlertTriangle className="h-6 w-6 text-red-600" />
            </div>
            <CardTitle>Feature Not Found</CardTitle>
            <CardDescription>
              Unable to load feature settings. Please try refreshing the page.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  // Get the settings schema for this feature
  const settingsSchema = getFeatureSettings(config.feature_slug);

  if (!settingsSchema) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 p-3 rounded-full bg-gray-100 w-fit">
              <Settings className="h-6 w-6 text-gray-600" />
            </div>
            <CardTitle>No Settings Available</CardTitle>
            <CardDescription>
              This feature does not have any configurable settings yet.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  // Check if user has access to any settings
  const hasAnyAccess = Object.values(settingsSchema).some(section => {
    if (!section.requiresRole) return true;
    if (section.requiresRole === 'super_admin') return role === 'super_admin';
    if (section.requiresRole === 'admin') return role === 'admin' || role === 'super_admin';
    return true;
  });

  if (!hasAnyAccess) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 p-3 rounded-full bg-red-100 w-fit">
              <Lock className="h-6 w-6 text-red-600" />
            </div>
            <CardTitle>Access Restricted</CardTitle>
            <CardDescription>
              You don't have permission to access settings for this feature. 
              Contact your organization administrator for access.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center space-x-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Loading settings...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center">
            <AlertTriangle className="h-8 w-8 text-destructive mx-auto mb-2" />
            <h3 className="font-semibold mb-2">Failed to Load Settings</h3>
            <p className="text-muted-foreground mb-4">
              We couldn't load the settings for this feature. Please try again.
            </p>
            <Button onClick={() => window.location.reload()} variant="outline">
              Try Again
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="container mx-auto py-6">
      <DynamicSettingsForm
        schema={settingsSchema}
        initialValues={settings}
        onSave={updateSettings}
        onReset={resetSettings}
        isLoading={isLoading}
        isSaving={isUpdating}
        isResetting={isResetting}
      />
    </div>
  );
}

export default FeatureSettings;