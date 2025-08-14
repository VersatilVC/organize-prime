import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Users, 
  MessageSquare, 
  Mail, 
  Trash2, 
  Archive, 
  UserCheck, 
  AlertTriangle,
  CheckCircle2,
  X
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface BulkOperation {
  id: string;
  type: 'user' | 'feedback' | 'notification';
  action: 'delete' | 'archive' | 'send_notification' | 'change_role' | 'export';
  items: any[];
  status: 'pending' | 'running' | 'completed' | 'failed';
  progress: number;
  result?: string;
}

interface BulkOperationsPanelProps {
  selectedItems: any[];
  itemType: 'user' | 'feedback' | 'notification';
  onOperationComplete: () => void;
  className?: string;
}

export function BulkOperationsPanel({ 
  selectedItems, 
  itemType, 
  onOperationComplete,
  className 
}: BulkOperationsPanelProps) {
  const [operations, setOperations] = useState<BulkOperation[]>([]);
  const [selectedAction, setSelectedAction] = useState<string>('');
  const [confirmAction, setConfirmAction] = useState<string | null>(null);

  const actionConfig = {
    user: [
      { value: 'send_notification', label: 'Send Notification', icon: Mail, color: 'blue' },
      { value: 'change_role', label: 'Change Role', icon: UserCheck, color: 'green' },
      { value: 'export', label: 'Export Data', icon: Archive, color: 'gray' },
      { value: 'delete', label: 'Delete Users', icon: Trash2, color: 'red', dangerous: true },
    ],
    feedback: [
      { value: 'archive', label: 'Archive Feedback', icon: Archive, color: 'gray' },
      { value: 'export', label: 'Export Feedback', icon: Archive, color: 'blue' },
      { value: 'delete', label: 'Delete Feedback', icon: Trash2, color: 'red', dangerous: true },
    ],
    notification: [
      { value: 'archive', label: 'Archive Notifications', icon: Archive, color: 'gray' },
      { value: 'export', label: 'Export Notifications', icon: Archive, color: 'blue' },
      { value: 'delete', label: 'Delete Notifications', icon: Trash2, color: 'red', dangerous: true },
    ],
  };

  const executeOperation = async (action: string) => {
    if (selectedItems.length === 0) {
      toast.error('No items selected');
      return;
    }

    const operation: BulkOperation = {
      id: Date.now().toString(),
      type: itemType,
      action: action as any,
      items: selectedItems,
      status: 'running',
      progress: 0,
    };

    setOperations(prev => [...prev, operation]);
    setConfirmAction(null);

    try {
      switch (action) {
        case 'delete':
          await executeBulkDelete(operation);
          break;
        case 'archive':
          await executeBulkArchive(operation);
          break;
        case 'send_notification':
          await executeBulkNotification(operation);
          break;
        case 'change_role':
          await executeBulkRoleChange(operation);
          break;
        case 'export':
          await executeBulkExport(operation);
          break;
        default:
          throw new Error('Unknown action');
      }

      // Update operation status
      setOperations(prev => prev.map(op => 
        op.id === operation.id 
          ? { ...op, status: 'completed' as const, progress: 100 }
          : op
      ));

      toast.success(`Bulk ${action} completed successfully`);
      onOperationComplete();
    } catch (error) {
      console.error('Bulk operation failed:', error);
      setOperations(prev => prev.map(op => 
        op.id === operation.id 
          ? { ...op, status: 'failed' as const, result: error.message }
          : op
      ));
      toast.error(`Bulk ${action} failed`);
    }
  };

  const executeBulkDelete = async (operation: BulkOperation) => {
    const batchSize = 10;
    const totalItems = operation.items.length;
    
    for (let i = 0; i < totalItems; i += batchSize) {
      const batch = operation.items.slice(i, i + batchSize);
      const ids = batch.map(item => item.id);
      
      let error;
      switch (itemType) {
        case 'user':
          ({ error } = await supabase
            .from('profiles')
            .delete()
            .in('id', ids));
          break;
        case 'feedback':
          ({ error } = await supabase
            .from('feedback')
            .delete()
            .in('id', ids));
          break;
        case 'notification':
          ({ error } = await supabase
            .from('notifications')
            .delete()
            .in('id', ids));
          break;
      }
      
      if (error) throw error;
      
      // Update progress
      const progress = Math.min(100, ((i + batchSize) / totalItems) * 100);
      setOperations(prev => prev.map(op => 
        op.id === operation.id ? { ...op, progress } : op
      ));
      
      // Small delay to prevent overwhelming the database
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  };

  const executeBulkArchive = async (operation: BulkOperation) => {
    const batchSize = 10;
    const totalItems = operation.items.length;
    
    for (let i = 0; i < totalItems; i += batchSize) {
      const batch = operation.items.slice(i, i + batchSize);
      const ids = batch.map(item => item.id);
      
      let error;
      switch (itemType) {
        case 'feedback':
          // For feedback, we'll just mark as resolved or closed
          ({ error } = await supabase
            .from('feedback')
            .update({ status: 'closed' })
            .in('id', ids));
          break;
        case 'notification':
          // For notifications, we'll mark as read
          ({ error } = await supabase
            .from('notifications')
            .update({ read: true })
            .in('id', ids));
          break;
        default:
          throw new Error('Archive not supported for this item type');
      }
      
      if (error) throw error;
      
      const progress = Math.min(100, ((i + batchSize) / totalItems) * 100);
      setOperations(prev => prev.map(op => 
        op.id === operation.id ? { ...op, progress } : op
      ));
      
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  };

  const executeBulkNotification = async (operation: BulkOperation) => {
    // This would integrate with your notification system
    // For now, just simulate the operation
    const totalItems = operation.items.length;
    
    for (let i = 0; i < totalItems; i++) {
      // Simulate sending notification
      await new Promise(resolve => setTimeout(resolve, 200));
      
      const progress = ((i + 1) / totalItems) * 100;
      setOperations(prev => prev.map(op => 
        op.id === operation.id ? { ...op, progress } : op
      ));
    }
  };

  const executeBulkRoleChange = async (operation: BulkOperation) => {
    // This would integrate with your role management system
    const totalItems = operation.items.length;
    
    for (let i = 0; i < totalItems; i++) {
      // Simulate role change
      await new Promise(resolve => setTimeout(resolve, 150));
      
      const progress = ((i + 1) / totalItems) * 100;
      setOperations(prev => prev.map(op => 
        op.id === operation.id ? { ...op, progress } : op
      ));
    }
  };

  const executeBulkExport = async (operation: BulkOperation) => {
    const data = operation.items.map(item => {
      // Remove sensitive data for export
      const { password, ...exportItem } = item;
      return exportItem;
    });
    
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: 'application/json'
    });
    
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${itemType}-export-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    
    // Simulate progress for UX
    for (let i = 0; i <= 100; i += 10) {
      setOperations(prev => prev.map(op => 
        op.id === operation.id ? { ...op, progress: i } : op
      ));
      await new Promise(resolve => setTimeout(resolve, 50));
    }
  };

  const removeOperation = (operationId: string) => {
    setOperations(prev => prev.filter(op => op.id !== operationId));
  };

  const actions = actionConfig[itemType] || [];
  const selectedActionConfig = actions.find(a => a.value === selectedAction);

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Selection Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {itemType === 'user' && <Users className="h-5 w-5" />}
            {itemType === 'feedback' && <MessageSquare className="h-5 w-5" />}
            {itemType === 'notification' && <Mail className="h-5 w-5" />}
            Bulk Operations
          </CardTitle>
          <CardDescription>
            {selectedItems.length} {itemType}(s) selected
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <Select value={selectedAction} onValueChange={setSelectedAction}>
              <SelectTrigger className="flex-1">
                <SelectValue placeholder="Select an action..." />
              </SelectTrigger>
              <SelectContent>
                {actions.map((action) => (
                  <SelectItem key={action.value} value={action.value}>
                    <div className="flex items-center gap-2">
                      <action.icon className="h-4 w-4" />
                      {action.label}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            {selectedAction && (
              <Button
                onClick={() => setConfirmAction(selectedAction)}
                variant={selectedActionConfig?.dangerous ? "destructive" : "default"}
                disabled={selectedItems.length === 0}
              >
                Execute
              </Button>
            )}
          </div>

          {/* Confirmation Dialog */}
          {confirmAction && (
            <Alert className={selectedActionConfig?.dangerous ? "border-destructive" : ""}>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription className="flex items-center justify-between">
                <span>
                  Are you sure you want to {selectedActionConfig?.label.toLowerCase()} {selectedItems.length} {itemType}(s)?
                  {selectedActionConfig?.dangerous && " This action cannot be undone."}
                </span>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant={selectedActionConfig?.dangerous ? "destructive" : "default"}
                    onClick={() => executeOperation(confirmAction)}
                  >
                    Confirm
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setConfirmAction(null)}
                  >
                    Cancel
                  </Button>
                </div>
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Active Operations */}
      {operations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Operation Status</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {operations.map((operation) => (
              <div key={operation.id} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {operation.status === 'completed' && (
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                    )}
                    {operation.status === 'failed' && (
                      <X className="h-4 w-4 text-red-600" />
                    )}
                    {operation.status === 'running' && (
                      <div className="h-4 w-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                    )}
                    <span className="font-medium">
                      {actions.find(a => a.value === operation.action)?.label} 
                      ({operation.items.length} items)
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={
                      operation.status === 'completed' ? 'default' :
                      operation.status === 'failed' ? 'destructive' : 'secondary'
                    }>
                      {operation.status}
                    </Badge>
                    {operation.status !== 'running' && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeOperation(operation.id)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                </div>
                
                {operation.status === 'running' && (
                  <div className="space-y-1">
                    <Progress value={operation.progress} className="h-2" />
                    <p className="text-xs text-muted-foreground">
                      {operation.progress.toFixed(0)}% complete
                    </p>
                  </div>
                )}
                
                {operation.status === 'failed' && operation.result && (
                  <p className="text-xs text-red-600">{operation.result}</p>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}