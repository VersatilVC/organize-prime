import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { useFeatureWebhookAssignments } from '@/hooks/useFeatureWebhookAssignments';
import { useWebhooks } from '@/hooks/useWebhooks';
import type { SystemFeature } from '@/types/features';
import { 
  Webhook, 
  Plus, 
  Edit, 
  Trash2, 
  TestTube, 
  CheckCircle, 
  XCircle, 
  Clock,
  ExternalLink,
  Activity
} from 'lucide-react';
import { AddWebhookModal } from './AddWebhookModal';
import { EditWebhookModal } from './EditWebhookModal';
import { WebhookSetupRequired } from './WebhookSetupRequired';

interface FeatureWebhookManagerProps {
  feature: SystemFeature;
}

export function FeatureWebhookManager({ feature }: FeatureWebhookManagerProps) {
  const { toast } = useToast();
  const { webhooks: availableWebhooks } = useWebhooks();
  const {
    assignments,
    isLoading,
    error,
    createAssignment,
    updateAssignment,
    deleteAssignment,
    isCreating,
    isUpdating,
    isDeleting
  } = useFeatureWebhookAssignments(feature.feature_slug);
  
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingWebhook, setEditingWebhook] = useState<any>(null);

  const handleDeleteWebhook = async (webhookId: string) => {
    try {
      await deleteWebhook(webhookId);
    } catch (error) {
      // Error handled by hook
    }
  };

  const handleToggleWebhook = async (webhookId: string, isActive: boolean) => {
    try {
      await toggleWebhook({ webhookId, isActive });
    } catch (error) {
      // Error handled by hook
    }
  };

  const handleTestWebhook = async (webhook: any) => {
    try {
      await testWebhook(webhook.id);
      // Success and error messages are handled by the hook's mutation
    } catch (error) {
      // Error handling is also done by the hook
      console.error('Test webhook error:', error);
    }
  };

  const handleEditWebhook = (webhook: any) => {
    setEditingWebhook(webhook);
    setIsEditModalOpen(true);
  };

  const formatLastTriggered = (timestamp?: string) => {
    if (!timestamp) return 'Never';
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
    
    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return `${Math.floor(diffInHours)}h ago`;
    return date.toLocaleDateString();
  };

  const getStatusBadge = (webhook: any) => {
    if (!webhook.is_active) {
      return <Badge variant="secondary">Inactive</Badge>;
    }
    
    const totalCalls = webhook.success_count + webhook.failure_count;
    if (totalCalls === 0) {
      return <Badge variant="outline">Not Used</Badge>;
    }
    
    const successRate = (webhook.success_count / totalCalls) * 100;
    if (successRate >= 95) {
      return <Badge variant="default" className="bg-green-500">Healthy</Badge>;
    } else if (successRate >= 80) {
      return <Badge variant="secondary" className="bg-yellow-500">Warning</Badge>;
    } else {
      return <Badge variant="destructive">Error</Badge>;
    }
  };

  const truncateUrl = (url: string, maxLength = 50) => {
    if (url.length <= maxLength) return url;
    return url.substring(0, maxLength - 3) + '...';
  };

  // Show setup guide if webhook system is unavailable (tables don't exist)
  if (isWebhookSystemUnavailable) {
    return <WebhookSetupRequired featureName={feature.display_name} />;
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Webhook className="h-5 w-5" />
            Webhooks Configuration
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
            <span className="ml-2">Loading webhooks...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Webhook className="h-5 w-5" />
                Webhooks Configuration
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Configure N8N webhook endpoints for the <strong>{feature.display_name}</strong> feature
              </p>
            </div>
            <Button type="button" onClick={() => setIsAddModalOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Webhook
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {webhooks.length === 0 ? (
            <div className="text-center py-8">
              <Webhook className="h-8 w-8 mx-auto mb-3 text-muted-foreground" />
              <h3 className="text-lg font-medium mb-2">No webhooks configured</h3>
              <p className="text-muted-foreground mb-4">
                Set up N8N webhook endpoints to enable automation for this feature.
              </p>
              <Button type="button" onClick={() => setIsAddModalOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add First Webhook
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Summary Stats */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-muted/50 rounded-lg p-3">
                  <div className="flex items-center gap-2">
                    <Webhook className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">Total</span>
                  </div>
                  <p className="text-2xl font-bold mt-1">{webhooks.length}</p>
                </div>
                <div className="bg-muted/50 rounded-lg p-3">
                  <div className="flex items-center gap-2">
                    <Activity className="h-4 w-4 text-green-500" />
                    <span className="text-sm text-muted-foreground">Active</span>
                  </div>
                  <p className="text-2xl font-bold mt-1 text-green-600">
                    {webhooks.filter(w => w.is_active).length}
                  </p>
                </div>
                <div className="bg-muted/50 rounded-lg p-3">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-blue-500" />
                    <span className="text-sm text-muted-foreground">Success Rate</span>
                  </div>
                  <p className="text-2xl font-bold mt-1 text-blue-600">
                    {webhooks.length > 0 
                      ? Math.round(
                          webhooks.reduce((acc, w) => {
                            const total = w.success_count + w.failure_count;
                            return acc + (total > 0 ? (w.success_count / total) * 100 : 0);
                          }, 0) / webhooks.length
                        ) 
                      : 0}%
                  </p>
                </div>
                <div className="bg-muted/50 rounded-lg p-3">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-orange-500" />
                    <span className="text-sm text-muted-foreground">Avg Response</span>
                  </div>
                  <p className="text-2xl font-bold mt-1 text-orange-600">
                    {webhooks.length > 0 
                      ? Math.round(
                          webhooks.reduce((acc, w) => acc + w.avg_response_time, 0) / webhooks.length
                        ) 
                      : 0}ms
                  </p>
                </div>
              </div>

              {/* Webhooks Table */}
              <div className="border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>URL</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Success Rate</TableHead>
                      <TableHead>Avg Response</TableHead>
                      <TableHead>Last Triggered</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {webhooks.map((webhook) => {
                      const totalCalls = webhook.success_count + webhook.failure_count;
                      const successRate = totalCalls > 0 ? (webhook.success_count / totalCalls) * 100 : 0;
                      
                      return (
                        <TableRow key={webhook.id}>
                          <TableCell className="font-medium">
                            <div>
                              <p className="font-medium">{webhook.name}</p>
                              {webhook.description && (
                                <p className="text-xs text-muted-foreground">
                                  {webhook.description}
                                </p>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <span className="font-mono text-xs" title={webhook.url}>
                                {truncateUrl(webhook.url)}
                              </span>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="h-4 w-4 p-0"
                                onClick={() => window.open(webhook.url, '_blank')}
                              >
                                <ExternalLink className="h-3 w-3" />
                              </Button>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {getStatusBadge(webhook)}
                              <Switch
                                checked={webhook.is_active}
                                onCheckedChange={(checked) => handleToggleWebhook(webhook.id, checked)}
                                disabled={isToggling}
                                size="sm"
                              />
                            </div>
                          </TableCell>
                          <TableCell>
                            {totalCalls > 0 ? (
                              <span className={
                                successRate >= 95 ? 'text-green-600' :
                                successRate >= 80 ? 'text-yellow-600' : 'text-red-600'
                              }>
                                {Math.round(successRate)}%
                              </span>
                            ) : (
                              <span className="text-muted-foreground">N/A</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {webhook.avg_response_time > 0 ? (
                              <span>{webhook.avg_response_time}ms</span>
                            ) : (
                              <span className="text-muted-foreground">N/A</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <span className="text-sm">
                              {formatLastTriggered(webhook.last_triggered)}
                            </span>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => handleTestWebhook(webhook)}
                                disabled={isTesting}
                                title="Test webhook"
                              >
                                {isTesting ? (
                                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                                ) : (
                                  <TestTube className="h-4 w-4" />
                                )}
                              </Button>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => handleEditWebhook(webhook)}
                                title="Edit webhook"
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    disabled={isDeleting}
                                    title="Delete webhook"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Delete Webhook</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Are you sure you want to delete "{webhook.name}"? This action cannot be undone and will stop all automation using this webhook.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={() => handleDeleteWebhook(webhook.id)}
                                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                    >
                                      Delete
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modals */}
      <AddWebhookModal
        open={isAddModalOpen}
        onOpenChange={setIsAddModalOpen}
        feature={feature}
      />

      <EditWebhookModal
        open={isEditModalOpen}
        onOpenChange={setIsEditModalOpen}
        webhook={editingWebhook}
        feature={feature}
      />
    </div>
  );
}