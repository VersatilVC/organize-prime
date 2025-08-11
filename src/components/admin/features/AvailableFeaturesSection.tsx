import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { 
  Edit, 
  Trash2, 
  Building2, 
  Webhook,
  Eye,
  EyeOff,
  Package,
  Users,
  Activity
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import type { SystemFeature } from '@/types/features';

interface AvailableFeaturesSectionProps {
  features: SystemFeature[];
  onFeatureSelect: (featureId: string) => void;
}

const categoryColors = {
  business: 'bg-blue-100 text-blue-800 border-blue-200',
  productivity: 'bg-green-100 text-green-800 border-green-200',
  analytics: 'bg-purple-100 text-purple-800 border-purple-200',
  communication: 'bg-orange-100 text-orange-800 border-orange-200',
  integration: 'bg-indigo-100 text-indigo-800 border-indigo-200',
};

const getCategoryColor = (category: string) => {
  return categoryColors[category as keyof typeof categoryColors] || 'bg-gray-100 text-gray-800 border-gray-200';
};

export function AvailableFeaturesSection({ features, onFeatureSelect }: AvailableFeaturesSectionProps) {
  const { toast } = useToast();
  const [updatingFeature, setUpdatingFeature] = useState<string | null>(null);

  const handleToggleActive = async (feature: SystemFeature) => {
    setUpdatingFeature(feature.id);
    try {
      // Implementation for toggling feature active state
      toast({
        title: 'Feature Updated',
        description: `${feature.display_name} has been ${feature.is_active ? 'disabled' : 'enabled'}`,
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update feature status',
        variant: 'destructive',
      });
    } finally {
      setUpdatingFeature(null);
    }
  };

  const handleDeleteFeature = async (feature: SystemFeature) => {
    try {
      // Implementation for deleting feature
      toast({
        title: 'Feature Deleted',
        description: `${feature.display_name} has been removed`,
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete feature',
        variant: 'destructive',
      });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Package className="h-5 w-5" />
          Available Features
        </CardTitle>
        <CardDescription>
          Manage system features and their availability across the platform
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {features.map((feature) => (
            <Card 
              key={feature.id} 
              className={cn(
                "transition-all hover:shadow-md cursor-pointer",
                !feature.is_active && "opacity-60"
              )}
              onClick={() => onFeatureSelect(feature.id)}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div 
                      className="w-10 h-10 rounded-lg flex items-center justify-center text-white"
                      style={{ backgroundColor: feature.color_hex }}
                    >
                      <Package className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-base font-medium truncate">
                        {feature.display_name}
                      </CardTitle>
                      <Badge 
                        variant="outline" 
                        className={cn("text-xs mt-1", getCategoryColor(feature.category))}
                      >
                        {feature.category}
                      </Badge>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0"
                      onClick={(e) => {
                        e.stopPropagation();
                        onFeatureSelect(feature.id);
                      }}
                    >
                      <Edit className="h-3 w-3" />
                    </Button>
                    
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 text-destructive"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Trash2 className="h-3 w-3" />
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
                            onClick={() => handleDeleteFeature(feature)}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              </CardHeader>
              
              <CardContent className="pt-0">
                <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                  {feature.description || 'No description available'}
                </p>
                
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label htmlFor={`active-${feature.id}`} className="text-sm">
                      Active
                    </Label>
                    <Switch
                      id={`active-${feature.id}`}
                      checked={feature.is_active}
                      onCheckedChange={() => handleToggleActive(feature)}
                      disabled={updatingFeature === feature.id}
                      onClick={(e) => e.stopPropagation()}
                    />
                  </div>
                  
                  <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Building2 className="h-3 w-3" />
                      <span>0 orgs</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Webhook className="h-3 w-3" />
                      <span>0 webhooks</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
        
        {features.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No features available</p>
            <p className="text-sm">Add your first feature to get started</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}