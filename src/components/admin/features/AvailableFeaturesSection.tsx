import React, { useState, useCallback } from 'react';
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

// Memoized feature card component for performance
const FeatureCard = React.memo(({ 
  feature, 
  onSelect, 
  onToggleActive, 
  onDelete, 
  isUpdating 
}: {
  feature: SystemFeature;
  onSelect: (featureId: string) => void;
  onToggleActive: (feature: SystemFeature) => void;
  onDelete: (feature: SystemFeature) => void;
  isUpdating: boolean;
}) => {
  const handleCardClick = useCallback(() => {
    onSelect(feature.id);
  }, [feature.id, onSelect]);

  const handleToggleClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onToggleActive(feature);
  }, [feature, onToggleActive]);

  const handleDeleteClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete(feature);
  }, [feature, onDelete]);

  return (
    <Card 
      className={cn(
        "transition-all hover:shadow-md cursor-pointer",
        !feature.is_active && "opacity-60"
      )}
      onClick={handleCardClick}
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
              onClick={handleToggleClick}
              disabled={isUpdating}
            >
              {feature.is_active ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
            </Button>
            
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                  onClick={(e) => e.stopPropagation()}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete Feature</AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to delete "{feature.display_name}"? This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleDeleteClick}
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
        <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
          {feature.description}
        </p>
        
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>
            {feature.is_marketplace_visible ? 'Public' : 'Private'}
          </span>
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1">
              <Building2 className="h-3 w-3" />
              Organizations
            </span>
            <span className="flex items-center gap-1">
              <Users className="h-3 w-3" />
              Users
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}, (prevProps, nextProps) =>
  prevProps.feature.id === nextProps.feature.id &&
  prevProps.feature.is_active === nextProps.feature.is_active &&
  prevProps.feature.updated_at === nextProps.feature.updated_at &&
  prevProps.isUpdating === nextProps.isUpdating
);

FeatureCard.displayName = 'FeatureCard';

export function AvailableFeaturesSection({ features, onFeatureSelect }: AvailableFeaturesSectionProps) {
  const { toast } = useToast();
  const [updatingFeature, setUpdatingFeature] = useState<string | null>(null);

  // Stable callbacks to prevent re-renders
  const handleToggleActive = useCallback(async (feature: SystemFeature) => {
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
  }, [toast]);

  const handleDeleteFeature = useCallback(async (feature: SystemFeature) => {
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
  }, [toast]);

  const handleFeatureSelect = useCallback((featureId: string) => {
    onFeatureSelect(featureId);
  }, [onFeatureSelect]);

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
            <FeatureCard
              key={feature.id}
              feature={feature}
              onSelect={handleFeatureSelect}
              onToggleActive={handleToggleActive}
              onDelete={handleDeleteFeature}
              isUpdating={updatingFeature === feature.id}
            />
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