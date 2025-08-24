/**
 * Simple Webhook Assignment Manager
 * Allows users to assign webhooks to specific feature pages and button positions
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Trash2, Plus, CheckCircle, XCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useWebhooks } from '@/hooks/useWebhooks';
import { useOrganization } from '@/contexts/OrganizationContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

interface WebhookAssignment {
  id: string;
  feature_slug: string;
  feature_page: string;
  button_position: string;
  webhook_id: string;
  is_active: boolean;
  webhook?: {
    id: string;
    name: string;
  };
}

const COMMON_PAGES = [
  { value: 'ManageFiles', label: 'Manage Files' },
  { value: 'ManageKnowledgeBases', label: 'Manage Knowledge Bases' },
  { value: 'Chat', label: 'AI Chat' },
  { value: 'Dashboard', label: 'Dashboard' },
];

const COMMON_POSITIONS = [
  { value: 'upload-section', label: 'Upload Section' },
  { value: 'header-actions', label: 'Header Actions' },
  { value: 'sidebar-bottom', label: 'Sidebar Bottom' },
  { value: 'footer-actions', label: 'Footer Actions' },
];

export function SimpleWebhookAssignments() {
  const { toast } = useToast();
  const { webhooks } = useWebhooks();
  const { currentOrganization } = useOrganization();
  const queryClient = useQueryClient();

  const [newAssignment, setNewAssignment] = useState({
    feature_page: '',
    button_position: '',
    webhook_id: '',
  });

  // Fetch existing assignments
  const { data: assignments = [], isLoading, refetch } = useQuery({
    queryKey: ['webhook-assignments', currentOrganization?.id],
    queryFn: async () => {
      if (!currentOrganization?.id) return [];
      
      const { data, error } = await supabase
        .from('webhook_button_assignments')
        .select(`
          *,
          webhook:webhooks(id, name)
        `)
        .eq('organization_id', currentOrganization.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as WebhookAssignment[];
    },
    enabled: !!currentOrganization?.id,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });

  // Create assignment mutation
  const createAssignmentMutation = useMutation({
    mutationFn: async (assignment: typeof newAssignment) => {
      if (!currentOrganization?.id) throw new Error('No organization selected');
      
      const { data, error } = await supabase
        .from('webhook_button_assignments')
        .insert({
          organization_id: currentOrganization.id,
          feature_slug: 'knowledge-base', // Default for now
          feature_page: assignment.feature_page,
          button_position: assignment.button_position,
          webhook_id: assignment.webhook_id,
          is_active: true,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast({
        title: 'Assignment Created',
        description: 'Webhook assignment created successfully',
      });
      queryClient.invalidateQueries({ queryKey: ['webhook-assignments'] });
      setNewAssignment({ feature_page: '', button_position: '', webhook_id: '' });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to create assignment',
        variant: 'destructive',
      });
    },
  });

  // Delete assignment mutation
  const deleteAssignmentMutation = useMutation({
    mutationFn: async (assignmentId: string) => {
      const { error } = await supabase
        .from('webhook_button_assignments')
        .delete()
        .eq('id', assignmentId);

      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: 'Assignment Deleted',
        description: 'Webhook assignment deleted successfully',
      });
      queryClient.invalidateQueries({ queryKey: ['webhook-assignments'] });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete assignment',
        variant: 'destructive',
      });
    },
  });

  // Toggle assignment status
  const toggleAssignmentMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase
        .from('webhook_button_assignments')
        .update({ is_active: !is_active })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['webhook-assignments'] });
    },
  });

  const handleCreateAssignment = () => {
    if (!newAssignment.feature_page || !newAssignment.button_position || !newAssignment.webhook_id) {
      toast({
        title: 'Missing Fields',
        description: 'Please fill in all required fields',
        variant: 'destructive',
      });
      return;
    }

    createAssignmentMutation.mutate(newAssignment);
  };

  const activeWebhooks = webhooks.filter(w => w.is_active);

  return (
    <div className="space-y-6">
      {/* Create New Assignment */}
      <Card>
        <CardHeader>
          <CardTitle>Create Webhook Assignment</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="feature_page">Feature Page</Label>
              <Select
                value={newAssignment.feature_page}
                onValueChange={(value) => setNewAssignment(prev => ({ ...prev, feature_page: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select page" />
                </SelectTrigger>
                <SelectContent>
                  {COMMON_PAGES.map((page) => (
                    <SelectItem key={page.value} value={page.value}>
                      {page.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="button_position">Button Position</Label>
              <Select
                value={newAssignment.button_position}
                onValueChange={(value) => setNewAssignment(prev => ({ ...prev, button_position: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select position" />
                </SelectTrigger>
                <SelectContent>
                  {COMMON_POSITIONS.map((position) => (
                    <SelectItem key={position.value} value={position.value}>
                      {position.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="webhook_id">Webhook</Label>
              <Select
                value={newAssignment.webhook_id}
                onValueChange={(value) => setNewAssignment(prev => ({ ...prev, webhook_id: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select webhook" />
                </SelectTrigger>
                <SelectContent>
                  {activeWebhooks.map((webhook) => (
                    <SelectItem key={webhook.id} value={webhook.id}>
                      {webhook.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <Button 
            onClick={handleCreateAssignment} 
            disabled={createAssignmentMutation.isPending}
            className="w-full md:w-auto"
          >
            <Plus className="h-4 w-4 mr-2" />
            Create Assignment
          </Button>
        </CardContent>
      </Card>

      {/* Existing Assignments */}
      <Card>
        <CardHeader>
          <CardTitle>Webhook Assignments</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div>Loading assignments...</div>
          ) : assignments.length === 0 ? (
            <div className="text-center py-4 text-muted-foreground">
              No webhook assignments created yet
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Page</TableHead>
                  <TableHead>Position</TableHead>
                  <TableHead>Webhook</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {assignments.map((assignment) => (
                  <TableRow key={assignment.id}>
                    <TableCell>{assignment.feature_page}</TableCell>
                    <TableCell>{assignment.button_position}</TableCell>
                    <TableCell>{assignment.webhook?.name || 'Unknown'}</TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleAssignmentMutation.mutate({
                          id: assignment.id,
                          is_active: assignment.is_active
                        })}
                        disabled={toggleAssignmentMutation.isPending}
                      >
                        {assignment.is_active ? (
                          <Badge variant="default" className="flex items-center gap-1">
                            <CheckCircle className="h-3 w-3" />
                            Active
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="flex items-center gap-1">
                            <XCircle className="h-3 w-3" />
                            Inactive
                          </Badge>
                        )}
                      </Button>
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteAssignmentMutation.mutate(assignment.id)}
                        disabled={deleteAssignmentMutation.isPending}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}