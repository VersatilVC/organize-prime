import React, { useState, useCallback, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { useFeatureWebhooks } from '@/hooks/useFeatureWebhooks';
import { useWebhookLogs } from '@/hooks/useWebhookLogs';
import { useWebhookStats } from '@/hooks/useWebhookStats';
import { testWebhookWithLogging, validateWebhookUrl } from '@/lib/webhook-testing';
import { WebhookRealTimeMonitor } from './WebhookRealTimeMonitor';
import { 
  Webhook, 
  Plus, 
  Edit, 
  Trash2, 
  Play, 
  Pause, 
  TestTube, 
  Activity, 
  Clock, 
  CheckCircle, 
  XCircle, 
  AlertTriangle,
  BarChart3,
  RefreshCw,
  Eye,
  Settings,
  ExternalLink,
  Copy,
  Download
} from 'lucide-react';

// Feature categories for webhook management
const FEATURE_CATEGORIES = [
  'Project Management',
  'Task Management',
  'Team Collaboration',
  'Document Management',
  'Time Tracking',
  'Analytics',
  'Communication',
  'Integration',
  'Security',
  'Custom'
];

// Event types for webhooks
const EVENT_TYPES = [
  'user.created',
  'user.updated',
  'user.deleted',
  'organization.created',
  'organization.updated',
  'project.created',
  'project.updated',
  'project.deleted',
  'task.created',
  'task.updated',
  'task.completed',
  'task.deleted',
  'feature.enabled',
  'feature.disabled',
  'custom.event'
];

interface WebhookConfig {
  id: string;
  name: string;
  url: string;
  description?: string;
  feature_id: string;
  feature_name: string;
  feature_category: string;
  event_types: string[];
  is_active: boolean;
  secret_key?: string;
  timeout_seconds: number;
  retry_attempts: number;
  created_at: string;
  updated_at: string;
  last_triggered?: string;
  success_count: number;
  failure_count: number;
  avg_response_time: number;
}

interface WebhookLog {
  id: string;
  webhook_id: string;
  event_type: string;
  status: 'success' | 'failed' | 'timeout';
  status_code?: number;
  response_time_ms: number;
  error_message?: string;
  payload_size: number;
  triggered_at: string;
  retry_count: number;
}

interface WebhookStats {
  total_webhooks: number;
  active_webhooks: number;
  total_triggers_24h: number;
  success_rate_24h: number;
  avg_response_time_24h: number;
  top_features: { feature_name: string; trigger_count: number }[];
  recent_errors: { webhook_name: string; error: string; timestamp: string }[];
}

// Mock data - replace with actual API calls
const mockWebhooks: WebhookConfig[] = [
  {
    id: '1',
    name: 'Task Creation Webhook',
    url: 'https://n8n.example.com/webhook/task-created',
    description: 'Triggered when new tasks are created',
    feature_id: 'task_management',
    feature_name: 'Task Management',
    feature_category: 'Task Management',
    event_types: ['task.created'],
    is_active: true,
    secret_key: 'sk_...',
    timeout_seconds: 30,
    retry_attempts: 3,
    created_at: '2024-01-15T10:00:00Z',
    updated_at: '2024-01-20T14:30:00Z',
    last_triggered: '2024-01-20T16:45:00Z',
    success_count: 145,
    failure_count: 3,
    avg_response_time: 250
  },
  {
    id: '2',
    name: 'User Management Sync',
    url: 'https://n8n.example.com/webhook/user-sync',
    description: 'Syncs user data changes to external systems',
    feature_id: 'user_management',
    feature_name: 'User Management',
    feature_category: 'Security',
    event_types: ['user.created', 'user.updated'],
    is_active: false,
    timeout_seconds: 45,
    retry_attempts: 5,
    created_at: '2024-01-10T09:00:00Z',
    updated_at: '2024-01-18T11:20:00Z',
    success_count: 89,
    failure_count: 12,
    avg_response_time: 420
  }
];

const mockLogs: WebhookLog[] = [
  {
    id: '1',
    webhook_id: '1',
    event_type: 'task.created',
    status: 'success',
    status_code: 200,
    response_time_ms: 245,
    payload_size: 1024,
    triggered_at: '2024-01-20T16:45:00Z',
    retry_count: 0
  },
  {
    id: '2',
    webhook_id: '1',
    event_type: 'task.created',
    status: 'failed',
    status_code: 500,
    response_time_ms: 2000,
    error_message: 'Internal Server Error - Database connection timeout',
    payload_size: 987,
    triggered_at: '2024-01-20T15:30:00Z',
    retry_count: 2
  }
];

const mockStats: WebhookStats = {
  total_webhooks: 15,
  active_webhooks: 12,
  total_triggers_24h: 1247,
  success_rate_24h: 97.8,
  avg_response_time_24h: 285,
  top_features: [
    { feature_name: 'Task Management', trigger_count: 456 },
    { feature_name: 'Project Management', trigger_count: 234 },
    { feature_name: 'User Management', trigger_count: 189 }
  ],
  recent_errors: [
    { webhook_name: 'Task Creation Webhook', error: 'Connection timeout', timestamp: '2024-01-20T16:00:00Z' },
    { webhook_name: 'User Management Sync', error: 'Authentication failed', timestamp: '2024-01-20T15:45:00Z' }
  ]
};

export function WebhookManagement() {
  const { toast } = useToast();
  
  // Use real hooks
  const {
    webhooks,
    isLoading: webhooksLoading,
    createWebhook,
    updateWebhook,
    deleteWebhook,
    toggleWebhook,
    isCreating,
    isUpdating,
    isDeleting,
    isToggling,
    isTesting
  } = useFeatureWebhooks();
  
  const {
    logs,
    isLoading: logsLoading,
    exportLogs,
    useLogsSummary
  } = useWebhookLogs();
  
  const { stats } = useWebhookStats();
  const summaryQuery = useLogsSummary('24h');
  
  const [selectedWebhook, setSelectedWebhook] = useState<WebhookConfig | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isTestDialogOpen, setIsTestDialogOpen] = useState(false);
  const [testResults, setTestResults] = useState<any>(null);
  const [isTestingWebhook, setIsTestingWebhook] = useState(false);

  // Form state for create/edit
  const [formData, setFormData] = useState({
    name: '',
    url: '',
    description: '',
    feature_id: '',
    event_types: [] as string[],
    is_active: true,
    timeout_seconds: 30,
    retry_attempts: 3
  });

  const resetForm = () => {
    setFormData({
      name: '',
      url: '',
      description: '',
      feature_id: '',
      event_types: [],
      is_active: true,
      timeout_seconds: 30,
      retry_attempts: 3
    });
  };

  const handleCreateWebhook = useCallback(async () => {
    // Validate form
    if (!formData.name || !formData.url || !formData.feature_id) {
      toast({
        title: 'Validation Error',
        description: 'Please fill in all required fields',
        variant: 'destructive'
      });
      return;
    }

    // Validate URL format
    const urlValidation = validateWebhookUrl(formData.url);
    if (!urlValidation.isValid) {
      toast({
        title: 'Invalid URL',
        description: urlValidation.error,
        variant: 'destructive'
      });
      return;
    }

    try {
      await createWebhook(formData);
      setIsCreateDialogOpen(false);
      resetForm();
    } catch (error) {
      // Error is handled by the hook
    }
  }, [formData, createWebhook, toast]);

  const handleUpdateWebhook = useCallback(async () => {
    if (!selectedWebhook) return;

    // Validate URL format if changed
    if (formData.url !== selectedWebhook.url) {
      const urlValidation = validateWebhookUrl(formData.url);
      if (!urlValidation.isValid) {
        toast({
          title: 'Invalid URL',
          description: urlValidation.error,
          variant: 'destructive'
        });
        return;
      }
    }

    try {
      await updateWebhook({ id: selectedWebhook.id, ...formData });
      setIsEditDialogOpen(false);
      setSelectedWebhook(null);
      resetForm();
    } catch (error) {
      // Error is handled by the hook
    }
  }, [selectedWebhook, formData, updateWebhook, toast]);

  const handleDeleteWebhook = useCallback(async (webhookId: string) => {
    try {
      await deleteWebhook(webhookId);
    } catch (error) {
      // Error is handled by the hook
    }
  }, [deleteWebhook]);

  const handleToggleWebhook = useCallback(async (webhookId: string, isActive: boolean) => {
    try {
      await toggleWebhook({ webhookId, isActive });
    } catch (error) {
      // Error is handled by the hook
    }
  }, [toggleWebhook]);

  const handleTestWebhook = useCallback(async (webhook: WebhookConfig) => {
    setSelectedWebhook(webhook);
    setIsTestDialogOpen(true);
    setTestResults(null);
    setIsTestingWebhook(true);
    
    try {
      const result = await testWebhookWithLogging(webhook.id, 'webhook.test');
      setTestResults(result);
    } catch (error) {
      setTestResults({
        status: 'failed',
        response_time: 0,
        error_message: error instanceof Error ? error.message : 'Unknown error',
        request_headers: {},
        payload_size: 0
      });
    } finally {
      setIsTestingWebhook(false);
    }
  }, []);

  const openEditDialog = (webhook: WebhookConfig) => {
    setSelectedWebhook(webhook);
    setFormData({
      name: webhook.name,
      url: webhook.url,
      description: webhook.description || '',
      feature_id: webhook.feature_id,
      event_types: webhook.event_types,
      is_active: webhook.is_active,
      timeout_seconds: webhook.timeout_seconds,
      retry_attempts: webhook.retry_attempts
    });
    setIsEditDialogOpen(true);
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const getStatusBadge = (status: 'success' | 'failed' | 'timeout') => {
    switch (status) {
      case 'success':
        return <Badge variant="default" className="bg-green-500"><CheckCircle className="h-3 w-3 mr-1" />Success</Badge>;
      case 'failed':
        return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />Failed</Badge>;
      case 'timeout':
        return <Badge variant="secondary"><Clock className="h-3 w-3 mr-1" />Timeout</Badge>;
    }
  };

  // Show loading state
  if (webhooksLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-6 w-6 animate-spin" />
        <span className="ml-2">Loading webhook management...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2">
              <Webhook className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-2xl font-bold">{stats?.total_webhooks || webhooks.length}</p>
                <p className="text-xs text-muted-foreground">Total Webhooks</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2">
              <Activity className="h-4 w-4 text-green-500" />
              <div>
                <p className="text-2xl font-bold text-green-600">
                  {stats?.active_webhooks || webhooks.filter(w => w.is_active).length}
                </p>
                <p className="text-xs text-muted-foreground">Active</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2">
              <BarChart3 className="h-4 w-4 text-blue-500" />
              <div>
                <p className="text-2xl font-bold text-blue-600">
                  {summaryQuery.data?.total_triggers || stats?.total_triggers_24h || 0}
                </p>
                <p className="text-xs text-muted-foreground">Triggers (24h)</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <div>
                <p className="text-2xl font-bold text-green-600">
                  {summaryQuery.data?.success_rate || stats?.success_rate_24h || 0}%
                </p>
                <p className="text-xs text-muted-foreground">Success Rate</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2">
              <Clock className="h-4 w-4 text-orange-500" />
              <div>
                <p className="text-2xl font-bold text-orange-600">
                  {summaryQuery.data?.avg_response_time || stats?.avg_response_time_24h || 0}ms
                </p>
                <p className="text-xs text-muted-foreground">Avg Response</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="webhooks" className="space-y-6">
        <TabsList>
          <TabsTrigger value="webhooks">Webhook Configuration</TabsTrigger>
          <TabsTrigger value="logs">Activity Logs</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="monitor">Real-time Monitor</TabsTrigger>
          <TabsTrigger value="settings">Global Settings</TabsTrigger>
        </TabsList>

        {/* Webhook Configuration Tab */}
        <TabsContent value="webhooks" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Webhook Configuration</h3>
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={() => resetForm()}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Webhook
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Create New Webhook</DialogTitle>
                  <DialogDescription>
                    Configure a new webhook for N8N integration
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Webhook Name *</Label>
                      <Input
                        id="name"
                        value={formData.name}
                        onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                        placeholder="Enter webhook name"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="feature">Feature *</Label>
                      <Select value={formData.feature_id} onValueChange={(value) => setFormData(prev => ({ ...prev, feature_id: value }))}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select feature" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="task_management">Task Management</SelectItem>
                          <SelectItem value="project_management">Project Management</SelectItem>
                          <SelectItem value="user_management">User Management</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="url">Webhook URL *</Label>
                    <Input
                      id="url"
                      value={formData.url}
                      onChange={(e) => setFormData(prev => ({ ...prev, url: e.target.value }))}
                      placeholder="https://n8n.example.com/webhook/..."
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="Describe what this webhook does"
                      rows={3}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="timeout">Timeout (seconds)</Label>
                      <Input
                        id="timeout"
                        type="number"
                        value={formData.timeout_seconds}
                        onChange={(e) => setFormData(prev => ({ ...prev, timeout_seconds: parseInt(e.target.value) || 30 }))}
                        min="5"
                        max="300"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="retry">Retry Attempts</Label>
                      <Input
                        id="retry"
                        type="number"
                        value={formData.retry_attempts}
                        onChange={(e) => setFormData(prev => ({ ...prev, retry_attempts: parseInt(e.target.value) || 3 }))}
                        min="0"
                        max="10"
                      />
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="active"
                      checked={formData.is_active}
                      onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_active: checked }))}
                    />
                    <Label htmlFor="active">Enable webhook immediately</Label>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleCreateWebhook}>
                    Create Webhook
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Feature</TableHead>
                    <TableHead>URL</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Success Rate</TableHead>
                    <TableHead>Avg Response</TableHead>
                    <TableHead>Last Triggered</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {webhooks.map((webhook) => (
                    <TableRow key={webhook.id}>
                      <TableCell className="font-medium">{webhook.name}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">{webhook.feature_name}</Badge>
                      </TableCell>
                      <TableCell className="max-w-xs truncate">{webhook.url}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {webhook.is_active ? (
                            <Badge variant="default" className="bg-green-500">
                              <Activity className="h-3 w-3 mr-1" />
                              Active
                            </Badge>
                          ) : (
                            <Badge variant="secondary">
                              <Pause className="h-3 w-3 mr-1" />
                              Inactive
                            </Badge>
                          )}
                          <Switch
                            checked={webhook.is_active}
                            onCheckedChange={(checked) => handleToggleWebhook(webhook.id, checked)}
                            size="sm"
                          />
                        </div>
                      </TableCell>
                      <TableCell>
                        {webhook.success_count + webhook.failure_count > 0 ? 
                          `${Math.round((webhook.success_count / (webhook.success_count + webhook.failure_count)) * 100)}%` : 
                          'N/A'
                        }
                      </TableCell>
                      <TableCell>{webhook.avg_response_time}ms</TableCell>
                      <TableCell>
                        {webhook.last_triggered ? formatDateTime(webhook.last_triggered) : 'Never'}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleTestWebhook(webhook)}
                            title="Test webhook"
                          >
                            <TestTube className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openEditDialog(webhook)}
                            title="Edit webhook"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="sm" title="Delete webhook">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete Webhook</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to delete "{webhook.name}"? This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDeleteWebhook(webhook.id)}>
                                  Delete
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
            </CardContent>
          </Card>
        </TabsContent>

        {/* Activity Logs Tab */}
        <TabsContent value="logs" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Activity Logs</h3>
            <div className="flex gap-2">
              <Button variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
              <Button variant="outline" size="sm">
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
            </div>
          </div>
          
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Timestamp</TableHead>
                    <TableHead>Webhook</TableHead>
                    <TableHead>Event</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Response Time</TableHead>
                    <TableHead>Status Code</TableHead>
                    <TableHead>Retry Count</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell>{formatDateTime(log.triggered_at)}</TableCell>
                      <TableCell>
                        {webhooks.find(w => w.id === log.webhook_id)?.name || 'Unknown'}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{log.event_type}</Badge>
                      </TableCell>
                      <TableCell>{getStatusBadge(log.status)}</TableCell>
                      <TableCell>{log.response_time_ms}ms</TableCell>
                      <TableCell>{log.status_code || 'N/A'}</TableCell>
                      <TableCell>{log.retry_count}</TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm" title="View details">
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics" className="space-y-4">
          <h3 className="text-lg font-semibold">Webhook Analytics</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Top Features by Triggers */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Top Features by Triggers</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {stats?.top_features?.map((feature, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <span className="text-sm">{feature.feature_name}</span>
                      <Badge variant="secondary">{feature.trigger_count_24h}</Badge>
                    </div>
                  )) || (
                    <p className="text-sm text-muted-foreground">No data available</p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Recent Errors */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Recent Errors</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {stats?.recent_errors?.map((error, index) => (
                    <div key={index} className="space-y-1">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4 text-destructive" />
                        <span className="text-sm font-medium">{error.webhook_name}</span>
                      </div>
                      <p className="text-xs text-muted-foreground">{error.error_message}</p>
                      <p className="text-xs text-muted-foreground">{formatDateTime(error.timestamp)}</p>
                    </div>
                  )) || (
                    <p className="text-sm text-muted-foreground">No recent errors</p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Performance Trends Chart */}
            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle className="text-base">Performance Trends (Last 7 Days)</CardTitle>
              </CardHeader>
              <CardContent>
                {stats?.performance_trends && stats.performance_trends.length > 0 ? (
                  <div className="space-y-2">
                    {stats.performance_trends.map((trend, index) => (
                      <div key={index} className="flex items-center justify-between border-b pb-2">
                        <span className="text-sm">{new Date(trend.date).toLocaleDateString()}</span>
                        <div className="flex gap-4 text-xs">
                          <span>Triggers: {trend.total_triggers}</span>
                          <span>Success: {trend.successful_triggers}</span>
                          <span>Avg: {trend.avg_response_time}ms</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">Performance data will appear here as webhooks are used</p>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Real-time Monitor Tab */}
        <TabsContent value="monitor" className="space-y-4">
          <WebhookRealTimeMonitor />
        </TabsContent>

        {/* Global Settings Tab */}
        <TabsContent value="settings" className="space-y-4">
          <h3 className="text-lg font-semibold">Global Webhook Settings</h3>
          
          <Card>
            <CardHeader>
              <CardTitle>Default Configuration</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Default Timeout (seconds)</Label>
                  <Input type="number" defaultValue="30" min="5" max="300" />
                </div>
                <div className="space-y-2">
                  <Label>Default Retry Attempts</Label>
                  <Input type="number" defaultValue="3" min="0" max="10" />
                </div>
              </div>
              
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Enable Global Webhook Logging</Label>
                    <p className="text-sm text-muted-foreground">Log all webhook activities for debugging</p>
                  </div>
                  <Switch defaultChecked />
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Rate Limiting</Label>
                    <p className="text-sm text-muted-foreground">Limit webhook triggers per minute</p>
                  </div>
                  <Switch defaultChecked />
                </div>
              </div>
              
              <Button>Save Settings</Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Webhook</DialogTitle>
            <DialogDescription>
              Update webhook configuration for {selectedWebhook?.name}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-name">Webhook Name *</Label>
                <Input
                  id="edit-name"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-feature">Feature *</Label>
                <Select value={formData.feature_id} onValueChange={(value) => setFormData(prev => ({ ...prev, feature_id: value }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="task_management">Task Management</SelectItem>
                    <SelectItem value="project_management">Project Management</SelectItem>
                    <SelectItem value="user_management">User Management</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-url">Webhook URL *</Label>
              <Input
                id="edit-url"
                value={formData.url}
                onChange={(e) => setFormData(prev => ({ ...prev, url: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-description">Description</Label>
              <Textarea
                id="edit-description"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                rows={3}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-timeout">Timeout (seconds)</Label>
                <Input
                  id="edit-timeout"
                  type="number"
                  value={formData.timeout_seconds}
                  onChange={(e) => setFormData(prev => ({ ...prev, timeout_seconds: parseInt(e.target.value) || 30 }))}
                  min="5"
                  max="300"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-retry">Retry Attempts</Label>
                <Input
                  id="edit-retry"
                  type="number"
                  value={formData.retry_attempts}
                  onChange={(e) => setFormData(prev => ({ ...prev, retry_attempts: parseInt(e.target.value) || 3 }))}
                  min="0"
                  max="10"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateWebhook}>
              Update Webhook
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Test Dialog */}
      <Dialog open={isTestDialogOpen} onOpenChange={setIsTestDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Test Webhook</DialogTitle>
            <DialogDescription>
              Testing webhook: {selectedWebhook?.name}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            {isTestingWebhook ? (
              <div className="flex items-center gap-2">
                <RefreshCw className="h-4 w-4 animate-spin" />
                <span>Testing webhook...</span>
              </div>
            ) : testResults ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  {testResults.status === 'success' ? (
                    <CheckCircle className="h-5 w-5 text-green-500" />
                  ) : testResults.status === 'timeout' ? (
                    <Clock className="h-5 w-5 text-orange-500" />
                  ) : (
                    <XCircle className="h-5 w-5 text-destructive" />
                  )}
                  <span className="font-medium">
                    Test {testResults.status === 'success' ? 'Successful' : 
                         testResults.status === 'timeout' ? 'Timed Out' : 'Failed'}
                  </span>
                </div>
                <div className="bg-muted p-3 rounded-lg">
                  <p className="text-sm"><strong>Status Code:</strong> {testResults.status_code || 'N/A'}</p>
                  <p className="text-sm"><strong>Response Time:</strong> {testResults.response_time}ms</p>
                  {testResults.error_message && (
                    <p className="text-sm"><strong>Error:</strong> {testResults.error_message}</p>
                  )}
                  {testResults.response_body && (
                    <>
                      <p className="text-sm"><strong>Response:</strong></p>
                      <ScrollArea className="h-32 mt-1">
                        <pre className="text-xs overflow-auto">
                          {typeof testResults.response_body === 'string' 
                            ? testResults.response_body 
                            : JSON.stringify(testResults.response_body, null, 2)
                          }
                        </pre>
                      </ScrollArea>
                    </>
                  )}
                  <div className="mt-2">
                    <p className="text-xs text-muted-foreground">
                      Payload size: {testResults.payload_size} bytes
                    </p>
                  </div>
                </div>
              </div>
            ) : null}
          </div>
          <DialogFooter>
            <Button onClick={() => setIsTestDialogOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}