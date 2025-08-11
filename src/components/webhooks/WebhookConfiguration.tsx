import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { TestTube, Save, Plus, Trash2, Settings } from 'lucide-react';
import { N8NWebhookService, FeatureWebhookConfig } from '@/services/N8NWebhookService';
import { useWebhookTest } from '@/hooks/useWebhookCall';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface WebhookConfigurationProps {
  featureSlug: string;
  organizationId: string;
}

interface WebhookFormData {
  webhookName: string;
  url: string;
  method: 'POST' | 'GET' | 'PUT' | 'DELETE';
  enabled: boolean;
  timeout: number;
  maxRetries: number;
  headers: string; // JSON string
}

export const WebhookConfiguration: React.FC<WebhookConfigurationProps> = ({
  featureSlug,
  organizationId
}) => {
  const [selectedWebhook, setSelectedWebhook] = useState<string | null>(null);
  const queryClient = useQueryClient();
  const { testWebhook, isTesting } = useWebhookTest();

  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm<WebhookFormData>({
    defaultValues: {
      method: 'POST',
      enabled: true,
      timeout: 30,
      maxRetries: 3,
      headers: '{}'
    }
  });

  // Get existing webhooks for this feature
  const { data: webhooks, isLoading } = useQuery({
    queryKey: ['feature-webhooks', featureSlug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('feature_webhooks')
        .select('*')
        .eq('feature_id', featureSlug)
        .order('name');
      
      if (error) throw error;
      return data || [];
    }
  });

  // Save webhook configuration
  const saveWebhook = useMutation({
    mutationFn: async (formData: WebhookFormData) => {
      let headers = {};
      try {
        headers = JSON.parse(formData.headers);
      } catch (error) {
        throw new Error('Invalid JSON in headers field');
      }

      const config: Partial<FeatureWebhookConfig> = {
        featureSlug,
        webhookName: formData.webhookName,
        url: formData.url,
        method: formData.method,
        enabled: formData.enabled,
        timeout: formData.timeout * 1000, // Convert to milliseconds
        retryConfig: {
          maxRetries: formData.maxRetries,
          retryDelay: 1000,
          exponentialBackoff: true
        },
        headers,
        organizationId
      };

      return N8NWebhookService.saveWebhookConfig(config);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feature-webhooks', featureSlug] });
      toast.success('Webhook configuration saved');
      reset();
      setSelectedWebhook(null);
    },
    onError: (error) => {
      toast.error(`Failed to save webhook: ${(error as Error).message}`);
    }
  });

  // Delete webhook
  const deleteWebhook = useMutation({
    mutationFn: async (webhookId: string) => {
      const { error } = await supabase
        .from('feature_webhooks')
        .delete()
        .eq('id', webhookId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feature-webhooks', featureSlug] });
      toast.success('Webhook deleted');
      setSelectedWebhook(null);
      reset();
    },
    onError: (error) => {
      toast.error(`Failed to delete webhook: ${(error as Error).message}`);
    }
  });

  const handleWebhookSelect = (webhook: any) => {
    setSelectedWebhook(webhook.id);
    setValue('webhookName', webhook.name);
    setValue('url', webhook.endpoint_url);
    setValue('method', webhook.method);
    setValue('enabled', webhook.is_active);
    setValue('timeout', webhook.timeout_seconds);
    setValue('maxRetries', webhook.retry_attempts);
    setValue('headers', JSON.stringify(webhook.headers || {}, null, 2));
  };

  const handleTestWebhook = async (webhookId: string) => {
    try {
      await testWebhook(webhookId);
      queryClient.invalidateQueries({ queryKey: ['feature-webhooks', featureSlug] });
    } catch (error) {
      // Error handling is done in the hook
    }
  };

  const handleNewWebhook = () => {
    setSelectedWebhook(null);
    reset();
  };

  const onSubmit = (data: WebhookFormData) => {
    saveWebhook.mutate(data);
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="text-sm text-muted-foreground mt-2">Loading webhooks...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="w-5 h-5" />
          Webhook Configuration
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="list" className="w-full">
          <TabsList>
            <TabsTrigger value="list">Existing Webhooks</TabsTrigger>
            <TabsTrigger value="configure">Configure</TabsTrigger>
          </TabsList>

          <TabsContent value="list" className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-medium">Configured Webhooks</h3>
              <Button onClick={handleNewWebhook} size="sm">
                <Plus className="w-4 h-4 mr-2" />
                New Webhook
              </Button>
            </div>

            {webhooks?.length === 0 ? (
              <div className="text-center py-8">
                <Settings className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">No Webhooks Configured</h3>
                <p className="text-muted-foreground mb-4">
                  Add webhooks to enable automation for this feature.
                </p>
                <Button onClick={handleNewWebhook}>
                  <Plus className="w-4 h-4 mr-2" />
                  Create First Webhook
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                {webhooks?.map((webhook) => (
                  <div
                    key={webhook.id}
                    className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{webhook.name}</span>
                        <Badge variant={webhook.is_active ? "default" : "secondary"}>
                          {webhook.is_active ? "Active" : "Disabled"}
                        </Badge>
                        {webhook.test_status && (
                          <Badge 
                            variant={webhook.test_status === 'success' ? "outline" : "destructive"}
                          >
                            {webhook.test_status === 'success' ? 'Test ✓' : 'Test ✗'}
                          </Badge>
                        )}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {webhook.method} {webhook.endpoint_url}
                      </div>
                      {webhook.last_tested_at && (
                        <div className="text-xs text-muted-foreground">
                          Last tested: {new Date(webhook.last_tested_at).toLocaleString()}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleTestWebhook(webhook.id)}
                        disabled={isTesting}
                      >
                        <TestTube className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleWebhookSelect(webhook)}
                      >
                        Edit
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => deleteWebhook.mutate(webhook.id)}
                        disabled={deleteWebhook.isPending}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="configure" className="space-y-4">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="webhookName">Webhook Name</Label>
                  <Input
                    id="webhookName"
                    {...register('webhookName', { required: 'Webhook name is required' })}
                    placeholder="e.g., process-document"
                  />
                  {errors.webhookName && (
                    <p className="text-sm text-destructive mt-1">{errors.webhookName.message}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="method">HTTP Method</Label>
                  <Select
                    value={watch('method')}
                    onValueChange={(value: 'POST' | 'GET' | 'PUT' | 'DELETE') => setValue('method', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="POST">POST</SelectItem>
                      <SelectItem value="GET">GET</SelectItem>
                      <SelectItem value="PUT">PUT</SelectItem>
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
                  {...register('url', { required: 'Webhook URL is required' })}
                  placeholder="https://your-n8n-instance.com/webhook/your-workflow"
                />
                {errors.url && (
                  <p className="text-sm text-destructive mt-1">{errors.url.message}</p>
                )}
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="timeout">Timeout (seconds)</Label>
                  <Input
                    id="timeout"
                    type="number"
                    min="1"
                    max="300"
                    {...register('timeout', { 
                      required: 'Timeout is required',
                      min: { value: 1, message: 'Minimum 1 second' },
                      max: { value: 300, message: 'Maximum 300 seconds' }
                    })}
                  />
                  {errors.timeout && (
                    <p className="text-sm text-destructive mt-1">{errors.timeout.message}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="maxRetries">Max Retries</Label>
                  <Input
                    id="maxRetries"
                    type="number"
                    min="0"
                    max="10"
                    {...register('maxRetries', {
                      required: 'Max retries is required',
                      min: { value: 0, message: 'Minimum 0 retries' },
                      max: { value: 10, message: 'Maximum 10 retries' }
                    })}
                  />
                  {errors.maxRetries && (
                    <p className="text-sm text-destructive mt-1">{errors.maxRetries.message}</p>
                  )}
                </div>

                <div className="flex items-center space-x-2 pt-6">
                  <Switch
                    id="enabled"
                    checked={watch('enabled')}
                    onCheckedChange={(checked) => setValue('enabled', checked)}
                  />
                  <Label htmlFor="enabled">Enabled</Label>
                </div>
              </div>

              <div>
                <Label htmlFor="headers">Headers (JSON)</Label>
                <Textarea
                  id="headers"
                  {...register('headers')}
                  placeholder='{"Authorization": "Bearer token", "Content-Type": "application/json"}'
                  rows={4}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Optional HTTP headers as JSON object
                </p>
              </div>

              <div className="flex gap-2">
                <Button
                  type="submit"
                  disabled={saveWebhook.isPending}
                  className="flex-1"
                >
                  <Save className="w-4 h-4 mr-2" />
                  {saveWebhook.isPending ? 'Saving...' : selectedWebhook ? 'Update Webhook' : 'Create Webhook'}
                </Button>
                {selectedWebhook && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleNewWebhook}
                  >
                    Cancel
                  </Button>
                )}
              </div>
            </form>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};