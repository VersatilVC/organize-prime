import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  CheckSquare, 
  Square, 
  Power, 
  PowerOff, 
  Trash2, 
  Download, 
  Upload,
  Settings
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { SystemFeature } from '@/types/features';

interface FeatureBulkActionsProps {
  features: SystemFeature[];
  selectedFeatures: string[];
  onSelectionChange: (selected: string[]) => void;
  onBulkEnable: (featureIds: string[]) => void;
  onBulkDisable: (featureIds: string[]) => void;
  onBulkDelete: (featureIds: string[]) => void;
  isLoading?: boolean;
}

export function FeatureBulkActions({
  features,
  selectedFeatures,
  onSelectionChange,
  onBulkEnable,
  onBulkDisable,
  onBulkDelete,
  isLoading = false
}: FeatureBulkActionsProps) {
  const { toast } = useToast();
  const [bulkCategory, setBulkCategory] = useState<string>('');

  const handleSelectAll = () => {
    if (selectedFeatures.length === features.length) {
      onSelectionChange([]);
    } else {
      onSelectionChange(features.map(f => f.id));
    }
  };

  const handleSelectByCategory = (category: string) => {
    const categoryFeatures = features
      .filter(f => f.category === category)
      .map(f => f.id);
    
    const newSelection = new Set(selectedFeatures);
    categoryFeatures.forEach(id => {
      if (newSelection.has(id)) {
        newSelection.delete(id);
      } else {
        newSelection.add(id);
      }
    });
    
    onSelectionChange(Array.from(newSelection));
  };

  const handleBulkEnable = () => {
    onBulkEnable(selectedFeatures);
    onSelectionChange([]);
    toast({
      title: 'Features Enabled',
      description: `${selectedFeatures.length} features have been enabled`,
    });
  };

  const handleBulkDisable = () => {
    onBulkDisable(selectedFeatures);
    onSelectionChange([]);
    toast({
      title: 'Features Disabled',
      description: `${selectedFeatures.length} features have been disabled`,
    });
  };

  const handleBulkDelete = () => {
    onBulkDelete(selectedFeatures);
    onSelectionChange([]);
    toast({
      title: 'Features Deleted',
      description: `${selectedFeatures.length} features have been deleted`,
    });
  };

  const exportFeatures = () => {
    const selectedFeaturesData = features.filter(f => selectedFeatures.includes(f.id));
    const exportData = {
      features: selectedFeaturesData,
      exportedAt: new Date().toISOString(),
      version: '1.0'
    };
    
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { 
      type: 'application/json' 
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `features-export-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast({
      title: 'Features Exported',
      description: `${selectedFeatures.length} features exported successfully`,
    });
  };

  const categories = Array.from(new Set(features.map(f => f.category)));
  const selectedCount = selectedFeatures.length;
  const isAllSelected = selectedCount === features.length;
  const isPartiallySelected = selectedCount > 0 && selectedCount < features.length;

  const enabledSelected = selectedFeatures.filter(id => 
    features.find(f => f.id === id)?.is_active
  ).length;
  const disabledSelected = selectedCount - enabledSelected;

  if (features.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="h-5 w-5" />
          Bulk Actions
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Selection Controls */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              size="sm"
              onClick={handleSelectAll}
              className="flex items-center gap-2"
            >
              {isAllSelected ? (
                <CheckSquare className="h-4 w-4" />
              ) : isPartiallySelected ? (
                <Square className="h-4 w-4 fill-current" />
              ) : (
                <Square className="h-4 w-4" />
              )}
              {isAllSelected ? 'Deselect All' : 'Select All'}
            </Button>

            <Select
              value={bulkCategory}
              onValueChange={(value) => {
                setBulkCategory(value);
                handleSelectByCategory(value);
              }}
            >
              <SelectTrigger className="w-40">
                <SelectValue placeholder="By Category" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((category) => (
                  <SelectItem key={category} value={category}>
                    {category}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="text-sm text-muted-foreground">
            {selectedCount > 0 && (
              <span>
                {selectedCount} selected 
                {enabledSelected > 0 && ` (${enabledSelected} enabled`}
                {disabledSelected > 0 && `, ${disabledSelected} disabled`}
                {selectedCount > 0 && ')'}
              </span>
            )}
          </div>
        </div>

        {/* Bulk Actions */}
        {selectedCount > 0 && (
          <div className="flex items-center gap-2 flex-wrap">
            {disabledSelected > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleBulkEnable}
                disabled={isLoading}
                className="flex items-center gap-2"
              >
                <Power className="h-4 w-4" />
                Enable ({disabledSelected})
              </Button>
            )}

            {enabledSelected > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleBulkDisable}
                disabled={isLoading}
                className="flex items-center gap-2"
              >
                <PowerOff className="h-4 w-4" />
                Disable ({enabledSelected})
              </Button>
            )}

            <Button
              variant="outline"
              size="sm"
              onClick={exportFeatures}
              disabled={isLoading}
              className="flex items-center gap-2"
            >
              <Download className="h-4 w-4" />
              Export
            </Button>

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={isLoading}
                  className="flex items-center gap-2 text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                  Delete ({selectedCount})
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete Selected Features</AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to delete {selectedCount} feature{selectedCount > 1 ? 's' : ''}? 
                    This action cannot be undone and will remove the feature{selectedCount > 1 ? 's' : ''} from all organizations.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleBulkDelete}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    Delete {selectedCount} Feature{selectedCount > 1 ? 's' : ''}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        )}

        {/* Category Overview */}
        {selectedCount === 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium">Features by Category</h4>
            <div className="flex flex-wrap gap-2">
              {categories.map((category) => {
                const count = features.filter(f => f.category === category).length;
                const enabledCount = features.filter(f => f.category === category && f.is_active).length;
                
                return (
                  <Badge key={category} variant="outline" className="flex items-center gap-1">
                    {category}
                    <span className="text-xs">
                      {enabledCount}/{count}
                    </span>
                  </Badge>
                );
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}