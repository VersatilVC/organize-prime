import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { GripVertical, Eye, EyeOff, Globe, Building2 } from 'lucide-react';
import { useSystemFeatureConfigs, SystemFeatureConfig } from '@/hooks/useSystemFeatureConfigs';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';

interface FeatureListItem extends SystemFeatureConfig {
  displayName: string;
  description: string;
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

export function SystemFeatureManagement() {
  const { configs, isLoading, updateConfig, updateMenuOrder, isUpdating, isUpdatingOrder } = useSystemFeatureConfigs();
  const [features, setFeatures] = useState<FeatureListItem[]>([]);

  // Update local state when configs change
  React.useEffect(() => {
    const enrichedFeatures = configs.map(config => ({
      ...config,
      displayName: featureMetadata[config.feature_slug]?.displayName || config.feature_slug,
      description: featureMetadata[config.feature_slug]?.description || 'No description available'
    }));
    setFeatures(enrichedFeatures);
  }, [configs]);

  const handleToggleGlobalEnable = (feature: FeatureListItem) => {
    updateConfig({
      id: feature.id,
      updates: { is_enabled_globally: !feature.is_enabled_globally }
    });
  };

  const handleToggleMarketplaceVisible = (feature: FeatureListItem) => {
    updateConfig({
      id: feature.id,
      updates: { is_marketplace_visible: !feature.is_marketplace_visible }
    });
  };

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;

    const items = Array.from(features);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    // Update local state immediately for better UX
    setFeatures(items);

    // Update menu order in database
    const updates = items.map((item, index) => ({
      id: item.id,
      system_menu_order: index
    }));

    updateMenuOrder(updates);
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Feature Management</CardTitle>
          <CardDescription>Loading feature configurations...</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>System Feature Management</CardTitle>
        <CardDescription>
          Control which features are available globally and manage their marketplace visibility.
          Drag and drop to reorder features in the navigation menu.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <DragDropContext onDragEnd={handleDragEnd}>
          <Droppable droppableId="features">
            {(provided) => (
              <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-4">
                {features.map((feature, index) => (
                  <Draggable key={feature.id} draggableId={feature.id} index={index}>
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
                                Order: {feature.system_menu_order}
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground truncate">
                              {feature.description}
                            </p>
                          </div>

                          {/* Controls */}
                          <div className="flex items-center space-x-6">
                            {/* Global Enable/Disable */}
                            <div className="flex items-center space-x-2">
                              <Globe className="h-4 w-4 text-muted-foreground" />
                              <Label htmlFor={`global-${feature.id}`} className="text-sm">
                                Globally Enabled
                              </Label>
                              <Switch
                                id={`global-${feature.id}`}
                                checked={feature.is_enabled_globally}
                                onCheckedChange={() => handleToggleGlobalEnable(feature)}
                                disabled={isUpdating}
                              />
                            </div>

                            <Separator orientation="vertical" className="h-8" />

                            {/* Marketplace Visibility */}
                            <div className="flex items-center space-x-2">
                              {feature.is_marketplace_visible ? (
                                <Eye className="h-4 w-4 text-muted-foreground" />
                              ) : (
                                <EyeOff className="h-4 w-4 text-muted-foreground" />
                              )}
                              <Label htmlFor={`marketplace-${feature.id}`} className="text-sm">
                                Marketplace Visible
                              </Label>
                              <Switch
                                id={`marketplace-${feature.id}`}
                                checked={feature.is_marketplace_visible}
                                onCheckedChange={() => handleToggleMarketplaceVisible(feature)}
                                disabled={isUpdating || !feature.is_enabled_globally}
                              />
                            </div>
                          </div>
                        </div>

                        {/* Status Indicators */}
                        <div className="flex items-center space-x-2 mt-3 ml-12">
                          <Badge 
                            variant={feature.is_enabled_globally ? "default" : "secondary"}
                            className="text-xs"
                          >
                            {feature.is_enabled_globally ? "Enabled" : "Disabled"}
                          </Badge>
                          {feature.is_enabled_globally && (
                            <Badge 
                              variant={feature.is_marketplace_visible ? "default" : "outline"}
                              className="text-xs"
                            >
                              {feature.is_marketplace_visible ? "Public" : "Private"}
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
  );
}