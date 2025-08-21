// Phase 4.5: Preview Mode Bulk Operations Panel
// Integrated bulk operations panel for preview mode multi-selection

import React, { useState, useCallback, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
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
  Trash2,
  Power,
  PowerOff,
  Copy,
  Download,
  Upload,
  Settings,
  Play,
  RotateCcw,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Loader2,
  X,
  Users,
  Layers
} from 'lucide-react';
import { usePreview } from './PreviewController';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useOrganization } from '@/contexts/OrganizationContext';

interface BulkOperationResult {
  element_id: string;
  operation: string;
  status: 'success' | 'error' | 'skipped';
  error_message?: string;
}

interface PreviewElement {
  id: string;
  element: HTMLElement;
  signature: string;
  hasWebhook: boolean;
  webhookId?: string;
}

const BULK_OPERATIONS = [
  { 
    id: 'enable_all', 
    label: 'Enable All', 
    icon: Power, 
    color: 'text-green-600',
    description: 'Enable webhooks for all selected elements'
  },
  { 
    id: 'disable_all', 
    label: 'Disable All', 
    icon: PowerOff, 
    color: 'text-orange-600',
    description: 'Disable webhooks for all selected elements'
  },
  { 
    id: 'test_all', 
    label: 'Test All', 
    icon: Play, 
    color: 'text-blue-600',
    description: 'Run test executions on all selected webhooks'
  },
  { 
    id: 'copy_config', 
    label: 'Copy Config', 
    icon: Copy, 
    color: 'text-purple-600',
    description: 'Copy webhook configuration to clipboard'
  },
  { 
    id: 'delete_all', 
    label: 'Delete All', 
    icon: Trash2, 
    color: 'text-red-600',
    description: 'Delete webhooks for all selected elements'
  },
  { 
    id: 'export_config', 
    label: 'Export', 
    icon: Download, 
    color: 'text-indigo-600',
    description: 'Export configurations for selected elements'
  }
];

export function PreviewBulkPanel() {
  const { state, actions } = usePreview();
  const { currentOrganization } = useOrganization();
  const [isOperationRunning, setIsOperationRunning] = useState(false);
  const [operationProgress, setOperationProgress] = useState(0);
  const [operationResults, setOperationResults] = useState<BulkOperationResult[]>([]);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [showResultsDialog, setShowResultsDialog] = useState(false);
  const [selectedOperation, setSelectedOperation] = useState<string>('');
  const [previewElements, setPreviewElements] = useState<Map<string, PreviewElement>>(new Map());

  // Don't render if not in bulk mode or no elements selected
  if (!state.isBulkMode || state.selectedElementIds.size === 0) {
    return null;
  }

  // Update preview elements data when selection changes
  useEffect(() => {
    const updatePreviewElements = async () => {
      const elementMap = new Map<string, PreviewElement>();
      
      for (const elementId of state.selectedElementIds) {
        const element = document.querySelector(`[data-webhook-signature="${elementId}"]`) as HTMLElement;
        if (element) {
          // Check if element has existing webhook
          const { data: webhookData } = await supabase
            .from('element_webhooks')
            .select('id, is_enabled')
            .eq('element_signature', elementId)
            .single();

          elementMap.set(elementId, {
            id: elementId,
            element,
            signature: elementId,
            hasWebhook: !!webhookData,
            webhookId: webhookData?.id
          });
        }
      }
      
      setPreviewElements(elementMap);
    };

    if (state.selectedElementIds.size > 0) {
      updatePreviewElements();
    }
  }, [state.selectedElementIds]);

  // Handle bulk operation execution
  const handleOperationClick = useCallback((operationId: string) => {
    if (state.selectedElementIds.size === 0) {
      toast.error('Please select at least one element');
      return;
    }

    setSelectedOperation(operationId);
    setShowConfirmDialog(true);
  }, [state.selectedElementIds.size]);

  const executeOperation = useCallback(async () => {
    if (!selectedOperation || state.selectedElementIds.size === 0) return;

    setIsOperationRunning(true);
    setOperationProgress(0);
    setOperationResults([]);
    setShowConfirmDialog(false);

    const selectedElements = Array.from(previewElements.values());
    const results: BulkOperationResult[] = [];
    let completed = 0;

    try {
      for (const element of selectedElements) {
        try {
          const result = await executeOperationOnElement(element, selectedOperation);
          results.push(result);
        } catch (error) {
          results.push({
            element_id: element.id,
            operation: selectedOperation,
            status: 'error',
            error_message: error instanceof Error ? error.message : 'Unknown error'
          });
        }

        completed++;
        setOperationProgress((completed / selectedElements.length) * 100);
        
        // Small delay to prevent overwhelming the system
        await new Promise(resolve => setTimeout(resolve, 200));
      }

      setOperationResults(results);
      setShowResultsDialog(true);

      // Show summary toast
      const successCount = results.filter(r => r.status === 'success').length;
      const errorCount = results.filter(r => r.status === 'error').length;
      
      if (errorCount === 0) {
        toast.success(`Operation completed successfully on ${successCount} elements`);
      } else {
        toast.warning(`Operation completed with ${errorCount} errors out of ${results.length} elements`);
      }

    } catch (error) {
      console.error('Bulk operation failed:', error);
      toast.error('Bulk operation failed');
    } finally {
      setIsOperationRunning(false);
      setOperationProgress(0);
    }
  }, [selectedOperation, state.selectedElementIds, previewElements]);

  const executeOperationOnElement = async (
    element: PreviewElement,
    operation: string
  ): Promise<BulkOperationResult> => {
    const organizationId = currentOrganization?.id;

    switch (operation) {
      case 'enable_all':
        if (element.hasWebhook && element.webhookId) {
          await supabase
            .from('element_webhooks')
            .update({ is_enabled: true })
            .eq('id', element.webhookId);
        } else {
          throw new Error('No webhook configured for this element');
        }
        break;

      case 'disable_all':
        if (element.hasWebhook && element.webhookId) {
          await supabase
            .from('element_webhooks')
            .update({ is_enabled: false })
            .eq('id', element.webhookId);
        } else {
          throw new Error('No webhook configured for this element');
        }
        break;

      case 'test_all':
        if (element.hasWebhook && element.webhookId) {
          await supabase.rpc('test_webhook_execution', {
            p_webhook_id: element.webhookId,
            p_element_signature: element.signature
          });
        } else {
          throw new Error('No webhook configured for this element');
        }
        break;

      case 'delete_all':
        if (element.hasWebhook && element.webhookId) {
          await supabase
            .from('element_webhooks')
            .delete()
            .eq('id', element.webhookId);
        } else {
          throw new Error('No webhook configured for this element');
        }
        break;

      case 'copy_config':
      case 'export_config':
        // These are handled separately
        break;

      default:
        throw new Error(`Unknown operation: ${operation}`);
    }

    return {
      element_id: element.id,
      operation,
      status: 'success'
    };
  };

  const handleExport = useCallback(() => {
    if (state.selectedElementIds.size === 0) {
      toast.error('Please select elements to export');
      return;
    }

    const exportData = {
      exported_at: new Date().toISOString(),
      bulk_export: true,
      elements: Array.from(previewElements.values()).map(element => ({
        signature: element.signature,
        has_webhook: element.hasWebhook,
        element_info: {
          tagName: element.element.tagName,
          textContent: element.element.textContent?.trim().substring(0, 100),
          className: element.element.className,
          id: element.element.id
        }
      }))
    };

    const dataStr = JSON.stringify(exportData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `preview-bulk-export-${Date.now()}.json`;
    link.click();
    URL.revokeObjectURL(url);

    toast.success(`Exported ${state.selectedElementIds.size} element configurations`);
  }, [state.selectedElementIds, previewElements]);

  const handleSelectAll = useCallback(() => {
    // Find all interactive elements on the page
    const allInteractiveElements = document.querySelectorAll('.webhook-preview-element');
    const elementIds = Array.from(allInteractiveElements)
      .map(el => el.getAttribute('data-webhook-signature'))
      .filter(id => id !== null) as string[];
    
    actions.selectAllElements(elementIds);
  }, [actions]);

  // Render the bulk panel
  return createPortal(
    <div className="fixed bottom-4 left-4 right-4 z-[10002]" data-preview-system="true">
      <Card className="border-purple-500 bg-purple-50 dark:bg-purple-950 shadow-lg max-w-4xl mx-auto">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Layers className="h-5 w-5 text-purple-600" />
              <div>
                <CardTitle className="text-lg text-purple-800 dark:text-purple-200">
                  Bulk Operations
                </CardTitle>
                <CardDescription className="text-purple-600 dark:text-purple-400">
                  {state.selectedElementIds.size} elements selected
                </CardDescription>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={handleSelectAll}
                className="border-purple-200"
              >
                <CheckSquare className="h-4 w-4 mr-2" />
                Select All
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={actions.clearSelection}
                className="border-purple-200"
              >
                <Square className="h-4 w-4 mr-2" />
                Clear
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={actions.disableBulkMode}
                className="text-purple-600"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          {/* Selection Summary */}
          <div className="flex items-center gap-4 text-sm text-purple-700 dark:text-purple-300 mb-4">
            <div className="flex items-center gap-1">
              <Users className="h-4 w-4" />
              <span>{Array.from(previewElements.values()).filter(e => e.hasWebhook).length} with webhooks</span>
            </div>
            <div className="flex items-center gap-1">
              <Settings className="h-4 w-4" />
              <span>{Array.from(previewElements.values()).filter(e => !e.hasWebhook).length} need configuration</span>
            </div>
          </div>

          {/* Operations Grid */}
          <div className="grid grid-cols-3 md:grid-cols-6 gap-2 mb-4">
            {BULK_OPERATIONS.map(operation => {
              const IconComponent = operation.icon;
              return (
                <Button
                  key={operation.id}
                  variant="outline"
                  className="flex flex-col h-16 p-2 text-xs border-purple-200"
                  onClick={() => operation.id === 'export_config' ? handleExport() : handleOperationClick(operation.id)}
                  disabled={isOperationRunning}
                >
                  <IconComponent className={`h-4 w-4 mb-1 ${operation.color}`} />
                  <span className="text-center leading-tight">{operation.label}</span>
                </Button>
              );
            })}
          </div>

          {/* Operation Progress */}
          {isOperationRunning && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm text-purple-700 dark:text-purple-300">
                <span>Operation in progress...</span>
                <span>{Math.round(operationProgress)}%</span>
              </div>
              <Progress value={operationProgress} className="bg-purple-200" />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Confirmation Dialog */}
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Bulk Operation</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to {selectedOperation.replace('_', ' ')} {state.selectedElementIds.size} element(s)?
              {selectedOperation === 'delete_all' && (
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
              className={selectedOperation === 'delete_all' ? 'bg-red-600 hover:bg-red-700' : ''}
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
              Results for {selectedOperation.replace('_', ' ')} operation on {operationResults.length} elements
            </DialogDescription>
          </DialogHeader>
          
          <div className="max-h-96 overflow-y-auto space-y-2">
            {operationResults.map(result => (
              <div
                key={result.element_id}
                className="flex items-center justify-between p-3 border rounded-lg"
              >
                <div className="flex items-center space-x-3">
                  {result.status === 'success' ? (
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  ) : (
                    <XCircle className="h-4 w-4 text-red-500" />
                  )}
                  <div>
                    <div className="font-medium text-sm">
                      {previewElements.get(result.element_id)?.element.textContent?.trim().substring(0, 50) || result.element_id}
                    </div>
                    {result.error_message && (
                      <div className="text-xs text-red-600">{result.error_message}</div>
                    )}
                  </div>
                </div>
                <Badge variant={result.status === 'success' ? 'default' : 'destructive'}>
                  {result.status}
                </Badge>
              </div>
            ))}
          </div>

          <DialogFooter>
            <Button onClick={() => setShowResultsDialog(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>,
    document.body
  );
}