import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Loader2, Plus, Edit, Trash2 } from 'lucide-react';
import { Icons } from '@/components/ui/icons';
import { useSystemFeatures } from '@/hooks/database/useSystemFeatures';
import { AddFeatureModal } from './features/AddFeatureModal';
import { EditFeatureModal } from './features/EditFeatureModal';
import type { SystemFeature } from '@/types/features';

export function SystemFeatureManagement() {
  const { features: systemFeatures, isLoading: featuresLoading, updateFeature, deleteFeature, isDeleting } = useSystemFeatures();
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingFeature, setEditingFeature] = useState<SystemFeature | null>(null);

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
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>System Feature Management</CardTitle>
            <p className="text-sm text-muted-foreground">
              Control global availability of features across all organizations
            </p>
          </div>
          <Button onClick={() => setIsAddModalOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Feature
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {systemFeatures.map((feature) => {
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
            );
          })}
          
          {systemFeatures.length === 0 && (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No features available</p>
            </div>
          )}
        </div>
      </CardContent>

      <AddFeatureModal 
        open={isAddModalOpen}
        onOpenChange={setIsAddModalOpen}
      />

      <EditFeatureModal 
        open={isEditModalOpen}
        onOpenChange={setIsEditModalOpen}
        feature={editingFeature}
      />
    </Card>
  );
}