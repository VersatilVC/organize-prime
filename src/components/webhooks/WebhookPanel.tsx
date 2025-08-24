import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Plus, TestTube, Edit2, Trash2, CheckCircle, XCircle, Clock } from 'lucide-react';
import { useWebhooks } from '@/hooks/useWebhooks';
import type { WebhookInput } from '@/types/webhook';

interface WebhookPanelProps {
  title?: string;
  description?: string;
  className?: string;
}

export function WebhookPanel({ 
  title = "Webhooks", 
  description = "Manage and test webhook integrations",
  className 
}: WebhookPanelProps) {
  const {
    webhooks,
    isLoading,
    createWebhook,
    updateWebhook,
    deleteWebhook,
    testWebhook,
    isCreating,
    isUpdating,
    isDeleting,
    isTesting,
  } = useWebhooks();

  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<WebhookInput>({
    name: '',
    webhook_url: '',
    http_method: 'POST',
    headers: {},
    payload_template: {},
    is_active: true,
  });

  const resetForm = () => {
    setFormData({
      name: '',
      webhook_url: '',
      http_method: 'POST',
      headers: {},
      payload_template: {},
      is_active: true,
    });
    setShowAddForm(false);
    setEditingId(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (editingId) {
        await updateWebhook(editingId, formData);
      } else {
        await createWebhook(formData);
      }
      resetForm();
    } catch (error) {
      // Error is handled by the hook's onError callback
    }
  };

  const handleEdit = (webhook: any) => {
    setFormData({
      name: webhook.name,
      webhook_url: webhook.webhook_url,
      http_method: webhook.http_method,
      headers: webhook.headers,
      payload_template: webhook.payload_template,
      is_active: webhook.is_active,
    });
    setEditingId(webhook.id);
    setShowAddForm(true);
  };

  const getStatusIcon = (webhook: any) => {
    if (!webhook.last_tested_at) {
      return <Clock className="h-4 w-4 text-gray-400" />;
    }
    
    switch (webhook.last_test_status) {
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'failure':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Clock className="h-4 w-4 text-yellow-500" />;
    }
  };

  const getStatusText = (webhook: any) => {
    if (!webhook.last_tested_at) {
      return 'Never tested';
    }
    
    const timeAgo = new Date(webhook.last_tested_at).toLocaleString();
    
    switch (webhook.last_test_status) {
      case 'success':
        return `✅ Working (${timeAgo})`;
      case 'failure':
        return `❌ Failed (${timeAgo})`;
      default:
        return `⏳ Testing (${timeAgo})`;
    }
  };

  if (isLoading) {
    return (
      <Card className={className}>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>{title}</CardTitle>
            <CardDescription>{description}</CardDescription>
          </div>
          <Button
            onClick={() => setShowAddForm(true)}
            size="sm"
            disabled={showAddForm}
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Webhook
          </Button>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Add/Edit Form */}
        {showAddForm && (
          <Card className="border-dashed">
            <CardHeader>
              <CardTitle className="text-lg">
                {editingId ? 'Edit Webhook' : 'Add New Webhook'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="name">Name</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="e.g., AI Chat Settings"
                      required
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="method">Method</Label>
                    <Select
                      value={formData.http_method}
                      onValueChange={(value: any) => setFormData({ ...formData, http_method: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="POST">POST</SelectItem>
                        <SelectItem value="GET">GET</SelectItem>
                        <SelectItem value="PUT">PUT</SelectItem>
                        <SelectItem value="PATCH">PATCH</SelectItem>
                        <SelectItem value="DELETE">DELETE</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label htmlFor="url">Webhook URL</Label>
                  <Input
                    id="url"
                    type="url"
                    value={formData.webhook_url}
                    onChange={(e) => setFormData({ ...formData, webhook_url: e.target.value })}
                    placeholder="https://your-webhook-url.com/endpoint"
                    required
                  />
                </div>

                {/* Headers and payload optional for advanced users */}
                <details className="space-y-2">
                  <summary className="cursor-pointer text-sm font-medium">Advanced Options (Optional)</summary>
                  
                  <div>
                    <Label htmlFor="headers">Headers (JSON)</Label>
                    <Textarea
                      id="headers"
                      value={JSON.stringify(formData.headers, null, 2)}
                      onChange={(e) => {
                        try {
                          const headers = JSON.parse(e.target.value || '{}');
                          setFormData({ ...formData, headers });
                        } catch {
                          // Invalid JSON, ignore
                        }
                      }}
                      placeholder='{"Authorization": "Bearer token"}'
                      rows={2}
                    />
                  </div>

                  <div>
                    <Label htmlFor="payload">Default Payload (JSON)</Label>
                    <Textarea
                      id="payload"
                      value={JSON.stringify(formData.payload_template, null, 2)}
                      onChange={(e) => {
                        try {
                          const payload = JSON.parse(e.target.value || '{}');
                          setFormData({ ...formData, payload_template: payload });
                        } catch {
                          // Invalid JSON, ignore
                        }
                      }}
                      placeholder='{"event": "default"}'
                      rows={2}
                    />
                  </div>
                </details>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="active"
                    checked={formData.is_active}
                    onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                  />
                  <Label htmlFor="active">Active</Label>
                </div>

                <div className="flex gap-2">
                  <Button type="submit" disabled={isCreating || isUpdating}>
                    {editingId ? 'Update' : 'Create'}
                  </Button>
                  <Button type="button" variant="outline" onClick={resetForm}>
                    Cancel
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Webhook List */}
        {webhooks.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <p>No webhooks configured yet.</p>
            <p className="text-sm">Add your first webhook to get started.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {webhooks.map((webhook) => (
              <Card key={webhook.id} className="border-l-4 border-l-primary/20">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h4 className="font-medium">{webhook.name}</h4>
                        <Badge variant={webhook.is_active ? 'default' : 'secondary'}>
                          {webhook.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                        <Badge variant="outline">
                          {webhook.http_method}
                        </Badge>
                      </div>
                      
                      <p className="text-sm text-muted-foreground mb-2 font-mono">
                        {webhook.webhook_url}
                      </p>
                      
                      <div className="flex items-center gap-2 text-sm">
                        {getStatusIcon(webhook)}
                        <span>{getStatusText(webhook)}</span>
                        {webhook.last_error_message && (
                          <span className="text-red-500 text-xs">
                            ({webhook.last_error_message})
                          </span>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => testWebhook(webhook.id)}
                        disabled={isTesting}
                      >
                        <TestTube className="h-4 w-4" />
                        Test
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleEdit(webhook)}
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => deleteWebhook(webhook.id)}
                        disabled={isDeleting}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}