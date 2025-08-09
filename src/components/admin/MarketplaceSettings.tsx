import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Settings, Save, RotateCcw } from 'lucide-react';

interface MarketplaceSetting {
  id: string;
  key: string;
  value: any;
  description: string;
  category: string;
}

interface SettingFormData {
  marketplace_enabled: boolean;
  auto_approval_enabled: boolean;
  featured_apps_limit: number;
  allow_app_reviews: boolean;
  minimum_rating_count: number;
  require_admin_approval: boolean;
  analytics_enabled: boolean;
}

export const MarketplaceSettings: React.FC = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [hasChanges, setHasChanges] = useState(false);
  const [formData, setFormData] = useState<SettingFormData>({
    marketplace_enabled: true,
    auto_approval_enabled: false,
    featured_apps_limit: 6,
    allow_app_reviews: true,
    minimum_rating_count: 3,
    require_admin_approval: true,
    analytics_enabled: true
  });

  // Fetch marketplace settings
  const { data: settings, isLoading } = useQuery({
    queryKey: ['marketplace-settings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('marketplace_settings' as any)
        .select('id, key, value, description, category')
        .order('key');
      
      if (error) throw error;
      return (data || []) as unknown as MarketplaceSetting[];
    }
  });

  // Update form data when settings load
  React.useEffect(() => {
    if (settings) {
      const settingsMap: Record<string, any> = {};
      settings.forEach(setting => {
        settingsMap[setting.key] = setting.value;
      });
      
      setFormData({
        marketplace_enabled: settingsMap.marketplace_enabled ?? true,
        auto_approval_enabled: settingsMap.auto_approval_enabled ?? false,
        featured_apps_limit: parseInt(settingsMap.featured_apps_limit) || 6,
        allow_app_reviews: settingsMap.allow_app_reviews ?? true,
        minimum_rating_count: parseInt(settingsMap.minimum_rating_count) || 3,
        require_admin_approval: settingsMap.require_admin_approval ?? true,
        analytics_enabled: settingsMap.analytics_enabled ?? true
      });
    }
  }, [settings]);

  // Update settings mutation
  const updateSettingsMutation = useMutation({
    mutationFn: async (newSettings: SettingFormData) => {
      const updates = Object.entries(newSettings).map(([key, value]) => ({
        key,
        value,
        description: getSettingDescription(key),
        category: getSettingCategory(key),
        updated_at: new Date().toISOString()
      }));

      for (const update of updates) {
        const { error } = await supabase
          .from('marketplace_settings' as any)
          .upsert(update, { onConflict: 'key' });
        
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast({
        title: 'Success',
        description: 'Marketplace settings updated successfully',
      });
      setHasChanges(false);
      queryClient.invalidateQueries({ queryKey: ['marketplace-settings'] });
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'Failed to update marketplace settings',
        variant: 'destructive',
      });
    }
  });

  // Reset settings mutation
  const resetSettingsMutation = useMutation({
    mutationFn: async () => {
      const defaultSettings: SettingFormData = {
        marketplace_enabled: true,
        auto_approval_enabled: false,
        featured_apps_limit: 6,
        allow_app_reviews: true,
        minimum_rating_count: 3,
        require_admin_approval: true,
        analytics_enabled: true
      };

      const updates = Object.entries(defaultSettings).map(([key, value]) => ({
        key,
        value,
        description: getSettingDescription(key),
        category: getSettingCategory(key),
        updated_at: new Date().toISOString()
      }));

      for (const update of updates) {
        const { error } = await supabase
          .from('marketplace_settings' as any)
          .upsert(update, { onConflict: 'key' });
        
        if (error) throw error;
      }

      setFormData(defaultSettings);
    },
    onSuccess: () => {
      toast({
        title: 'Success',
        description: 'Marketplace settings reset to defaults',
      });
      setHasChanges(false);
      queryClient.invalidateQueries({ queryKey: ['marketplace-settings'] });
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'Failed to reset marketplace settings',
        variant: 'destructive',
      });
    }
  });

  const getSettingDescription = (key: string): string => {
    const descriptions: Record<string, string> = {
      marketplace_enabled: 'Enable or disable the marketplace feature',
      auto_approval_enabled: 'Automatically approve new app installations',
      featured_apps_limit: 'Maximum number of featured apps to display',
      allow_app_reviews: 'Allow users to rate and review apps',
      minimum_rating_count: 'Minimum reviews before showing rating',
      require_admin_approval: 'Require company admin approval for app installations',
      analytics_enabled: 'Enable app usage analytics tracking'
    };
    return descriptions[key] || '';
  };

  const getSettingCategory = (key: string): string => {
    const categories: Record<string, string> = {
      marketplace_enabled: 'general',
      auto_approval_enabled: 'moderation',
      featured_apps_limit: 'display',
      allow_app_reviews: 'features',
      minimum_rating_count: 'display',
      require_admin_approval: 'security',
      analytics_enabled: 'analytics'
    };
    return categories[key] || 'general';
  };

  const handleBooleanChange = (key: keyof SettingFormData, value: boolean) => {
    setFormData(prev => ({ ...prev, [key]: value }));
    setHasChanges(true);
  };

  const handleNumberChange = (key: keyof SettingFormData, value: number) => {
    setFormData(prev => ({ ...prev, [key]: value }));
    setHasChanges(true);
  };

  const handleSave = () => {
    updateSettingsMutation.mutate(formData);
  };

  const handleReset = () => {
    resetSettingsMutation.mutate();
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Marketplace Settings
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="h-4 bg-muted rounded w-1/3 mb-2"></div>
                <div className="h-8 bg-muted rounded w-full"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Marketplace Settings
          </CardTitle>
          {hasChanges && (
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleReset}
                disabled={resetSettingsMutation.isPending}
              >
                <RotateCcw className="h-4 w-4 mr-1" />
                Reset
              </Button>
              <Button
                size="sm"
                onClick={handleSave}
                disabled={updateSettingsMutation.isPending}
              >
                <Save className="h-4 w-4 mr-1" />
                Save Changes
              </Button>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* General Settings */}
          <div>
            <h3 className="text-lg font-medium mb-4">General Settings</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="marketplace-enabled">Marketplace Enabled</Label>
                  <p className="text-sm text-muted-foreground">
                    Enable or disable the entire marketplace feature
                  </p>
                </div>
                <Switch
                  id="marketplace-enabled"
                  checked={formData.marketplace_enabled}
                  onCheckedChange={(checked) => handleBooleanChange('marketplace_enabled', checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="analytics-enabled">Analytics Enabled</Label>
                  <p className="text-sm text-muted-foreground">
                    Track app usage and installation analytics
                  </p>
                </div>
                <Switch
                  id="analytics-enabled"
                  checked={formData.analytics_enabled}
                  onCheckedChange={(checked) => handleBooleanChange('analytics_enabled', checked)}
                />
              </div>
            </div>
          </div>

          {/* Display Settings */}
          <div>
            <h3 className="text-lg font-medium mb-4">Display Settings</h3>
            <div className="space-y-4">
              <div>
                <Label htmlFor="featured-apps-limit">Featured Apps Limit</Label>
                <Input
                  id="featured-apps-limit"
                  type="number"
                  min="1"
                  max="20"
                  value={formData.featured_apps_limit}
                  onChange={(e) => handleNumberChange('featured_apps_limit', parseInt(e.target.value) || 6)}
                  className="w-32 mt-1"
                />
                <p className="text-sm text-muted-foreground mt-1">
                  Maximum number of apps to feature prominently
                </p>
              </div>

              <div>
                <Label htmlFor="minimum-rating-count">Minimum Rating Count</Label>
                <Input
                  id="minimum-rating-count"
                  type="number"
                  min="1"
                  max="50"
                  value={formData.minimum_rating_count}
                  onChange={(e) => handleNumberChange('minimum_rating_count', parseInt(e.target.value) || 3)}
                  className="w-32 mt-1"
                />
                <p className="text-sm text-muted-foreground mt-1">
                  Minimum reviews needed before displaying average rating
                </p>
              </div>
            </div>
          </div>

          {/* Review Settings */}
          <div>
            <h3 className="text-lg font-medium mb-4">Review Settings</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="allow-app-reviews">Allow App Reviews</Label>
                  <p className="text-sm text-muted-foreground">
                    Enable users to rate and review marketplace apps
                  </p>
                </div>
                <Switch
                  id="allow-app-reviews"
                  checked={formData.allow_app_reviews}
                  onCheckedChange={(checked) => handleBooleanChange('allow_app_reviews', checked)}
                />
              </div>
            </div>
          </div>

          {/* Security & Approval Settings */}
          <div>
            <h3 className="text-lg font-medium mb-4">Security & Approval</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="require-admin-approval">Require Admin Approval</Label>
                  <p className="text-sm text-muted-foreground">
                    Require organization admin approval for app installations
                  </p>
                </div>
                <Switch
                  id="require-admin-approval"
                  checked={formData.require_admin_approval}
                  onCheckedChange={(checked) => handleBooleanChange('require_admin_approval', checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="auto-approval-enabled">Auto-Approval Enabled</Label>
                  <p className="text-sm text-muted-foreground">
                    Automatically approve app installations without manual review
                  </p>
                </div>
                <Switch
                  id="auto-approval-enabled"
                  checked={formData.auto_approval_enabled}
                  onCheckedChange={(checked) => handleBooleanChange('auto_approval_enabled', checked)}
                />
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};