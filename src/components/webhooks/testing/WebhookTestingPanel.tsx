// Phase 4.2: Interactive Webhook Testing Interface
// Comprehensive testing panel with live feedback and results visualization

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { 
  Play, 
  Square, 
  RotateCcw, 
  CheckCircle, 
  XCircle, 
  Clock, 
  Zap, 
  Activity,
  AlertTriangle,
  Download,
  Copy
} from 'lucide-react';
import { toast } from 'sonner';
import { webhookTestingEngine } from '@/services/webhook/WebhookTestingEngine';
import type { 
  WebhookTestConfiguration, 
  WebhookTestResult,
  WebhookExecution 
} from '@/types/webhook-monitoring';

interface WebhookTestingPanelProps {
  webhookId: string;
  elementId: string;
  webhookName: string;
  endpointUrl: string;
  onClose: () => void;
}

interface TestProgress {
  currentTest: string;
  progress: number;
  isRunning: boolean;
  completedTests: number;
  totalTests: number;
}

export const WebhookTestingPanel: React.FC<WebhookTestingPanelProps> = ({
  webhookId,
  elementId,
  webhookName,
  endpointUrl,
  onClose
}) => {
  const [configuration, setConfiguration] = useState<WebhookTestConfiguration>({
    webhook_id: webhookId,
    element_id: elementId,
    test_type: 'quick',
    data_generation_method: 'auto',
    expected_status_codes: [200, 201],
    response_validation_rules: [],
    notify_on_completion: false,
    notify_on_failure: true,
    notification_channels: []
  });

  const [testResult, setTestResult] = useState<WebhookTestResult | null>(null);
  const [testProgress, setTestProgress] = useState<TestProgress>({
    currentTest: '',
    progress: 0,
    isRunning: false,
    completedTests: 0,
    totalTests: 0
  });
  const [activeTab, setActiveTab] = useState('configure');
  const [customPayload, setCustomPayload] = useState('{\n  "test": true,\n  "timestamp": "' + new Date().toISOString() + '"\n}');

  // ===== TEST EXECUTION =====

  const handleStartTest = async () => {
    if (testProgress.isRunning) return;

    setTestProgress({
      currentTest: 'Initializing test...',
      progress: 0,
      isRunning: true,
      completedTests: 0,
      totalTests: getTotalTestCount()
    });

    try {
      // Validate configuration
      const validatedConfig = validateConfiguration(configuration);
      
      setTestProgress(prev => ({
        ...prev,
        currentTest: 'Generating test data...',
        progress: 10
      }));

      // Execute the test
      const result = await webhookTestingEngine.executeTest(
        webhookId,
        elementId,
        validatedConfig
      );

      setTestResult(result);
      setActiveTab('results');

      // Show success notification
      toast.success(
        `Test completed with ${result.successful_requests}/${result.total_requests} successful requests`,
        {
          description: `Average response time: ${Math.round(result.avg_response_time_ms)}ms`
        }
      );

    } catch (error) {
      console.error('Test execution failed:', error);
      toast.error('Test execution failed', {
        description: error instanceof Error ? error.message : 'Unknown error occurred'
      });
    } finally {
      setTestProgress(prev => ({
        ...prev,
        isRunning: false,
        progress: 100,
        currentTest: 'Test completed'
      }));
    }
  };

  const handleStopTest = async () => {
    // Implementation for stopping active tests
    setTestProgress(prev => ({
      ...prev,
      isRunning: false,
      currentTest: 'Test cancelled'
    }));
    
    toast.info('Test execution cancelled');
  };

  const getTotalTestCount = (): number => {
    switch (configuration.test_type) {
      case 'quick': return 1;
      case 'comprehensive': return 4;
      case 'performance': return configuration.duration_seconds || 30;
      case 'custom': return 1;
      default: return 1;
    }
  };

  const validateConfiguration = (config: WebhookTestConfiguration): WebhookTestConfiguration => {
    if (config.data_generation_method === 'custom' && customPayload) {
      try {
        config.custom_payload = JSON.parse(customPayload);
      } catch (error) {
        throw new Error('Invalid JSON in custom payload');
      }
    }
    
    if (config.expected_status_codes.length === 0) {
      config.expected_status_codes = [200];
    }

    return config;
  };

  // ===== RENDER METHODS =====

  const renderConfigurationTab = () => (
    <div className="space-y-6">
      {/* Test Type Selection */}
      <div className="space-y-2">
        <Label>Test Type</Label>
        <Select 
          value={configuration.test_type} 
          onValueChange={(value) => setConfiguration(prev => ({
            ...prev, 
            test_type: value as any
          }))}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="quick">
              <div className="flex items-center gap-2">
                <Zap className="h-4 w-4" />
                <div>
                  <div className="font-medium">Quick Test</div>
                  <div className="text-xs text-muted-foreground">Single request validation</div>
                </div>
              </div>
            </SelectItem>
            <SelectItem value="comprehensive">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4" />
                <div>
                  <div className="font-medium">Comprehensive Test</div>
                  <div className="text-xs text-muted-foreground">Multiple payload variations</div>
                </div>
              </div>
            </SelectItem>
            <SelectItem value="performance">
              <div className="flex items-center gap-2">
                <Activity className="h-4 w-4" />
                <div>
                  <div className="font-medium">Performance Test</div>
                  <div className="text-xs text-muted-foreground">Load testing with concurrent requests</div>
                </div>
              </div>
            </SelectItem>
            <SelectItem value="custom">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                <div>
                  <div className="font-medium">Custom Test</div>
                  <div className="text-xs text-muted-foreground">Custom configuration and payload</div>
                </div>
              </div>
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Performance Test Settings */}
      {configuration.test_type === 'performance' && (
        <div className="grid grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label>Duration (seconds)</Label>
            <Input
              type="number"
              value={configuration.duration_seconds || 30}
              onChange={(e) => setConfiguration(prev => ({
                ...prev,
                duration_seconds: parseInt(e.target.value) || 30
              }))}
              min={5}
              max={300}
            />
          </div>
          <div className="space-y-2">
            <Label>Concurrent Requests</Label>
            <Input
              type="number"
              value={configuration.concurrent_requests || 5}
              onChange={(e) => setConfiguration(prev => ({
                ...prev,
                concurrent_requests: parseInt(e.target.value) || 5
              }))}
              min={1}
              max={50}
            />
          </div>
          <div className="space-y-2">
            <Label>Ramp-up Time (seconds)</Label>
            <Input
              type="number"
              value={configuration.ramp_up_time_seconds || 5}
              onChange={(e) => setConfiguration(prev => ({
                ...prev,
                ramp_up_time_seconds: parseInt(e.target.value) || 5
              }))}
              min={0}
              max={60}
            />
          </div>
        </div>
      )}

      {/* Data Generation Method */}
      <div className="space-y-2">
        <Label>Test Data Source</Label>
        <Select 
          value={configuration.data_generation_method} 
          onValueChange={(value) => setConfiguration(prev => ({
            ...prev, 
            data_generation_method: value as any
          }))}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="auto">Auto-generated Mock Data</SelectItem>
            <SelectItem value="custom">Custom JSON Payload</SelectItem>
            <SelectItem value="template">Use Test Template</SelectItem>
            <SelectItem value="recorded">Use Recorded Data</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Custom Payload Editor */}
      {configuration.data_generation_method === 'custom' && (
        <div className="space-y-2">
          <Label>Custom JSON Payload</Label>
          <Textarea
            value={customPayload}
            onChange={(e) => setCustomPayload(e.target.value)}
            className="font-mono text-sm"
            rows={8}
            placeholder="Enter JSON payload..."
          />
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                try {
                  const formatted = JSON.stringify(JSON.parse(customPayload), null, 2);
                  setCustomPayload(formatted);
                  toast.success('JSON formatted successfully');
                } catch (error) {
                  toast.error('Invalid JSON format');
                }
              }}
            >
              Format JSON
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                navigator.clipboard.writeText(customPayload);
                toast.success('Copied to clipboard');
              }}
            >
              <Copy className="h-4 w-4 mr-1" />
              Copy
            </Button>
          </div>
        </div>
      )}

      {/* Expected Response Configuration */}
      <div className="space-y-4">
        <Label>Expected Response Validation</Label>
        
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="text-sm">Expected Status Codes</Label>
            <Input
              value={configuration.expected_status_codes.join(', ')}
              onChange={(e) => {
                const codes = e.target.value
                  .split(',')
                  .map(code => parseInt(code.trim()))
                  .filter(code => !isNaN(code));
                setConfiguration(prev => ({
                  ...prev,
                  expected_status_codes: codes
                }));
              }}
              placeholder="200, 201, 202"
            />
          </div>
          
          <div className="space-y-2">
            <Label className="text-sm">Max Response Time (ms)</Label>
            <Input
              type="number"
              value={configuration.expected_response_time_ms || ''}
              onChange={(e) => setConfiguration(prev => ({
                ...prev,
                expected_response_time_ms: e.target.value ? parseInt(e.target.value) : undefined
              }))}
              placeholder="5000"
            />
          </div>
        </div>
      </div>

      {/* Notification Settings */}
      <div className="space-y-4">
        <Label>Notification Settings</Label>
        
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label className="text-sm font-medium">Notify on completion</Label>
            <div className="text-xs text-muted-foreground">
              Send notification when test completes successfully
            </div>
          </div>
          <Switch
            checked={configuration.notify_on_completion}
            onCheckedChange={(checked) => setConfiguration(prev => ({
              ...prev,
              notify_on_completion: checked
            }))}
          />
        </div>
        
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label className="text-sm font-medium">Notify on failure</Label>
            <div className="text-xs text-muted-foreground">
              Send notification when test fails
            </div>
          </div>
          <Switch
            checked={configuration.notify_on_failure}
            onCheckedChange={(checked) => setConfiguration(prev => ({
              ...prev,
              notify_on_failure: checked
            }))}
          />
        </div>
      </div>
    </div>
  );

  const renderProgressTab = () => (
    <div className="space-y-6">
      {/* Progress Overview */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium">Test Execution Progress</h3>
          <Badge variant={testProgress.isRunning ? "default" : "secondary"}>
            {testProgress.isRunning ? "Running" : "Idle"}
          </Badge>
        </div>
        
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>{testProgress.currentTest}</span>
            <span>{testProgress.progress}%</span>
          </div>
          <Progress value={testProgress.progress} className="h-2" />
        </div>
        
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-muted-foreground">Completed:</span>{' '}
            {testProgress.completedTests} / {testProgress.totalTests}
          </div>
          <div>
            <span className="text-muted-foreground">Test Type:</span>{' '}
            {configuration.test_type}
          </div>
        </div>
      </div>

      {/* Real-time Execution Log */}
      <div className="space-y-2">
        <Label>Execution Log</Label>
        <ScrollArea className="h-64 w-full border rounded-md p-4">
          <div className="space-y-2 font-mono text-xs">
            <div className="text-muted-foreground">
              [{new Date().toISOString()}] Test initialized
            </div>
            <div className="text-muted-foreground">
              [{new Date().toISOString()}] Configuration validated
            </div>
            {testProgress.isRunning && (
              <div className="text-blue-600">
                [{new Date().toISOString()}] {testProgress.currentTest}
              </div>
            )}
          </div>
        </ScrollArea>
      </div>
    </div>
  );

  const renderResultsTab = () => {
    if (!testResult) {
      return (
        <div className="text-center py-8 text-muted-foreground">
          No test results available. Run a test to see results here.
        </div>
      );
    }

    return (
      <div className="space-y-6">
        {/* Results Summary */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Activity className="h-4 w-4 text-blue-500" />
                <div>
                  <div className="text-2xl font-bold">{testResult.total_requests}</div>
                  <div className="text-xs text-muted-foreground">Total Requests</div>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <div>
                  <div className="text-2xl font-bold">{testResult.successful_requests}</div>
                  <div className="text-xs text-muted-foreground">Successful</div>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <XCircle className="h-4 w-4 text-red-500" />
                <div>
                  <div className="text-2xl font-bold">{testResult.failed_requests}</div>
                  <div className="text-xs text-muted-foreground">Failed</div>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-orange-500" />
                <div>
                  <div className="text-2xl font-bold">{Math.round(testResult.avg_response_time_ms)}</div>
                  <div className="text-xs text-muted-foreground">Avg Response (ms)</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Validation Results */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {testResult.validation_passed ? (
                <CheckCircle className="h-5 w-5 text-green-500" />
              ) : (
                <XCircle className="h-5 w-5 text-red-500" />
              )}
              Validation Results
            </CardTitle>
          </CardHeader>
          <CardContent>
            {testResult.validation_passed ? (
              <div className="text-green-600">All validation rules passed successfully.</div>
            ) : (
              <div className="space-y-2">
                {testResult.validation_errors.map((error, index) => (
                  <Alert key={index} variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>{error.message}</AlertDescription>
                  </Alert>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Error Summary */}
        {testResult.errors.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <XCircle className="h-5 w-5 text-red-500" />
                Error Summary
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {testResult.errors.map((error, index) => (
                  <div key={index} className="border rounded-md p-3">
                    <div className="flex items-center justify-between">
                      <div className="font-medium">{error.error_message}</div>
                      <Badge variant="destructive">{error.occurrences} occurrences</Badge>
                    </div>
                    {error.error_code && (
                      <div className="text-sm text-muted-foreground">Code: {error.error_code}</div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Export Options */}
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => {
              const dataStr = JSON.stringify(testResult, null, 2);
              const dataBlob = new Blob([dataStr], { type: 'application/json' });
              const url = URL.createObjectURL(dataBlob);
              const link = document.createElement('a');
              link.href = url;
              link.download = `webhook-test-${testResult.test_id}.json`;
              link.click();
              URL.revokeObjectURL(url);
            }}
          >
            <Download className="h-4 w-4 mr-2" />
            Export Results
          </Button>
          
          <Button
            variant="outline"
            onClick={() => {
              navigator.clipboard.writeText(JSON.stringify(testResult, null, 2));
              toast.success('Results copied to clipboard');
            }}
          >
            <Copy className="h-4 w-4 mr-2" />
            Copy Results
          </Button>
        </div>
      </div>
    );
  };

  return (
    <Card className="w-full max-w-4xl">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5" />
              Webhook Testing - {webhookName}
            </CardTitle>
            <CardDescription>
              Test webhook performance, reliability, and response validation
            </CardDescription>
          </div>
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      </CardHeader>
      
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="configure">Configure</TabsTrigger>
            <TabsTrigger value="progress">Progress</TabsTrigger>
            <TabsTrigger value="results">Results</TabsTrigger>
          </TabsList>
          
          <TabsContent value="configure" className="mt-6">
            {renderConfigurationTab()}
          </TabsContent>
          
          <TabsContent value="progress" className="mt-6">
            {renderProgressTab()}
          </TabsContent>
          
          <TabsContent value="results" className="mt-6">
            {renderResultsTab()}
          </TabsContent>
        </Tabs>
        
        {/* Action Buttons */}
        <div className="flex justify-end gap-2 mt-6 pt-6 border-t">
          {testProgress.isRunning ? (
            <Button variant="destructive" onClick={handleStopTest}>
              <Square className="h-4 w-4 mr-2" />
              Stop Test
            </Button>
          ) : (
            <>
              <Button variant="outline" onClick={() => setActiveTab('configure')}>
                <RotateCcw className="h-4 w-4 mr-2" />
                Reset Configuration
              </Button>
              <Button onClick={handleStartTest}>
                <Play className="h-4 w-4 mr-2" />
                Start Test
              </Button>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
};