import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Loader2, Plus, Edit, Trash2, GripVertical } from 'lucide-react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { Icons } from '@/components/ui/icons';
import { useSystemFeatures } from '@/hooks/database/useSystemFeatures';
import { AddFeatureModal } from './features/AddFeatureModal';
import { EditFeatureModal } from './features/EditFeatureModal';
import { FeatureBulkActions } from './features/FeatureBulkActions';
import { FeatureTemplates } from './features/FeatureTemplates';
import { FeatureAnalyticsDashboard } from './features/FeatureAnalyticsDashboard';
import type { SystemFeature } from '@/types/features';

export function SystemFeatureManagement() {
  const { features: systemFeatures, isLoading: featuresLoading, updateFeature, deleteFeature, isDeleting } = useSystemFeatures();
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingFeature, setEditingFeature] = useState<SystemFeature | null>(null);
  const [selectedFeatures, setSelectedFeatures] = useState<string[]>([]);

  const handleToggleGlobalFeature = (feature: typeof systemFeatures[0], isEnabled: boolean) => {
    updateFeature({
      id: feature.id,
      updates: {
        is_active: isEnabled,
        sort_order: feature.sort_order,
      }
    });
  };

  const handleEditFeature = (feature: SystemFeature) => {
    setEditingFeature(feature);
    setIsEditModalOpen(true);
  };

  const handleDeleteFeature = (featureId: string) => {
    deleteFeature(featureId);
  };

  const handleDragEnd = (result: any) => {
    if (!result.destination) return;

    const reorderedFeatures = Array.from(systemFeatures);
    const [removed] = reorderedFeatures.splice(result.source.index, 1);
    reorderedFeatures.splice(result.destination.index, 0, removed);

    // Update sort orders
    reorderedFeatures.forEach((feature, index) => {
      if (feature.sort_order !== index) {
        updateFeature({
          id: feature.id,
          updates: {
            sort_order: index,
            is_active: feature.is_active
          }
        });
      }
    });
  };

  const handleBulkEnable = (featureIds: string[]) => {
    featureIds.forEach(id => {
      const feature = systemFeatures.find(f => f.id === id);
      if (feature && !feature.is_active) {
        updateFeature({
          id,
          updates: {
            is_active: true,
            sort_order: feature.sort_order
          }
        });
      }
    });
  };

  const handleBulkDisable = (featureIds: string[]) => {
    featureIds.forEach(id => {
      const feature = systemFeatures.find(f => f.id === id);
      if (feature && feature.is_active) {
        updateFeature({
          id,
          updates: {
            is_active: false,
            sort_order: feature.sort_order
          }
        });
      }
    });
  };

  const handleBulkDelete = (featureIds: string[]) => {
    featureIds.forEach(id => {
      deleteFeature(id);
    });
  };

  if (featuresLoading) {
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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">System Feature Management</h1>
          <p className="text-muted-foreground">
            Control global availability of features across all organizations
          </p>
        </div>
        <Button onClick={() => setIsAddModalOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Feature
        </Button>
      </div>

      <Tabs defaultValue="features" className="space-y-6">
        <TabsList>
          <TabsTrigger value="features">Features</TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="features">
          <Card>
            <CardHeader>
              <CardTitle>Active Features</CardTitle>
            </CardHeader>
      <CardContent className="space-y-6">
        {/* Bulk Actions */}
        <FeatureBulkActions
          features={systemFeatures}
          selectedFeatures={selectedFeatures}
          onSelectionChange={setSelectedFeatures}
          onBulkEnable={handleBulkEnable}
          onBulkDisable={handleBulkDisable}
          onBulkDelete={handleBulkDelete}
          isLoading={featuresLoading || isDeleting}
        />

        {/* Features List */}
        <div className="space-y-4">
          <DragDropContext onDragEnd={handleDragEnd}>
            <Droppable droppableId="features">
              {(provided) => (
                <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-3">
                  {systemFeatures.map((feature, index) => {
                    const IconComponent = Icons[feature.icon_name as keyof typeof Icons] || Icons.package;
                    
                    return (
                      <Draggable key={feature.id} draggableId={feature.id} index={index}>
                        {(provided) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            className="flex items-center justify-between p-4 border rounded-lg bg-background hover:bg-accent/50 transition-colors"
                          >
                            <div className="flex items-center gap-4">
                              <div className="flex items-center gap-2">
                                <Checkbox
                                  checked={selectedFeatures.includes(feature.id)}
                                  onCheckedChange={(checked) => {
                                    if (checked) {
                                      setSelectedFeatures(prev => [...prev, feature.id]);
                                    } else {
                                      setSelectedFeatures(prev => prev.filter(id => id !== feature.id));
                                    }
                                  }}
                                />
                                <div {...provided.dragHandleProps} className="text-muted-foreground cursor-grab">
                                  <GripVertical className="h-4 w-4" />
                                </div>
                              </div>
                              
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
                                  {!feature.is_active && (
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
                            
                            <div className="flex items-center gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleEditFeature(feature)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    disabled={isDeleting}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Delete Feature</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Are you sure you want to delete "{feature.display_name}"? This action cannot be undone and will remove the feature from all organizations.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={() => handleDeleteFeature(feature.id)}
                                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                    >
                                      Delete
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                              <Switch
                                checked={feature.is_active}
                                onCheckedChange={(checked) => handleToggleGlobalFeature(feature, checked)}
                              />
                            </div>
                          </div>
                        )}
                      </Draggable>
                    );
                  })}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </DragDropContext>
          
          {systemFeatures.length === 0 && (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No features available</p>
            </div>
          )}
        </div>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="templates">
        <FeatureTemplates />
      </TabsContent>

      <TabsContent value="analytics">
        <FeatureAnalyticsDashboard />
      </TabsContent>
    </Tabs>

    <AddFeatureModal 
      open={isAddModalOpen}
      onOpenChange={setIsAddModalOpen}
    />

    <EditFeatureModal 
      open={isEditModalOpen}
      onOpenChange={setIsEditModalOpen}
      feature={editingFeature}
    />
  </div>
  );
}