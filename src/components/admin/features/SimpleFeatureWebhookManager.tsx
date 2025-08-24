import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useFeatureWebhookAssignments } from '@/hooks/useFeatureWebhookAssignments';
import { useWebhooks } from '@/hooks/useWebhooks';
import type { SystemFeature } from '@/types/features';
import { 
  Webhook, 
  Plus, 
  Trash2, 
  CheckCircle, 
  XCircle,
  ExternalLink
} from 'lucide-react';

interface SimpleFeatureWebhookManagerProps {
  feature: SystemFeature;
}

export function SimpleFeatureWebhookManager({ feature }: SimpleFeatureWebhookManagerProps) {
  const { toast } = useToast();
  const { webhooks: availableWebhooks, isLoading: webhooksLoading } = useWebhooks();
  const {
    assignments,
    isLoading,
    createAssignment,
    updateAssignment,
    deleteAssignment,
    isCreating,
    isDeleting
  } = useFeatureWebhookAssignments(feature.feature_slug);
  
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newAssignment, setNewAssignment] = useState({
    feature_page: '',
    button_position: '',
    webhook_id: '',
  });

  const handleCreateAssignment = async () => {
    if (!newAssignment.feature_page || !newAssignment.button_position || !newAssignment.webhook_id) {
      toast({
        title: 'Error',
        description: 'Please fill in all required fields.',
        variant: 'destructive',
      });
      return;
    }

    try {
      await createAssignment(newAssignment);
      setIsAddModalOpen(false);
      setNewAssignment({ feature_page: '', button_position: '', webhook_id: '' });
    } catch (error) {
      // Error handled by hook
    }
  };

  const handleDeleteAssignment = async (assignmentId: string) => {
    try {
      await deleteAssignment(assignmentId);
    } catch (error) {
      // Error handled by hook
    }
  };

  const handleToggleAssignment = async (assignmentId: string, isActive: boolean) => {
    try {
      await updateAssignment(assignmentId, { is_active: isActive });
    } catch (error) {
      // Error handled by hook
    }
  };

  if (isLoading || webhooksLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Webhook className="h-5 w-5" />
            Webhook Assignments
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex justify-center py-8">
            <div className="text-center">
              <div className="animate-spin h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
              <p className="text-sm text-muted-foreground">Loading webhook assignments...</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Webhook className="h-5 w-5" />
                Webhook Assignments for {feature.display_name}
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Assign webhooks to specific pages and button positions in this feature.
              </p>
            </div>
            <Button onClick={() => setIsAddModalOpen(true)} disabled={availableWebhooks.length === 0}>
              <Plus className="h-4 w-4 mr-2" />
              Add Assignment
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {availableWebhooks.length === 0 && (
            <div className="text-center py-8">
              <Webhook className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-semibold mb-2">No Webhooks Available</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Create webhooks first in the Webhook Management section before assigning them to features.
              </p>
              <Button variant="outline" onClick={() => window.open('/webhooks', '_blank')}>
                <ExternalLink className="h-4 w-4 mr-2" />
                Go to Webhook Management
              </Button>
            </div>
          )}

          {availableWebhooks.length > 0 && assignments.length === 0 && (
            <div className="text-center py-8">
              <Webhook className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-semibold mb-2">No Webhook Assignments</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Assign webhooks to specific pages and button positions to enable webhook triggers.
              </p>
              <Button onClick={() => setIsAddModalOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create First Assignment
              </Button>
            </div>
          )}

          {assignments.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-medium">Active Assignments ({assignments.length})</h4>
              </div>
              
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Page</TableHead>
                    <TableHead>Position</TableHead>
                    <TableHead>Webhook</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {assignments.map((assignment) => (
                    <TableRow key={assignment.id}>
                      <TableCell className="font-medium">
                        {assignment.feature_page}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {assignment.button_position}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {assignment.webhook?.name || 'Unknown Webhook'}
                        <div className="text-xs text-muted-foreground">
                          {assignment.webhook?.webhook_url}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={assignment.is_active}
                            onCheckedChange={(checked) => 
                              handleToggleAssignment(assignment.id, checked)
                            }
                          />
                          {assignment.is_active ? (
                            <Badge variant="default" className="gap-1">
                              <CheckCircle className="h-3 w-3" />
                              Active
                            </Badge>
                          ) : (
                            <Badge variant="secondary" className="gap-1">
                              <XCircle className="h-3 w-3" />
                              Inactive
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="destructive" size="sm">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Webhook Assignment</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to delete this webhook assignment? This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDeleteAssignment(assignment.id)}
                                disabled={isDeleting}
                              >
                                Delete Assignment
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Assignment Modal */}
      <AlertDialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Add Webhook Assignment</AlertDialogTitle>
            <AlertDialogDescription>
              Assign a webhook to a specific page and button position in {feature.display_name}.
            </AlertDialogDescription>
          </AlertDialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="feature_page">Feature Page</Label>
              <Input
                id="feature_page"
                placeholder="e.g., ManageFiles, AIChatSettings"
                value={newAssignment.feature_page}
                onChange={(e) => setNewAssignment(prev => ({ ...prev, feature_page: e.target.value }))}
              />
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="button_position">Button Position</Label>
              <Input
                id="button_position"
                placeholder="e.g., upload-section, chat-input"
                value={newAssignment.button_position}
                onChange={(e) => setNewAssignment(prev => ({ ...prev, button_position: e.target.value }))}
              />
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="webhook_id">Webhook</Label>
              <Select
                value={newAssignment.webhook_id}
                onValueChange={(value) => setNewAssignment(prev => ({ ...prev, webhook_id: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a webhook" />
                </SelectTrigger>
                <SelectContent>
                  {availableWebhooks
                    .filter(webhook => webhook.is_active)
                    .map((webhook) => (
                      <SelectItem key={webhook.id} value={webhook.id}>
                        {webhook.name}
                        <div className="text-xs text-muted-foreground">
                          {webhook.webhook_url}
                        </div>
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCreateAssignment}
              disabled={isCreating}
            >
              {isCreating ? 'Creating...' : 'Create Assignment'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}