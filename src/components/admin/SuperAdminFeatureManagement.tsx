import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Label } from '@/components/ui/label';
import { Loader2, Building, Users, Settings, Package } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useSystemFeatures } from '@/hooks/database/useSystemFeatures';

interface Organization {
  id: string;
  name: string;
  subscription_plan: string;
  is_active: boolean;
  created_at: string;
}

interface OrganizationFeatureConfig {
  id: string;
  organization_id: string;
  feature_slug: string;
  is_enabled: boolean;
  is_user_accessible: boolean;
  org_menu_order: number;
}

export function SuperAdminFeatureManagement() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedOrgId, setSelectedOrgId] = useState<string>('');

  // Fetch all organizations
  const { data: organizations = [], isLoading: isLoadingOrgs } = useQuery({
    queryKey: ['organizations-all'],
    queryFn: async (): Promise<Organization[]> => {
      const { data, error } = await supabase
        .from('organizations')
        .select('id, name, subscription_plan, is_active, created_at')
        .order('name');
      
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch system features
  const { features: systemFeatures = [], isLoading: isLoadingFeatures } = useSystemFeatures();

  // Fetch organization feature configs for selected org
  const { data: orgFeatureConfigs = [], isLoading: isLoadingOrgConfigs } = useQuery({
    queryKey: ['org-feature-configs', selectedOrgId],
    queryFn: async (): Promise<OrganizationFeatureConfig[]> => {
      if (!selectedOrgId) return [];
      
      const { data, error } = await supabase
        .from('organization_feature_configs')
        .select('*')
        .eq('organization_id', selectedOrgId)
        .order('org_menu_order');
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!selectedOrgId,
  });

  // Mutation to create or update organization feature config
  const updateOrgFeatureMutation = useMutation({
    mutationFn: async ({ 
      featureSlug, 
      isEnabled, 
      isUserAccessible 
    }: { 
      featureSlug: string; 
      isEnabled: boolean; 
      isUserAccessible: boolean; 
    }) => {
      if (!selectedOrgId) throw new Error('No organization selected');

      const existingConfig = orgFeatureConfigs.find(c => c.feature_slug === featureSlug);
      
      if (existingConfig) {
        const { error } = await supabase
          .from('organization_feature_configs')
          .update({ 
            is_enabled: isEnabled, 
            is_user_accessible: isUserAccessible 
          })
          .eq('id', existingConfig.id);
        
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('organization_feature_configs')
          .insert({
            organization_id: selectedOrgId,
            feature_slug: featureSlug,
            is_enabled: isEnabled,
            is_user_accessible: isUserAccessible,
            org_menu_order: 0,
          });
        
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast({ title: 'Feature configuration updated successfully' });
      queryClient.invalidateQueries({ queryKey: ['org-feature-configs', selectedOrgId] });
    },
    onError: (error) => {
      toast({
        title: 'Failed to update feature configuration',
        description: error instanceof Error ? error.message : 'An unexpected error occurred',
        variant: 'destructive',
      });
    },
  });

  const selectedOrg = organizations.find(org => org.id === selectedOrgId);
  
  const isFeatureEnabled = (featureSlug: string) => {
    const config = orgFeatureConfigs.find(c => c.feature_slug === featureSlug);
    return config?.is_enabled || false;
  };

  const isFeatureUserAccessible = (featureSlug: string) => {
    const config = orgFeatureConfigs.find(c => c.feature_slug === featureSlug);
    return config?.is_user_accessible || false;
  };

  const handleToggleFeature = (featureSlug: string, field: 'enabled' | 'userAccessible', value: boolean) => {
    const currentConfig = orgFeatureConfigs.find(c => c.feature_slug === featureSlug);
    
    updateOrgFeatureMutation.mutate({
      featureSlug,
      isEnabled: field === 'enabled' ? value : (currentConfig?.is_enabled || false),
      isUserAccessible: field === 'userAccessible' ? value : (currentConfig?.is_user_accessible || false),
    });
  };

  if (isLoadingOrgs || isLoadingFeatures) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center p-8">
          <Loader2 className="h-8 w-8 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Building className="h-5 w-5" />
          Organization Feature Management
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Manage feature access for specific organizations. Select an organization to configure their features.
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Organization Selector */}
        <div className="space-y-2">
          <Label htmlFor="org-select" className="text-sm font-medium">
            Select Organization
          </Label>
          <Select value={selectedOrgId} onValueChange={setSelectedOrgId}>
            <SelectTrigger id="org-select">
              <SelectValue placeholder="Choose an organization to manage..." />
            </SelectTrigger>
            <SelectContent>
              {organizations.map((org) => (
                <SelectItem key={org.id} value={org.id}>
                  <div className="flex items-center justify-between w-full">
                    <span>{org.name}</span>
                    <div className="flex items-center gap-2 ml-2">
                      <Badge variant={org.is_active ? "default" : "secondary"} className="text-xs">
                        {org.subscription_plan}
                      </Badge>
                      {!org.is_active && (
                        <Badge variant="destructive" className="text-xs">Inactive</Badge>
                      )}
                    </div>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {selectedOrg && (
          <>
            <Separator />
            
            {/* Organization Info */}
            <div className="bg-muted/50 p-4 rounded-lg">
              <h3 className="font-medium flex items-center gap-2 mb-2">
                <Building className="h-4 w-4" />
                {selectedOrg.name}
              </h3>
              <div className="grid grid-cols-2 gap-4 text-sm text-muted-foreground">
                <div>
                  <span className="font-medium">Plan:</span> {selectedOrg.subscription_plan}
                </div>
                <div>
                  <span className="font-medium">Status:</span>{' '}
                  <Badge variant={selectedOrg.is_active ? "default" : "destructive"}>
                    {selectedOrg.is_active ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
              </div>
            </div>

            {/* Feature Management */}
            <div className="space-y-4">
              <h3 className="font-medium flex items-center gap-2">
                <Settings className="h-4 w-4" />
                Feature Configuration
              </h3>
              
              {isLoadingOrgConfigs ? (
                <div className="flex items-center justify-center p-8">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
              ) : (
                <div className="space-y-4">
                  {systemFeatures
                    .filter(feature => feature.is_active)
                    .map((feature) => {
                      const isEnabled = isFeatureEnabled(feature.slug);
                      const isUserAccessible = isFeatureUserAccessible(feature.slug);
                      
                      return (
                        <div key={feature.id} className="border rounded-lg p-4 space-y-4">
                          <div className="flex items-start justify-between">
                            <div className="flex items-start gap-3">
                              <div className="p-2 rounded-md bg-primary/10">
                                <Package className="h-4 w-4 text-primary" />
                              </div>
                              <div>
                                <h4 className="font-medium">{feature.display_name}</h4>
                                <p className="text-sm text-muted-foreground mt-1">
                                  {feature.description || 'No description available'}
                                </p>
                                <div className="flex items-center gap-2 mt-2">
                                  <Badge variant="outline">{feature.category}</Badge>
                                </div>
                              </div>
                            </div>
                          </div>
                          
                          <div className="grid grid-cols-2 gap-4">
                            <div className="flex items-center justify-between">
                              <div>
                                <Label className="text-sm font-medium">Feature Enabled</Label>
                                <p className="text-xs text-muted-foreground">
                                  Allow this organization to use this feature
                                </p>
                              </div>
                              <Switch
                                checked={isEnabled}
                                onCheckedChange={(checked) =>
                                  handleToggleFeature(feature.slug, 'enabled', checked)
                                }
                                disabled={updateOrgFeatureMutation.isPending}
                              />
                            </div>
                            
                            <div className="flex items-center justify-between">
                              <div>
                                <Label className="text-sm font-medium">User Accessible</Label>
                                <p className="text-xs text-muted-foreground">
                                  Show in navigation for org users
                                </p>
                              </div>
                              <Switch
                                checked={isUserAccessible}
                                onCheckedChange={(checked) =>
                                  handleToggleFeature(feature.slug, 'userAccessible', checked)
                                }
                                disabled={updateOrgFeatureMutation.isPending || !isEnabled}
                              />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                </div>
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}