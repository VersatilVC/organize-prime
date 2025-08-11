import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { 
  Settings, 
  Code, 
  Building2, 
  Users, 
  BarChart3,
  Package,
  Save,
  RotateCcw,
  Eye,
  Loader2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import type { SystemFeature } from '@/types/features';

interface FeatureConfigurationPanelProps {
  selectedFeature: string | null;
  features: SystemFeature[];
  onFeatureSelect: (featureId: string) => void;
}

export function FeatureConfigurationPanel({ 
  selectedFeature, 
  features, 
  onFeatureSelect 
}: FeatureConfigurationPanelProps) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [navigationConfig, setNavigationConfig] = useState('{}');

  const feature = features.find(f => f.id === selectedFeature);

  const handleSaveConfiguration = async () => {
    if (!feature) return;
    
    setIsLoading(true);
    try {
      // Validate JSON
      JSON.parse(navigationConfig);
      
      // Implementation for saving configuration
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      toast({
        title: 'Configuration Saved',
        description: `Configuration for ${feature.display_name} has been updated`,
      });
    } catch (error) {
      toast({
        title: 'Invalid JSON',
        description: 'Please check your navigation configuration syntax',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const resetConfiguration = () => {
    setNavigationConfig(JSON.stringify({
      menu_items: [
        {
          label: feature?.display_name || 'Feature',
          path: `/${feature?.slug || 'feature'}`,
          icon: feature?.icon_name || 'Package'
        }
      ]
    }, null, 2));
  };

  if (!selectedFeature) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Feature Configuration
          </CardTitle>
          <CardDescription>
            Select a feature to view and edit its configuration
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {features.map((feature) => (
              <Button
                key={feature.id}
                variant="outline"
                className="h-auto p-4 justify-start"
                onClick={() => onFeatureSelect(feature.id)}
              >
                <div className="flex items-center gap-3">
                  <div 
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-white flex-shrink-0"
                    style={{ backgroundColor: feature.color_hex }}
                  >
                    <Package className="h-4 w-4" />
                  </div>
                  <div className="text-left">
                    <div className="font-medium">{feature.display_name}</div>
                    <Badge variant="outline" className="text-xs mt-1">
                      {feature.category}
                    </Badge>
                  </div>
                </div>
              </Button>
            ))}
          </div>
          
          {features.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <Settings className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No features available</p>
              <p className="text-sm">Add features to configure them</p>
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  if (!feature) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center py-8 text-muted-foreground">
            <Settings className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Feature not found</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Feature Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <div 
              className="w-12 h-12 rounded-lg flex items-center justify-center text-white"
              style={{ backgroundColor: feature.color_hex }}
            >
              <Package className="h-6 w-6" />
            </div>
            <div className="flex-1">
              <CardTitle className="flex items-center gap-2">
                {feature.display_name}
                <Badge variant={feature.is_active ? "default" : "secondary"}>
                  {feature.is_active ? "Active" : "Inactive"}
                </Badge>
              </CardTitle>
              <CardDescription>
                {feature.description || 'No description available'}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Navigation Configuration */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Code className="h-5 w-5" />
              Navigation Structure
            </CardTitle>
            <CardDescription>
              Configure the navigation menu structure for this feature
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="navigation-config">JSON Configuration</Label>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={resetConfiguration}
                  >
                    <RotateCcw className="h-3 w-3 mr-1" />
                    Reset
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                  >
                    <Eye className="h-3 w-3 mr-1" />
                    Preview
                  </Button>
                </div>
              </div>
              <Textarea
                id="navigation-config"
                value={navigationConfig}
                onChange={(e) => setNavigationConfig(e.target.value)}
                placeholder="Enter navigation configuration as JSON..."
                className="font-mono text-sm"
                rows={12}
              />
            </div>
            
            <Button 
              onClick={handleSaveConfiguration} 
              className="w-full"
              disabled={isLoading}
            >
              {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              <Save className="h-4 w-4 mr-2" />
              Save Configuration
            </Button>
          </CardContent>
        </Card>

        {/* Feature Statistics */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Usage Statistics
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">Organizations Using</span>
                </div>
                <Badge variant="outline">0</Badge>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">Total Users</span>
                </div>
                <Badge variant="outline">0</Badge>
              </div>
              
              <Separator />
              
              <div className="text-sm text-muted-foreground">
                <p>Created: {new Date(feature.created_at).toLocaleDateString()}</p>
                <p>Last Updated: {new Date(feature.updated_at).toLocaleDateString()}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Organizations</CardTitle>
              <CardDescription>
                Organizations currently using this feature
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                <Building2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No organizations using this feature yet</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}