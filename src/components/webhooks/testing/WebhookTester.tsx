/**
 * Webhook Tester Component
 * Interactive testing interface for webhooks with payload customization and real-time results
 */

import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
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
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  TestTube,
  Play,
  Copy,
  Download,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  Code,
  History,
  Zap
} from 'lucide-react';
import { toast } from 'sonner';

// Hooks and services
import { useWebhookServices } from '@/hooks/useWebhookServices';
import { useElementWebhooks } from '@/hooks/useElementWebhooks';

// Validation schema
const testSchema = z.object({
  webhookId: z.string().min(1, 'Please select a webhook'),
  customPayload: z.string().optional(),
  customHeaders: z.string().optional(),
  testType: z.enum(['connectivity', 'full_payload', 'custom']),
});

type TestFormData = z.infer<typeof testSchema>;

interface TestResult {
  id: string;
  timestamp: Date;
  webhookId: string;
  testType: string;
  success: boolean;
  statusCode?: number;
  responseTime: number;
  response?: any;
  error?: string;
  payload?: any;
  headers?: any;
}

export function WebhookTester() {
  console.log('🔧 WebhookTester component rendering...');
  
  const [activeTab, setActiveTab] = useState('test');
  const [isTesting, setIsTesting] = useState(false);
  const [currentResult, setCurrentResult] = useState<TestResult | null>(null);
  const [testHistory, setTestHistory] = useState<TestResult[]>([]);

  // Hooks
  const { data: webhooksData, isLoading, error } = useElementWebhooks();
  const { elementService } = useWebhookServices();
  
  // Extract webhooks array from paginated response
  const webhooks = webhooksData?.webhooks || [];

  // Debug logging
  useEffect(() => {
    console.log('WebhookTester mounted - webhooksData:', webhooksData, 'webhooks array:', webhooks?.length || 0, 'loading:', isLoading, 'error:', error);
  }, [webhooksData, webhooks, isLoading, error]);

  // Early return for loading state
  if (isLoading) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Loading webhooks...</CardTitle>
          </CardHeader>
        </Card>
      </div>
    );
  }

  // Early return for error state
  if (error) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Error loading webhooks</CardTitle>
            <CardDescription>{error.message}</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  // Form setup
  const form = useForm<TestFormData>({
    resolver: zodResolver(testSchema),
    defaultValues: {
      webhookId: '',
      customPayload: '{\n  "test": true,\n  "timestamp": "{{timestamp}}",\n  "source": "webhook-tester"\n}',
      customHeaders: '{\n  "Content-Type": "application/json",\n  "X-Test-Source": "OrganizePrime"\n}',
      testType: 'connectivity',
    },
  });

  const selectedWebhook = webhooks.find(w => w.id === form.watch('webhookId'));

  const handleTest = async (data: TestFormData) => {
    if (!selectedWebhook) {
      toast.error('Please select a webhook to test');
      return;
    }

    setIsTesting(true);
    const testId = `test-${Date.now()}`;
    const startTime = Date.now();

    try {
      let result: any;
      let payload: any = undefined;
      let headers: any = undefined;

      // Parse custom payload and headers if provided
      if (data.testType === 'custom') {
        if (data.customPayload) {
          try {
            payload = JSON.parse(data.customPayload);
          } catch (error) {
            toast.error('Invalid JSON in custom payload');
            setIsTesting(false);
            return;
          }
        }

        if (data.customHeaders) {
          try {
            headers = JSON.parse(data.customHeaders);
          } catch (error) {
            toast.error('Invalid JSON in custom headers');
            setIsTesting(false);
            return;
          }
        }
      }

      // Execute test based on type
      switch (data.testType) {
        case 'connectivity':
          result = await elementService.testWebhookConnectivity(selectedWebhook.id);
          break;
        case 'full_payload':
          result = await elementService.executeWebhook(selectedWebhook.id, {
            test: true,
            source: 'webhook-tester',
          });
          break;
        case 'custom':
          result = await elementService.executeWebhook(selectedWebhook.id, payload, headers);
          break;
      }

      const responseTime = Date.now() - startTime;
      
      const testResult: TestResult = {
        id: testId,
        timestamp: new Date(),
        webhookId: selectedWebhook.id,
        testType: data.testType,
        success: result.success || result.statusCode < 400,
        statusCode: result.statusCode,
        responseTime,
        response: result.response || result.data,
        error: result.error,
        payload: payload || result.payload,
        headers: headers || result.headers,
      };

      setCurrentResult(testResult);
      setTestHistory(prev => [testResult, ...prev.slice(0, 9)]); // Keep last 10 results

      if (testResult.success) {
        toast.success('Test completed successfully');
      } else {
        toast.error('Test failed - check results for details');
      }

    } catch (error) {
      const responseTime = Date.now() - startTime;
      const testResult: TestResult = {
        id: testId,
        timestamp: new Date(),
        webhookId: selectedWebhook.id,
        testType: data.testType,
        success: false,
        responseTime,
        error: error.message,
      };

      setCurrentResult(testResult);
      setTestHistory(prev => [testResult, ...prev.slice(0, 9)]);
      toast.error('Test failed: ' + error.message);
    } finally {
      setIsTesting(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  };

  const exportResults = () => {
    const data = {
      currentResult,
      testHistory: testHistory.slice(0, 5), // Export last 5 results
      exportedAt: new Date().toISOString(),
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `webhook-test-results-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Test results exported');
  };

  const getStatusIcon = (success: boolean) => {
    return success ? (
      <CheckCircle className="h-4 w-4 text-green-600" />
    ) : (
      <XCircle className="h-4 w-4 text-red-600" />
    );
  };

  const getStatusColor = (statusCode?: number) => {
    if (!statusCode) return 'secondary';
    if (statusCode >= 200 && statusCode < 300) return 'default';
    if (statusCode >= 400 && statusCode < 500) return 'destructive';
    if (statusCode >= 500) return 'destructive';
    return 'secondary';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TestTube className="h-5 w-5" />
            Webhook Tester
          </CardTitle>
          <CardDescription>
            Test webhook connectivity, validate payloads, and debug webhook executions in real-time
          </CardDescription>
        </CardHeader>
      </Card>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="test" className="flex items-center gap-2">
            <Zap className="h-4 w-4" />
            Test Configuration
          </TabsTrigger>
          <TabsTrigger value="results" className="flex items-center gap-2">
            <Code className="h-4 w-4" />
            Current Results
          </TabsTrigger>
          <TabsTrigger value="history" className="flex items-center gap-2">
            <History className="h-4 w-4" />
            Test History
          </TabsTrigger>
        </TabsList>

        {/* Test Configuration */}
        <TabsContent value="test" className="space-y-6">
          <form onSubmit={form.handleSubmit(handleTest)} className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Test Configuration</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="webhookId">Select Webhook *</Label>
                    <Select
                      value={form.watch('webhookId')}
                      onValueChange={(value) => form.setValue('webhookId', value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Choose a webhook to test" />
                      </SelectTrigger>
                      <SelectContent>
                        {webhooks.map((webhook) => (
                          <SelectItem key={webhook.id} value={webhook.id}>
                            <div className="flex items-center justify-between w-full">
                              <span>{webhook.displayName || webhook.elementId}</span>
                              <Badge variant={webhook.isActive ? 'default' : 'secondary'} className="ml-2">
                                {webhook.isActive ? 'Active' : 'Inactive'}
                              </Badge>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {form.formState.errors.webhookId && (
                      <p className="text-sm text-destructive">
                        {form.formState.errors.webhookId.message}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="testType">Test Type</Label>
                    <Select
                      value={form.watch('testType')}
                      onValueChange={(value) => form.setValue('testType', value as any)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="connectivity">Connectivity Test</SelectItem>
                        <SelectItem value="full_payload">Full Payload Test</SelectItem>
                        <SelectItem value="custom">Custom Payload</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Webhook Details */}
                {selectedWebhook && (
                  <Alert>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      <div className="space-y-2">
                        <p><strong>Endpoint:</strong> {selectedWebhook.endpointUrl}</p>
                        <p><strong>Method:</strong> {selectedWebhook.httpMethod}</p>
                        <p><strong>Feature:</strong> {selectedWebhook.featureSlug} → {selectedWebhook.elementId}</p>
                      </div>
                    </AlertDescription>
                  </Alert>
                )}

                {/* Custom Payload and Headers */}
                {form.watch('testType') === 'custom' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="customPayload">Custom Payload (JSON)</Label>
                      <Textarea
                        id="customPayload"
                        {...form.register('customPayload')}
                        rows={6}
                        className="font-mono text-sm"
                        placeholder="Enter custom JSON payload..."
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="customHeaders">Custom Headers (JSON)</Label>
                      <Textarea
                        id="customHeaders"
                        {...form.register('customHeaders')}
                        rows={6}
                        className="font-mono text-sm"
                        placeholder="Enter custom headers..."
                      />
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-4">
                  <Button
                    type="submit"
                    disabled={isTesting || !form.watch('webhookId')}
                    className="flex items-center gap-2"
                  >
                    {isTesting ? (
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                    ) : (
                      <Play className="h-4 w-4" />
                    )}
                    {isTesting ? 'Testing...' : 'Run Test'}
                  </Button>

                  {currentResult && (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={exportResults}
                      className="flex items-center gap-2"
                    >
                      <Download className="h-4 w-4" />
                      Export Results
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          </form>
        </TabsContent>

        {/* Current Results */}
        <TabsContent value="results" className="space-y-6">
          {currentResult ? (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    {getStatusIcon(currentResult.success)}
                    Test Results
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    <Badge variant={getStatusColor(currentResult.statusCode)}>
                      {currentResult.statusCode || 'No Status'}
                    </Badge>
                    <Badge variant="outline">
                      {currentResult.responseTime}ms
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Test Summary */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Status</p>
                    <p className="font-medium">
                      {currentResult.success ? 'Success' : 'Failed'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Response Time</p>
                    <p className="font-medium">{currentResult.responseTime}ms</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Test Type</p>
                    <p className="font-medium capitalize">{currentResult.testType.replace('_', ' ')}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Timestamp</p>
                    <p className="font-medium">{currentResult.timestamp.toLocaleTimeString()}</p>
                  </div>
                </div>

                {/* Error Details */}
                {currentResult.error && (
                  <Alert variant="destructive">
                    <XCircle className="h-4 w-4" />
                    <AlertDescription>
                      <strong>Error:</strong> {currentResult.error}
                    </AlertDescription>
                  </Alert>
                )}

                {/* Response Details */}
                {currentResult.response && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label>Response Body</Label>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyToClipboard(JSON.stringify(currentResult.response, null, 2))}
                        className="h-8"
                      >
                        <Copy className="h-3 w-3 mr-1" />
                        Copy
                      </Button>
                    </div>
                    <Textarea
                      value={JSON.stringify(currentResult.response, null, 2)}
                      rows={8}
                      className="font-mono text-sm"
                      readOnly
                    />
                  </div>
                )}

                {/* Payload Used */}
                {currentResult.payload && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label>Payload Sent</Label>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyToClipboard(JSON.stringify(currentResult.payload, null, 2))}
                        className="h-8"
                      >
                        <Copy className="h-3 w-3 mr-1" />
                        Copy
                      </Button>
                    </div>
                    <Textarea
                      value={JSON.stringify(currentResult.payload, null, 2)}
                      rows={4}
                      className="font-mono text-sm"
                      readOnly
                    />
                  </div>
                )}
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="py-8">
                <div className="text-center text-muted-foreground">
                  <TestTube className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No test results yet. Run a test to see results here.</p>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Test History */}
        <TabsContent value="history" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Test History</CardTitle>
              <CardDescription>
                Recent webhook test results (last 10 tests)
              </CardDescription>
            </CardHeader>
            <CardContent>
              {testHistory.length > 0 ? (
                <div className="space-y-3">
                  {testHistory.map((result) => (
                    <div
                      key={result.id}
                      className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
                      onClick={() => setCurrentResult(result)}
                    >
                      <div className="flex items-center gap-3">
                        {getStatusIcon(result.success)}
                        <div>
                          <p className="font-medium">
                            {webhooks.find(w => w.id === result.webhookId)?.displayName || 'Webhook'}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {result.testType.replace('_', ' ')} • {result.timestamp.toLocaleString()}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={getStatusColor(result.statusCode)}>
                          {result.statusCode || 'No Status'}
                        </Badge>
                        <Badge variant="outline">
                          <Clock className="h-3 w-3 mr-1" />
                          {result.responseTime}ms
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <History className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No test history available</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}