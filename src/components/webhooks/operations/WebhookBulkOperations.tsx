// Phase 4.2: Webhook Bulk Operations
// Mass management capabilities for enabling/disabling/deleting multiple webhooks

import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  CheckSquare,
  Square,
  Search,
  Filter,
  Trash2,
  Power,
  PowerOff,
  Copy,
  Download,
  Upload,
  Settings,
  Play,
  Pause,
  RotateCcw,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Loader2
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { realtimeMonitoringService } from '@/services/webhook/RealtimeMonitoringService';
import type { WebhookRealtimeStatus } from '@/types/webhook-monitoring';
import { toast } from 'sonner';

interface WebhookBulkOperationsProps {
  organizationId: string;
  className?: string;
  onOperationComplete?: () => void;
}

interface BulkOperationItem {
  id: string;
  name: string;
  status: 'healthy' | 'warning' | 'critical' | 'unknown';
  is_enabled: boolean;
  element_id: string;
  feature_slug: string;
  endpoint_url?: string;
  last_execution?: string;
  performance_score?: number;
  success_rate?: number;
}

interface BulkOperationResult {
  item_id: string;
  operation: string;
  status: 'success' | 'error' | 'skipped';
  error_message?: string;
}

interface FilterOptions {
  search: string;
  status: string[];
  feature: string[];
  enabled: 'all' | 'enabled' | 'disabled';
  performance: 'all' | 'high' | 'medium' | 'low';
}

const BULK_OPERATIONS = [
  { 
    id: 'enable', 
    label: 'Enable Webhooks', 
    icon: Power, 
    color: 'text-green-600',
    description: 'Enable selected webhooks to receive events'
  },
  { 
    id: 'disable', 
    label: 'Disable Webhooks', 
    icon: PowerOff, 
    color: 'text-orange-600',
    description: 'Temporarily disable selected webhooks'
  },
  { 
    id: 'delete', 
    label: 'Delete Webhooks', 
    icon: Trash2, 
    color: 'text-red-600',
    description: 'Permanently delete selected webhooks'
  },
  { 
    id: 'test', 
    label: 'Test Webhooks', 
    icon: Play, 
    color: 'text-blue-600',
    description: 'Run test executions on selected webhooks'
  },
  { 
    id: 'reset_stats', 
    label: 'Reset Statistics', 
    icon: RotateCcw, 
    color: 'text-purple-600',
    description: 'Clear performance metrics for selected webhooks'
  },
  { 
    id: 'export', 
    label: 'Export Config', 
    icon: Download, 
    color: 'text-indigo-600',
    description: 'Export webhook configurations'
  }
];

export const WebhookBulkOperations: React.FC<WebhookBulkOperationsProps> = ({
  organizationId,
  className = '',
  onOperationComplete
}) => {
  const [webhooks, setWebhooks] = useState<BulkOperationItem[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [isOperationRunning, setIsOperationRunning] = useState(false);
  const [operationProgress, setOperationProgress] = useState(0);
  const [operationResults, setOperationResults] = useState<BulkOperationResult[]>([]);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [showResultsDialog, setShowResultsDialog] = useState(false);
  const [selectedOperation, setSelectedOperation] = useState<string>('');
  const [filters, setFilters] = useState<FilterOptions>({
    search: '',
    status: [],
    feature: [],
    enabled: 'all',
    performance: 'all'
  });

  // Load webhooks data
  useEffect(() => {
    loadWebhooksData();
    const interval = setInterval(loadWebhooksData, 30000);
    return () => clearInterval(interval);
  }, [organizationId]);

  const loadWebhooksData = async () => {
    setIsLoading(true);
    try {
      // Load webhook statuses
      const statuses = await realtimeMonitoringService.getAllWebhookStatuses();
      
      // Transform to bulk operation items
      const items: BulkOperationItem[] = statuses.map(status => ({
        id: status.webhook_id,
        name: status.webhook_name || status.webhook_id,
        status: status.overall_health,
        is_enabled: status.is_enabled || true,
        element_id: status.element_id,
        feature_slug: status.feature_slug,
        endpoint_url: status.webhook_url,
        last_execution: status.performance_metrics?.last_execution_at,
        performance_score: status.performance_metrics?.performance_score,
        success_rate: status.performance_metrics?.success_rate
      }));

      setWebhooks(items);
    } catch (error) {
      console.error('Failed to load webhooks:', error);
      toast.error('Failed to load webhooks');
    } finally {
      setIsLoading(false);
    }
  };

  // Filter webhooks based on criteria
  const filteredWebhooks = useMemo(() => {
    return webhooks.filter(webhook => {
      // Search filter
      if (filters.search && !webhook.name.toLowerCase().includes(filters.search.toLowerCase()) &&
          !webhook.feature_slug.toLowerCase().includes(filters.search.toLowerCase())) {
        return false;
      }

      // Status filter
      if (filters.status.length > 0 && !filters.status.includes(webhook.status)) {
        return false;
      }

      // Feature filter
      if (filters.feature.length > 0 && !filters.feature.includes(webhook.feature_slug)) {
        return false;
      }

      // Enabled filter
      if (filters.enabled === 'enabled' && !webhook.is_enabled) {
        return false;
      }
      if (filters.enabled === 'disabled' && webhook.is_enabled) {
        return false;
      }

      // Performance filter
      if (filters.performance !== 'all' && webhook.performance_score) {
        if (filters.performance === 'high' && webhook.performance_score < 7) {
          return false;
        }
        if (filters.performance === 'medium' && (webhook.performance_score < 4 || webhook.performance_score >= 7)) {
          return false;
        }
        if (filters.performance === 'low' && webhook.performance_score >= 4) {
          return false;
        }
      }

      return true;
    });
  }, [webhooks, filters]);

  // Selection handlers
  const toggleSelectAll = () => {
    if (selectedIds.size === filteredWebhooks.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredWebhooks.map(w => w.id)));
    }
  };

  const toggleSelect = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const selectByFilter = (filterType: string, filterValue: string) => {
    const matchingIds = filteredWebhooks
      .filter(webhook => {
        switch (filterType) {
          case 'status': return webhook.status === filterValue;
          case 'feature': return webhook.feature_slug === filterValue;
          case 'enabled': return webhook.is_enabled.toString() === filterValue;
          default: return false;
        }
      })
      .map(w => w.id);
    
    setSelectedIds(new Set(matchingIds));
  };

  // Operation handlers
  const handleOperationClick = (operationId: string) => {
    if (selectedIds.size === 0) {
      toast.error('Please select at least one webhook');
      return;
    }

    setSelectedOperation(operationId);
    setShowConfirmDialog(true);
  };

  const executeOperation = async () => {
    if (!selectedOperation || selectedIds.size === 0) return;

    setIsOperationRunning(true);
    setOperationProgress(0);
    setOperationResults([]);
    setShowConfirmDialog(false);

    const selectedWebhooks = webhooks.filter(w => selectedIds.has(w.id));
    const results: BulkOperationResult[] = [];
    let completed = 0;

    try {
      for (const webhook of selectedWebhooks) {
        try {
          const result = await executeOperationOnWebhook(webhook, selectedOperation);
          results.push(result);
        } catch (error) {
          results.push({
            item_id: webhook.id,
            operation: selectedOperation,
            status: 'error',
            error_message: error instanceof Error ? error.message : 'Unknown error'
          });
        }

        completed++;
        setOperationProgress((completed / selectedWebhooks.length) * 100);
        
        // Small delay to prevent overwhelming the system
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      setOperationResults(results);
      setShowResultsDialog(true);

      // Show summary toast
      const successCount = results.filter(r => r.status === 'success').length;
      const errorCount = results.filter(r => r.status === 'error').length;
      
      if (errorCount === 0) {
        toast.success(`Operation completed successfully on ${successCount} webhooks`);
      } else {
        toast.warning(`Operation completed with ${errorCount} errors out of ${results.length} webhooks`);
      }

      // Clear selection and refresh data
      setSelectedIds(new Set());
      await loadWebhooksData();
      onOperationComplete?.();

    } catch (error) {
      console.error('Bulk operation failed:', error);
      toast.error('Bulk operation failed');
    } finally {
      setIsOperationRunning(false);
      setOperationProgress(0);
    }
  };

  const executeOperationOnWebhook = async (
    webhook: BulkOperationItem, 
    operation: string
  ): Promise<BulkOperationResult> => {
    switch (operation) {
      case 'enable':
        await supabase
          .from('feature_webhooks')
          .update({ is_enabled: true })
          .eq('id', webhook.id);
        break;

      case 'disable':
        await supabase
          .from('feature_webhooks')
          .update({ is_enabled: false })
          .eq('id', webhook.id);
        break;

      case 'delete':
        await supabase
          .from('feature_webhooks')
          .delete()
          .eq('id', webhook.id);
        break;

      case 'test':
        // Trigger a test execution
        await supabase.rpc('test_webhook_execution', {
          p_webhook_id: webhook.id,
          p_element_id: webhook.element_id
        });
        break;

      case 'reset_stats':
        // Reset performance metrics
        await supabase
          .from('webhook_performance_metrics')
          .delete()
          .eq('webhook_id', webhook.id);
        break;

      case 'export':
        // Export handled separately
        break;

      default:
        throw new Error(`Unknown operation: ${operation}`);
    }

    return {
      item_id: webhook.id,
      operation,
      status: 'success'
    };
  };

  const handleExport = () => {
    if (selectedIds.size === 0) {
      toast.error('Please select webhooks to export');
      return;
    }

    const selectedWebhooks = webhooks.filter(w => selectedIds.has(w.id));
    const exportData = {
      exported_at: new Date().toISOString(),
      organization_id: organizationId,
      webhooks: selectedWebhooks.map(webhook => ({
        name: webhook.name,
        feature_slug: webhook.feature_slug,
        element_id: webhook.element_id,
        endpoint_url: webhook.endpoint_url,
        is_enabled: webhook.is_enabled
      }))
    };

    const dataStr = JSON.stringify(exportData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `webhook-export-${Date.now()}.json`;
    link.click();
    URL.revokeObjectURL(url);

    toast.success(`Exported ${selectedWebhooks.length} webhook configurations`);
  };

  // Get unique values for filters
  const uniqueFeatures = [...new Set(webhooks.map(w => w.feature_slug))];
  const uniqueStatuses = [...new Set(webhooks.map(w => w.status))];

  const renderFilters = () => (
    <Card className="mb-6">
      <CardContent className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search webhooks..."
              value={filters.search}
              onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
              className="pl-9"
            />
          </div>

          <Select
            value={filters.enabled}
            onValueChange={(value: any) => setFilters(prev => ({ ...prev, enabled: value }))}
          >
            <SelectTrigger>
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Webhooks</SelectItem>
              <SelectItem value="enabled">Enabled Only</SelectItem>
              <SelectItem value="disabled">Disabled Only</SelectItem>
            </SelectContent>
          </Select>

          <Select
            value={filters.performance}
            onValueChange={(value: any) => setFilters(prev => ({ ...prev, performance: value }))}
          >
            <SelectTrigger>
              <SelectValue placeholder="Performance" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Performance</SelectItem>
              <SelectItem value="high">High (7-10)</SelectItem>
              <SelectItem value="medium">Medium (4-6)</SelectItem>
              <SelectItem value="low">Low (0-3)</SelectItem>
            </SelectContent>
          </Select>

          <div className="flex gap-2">
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => selectByFilter('status', 'healthy')}
            >
              Select Healthy
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => selectByFilter('enabled', 'false')}
            >
              Select Disabled
            </Button>
          </div>

          <div className="text-sm text-muted-foreground">
            {selectedIds.size} of {filteredWebhooks.length} selected
          </div>
        </div>
      </CardContent>
    </Card>
  );

  const renderOperationButtons = () => (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle>Bulk Operations</CardTitle>
        <CardDescription>
          Perform operations on {selectedIds.size} selected webhook(s)
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {BULK_OPERATIONS.map(operation => {
            const IconComponent = operation.icon;
            return (
              <Button
                key={operation.id}
                variant="outline"
                className="flex flex-col h-20 p-2"
                onClick={() => operation.id === 'export' ? handleExport() : handleOperationClick(operation.id)}
                disabled={selectedIds.size === 0 || isOperationRunning}
              >
                <IconComponent className={`h-5 w-5 mb-1 ${operation.color}`} />
                <span className="text-xs text-center">{operation.label}</span>
              </Button>
            );
          })}
        </div>

        {isOperationRunning && (
          <div className="mt-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span>Operation in progress...</span>
              <span>{Math.round(operationProgress)}%</span>
            </div>
            <Progress value={operationProgress} />
          </div>
        )}
      </CardContent>
    </Card>
  );

  const renderWebhooksList = () => (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Webhooks ({filteredWebhooks.length})</CardTitle>
            <CardDescription>
              Select webhooks for bulk operations
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={toggleSelectAll}
              disabled={filteredWebhooks.length === 0}
            >
              {selectedIds.size === filteredWebhooks.length ? (
                <CheckSquare className="h-4 w-4 mr-2" />
              ) : (
                <Square className="h-4 w-4 mr-2" />
              )}
              Select All
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-96">
          <div className="space-y-2">
            {filteredWebhooks.map(webhook => (
              <div
                key={webhook.id}
                className={`flex items-center justify-between p-3 border rounded-lg cursor-pointer transition-colors ${
                  selectedIds.has(webhook.id) ? 'bg-blue-50 border-blue-200 dark:bg-blue-950' : 'hover:bg-gray-50 dark:hover:bg-gray-800'
                }`}
                onClick={() => toggleSelect(webhook.id)}
              >
                <div className="flex items-center space-x-3">
                  <Checkbox
                    checked={selectedIds.has(webhook.id)}
                    onChange={() => {}} // Handled by parent onClick
                  />
                  <div className={`w-3 h-3 rounded-full ${
                    webhook.status === 'healthy' ? 'bg-green-500' :
                    webhook.status === 'warning' ? 'bg-orange-500' :
                    webhook.status === 'critical' ? 'bg-red-500' : 'bg-gray-500'
                  }`} />
                  <div>
                    <div className="font-medium">{webhook.name}</div>
                    <div className="text-sm text-muted-foreground">
                      {webhook.feature_slug} • {webhook.element_id}
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-4 text-sm">
                  <Badge variant={webhook.is_enabled ? 'default' : 'secondary'}>
                    {webhook.is_enabled ? 'Enabled' : 'Disabled'}
                  </Badge>
                  
                  {webhook.performance_score && (
                    <div className="text-center">
                      <div>{webhook.performance_score}/10</div>
                      <div className="text-xs text-muted-foreground">Score</div>
                    </div>
                  )}
                  
                  {webhook.success_rate && (
                    <div className="text-center">
                      <div>{Math.round(webhook.success_rate)}%</div>
                      <div className="text-xs text-muted-foreground">Success</div>
                    </div>
                  )}
                </div>
              </div>
            ))}

            {filteredWebhooks.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                No webhooks found matching the current filters
              </div>
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );

  if (isLoading) {
    return (
      <Card className={className}>
        <CardContent className="p-8">
          <div className="flex items-center justify-center space-x-2">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span>Loading webhooks...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={className}>
      {renderFilters()}
      {renderOperationButtons()}
      {renderWebhooksList()}

      {/* Confirmation Dialog */}
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Bulk Operation</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to {selectedOperation} {selectedIds.size} webhook(s)?
              {selectedOperation === 'delete' && (
                <div className="mt-2 p-2 bg-red-50 dark:bg-red-950 rounded text-red-600 dark:text-red-400">
                  <AlertTriangle className="h-4 w-4 inline mr-1" />
                  This action cannot be undone.
                </div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={executeOperation}
              className={selectedOperation === 'delete' ? 'bg-red-600 hover:bg-red-700' : ''}
            >
              Continue
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Results Dialog */}
      <Dialog open={showResultsDialog} onOpenChange={setShowResultsDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Operation Results</DialogTitle>
            <DialogDescription>
              Results for {selectedOperation} operation on {operationResults.length} webhooks
            </DialogDescription>
          </DialogHeader>
          
          <ScrollArea className="h-96">
            <div className="space-y-2">
              {operationResults.map(result => (
                <div
                  key={result.item_id}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div className="flex items-center space-x-3">
                    {result.status === 'success' ? (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    ) : (
                      <XCircle className="h-4 w-4 text-red-500" />
                    )}
                    <div>
                      <div className="font-medium">
                        {webhooks.find(w => w.id === result.item_id)?.name || result.item_id}
                      </div>
                      {result.error_message && (
                        <div className="text-sm text-red-600">{result.error_message}</div>
                      )}
                    </div>
                  </div>
                  <Badge variant={result.status === 'success' ? 'default' : 'destructive'}>
                    {result.status}
                  </Badge>
                </div>
              ))}
            </div>
          </ScrollArea>

          <DialogFooter>
            <Button onClick={() => setShowResultsDialog(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};