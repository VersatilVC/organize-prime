/**
 * Webhook Bulk Actions Component
 * Provides bulk operations for selected webhooks
 */

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Play, 
  Pause, 
  Trash2, 
  TestTube, 
  X, 
  Download,
  AlertTriangle 
} from 'lucide-react';
import { toast } from 'sonner';
import { useUpdateElementWebhook, useDeleteElementWebhook } from '@/hooks/useElementWebhooks';

interface WebhookBulkActionsProps {
  selectedWebhookIds: string[];
  onClearSelection: () => void;
}

export function WebhookBulkActions({ selectedWebhookIds, onClearSelection }: WebhookBulkActionsProps) {
  const updateWebhookMutation = useUpdateElementWebhook();
  const deleteWebhookMutation = useDeleteElementWebhook();

  const selectedCount = selectedWebhookIds.length;

  const handleBulkEnable = async () => {
    try {
      // In a real implementation, we'd have a bulk update endpoint
      for (const id of selectedWebhookIds) {
        await updateWebhookMutation.mutateAsync({
          id,
          updates: { isActive: true }
        });
      }
      toast.success(`${selectedCount} webhooks enabled successfully`);
      onClearSelection();
    } catch (error) {
      toast.error('Failed to enable some webhooks');
    }
  };

  const handleBulkDisable = async () => {
    try {
      // In a real implementation, we'd have a bulk update endpoint
      for (const id of selectedWebhookIds) {
        await updateWebhookMutation.mutateAsync({
          id,
          updates: { isActive: false }
        });
      }
      toast.success(`${selectedCount} webhooks disabled successfully`);
      onClearSelection();
    } catch (error) {
      toast.error('Failed to disable some webhooks');
    }
  };

  const handleBulkDelete = async () => {
    const confirmed = confirm(
      `Are you sure you want to delete ${selectedCount} webhook${selectedCount > 1 ? 's' : ''}? This action cannot be undone.`
    );
    
    if (!confirmed) return;

    try {
      // In a real implementation, we'd have a bulk delete endpoint
      for (const id of selectedWebhookIds) {
        await deleteWebhookMutation.mutateAsync(id);
      }
      toast.success(`${selectedCount} webhooks deleted successfully`);
      onClearSelection();
    } catch (error) {
      toast.error('Failed to delete some webhooks');
    }
  };

  const handleBulkTest = () => {
    toast.info('Bulk testing will be available in the testing panel');
  };

  const handleBulkExport = () => {
    // TODO: Implement bulk export
    toast.info('Bulk export functionality will be available soon');
  };

  return (
    <Card className="border-blue-200 bg-blue-50/50">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Badge variant="secondary" className="bg-blue-100 text-blue-800">
              {selectedCount} selected
            </Badge>
            <span className="text-sm text-muted-foreground">
              Bulk actions for selected webhooks
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* Bulk Action Buttons */}
            <Button
              variant="outline"
              size="sm"
              onClick={handleBulkEnable}
              className="h-8"
              disabled={updateWebhookMutation.isPending}
            >
              <Play className="h-3 w-3 mr-1" />
              Enable
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={handleBulkDisable}
              className="h-8"
              disabled={updateWebhookMutation.isPending}
            >
              <Pause className="h-3 w-3 mr-1" />
              Disable
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={handleBulkTest}
              className="h-8"
            >
              <TestTube className="h-3 w-3 mr-1" />
              Test
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={handleBulkExport}
              className="h-8"
            >
              <Download className="h-3 w-3 mr-1" />
              Export
            </Button>

            {/* Destructive Actions */}
            <div className="flex items-center gap-2 ml-2 pl-2 border-l">
              <Button
                variant="outline"
                size="sm"
                onClick={handleBulkDelete}
                className="h-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                disabled={deleteWebhookMutation.isPending}
              >
                <Trash2 className="h-3 w-3 mr-1" />
                Delete
              </Button>

              <Button
                variant="ghost"
                size="sm"
                onClick={onClearSelection}
                className="h-8"
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          </div>
        </div>

        {/* Warning for bulk delete */}
        {selectedCount > 5 && (
          <div className="flex items-center gap-2 mt-3 p-2 bg-yellow-50 border border-yellow-200 rounded text-sm text-yellow-800">
            <AlertTriangle className="h-4 w-4" />
            <span>
              You have selected {selectedCount} webhooks. Please review your selection carefully before performing bulk operations.
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}