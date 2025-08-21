/**
 * Manual test component for webhook services
 * This component helps validate that our services work correctly in a UI context
 */

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

// Import our services
import { useWebhookServices } from '@/hooks/useWebhookServices';
import { useElementWebhooks, useCreateElementWebhook } from '@/hooks/useElementWebhooks';
import type { CreateElementWebhookRequest } from '@/types/webhook';

export function WebhookServiceTester() {
  const [testEndpoint, setTestEndpoint] = useState('https://httpbin.org/post');
  const [testResults, setTestResults] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Get our services
  const services = useWebhookServices();
  const createWebhookMutation = useCreateElementWebhook();
  const { data: webhooks, isLoading: webhooksLoading } = useElementWebhooks();

  const addResult = (message: string) => {
    setTestResults(prev => [`${new Date().toLocaleTimeString()}: ${message}`, ...prev.slice(0, 9)]);
  };

  // Test 1: Service Initialization
  const testServiceInitialization = async () => {
    setIsLoading(true);
    try {
      addResult('✅ Services initialized successfully');
      addResult(`ElementWebhookService: ${services.elementService ? '✅' : '❌'}`);
      addResult(`WebhookDiscoveryService: ${services.discoveryService ? '✅' : '❌'}`);
      addResult(`WebhookExecutionService: ${services.executionService ? '✅' : '❌'}`);
    } catch (error) {
      addResult(`❌ Service initialization failed: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Test 2: Create Test Webhook
  const testCreateWebhook = async () => {
    setIsLoading(true);
    try {
      const testWebhook: CreateElementWebhookRequest = {
        featureSlug: 'test-feature',
        pagePath: '/test-page',
        elementId: `test-element-${Date.now()}`,
        endpointUrl: testEndpoint,
        httpMethod: 'POST',
        payloadTemplate: {
          action: 'test',
          timestamp: '${timestamp}',
          elementId: '${elementId}'
        },
        headers: {
          'Content-Type': 'application/json',
          'X-Test-Source': 'webhook-tester'
        }
      };

      const result = await createWebhookMutation.mutateAsync(testWebhook);
      addResult(`✅ Webhook created successfully: ${result.id}`);
      toast.success('Test webhook created!');
    } catch (error) {
      addResult(`❌ Failed to create webhook: ${error.message}`);
      toast.error('Failed to create test webhook');
    } finally {
      setIsLoading(false);
    }
  };

  // Test 3: Validate Configuration
  const testValidateConfig = async () => {
    setIsLoading(true);
    try {
      const testConfig = {
        featureSlug: 'test-feature',
        pagePath: '/test-page',
        elementId: 'validation-test',
        endpointUrl: testEndpoint,
        httpMethod: 'POST' as const,
      };

      const validation = await services.elementService.validateWebhookConfig(testConfig);
      
      addResult(`✅ Configuration validation completed`);
      addResult(`Valid: ${validation.valid ? '✅' : '❌'}`);
      addResult(`Errors: ${validation.errors.length}`);
      addResult(`Warnings: ${validation.warnings.length}`);
      
      if (validation.warnings.length > 0) {
        validation.warnings.forEach(warning => {
          addResult(`⚠️ Warning: ${warning.message}`);
        });
      }
    } catch (error) {
      addResult(`❌ Configuration validation failed: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Test 4: Connectivity Test
  const testConnectivity = async () => {
    if (!webhooks?.webhooks?.length) {
      addResult('❌ No webhooks available for connectivity test');
      return;
    }

    setIsLoading(true);
    try {
      const webhook = webhooks.webhooks[0];
      const connectivityResult = await services.elementService.testWebhookConnectivity(webhook.id);
      
      addResult(`✅ Connectivity test completed for webhook: ${webhook.id}`);
      addResult(`Success: ${connectivityResult.success ? '✅' : '❌'}`);
      addResult(`Status Code: ${connectivityResult.statusCode || 'N/A'}`);
      addResult(`Response Time: ${connectivityResult.responseTime || 'N/A'}ms`);
      addResult(`Endpoint Reachable: ${connectivityResult.endpointReachable ? '✅' : '❌'}`);
      
      if (connectivityResult.recommendations?.length > 0) {
        addResult(`📋 Recommendations: ${connectivityResult.recommendations.length}`);
      }
    } catch (error) {
      addResult(`❌ Connectivity test failed: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Webhook Services Manual Tester</CardTitle>
          <CardDescription>
            Test the webhook services we implemented in Task 3 to ensure they work correctly
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="test-endpoint">Test Endpoint URL</Label>
              <Input
                id="test-endpoint"
                value={testEndpoint}
                onChange={(e) => setTestEndpoint(e.target.value)}
                placeholder="https://httpbin.org/post"
              />
            </div>
            
            <div className="space-y-2">
              <Label>Current Webhooks</Label>
              <div className="text-sm text-muted-foreground">
                {webhooksLoading ? (
                  <Badge variant="secondary">Loading...</Badge>
                ) : (
                  <Badge variant={webhooks?.totalCount ? "default" : "secondary"}>
                    {webhooks?.totalCount || 0} webhooks found
                  </Badge>
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            <Button
              onClick={testServiceInitialization}
              disabled={isLoading}
              variant="outline"
              size="sm"
            >
              Test Services
            </Button>
            
            <Button
              onClick={testCreateWebhook}
              disabled={isLoading}
              variant="outline"
              size="sm"
            >
              Create Webhook
            </Button>
            
            <Button
              onClick={testValidateConfig}
              disabled={isLoading}
              variant="outline"
              size="sm"
            >
              Validate Config
            </Button>
            
            <Button
              onClick={testConnectivity}
              disabled={isLoading || !webhooks?.webhooks?.length}
              variant="outline"
              size="sm"
            >
              Test Connectivity
            </Button>
          </div>

          {createWebhookMutation.isPending && (
            <div className="text-sm text-muted-foreground">
              Creating webhook...
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Test Results</CardTitle>
          <CardDescription>
            Live results from service tests
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Textarea
            value={testResults.join('\n')}
            readOnly
            className="h-64 font-mono text-sm"
            placeholder="Test results will appear here..."
          />
          
          {testResults.length > 0 && (
            <Button
              onClick={() => setTestResults([])}
              variant="ghost"
              size="sm"
              className="mt-2"
            >
              Clear Results
            </Button>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Service Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <h4 className="font-medium">ElementWebhookService</h4>
              <Badge variant={services.elementService ? "default" : "destructive"}>
                {services.elementService ? "Available" : "Not Available"}
              </Badge>
            </div>
            
            <div className="space-y-2">
              <h4 className="font-medium">WebhookDiscoveryService</h4>
              <Badge variant={services.discoveryService ? "default" : "destructive"}>
                {services.discoveryService ? "Available" : "Not Available"}
              </Badge>
            </div>
            
            <div className="space-y-2">
              <h4 className="font-medium">WebhookExecutionService</h4>
              <Badge variant={services.executionService ? "default" : "destructive"}>
                {services.executionService ? "Available" : "Not Available"}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}