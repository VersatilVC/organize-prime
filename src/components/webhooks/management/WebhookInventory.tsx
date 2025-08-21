/**
 * Webhook Inventory Component
 * Displays all webhooks in a searchable, filterable table with bulk operations
 */

import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Search, 
  Filter, 
  MoreHorizontal, 
  Edit, 
  Trash2, 
  Play, 
  Pause, 
  TestTube,
  Download,
  Upload
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';

// Import our components and hooks
import { WebhookStatusBadge } from '@/components/webhooks/shared/WebhookStatusBadge';
import { WebhookFilters } from './WebhookFilters';
import { WebhookBulkActions } from './WebhookBulkActions';
import { WebhookConfigurationModal } from '@/components/webhooks/configuration/WebhookConfigurationModal';
import { useActualElementWebhooks } from '@/hooks/useActualElementWebhooks';
import { useUpdateElementWebhook, useDeleteElementWebhook } from '@/hooks/useElementWebhooks';
import type { ElementWebhook } from '@/types/webhook';

export function WebhookInventory() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedWebhooks, setSelectedWebhooks] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [editingWebhook, setEditingWebhook] = useState<ElementWebhook | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  
  // Filter states
  const [filters, setFilters] = useState({
    isActive: undefined as boolean | undefined,
    healthStatus: undefined as string | undefined,
    featureSlug: undefined as string | undefined,
  });

  // Hooks
  const { data: webhooksData, isLoading, error } = useActualElementWebhooks(filters);
  const updateWebhookMutation = useUpdateElementWebhook();
  const deleteWebhookMutation = useDeleteElementWebhook();

  // Filter webhooks based on search query
  const filteredWebhooks = useMemo(() => {
    if (!webhooksData?.webhooks) return [];
    
    return webhooksData.webhooks.filter(webhook => {
      const searchLower = searchQuery.toLowerCase();
      return (
        (webhook.featureSlug || '').toLowerCase().includes(searchLower) ||
        (webhook.pagePath || '').toLowerCase().includes(searchLower) ||
        (webhook.elementId || '').toLowerCase().includes(searchLower) ||
        (webhook.endpointUrl || '').toLowerCase().includes(searchLower) ||
        (webhook.displayName || '').toLowerCase().includes(searchLower)
      );
    });
  }, [webhooksData?.webhooks, searchQuery]);

  // Selection handlers
  const handleSelectAll = (checked: boolean) => {
    setSelectedWebhooks(checked ? filteredWebhooks.map(w => w.id) : []);
  };

  const handleSelectWebhook = (webhookId: string, checked: boolean) => {
    setSelectedWebhooks(prev => 
      checked 
        ? [...prev, webhookId]
        : prev.filter(id => id !== webhookId)
    );
  };

  const isAllSelected = filteredWebhooks.length > 0 && selectedWebhooks.length === filteredWebhooks.length;
  const isPartiallySelected = selectedWebhooks.length > 0 && selectedWebhooks.length < filteredWebhooks.length;

  // Action handlers
  const handleEditWebhook = (webhook: ElementWebhook) => {
    setEditingWebhook(webhook);
    setIsEditModalOpen(true);
  };

  const handleToggleWebhook = async (webhook: ElementWebhook) => {
    try {
      await updateWebhookMutation.mutateAsync({
        id: webhook.id,
        updates: { isActive: !webhook.isActive }
      });
      toast.success(`Webhook ${webhook.isActive ? 'disabled' : 'enabled'} successfully`);
    } catch (error) {
      toast.error(`Failed to ${webhook.isActive ? 'disable' : 'enable'} webhook`);
    }
  };

  const handleDeleteWebhook = async (webhook: ElementWebhook) => {
    if (!confirm(`Are you sure you want to delete the webhook for ${webhook.featureSlug}/${webhook.elementId}?`)) {
      return;
    }

    try {
      await deleteWebhookMutation.mutateAsync(webhook.id);
      toast.success('Webhook deleted successfully');
    } catch (error) {
      toast.error('Failed to delete webhook');
    }
  };

  const handleTestWebhook = (webhook: ElementWebhook) => {
    // TODO: Implement webhook testing
    toast.info('Webhook testing will be available in the testing panel');
  };

  if (error) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center text-destructive">
            Failed to load webhooks: {error.message}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Search and Actions Bar */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Webhook Inventory</CardTitle>
              <CardDescription>
                Manage all webhooks across features and pages
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm">
                <Upload className="h-4 w-4 mr-2" />
                Import
              </Button>
              <Button variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search webhooks by feature, page, element, or URL..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8"
              />
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-2"
            >
              <Filter className="h-4 w-4" />
              Filters
              {Object.values(filters).some(v => v !== undefined) && (
                <Badge variant="secondary" className="ml-1">
                  {Object.values(filters).filter(v => v !== undefined).length}
                </Badge>
              )}
            </Button>
          </div>

          {/* Filters Panel */}
          {showFilters && (
            <div className="mt-4 pt-4 border-t">
              <WebhookFilters
                filters={filters}
                onFiltersChange={setFilters}
                onClearFilters={() => setFilters({
                  isActive: undefined,
                  healthStatus: undefined,
                  featureSlug: undefined,
                })}
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Bulk Actions */}
      {selectedWebhooks.length > 0 && (
        <WebhookBulkActions
          selectedWebhookIds={selectedWebhooks}
          onClearSelection={() => setSelectedWebhooks([])}
        />
      )}

      {/* Webhooks Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-8 text-center text-muted-foreground">
              Loading webhooks...
            </div>
          ) : filteredWebhooks.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              {searchQuery ? 'No webhooks match your search criteria' : 'No webhooks configured yet'}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <Checkbox
                      checked={isAllSelected}
                      onCheckedChange={handleSelectAll}
                      aria-label="Select all webhooks"
                      {...(isPartiallySelected && { 'data-state': 'indeterminate' })}
                    />
                  </TableHead>
                  <TableHead>Feature / Element</TableHead>
                  <TableHead>Endpoint</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Health</TableHead>
                  <TableHead>Executions</TableHead>
                  <TableHead>Last Executed</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredWebhooks.map((webhook) => (
                  <TableRow key={webhook.id}>
                    <TableCell>
                      <Checkbox
                        checked={selectedWebhooks.includes(webhook.id)}
                        onCheckedChange={(checked) => handleSelectWebhook(webhook.id, checked as boolean)}
                        aria-label={`Select webhook for ${webhook.featureSlug || 'unknown'}/${webhook.elementId || 'unknown'}`}
                      />
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">
                          {webhook.featureSlug || 'Unknown Feature'}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {webhook.pagePath || 'Unknown Page'} → #{webhook.elementId || 'Unknown Element'}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="max-w-xs truncate" title={webhook.endpointUrl || 'No URL'}>
                        {webhook.endpointUrl || 'No URL configured'}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {webhook.httpMethod || 'POST'}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={webhook.isActive ? "default" : "secondary"}>
                        {webhook.isActive ? 'Active' : 'Disabled'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <WebhookStatusBadge status={webhook.healthStatus} />
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <div>{webhook.totalExecutions || 0} total</div>
                        <div className="text-muted-foreground">
                          {webhook.successfulExecutions || 0} success
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm text-muted-foreground">
                        {webhook.lastExecutedAt 
                          ? new Date(webhook.lastExecutedAt).toLocaleDateString()
                          : 'Never'
                        }
                      </div>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleEditWebhook(webhook)}>
                            <Edit className="h-4 w-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleToggleWebhook(webhook)}>
                            {webhook.isActive ? (
                              <>
                                <Pause className="h-4 w-4 mr-2" />
                                Disable
                              </>
                            ) : (
                              <>
                                <Play className="h-4 w-4 mr-2" />
                                Enable
                              </>
                            )}
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleTestWebhook(webhook)}>
                            <TestTube className="h-4 w-4 mr-2" />
                            Test
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem 
                            onClick={() => handleDeleteWebhook(webhook)}
                            className="text-destructive focus:text-destructive"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Edit Modal */}
      <WebhookConfigurationModal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setEditingWebhook(null);
        }}
        mode="edit"
        webhook={editingWebhook}
      />
    </div>
  );
}