import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Loader2 } from 'lucide-react';
import { Icons } from '@/components/ui/icons';
import { useAvailableSystemFeatures, useOrganizationFeatures, useToggleOrganizationFeature } from '@/hooks/database/useOrganizationFeatures';

export function FeatureToggleSection() {
  const { data: availableFeatures = [], isLoading: featuresLoading } = useAvailableSystemFeatures();
  const { data: organizationFeatures = [], isLoading: orgFeaturesLoading } = useOrganizationFeatures();
  const toggleFeature = useToggleOrganizationFeature();

  const isFeatureEnabled = (featureSlug: string) => {
    // Check if feature is enabled in organization features
    const config = organizationFeatures.find(f => f.system_feature.slug === featureSlug);
    return config?.is_enabled ?? false;
  };

  const handleToggleFeature = (featureSlug: string, isEnabled: boolean) => {
    toggleFeature.mutate({ featureId: featureSlug, isEnabled });
  };

  if (featuresLoading || orgFeaturesLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Available Features</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin" />
            <span className="ml-2">Loading features...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Available Features</CardTitle>
        <p className="text-sm text-muted-foreground">
          Enable or disable features for your organization
        </p>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {availableFeatures.map((feature) => {
            const isEnabled = isFeatureEnabled(feature.slug);
            const IconComponent = Icons[feature.icon_name as keyof typeof Icons] || Icons.package;
            
            return (
              <div key={feature.id} className="flex items-center justify-between">
                <div className="flex items-start space-x-4">
                  <div 
                    className="w-10 h-10 rounded-lg flex items-center justify-center"
                    style={{ backgroundColor: `${feature.color_hex}20` }}
                  >
                    <IconComponent 
                      className="w-5 h-5" 
                      style={{ color: feature.color_hex }}
                    />
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <Label className="text-base font-medium">
                        {feature.display_name}
                      </Label>
                      <Badge variant="outline" className="text-xs">
                        {feature.category}
                      </Badge>
                    </div>
                    {feature.description && (
                      <p className="text-sm text-muted-foreground">
                        {feature.description}
                      </p>
                    )}
                  </div>
                </div>
                <Switch
                  checked={isEnabled}
                  onCheckedChange={(checked) => handleToggleFeature(feature.slug, checked)}
                  disabled={toggleFeature.isPending}
                />
              </div>
            );
          })}
          
          {availableFeatures.length === 0 && (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No features available</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}