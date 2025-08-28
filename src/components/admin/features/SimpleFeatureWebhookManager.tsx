import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { useFeatureWebhookAssignments } from '@/hooks/useFeatureWebhookAssignments';
import { useWebhooks } from '@/hooks/useWebhooks';
import { WebhookAssignmentDiagnostics } from '@/components/admin/WebhookAssignmentDiagnostics';
import type { SystemFeature } from '@/types/features';
import { 
  Webhook, 
  Plus, 
  Trash2, 
  Edit,
  CheckCircle, 
  XCircle,
  ExternalLink,
  Globe,
  Building
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
    isUpdating,
    isDeleting
  } = useFeatureWebhookAssignments(feature.slug);
  
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingAssignment, setEditingAssignment] = useState<any>(null);
  const [newAssignment, setNewAssignment] = useState({
    feature_page: '',
    button_position: '',
    webhook_id: '',
    custom_position: '',
  });

  const handleCreateAssignment = async () => {
    // Use custom_position if "custom-position" is selected
    const finalButtonPosition = newAssignment.button_position === 'custom-position' 
      ? newAssignment.custom_position 
      : newAssignment.button_position;

    if (!newAssignment.feature_page || !finalButtonPosition || !newAssignment.webhook_id) {
      toast({
        title: 'Error',
        description: 'Please fill in all required fields.',
        variant: 'destructive',
      });
      return;
    }

    try {
      await createAssignment({
        feature_page: newAssignment.feature_page,
        button_position: finalButtonPosition,
        webhook_id: newAssignment.webhook_id
      });
      setIsAddModalOpen(false);
      setNewAssignment({ feature_page: '', button_position: '', webhook_id: '', custom_position: '' });
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

  const handleEditAssignment = (assignment: any) => {
    setEditingAssignment({
      id: assignment.id,
      feature_page: assignment.feature_page,
      button_position: assignment.button_position,
      webhook_id: assignment.webhook_id,
      custom_position: ''
    });
    setIsEditModalOpen(true);
  };

  const handleUpdateAssignment = async () => {
    if (!editingAssignment) return;

    const finalButtonPosition = editingAssignment.button_position === 'custom-position'
      ? editingAssignment.custom_position
      : editingAssignment.button_position;

    try {
      await updateAssignment(editingAssignment.id, {
        feature_page: editingAssignment.feature_page,
        button_position: finalButtonPosition,
        webhook_id: editingAssignment.webhook_id,
      });
      setIsEditModalOpen(false);
      setEditingAssignment(null);
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
      <Tabs defaultValue="assignments" className="space-y-4">
        <TabsList>
          <TabsTrigger value="assignments" className="flex items-center gap-2">
            <Building className="h-4 w-4" />
            Assignments
          </TabsTrigger>
          <TabsTrigger value="diagnostics" className="flex items-center gap-2">
            <Webhook className="h-4 w-4" />
            Diagnostics
          </TabsTrigger>
        </TabsList>

        <TabsContent value="assignments">
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
            <Button 
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setIsAddModalOpen(true);
              }} 
              disabled={availableWebhooks.length === 0}
            >
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
              <Button 
                type="button" 
                variant="outline" 
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  window.open('/webhooks', '_blank');
                }}
              >
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
              <Button 
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setIsAddModalOpen(true);
                }}
              >
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
                        <div className="flex gap-2 justify-end">
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              handleEditAssignment(assignment);
                            }}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
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
                        </div>
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
      <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Webhook Assignment</DialogTitle>
            <DialogDescription>
              Assign a webhook to a specific page and button position in {feature.display_name}.
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="feature_page">Feature Page</Label>
              <Select
                value={newAssignment.feature_page}
                onValueChange={(value) => setNewAssignment(prev => ({ 
                  ...prev, 
                  feature_page: value, 
                  button_position: '',
                  custom_position: ''
                }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a feature page" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ManageFiles">Manage Files</SelectItem>
                  <SelectItem value="AIChatSettings">AI Chat Settings</SelectItem>
                  <SelectItem value="KnowledgeBaseDashboard">Knowledge Base Dashboard</SelectItem>
                  <SelectItem value="KnowledgeBaseChat">Knowledge Base Chat</SelectItem>
                  <SelectItem value="KnowledgeBaseManagement">Knowledge Base Management</SelectItem>
                  <SelectItem value="FeatureDashboard">Feature Dashboard</SelectItem>
                  <SelectItem value="FeatureSettings">Feature Settings</SelectItem>
                  <SelectItem value="UserDashboard">User Dashboard</SelectItem>
                  <SelectItem value="AdminPanel">Admin Panel</SelectItem>
                  <SelectItem value="NotificationCenter">Notification Center</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="button_position">Button Position</Label>
              <Select
                value={newAssignment.button_position}
                onValueChange={(value) => setNewAssignment(prev => ({ 
                  ...prev, 
                  button_position: value,
                  custom_position: value === 'custom-position' ? prev.custom_position : ''
                }))}
                disabled={!newAssignment.feature_page}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a button position" />
                </SelectTrigger>
                <SelectContent>
                  {newAssignment.feature_page === 'ManageFiles' && (
                    <>
                      <SelectItem value="upload-section">Upload Section</SelectItem>
                      <SelectItem value="file-actions">File Actions</SelectItem>
                      <SelectItem value="bulk-operations">Bulk Operations</SelectItem>
                      <SelectItem value="file-preview">File Preview</SelectItem>
                    </>
                  )}
                  {newAssignment.feature_page === 'AIChatSettings' && (
                    <>
                      <SelectItem value="chat-input">Chat Input</SelectItem>
                      <SelectItem value="message-actions">Message Actions</SelectItem>
                      <SelectItem value="conversation-header">Conversation Header</SelectItem>
                      <SelectItem value="settings-panel">Settings Panel</SelectItem>
                    </>
                  )}
                  {newAssignment.feature_page === 'KnowledgeBaseDashboard' && (
                    <>
                      <SelectItem value="dashboard-header">Dashboard Header</SelectItem>
                      <SelectItem value="stats-section">Stats Section</SelectItem>
                      <SelectItem value="quick-actions">Quick Actions</SelectItem>
                      <SelectItem value="recent-activity">Recent Activity</SelectItem>
                    </>
                  )}
                  {newAssignment.feature_page === 'KnowledgeBaseChat' && (
                    <>
                      <SelectItem value="chat-input">Chat Input</SelectItem>
                      <SelectItem value="message-send">Message Send</SelectItem>
                      <SelectItem value="conversation-start">Conversation Start</SelectItem>
                      <SelectItem value="file-upload">File Upload</SelectItem>
                    </>
                  )}
                  {newAssignment.feature_page === 'KnowledgeBaseManagement' && (
                    <>
                      <SelectItem value="create-kb">Create Knowledge Base</SelectItem>
                      <SelectItem value="manage-documents">Manage Documents</SelectItem>
                      <SelectItem value="configuration">Configuration</SelectItem>
                      <SelectItem value="analytics">Analytics</SelectItem>
                    </>
                  )}
                  {(newAssignment.feature_page === 'FeatureDashboard' || 
                    newAssignment.feature_page === 'FeatureSettings' ||
                    newAssignment.feature_page === 'UserDashboard' ||
                    newAssignment.feature_page === 'AdminPanel' ||
                    newAssignment.feature_page === 'NotificationCenter') && (
                    <>
                      <SelectItem value="header-actions">Header Actions</SelectItem>
                      <SelectItem value="main-content">Main Content</SelectItem>
                      <SelectItem value="sidebar">Sidebar</SelectItem>
                      <SelectItem value="footer-actions">Footer Actions</SelectItem>
                      <SelectItem value="form-submit">Form Submit</SelectItem>
                      <SelectItem value="bulk-actions">Bulk Actions</SelectItem>
                    </>
                  )}
                  {/* Common positions for any page */}
                  <SelectItem value="custom-position">Custom Position</SelectItem>
                </SelectContent>
              </Select>
              {newAssignment.button_position === 'custom-position' && (
                <Input
                  placeholder="Enter custom position name"
                  value={newAssignment.custom_position || ''}
                  onChange={(e) => setNewAssignment(prev => ({ ...prev, custom_position: e.target.value }))}
                  className="mt-2"
                />
              )}
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

          <DialogFooter>
            <Button 
              type="button" 
              variant="outline" 
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setIsAddModalOpen(false);
                setNewAssignment({ feature_page: '', button_position: '', webhook_id: '', custom_position: '' });
              }}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleCreateAssignment();
              }}
              disabled={isCreating}
            >
              {isCreating ? 'Creating...' : 'Create Assignment'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Assignment Modal */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Webhook Assignment</DialogTitle>
            <DialogDescription>
              Update the webhook assignment for {feature.display_name}.
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="edit_feature_page">Feature Page</Label>
              <Select
                value={editingAssignment?.feature_page || ''}
                onValueChange={(value) => setEditingAssignment(prev => ({ ...prev, feature_page: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a page" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="AIChatSettings">AI Chat Settings</SelectItem>
                  <SelectItem value="ManageFiles">Manage Files</SelectItem>
                  <SelectItem value="KnowledgeBaseDashboard">KB Dashboard</SelectItem>
                  <SelectItem value="KnowledgeBaseChat">KB Chat</SelectItem>
                  <SelectItem value="ManageKnowledgeBases">Manage KBs</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="edit_button_position">Button Position</Label>
              <Select
                value={editingAssignment?.button_position || ''}
                onValueChange={(value) => setEditingAssignment(prev => ({ ...prev, button_position: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select position" />
                </SelectTrigger>
                <SelectContent>
                  {editingAssignment?.feature_page === 'AIChatSettings' && (
                    <>
                      <SelectItem value="settings-panel">Settings Panel (Save Button)</SelectItem>
                    </>
                  )}
                  {editingAssignment?.feature_page === 'ManageFiles' && (
                    <>
                      <SelectItem value="upload-section">Upload Section</SelectItem>
                      <SelectItem value="file-actions">File Actions</SelectItem>
                    </>
                  )}
                  <SelectItem value="custom-position">Custom Position</SelectItem>
                </SelectContent>
              </Select>
              {editingAssignment?.button_position === 'custom-position' && (
                <Input
                  placeholder="Enter custom position name"
                  value={editingAssignment?.custom_position || ''}
                  onChange={(e) => setEditingAssignment(prev => ({ ...prev, custom_position: e.target.value }))}
                  className="mt-2"
                />
              )}
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="edit_webhook_id">Webhook</Label>
              <Select
                value={editingAssignment?.webhook_id || ''}
                onValueChange={(value) => setEditingAssignment(prev => ({ ...prev, webhook_id: value }))}
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

          <DialogFooter>
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => {
                setIsEditModalOpen(false);
                setEditingAssignment(null);
              }}
            >
              Cancel
            </Button>
            <Button 
              type="button" 
              onClick={handleUpdateAssignment}
              disabled={isUpdating}
            >
              {isUpdating ? 'Updating...' : 'Update Assignment'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
        </TabsContent>

        <TabsContent value="diagnostics">
          <WebhookAssignmentDiagnostics />
        </TabsContent>
      </Tabs>
    </>
  );
}