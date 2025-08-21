/**
 * Webhook Configuration Modal
 * Comprehensive modal for creating and editing webhooks
 */

import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  AlertCircle, 
  CheckCircle, 
  TestTube, 
  Save, 
  X,
  Code,
  Settings,
  Activity
} from 'lucide-react';
import { toast } from 'sonner';

// Import hooks and types
import { useCreateElementWebhook, useUpdateElementWebhook } from '@/hooks/useElementWebhooks';
import { useWebhookServices } from '@/hooks/useWebhookServices';
import type { ElementWebhook, CreateElementWebhookRequest } from '@/types/webhook';

// Validation schema
const webhookSchema = z.object({
  featureSlug: z.string().min(1, 'Feature is required'),
  pagePath: z.string().min(1, 'Page path is required'),
  elementId: z.string().min(1, 'Element ID is required'),
  elementType: z.string().optional(),
  displayName: z.string().optional(),
  endpointUrl: z.string().url('Must be a valid URL'),
  httpMethod: z.enum(['GET', 'POST', 'PUT', 'DELETE', 'PATCH']),
  payloadTemplate: z.string().optional(),
  headers: z.string().optional(),
  timeoutSeconds: z.number().min(1).max(300),
  retryCount: z.number().min(0).max(10),
  rateLimitPerMinute: z.number().min(1).max(1000),
  isActive: z.boolean(),
});

type WebhookFormData = z.infer<typeof webhookSchema>;

interface WebhookConfigurationModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode: 'create' | 'edit';
  webhook?: ElementWebhook | null;
}

export function WebhookConfigurationModal({ 
  isOpen, 
  onClose, 
  mode, 
  webhook 
}: WebhookConfigurationModalProps) {
  const [activeTab, setActiveTab] = useState('basic');
  const [isValidating, setIsValidating] = useState(false);
  const [validationResult, setValidationResult] = useState<any>(null);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<any>(null);

  // Hooks
  const createMutation = useCreateElementWebhook();
  const updateMutation = useUpdateElementWebhook();
  const { elementService } = useWebhookServices();

  // Form setup
  const form = useForm<WebhookFormData>({
    resolver: zodResolver(webhookSchema),
    defaultValues: {
      featureSlug: '',
      pagePath: '',
      elementId: '',
      elementType: 'button',
      displayName: '',
      endpointUrl: '',
      httpMethod: 'POST',
      payloadTemplate: '{\n  "action": "${elementId}_clicked",\n  "timestamp": "${timestamp}",\n  "userId": "${userId}"\n}',
      headers: '{\n  "Content-Type": "application/json"\n}',
      timeoutSeconds: 30,
      retryCount: 3,
      rateLimitPerMinute: 60,
      isActive: true,
    },
  });

  // Load webhook data when editing
  useEffect(() => {
    if (mode === 'edit' && webhook) {
      form.reset({
        featureSlug: webhook.featureSlug,
        pagePath: webhook.pagePath,
        elementId: webhook.elementId,
        elementType: webhook.elementType,
        displayName: webhook.displayName,
        endpointUrl: webhook.endpointUrl,
        httpMethod: webhook.httpMethod,
        payloadTemplate: JSON.stringify(webhook.payloadTemplate, null, 2),
        headers: JSON.stringify(webhook.headers, null, 2),
        timeoutSeconds: webhook.timeoutSeconds,
        retryCount: webhook.retryCount,
        rateLimitPerMinute: webhook.rateLimitPerMinute,
        isActive: webhook.isActive,
      });
    } else if (mode === 'create') {
      form.reset({
        featureSlug: '',
        pagePath: '',
        elementId: '',
        elementType: 'button',
        displayName: '',
        endpointUrl: '',
        httpMethod: 'POST',
        payloadTemplate: '{\n  "action": "${elementId}_clicked",\n  "timestamp": "${timestamp}",\n  "userId": "${userId}"\n}',
        headers: '{\n  "Content-Type": "application/json"\n}',
        timeoutSeconds: 30,
        retryCount: 3,
        rateLimitPerMinute: 60,
        isActive: true,
      });
    }
  }, [mode, webhook, form]);

  // Clear results when modal closes
  useEffect(() => {
    if (!isOpen) {
      setValidationResult(null);
      setTestResult(null);
      setActiveTab('basic');
    }
  }, [isOpen]);

  const handleValidate = async () => {
    setIsValidating(true);
    try {
      const formData = form.getValues();
      const config = {
        featureSlug: formData.featureSlug,
        pagePath: formData.pagePath,
        elementId: formData.elementId,
        elementType: formData.elementType,
        displayName: formData.displayName,
        endpointUrl: formData.endpointUrl,
        httpMethod: formData.httpMethod,
        payloadTemplate: formData.payloadTemplate ? JSON.parse(formData.payloadTemplate) : undefined,
        headers: formData.headers ? JSON.parse(formData.headers) : undefined,
        timeoutSeconds: formData.timeoutSeconds,
        retryCount: formData.retryCount,
        rateLimitPerMinute: formData.rateLimitPerMinute,
        isActive: formData.isActive,
      };

      const result = await elementService.validateWebhookConfig(config);
      setValidationResult(result);
      
      if (result.valid) {
        toast.success('Configuration is valid');
      } else {
        toast.error('Configuration has errors');
      }
    } catch (error) {
      toast.error('Validation failed: ' + error.message);
      setValidationResult({ valid: false, errors: [{ message: error.message }] });
    } finally {
      setIsValidating(false);
    }
  };

  const handleTest = async () => {
    if (mode === 'create') {
      toast.error('Please save the webhook first before testing');
      return;
    }

    if (!webhook) {
      toast.error('No webhook to test');
      return;
    }

    setIsTesting(true);
    try {
      const result = await elementService.testWebhookConnectivity(webhook.id);
      setTestResult(result);
      
      if (result.success) {
        toast.success('Connectivity test passed');
      } else {
        toast.error('Connectivity test failed');
      }
    } catch (error) {
      toast.error('Test failed: ' + error.message);
      setTestResult({ success: false, error: error.message });
    } finally {
      setIsTesting(false);
    }
  };

  const onSubmit = async (data: WebhookFormData) => {
    try {
      let payloadTemplate: any = {};
      let headers: any = {};

      // Parse JSON fields
      if (data.payloadTemplate) {
        try {
          payloadTemplate = JSON.parse(data.payloadTemplate);
        } catch (error) {
          toast.error('Invalid JSON in payload template');
          return;
        }
      }

      if (data.headers) {
        try {
          headers = JSON.parse(data.headers);
        } catch (error) {
          toast.error('Invalid JSON in headers');
          return;
        }
      }

      const webhookData: CreateElementWebhookRequest = {
        featureSlug: data.featureSlug,
        pagePath: data.pagePath,
        elementId: data.elementId,
        elementType: data.elementType,
        displayName: data.displayName,
        endpointUrl: data.endpointUrl,
        httpMethod: data.httpMethod,
        payloadTemplate,
        headers,
        timeoutSeconds: data.timeoutSeconds,
        retryCount: data.retryCount,
        rateLimitPerMinute: data.rateLimitPerMinute,
        isActive: data.isActive,
      };

      if (mode === 'create') {
        await createMutation.mutateAsync(webhookData);
        toast.success('Webhook created successfully');
      } else if (webhook) {
        await updateMutation.mutateAsync({
          id: webhook.id,
          updates: webhookData,
        });
        toast.success('Webhook updated successfully');
      }

      onClose();
    } catch (error) {
      toast.error(`Failed to ${mode} webhook: ${error.message}`);
    }
  };

  const isLoading = createMutation.isPending || updateMutation.isPending;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {mode === 'create' ? 'Create New Webhook' : 'Edit Webhook'}
          </DialogTitle>
          <DialogDescription>
            Configure webhook parameters, payload template, and testing options.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="basic" className="flex items-center gap-2">
                <Settings className="h-4 w-4" />
                Basic
              </TabsTrigger>
              <TabsTrigger value="payload" className="flex items-center gap-2">
                <Code className="h-4 w-4" />
                Payload
              </TabsTrigger>
              <TabsTrigger value="advanced" className="flex items-center gap-2">
                <Activity className="h-4 w-4" />
                Advanced
              </TabsTrigger>
              <TabsTrigger value="testing" className="flex items-center gap-2">
                <TestTube className="h-4 w-4" />
                Testing
              </TabsTrigger>
            </TabsList>

            {/* Basic Configuration */}
            <TabsContent value="basic" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="featureSlug">Feature Slug *</Label>
                  <Input
                    id="featureSlug"
                    {...form.register('featureSlug')}
                    placeholder="e.g., knowledge-base"
                  />
                  {form.formState.errors.featureSlug && (
                    <p className="text-sm text-destructive">
                      {form.formState.errors.featureSlug.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="pagePath">Page Path *</Label>
                  <Input
                    id="pagePath"
                    {...form.register('pagePath')}
                    placeholder="e.g., /features/knowledge-base"
                  />
                  {form.formState.errors.pagePath && (
                    <p className="text-sm text-destructive">
                      {form.formState.errors.pagePath.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="elementId">Element ID *</Label>
                  <Input
                    id="elementId"
                    {...form.register('elementId')}
                    placeholder="e.g., submit-button"
                  />
                  {form.formState.errors.elementId && (
                    <p className="text-sm text-destructive">
                      {form.formState.errors.elementId.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="elementType">Element Type</Label>
                  <Select
                    value={form.watch('elementType')}
                    onValueChange={(value) => form.setValue('elementType', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select element type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="button">Button</SelectItem>
                      <SelectItem value="link">Link</SelectItem>
                      <SelectItem value="form">Form</SelectItem>
                      <SelectItem value="input">Input</SelectItem>
                      <SelectItem value="select">Select</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="displayName">Display Name</Label>
                  <Input
                    id="displayName"
                    {...form.register('displayName')}
                    placeholder="Human-readable name for this webhook"
                  />
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="endpointUrl">Endpoint URL *</Label>
                  <Input
                    id="endpointUrl"
                    {...form.register('endpointUrl')}
                    placeholder="https://api.example.com/webhook"
                  />
                  {form.formState.errors.endpointUrl && (
                    <p className="text-sm text-destructive">
                      {form.formState.errors.endpointUrl.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="httpMethod">HTTP Method</Label>
                  <Select
                    value={form.watch('httpMethod')}
                    onValueChange={(value) => form.setValue('httpMethod', value as any)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="GET">GET</SelectItem>
                      <SelectItem value="POST">POST</SelectItem>
                      <SelectItem value="PUT">PUT</SelectItem>
                      <SelectItem value="DELETE">DELETE</SelectItem>
                      <SelectItem value="PATCH">PATCH</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="isActive"
                    checked={form.watch('isActive')}
                    onCheckedChange={(checked) => form.setValue('isActive', checked)}
                  />
                  <Label htmlFor="isActive">Active</Label>
                </div>
              </div>
            </TabsContent>

            {/* Payload Configuration */}
            <TabsContent value="payload" className="space-y-4">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="payloadTemplate">Payload Template (JSON)</Label>
                  <Textarea
                    id="payloadTemplate"
                    {...form.register('payloadTemplate')}
                    rows={8}
                    className="font-mono text-sm"
                    placeholder="Enter JSON payload template..."
                  />
                  <p className="text-xs text-muted-foreground">
                    Use variables like ${`elementId`}, ${`timestamp`}, ${`userId`} for dynamic values
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="headers">Headers (JSON)</Label>
                  <Textarea
                    id="headers"
                    {...form.register('headers')}
                    rows={4}
                    className="font-mono text-sm"
                    placeholder="Enter HTTP headers..."
                  />
                </div>
              </div>
            </TabsContent>

            {/* Advanced Configuration */}
            <TabsContent value="advanced" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="timeoutSeconds">Timeout (seconds)</Label>
                  <Input
                    id="timeoutSeconds"
                    type="number"
                    {...form.register('timeoutSeconds', { valueAsNumber: true })}
                    min={1}
                    max={300}
                  />
                  {form.formState.errors.timeoutSeconds && (
                    <p className="text-sm text-destructive">
                      {form.formState.errors.timeoutSeconds.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="retryCount">Retry Count</Label>
                  <Input
                    id="retryCount"
                    type="number"
                    {...form.register('retryCount', { valueAsNumber: true })}
                    min={0}
                    max={10}
                  />
                  {form.formState.errors.retryCount && (
                    <p className="text-sm text-destructive">
                      {form.formState.errors.retryCount.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="rateLimitPerMinute">Rate Limit (per minute)</Label>
                  <Input
                    id="rateLimitPerMinute"
                    type="number"
                    {...form.register('rateLimitPerMinute', { valueAsNumber: true })}
                    min={1}
                    max={1000}
                  />
                  {form.formState.errors.rateLimitPerMinute && (
                    <p className="text-sm text-destructive">
                      {form.formState.errors.rateLimitPerMinute.message}
                    </p>
                  )}
                </div>
              </div>
            </TabsContent>

            {/* Testing */}
            <TabsContent value="testing" className="space-y-4">
              <div className="flex items-center gap-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleValidate}
                  disabled={isValidating}
                  className="flex items-center gap-2"
                >
                  {isValidating ? (
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  ) : (
                    <CheckCircle className="h-4 w-4" />
                  )}
                  Validate Configuration
                </Button>

                {mode === 'edit' && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleTest}
                    disabled={isTesting}
                    className="flex items-center gap-2"
                  >
                    {isTesting ? (
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                    ) : (
                      <TestTube className="h-4 w-4" />
                    )}
                    Test Connectivity
                  </Button>
                )}
              </div>

              {/* Validation Results */}
              {validationResult && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      {validationResult.valid ? (
                        <CheckCircle className="h-5 w-5 text-green-600" />
                      ) : (
                        <AlertCircle className="h-5 w-5 text-destructive" />
                      )}
                      Validation Results
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {validationResult.valid ? (
                      <p className="text-green-600">Configuration is valid!</p>
                    ) : (
                      <div className="space-y-2">
                        {validationResult.errors?.map((error: any, index: number) => (
                          <Alert key={index} variant="destructive">
                            <AlertCircle className="h-4 w-4" />
                            <AlertDescription>{error.message}</AlertDescription>
                          </Alert>
                        ))}
                      </div>
                    )}
                    
                    {validationResult.warnings?.length > 0 && (
                      <div className="mt-4 space-y-2">
                        <h4 className="text-sm font-medium">Warnings:</h4>
                        {validationResult.warnings.map((warning: any, index: number) => (
                          <Alert key={index}>
                            <AlertCircle className="h-4 w-4" />
                            <AlertDescription>{warning.message}</AlertDescription>
                          </Alert>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Test Results */}
              {testResult && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      {testResult.success ? (
                        <CheckCircle className="h-5 w-5 text-green-600" />
                      ) : (
                        <AlertCircle className="h-5 w-5 text-destructive" />
                      )}
                      Connectivity Test Results
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <p className="text-sm">
                          <strong>Status:</strong>{' '}
                          <Badge variant={testResult.success ? 'default' : 'destructive'}>
                            {testResult.success ? 'Success' : 'Failed'}
                          </Badge>
                        </p>
                        {testResult.statusCode && (
                          <p className="text-sm">
                            <strong>Status Code:</strong> {testResult.statusCode}
                          </p>
                        )}
                        {testResult.responseTime && (
                          <p className="text-sm">
                            <strong>Response Time:</strong> {testResult.responseTime}ms
                          </p>
                        )}
                      </div>
                      <div className="space-y-2">
                        <p className="text-sm">
                          <strong>Endpoint Reachable:</strong>{' '}
                          <Badge variant={testResult.endpointReachable ? 'default' : 'destructive'}>
                            {testResult.endpointReachable ? 'Yes' : 'No'}
                          </Badge>
                        </p>
                        {testResult.sslValid !== undefined && (
                          <p className="text-sm">
                            <strong>SSL Valid:</strong>{' '}
                            <Badge variant={testResult.sslValid ? 'default' : 'destructive'}>
                              {testResult.sslValid ? 'Yes' : 'No'}
                            </Badge>
                          </p>
                        )}
                      </div>
                    </div>
                    
                    {testResult.error && (
                      <Alert variant="destructive" className="mt-4">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>{testResult.error}</AlertDescription>
                      </Alert>
                    )}
                    
                    {testResult.recommendations?.length > 0 && (
                      <div className="mt-4">
                        <h4 className="text-sm font-medium mb-2">Recommendations:</h4>
                        <ul className="text-sm space-y-1 text-muted-foreground">
                          {testResult.recommendations.map((rec: string, index: number) => (
                            <li key={index}>• {rec}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          </Tabs>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isLoading}
            >
              <X className="h-4 w-4 mr-2" />
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isLoading}
              className="flex items-center gap-2"
            >
              {isLoading ? (
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              {mode === 'create' ? 'Create Webhook' : 'Update Webhook'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}