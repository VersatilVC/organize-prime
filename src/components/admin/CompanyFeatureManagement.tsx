import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { GripVertical, Users, Settings, Eye, EyeOff } from 'lucide-react';
import { useOrganizationFeatureConfigs } from '@/hooks/useOrganizationFeatureConfigs';
import { useSystemFeatureConfigs } from '@/hooks/useSystemFeatureConfigs';
import { useOrganizationUsers } from '@/hooks/database/useOrganizationUsers';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface FeatureWithConfig {
  feature_slug: string;
  displayName: string;
  description: string;
  is_enabled?: boolean;
  is_user_accessible?: boolean;
  org_menu_order?: number;
  id?: string;
}

const featureMetadata: Record<string, { displayName: string; description: string }> = {
  'knowledge-base': {
    displayName: 'Knowledge Base',
    description: 'AI-powered document search and knowledge management'
  },
  'content-creation': {
    displayName: 'Content Creation',
    description: 'AI-assisted content generation and editing tools'
  },
  'market-intel': {
    displayName: 'Market Intelligence',
    description: 'Market research and competitive analysis tools'
  }
};

export function CompanyFeatureManagement() {
  const { configs: systemConfigs } = useSystemFeatureConfigs();
  const { 
    configs: orgConfigs, 
    updateConfig, 
    updateMenuOrder, 
    updateUserAccess,
    isUpdating, 
    isUpdatingOrder,
    isUpdatingUserAccess 
  } = useOrganizationFeatureConfigs();
  const { users } = useOrganizationUsers();
  
  const [features, setFeatures] = useState<FeatureWithConfig[]>([]);
  const [selectedUser, setSelectedUser] = useState<string>('');

  // Merge system configs with organization configs
  React.useEffect(() => {
    const availableFeatures = systemConfigs
      .filter(config => config.is_enabled_globally)
      .map(systemConfig => {
        const orgConfig = orgConfigs.find(config => config.feature_slug === systemConfig.feature_slug);
        return {
          feature_slug: systemConfig.feature_slug,
          displayName: featureMetadata[systemConfig.feature_slug]?.displayName || systemConfig.feature_slug,
          description: featureMetadata[systemConfig.feature_slug]?.description || 'No description available',
          is_enabled: orgConfig?.is_enabled ?? true,
          is_user_accessible: orgConfig?.is_user_accessible ?? true,
          org_menu_order: orgConfig?.org_menu_order ?? systemConfig.system_menu_order,
          id: orgConfig?.id
        };
      })
      .sort((a, b) => (a.org_menu_order || 0) - (b.org_menu_order || 0));
    
    setFeatures(availableFeatures);
  }, [systemConfigs, orgConfigs]);

  const handleToggleFeatureEnabled = (feature: FeatureWithConfig) => {
    updateConfig({
      featureSlug: feature.feature_slug,
      config: { 
        is_enabled: !feature.is_enabled,
        is_user_accessible: feature.is_user_accessible,
        org_menu_order: feature.org_menu_order || 0
      }
    });
  };

  const handleToggleUserAccessible = (feature: FeatureWithConfig) => {
    updateConfig({
      featureSlug: feature.feature_slug,
      config: { 
        is_enabled: feature.is_enabled,
        is_user_accessible: !feature.is_user_accessible,
        org_menu_order: feature.org_menu_order || 0
      }
    });
  };

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;

    const items = Array.from(features);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    // Update local state immediately for better UX
    setFeatures(items);

    // Update menu order in database (only for items with IDs)
    const updates = items
      .filter(item => item.id)
      .map((item, index) => ({
        id: item.id!,
        org_menu_order: index
      }));

    if (updates.length > 0) {
      updateMenuOrder(updates);
    }
  };

  const handleUserFeatureToggle = (userId: string, featureSlug: string, isEnabled: boolean) => {
    updateUserAccess({ userId, featureSlug, isEnabled });
  };

  return (
    <div className="space-y-6">
      <Tabs defaultValue="organization" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="organization">Organization Features</TabsTrigger>
          <TabsTrigger value="users">User Access Control</TabsTrigger>
        </TabsList>
        
        <TabsContent value="organization" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Organization Feature Management</CardTitle>
              <CardDescription>
                Control which features are available for your organization and manage their menu order.
                Drag and drop to reorder features in the navigation menu.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <DragDropContext onDragEnd={handleDragEnd}>
                <Droppable droppableId="org-features">
                  {(provided) => (
                    <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-4">
                      {features.map((feature, index) => (
                        <Draggable key={feature.feature_slug} draggableId={feature.feature_slug} index={index}>
                          {(provided, snapshot) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              className={cn(
                                "border rounded-lg p-4 bg-card transition-all",
                                snapshot.isDragging && "shadow-lg"
                              )}
                            >
                              <div className="flex items-center space-x-4">
                                {/* Drag Handle */}
                                <div
                                  {...provided.dragHandleProps}
                                  className="flex items-center justify-center w-8 h-8 rounded hover:bg-muted cursor-grab active:cursor-grabbing"
                                >
                                  <GripVertical className="h-4 w-4 text-muted-foreground" />
                                </div>

                                {/* Feature Info */}
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center space-x-2 mb-1">
                                    <h3 className="font-medium truncate">{feature.displayName}</h3>
                                    <Badge variant="outline" className="text-xs">
                                      Order: {feature.org_menu_order || 0}
                                    </Badge>
                                  </div>
                                  <p className="text-sm text-muted-foreground truncate">
                                    {feature.description}
                                  </p>
                                </div>

                                {/* Controls */}
                                <div className="flex items-center space-x-6">
                                  {/* Feature Enable/Disable */}
                                  <div className="flex items-center space-x-2">
                                    <Settings className="h-4 w-4 text-muted-foreground" />
                                    <Label htmlFor={`enabled-${feature.feature_slug}`} className="text-sm">
                                      Enabled
                                    </Label>
                                    <Switch
                                      id={`enabled-${feature.feature_slug}`}
                                      checked={feature.is_enabled ?? true}
                                      onCheckedChange={() => handleToggleFeatureEnabled(feature)}
                                      disabled={isUpdating}
                                    />
                                  </div>

                                  <Separator orientation="vertical" className="h-8" />

                                  {/* User Access Control */}
                                  <div className="flex items-center space-x-2">
                                    <Users className="h-4 w-4 text-muted-foreground" />
                                    <Label htmlFor={`user-access-${feature.feature_slug}`} className="text-sm">
                                      User Access
                                    </Label>
                                    <Switch
                                      id={`user-access-${feature.feature_slug}`}
                                      checked={feature.is_user_accessible ?? true}
                                      onCheckedChange={() => handleToggleUserAccessible(feature)}
                                      disabled={isUpdating || !feature.is_enabled}
                                    />
                                  </div>
                                </div>
                              </div>

                              {/* Status Indicators */}
                              <div className="flex items-center space-x-2 mt-3 ml-12">
                                <Badge 
                                  variant={feature.is_enabled ? "default" : "secondary"}
                                  className="text-xs"
                                >
                                  {feature.is_enabled ? "Enabled" : "Disabled"}
                                </Badge>
                                {feature.is_enabled && (
                                  <Badge 
                                    variant={feature.is_user_accessible ? "default" : "outline"}
                                    className="text-xs"
                                  >
                                    {feature.is_user_accessible ? "User Accessible" : "Admin Only"}
                                  </Badge>
                                )}
                              </div>
                            </div>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </DragDropContext>

              {isUpdatingOrder && (
                <div className="flex items-center justify-center py-4">
                  <p className="text-sm text-muted-foreground">Updating menu order...</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="users" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>User Feature Access</CardTitle>
              <CardDescription>
                Control individual user access to specific features within your organization.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* User Selection */}
              <div className="space-y-2">
                <Label htmlFor="user-select">Select User</Label>
                <Select value={selectedUser} onValueChange={setSelectedUser}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a user to manage their feature access" />
                  </SelectTrigger>
                  <SelectContent>
                    {users.map((user) => (
                      <SelectItem key={user.user_id} value={user.user_id}>
                        {user.full_name || user.username || user.email || 'Unknown User'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Feature Access Controls */}
              {selectedUser && (
                <div className="space-y-4">
                  <h3 className="font-medium">Feature Access for Selected User</h3>
                  <div className="grid gap-4">
                    {features
                      .filter(feature => feature.is_enabled && feature.is_user_accessible)
                      .map((feature) => (
                        <div key={feature.feature_slug} className="flex items-center justify-between p-4 border rounded-lg">
                          <div>
                            <h4 className="font-medium">{feature.displayName}</h4>
                            <p className="text-sm text-muted-foreground">{feature.description}</p>
                          </div>
                          <Switch
                            checked={true} // TODO: Get actual user access state
                            onCheckedChange={(isEnabled) => 
                              handleUserFeatureToggle(selectedUser, feature.feature_slug, isEnabled)
                            }
                            disabled={isUpdatingUserAccess}
                          />
                        </div>
                      ))}
                  </div>
                </div>
              )}

              {!selectedUser && (
                <div className="text-center py-8 text-muted-foreground">
                  Select a user above to manage their feature access permissions.
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}