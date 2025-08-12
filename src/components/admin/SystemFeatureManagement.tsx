import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Loader2 } from 'lucide-react';
import { Icons } from '@/components/ui/icons';
import { useSystemFeatures } from '@/hooks/database/useSystemFeatures';
import { useSystemFeatureConfigs } from '@/hooks/useSystemFeatureConfigs';

export function SystemFeatureManagement() {
  const { features: systemFeatures, isLoading: featuresLoading } = useSystemFeatures();
  const { configs, isLoading: configsLoading, updateConfig } = useSystemFeatureConfigs();

  const isFeatureGloballyEnabled = (featureSlug: string) => {
    const config = configs.find(c => c.feature_slug === featureSlug);
    return config?.is_enabled_globally ?? false;
  };

  const handleToggleGlobalFeature = (featureSlug: string, isEnabled: boolean) => {
    const config = configs.find(c => c.feature_slug === featureSlug);
    if (config) {
      updateConfig({
        id: config.id,
        updates: {
          is_enabled_globally: isEnabled,
          // When disabling globally, also hide from marketplace
          is_marketplace_visible: isEnabled ? config.is_marketplace_visible : false,
        }
      });
    }
  };

  if (featuresLoading || configsLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>System Feature Management</CardTitle>
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
        <CardTitle>System Feature Management</CardTitle>
        <p className="text-sm text-muted-foreground">
          Control global availability of features across all organizations
        </p>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {systemFeatures.map((feature) => {
            const isGloballyEnabled = isFeatureGloballyEnabled(feature.slug);
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
                      {!isGloballyEnabled && (
                        <Badge variant="secondary" className="text-xs">
                          Disabled Globally
                        </Badge>
                      )}
                    </div>
                    {feature.description && (
                      <p className="text-sm text-muted-foreground">
                        {feature.description}
                      </p>
                    )}
                  </div>
                </div>
                <Switch
                  checked={isGloballyEnabled}
                  onCheckedChange={(checked) => handleToggleGlobalFeature(feature.slug, checked)}
                />
              </div>
            );
          })}
          
          {systemFeatures.length === 0 && (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No features available</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}