import React, { useState } from 'react';
import {
  Settings,
  Webhook,
  TestTube,
  CheckCircle,
  AlertCircle,
  Clock,
  RefreshCw,
  Save,
  Eye,
  EyeOff
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { ChatWebhookService } from '../services/ChatWebhookService';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { cn } from '@/lib/utils';

interface ChatWebhookConfigProps {
  className?: string;
}

export function ChatWebhookConfig({ className }: ChatWebhookConfigProps) {
  const [isUrlVisible, setIsUrlVisible] = useState(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    responseTime?: number;
    error?: string;
  } | null>(null);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch webhook configuration
  const { data: config, isLoading } = useQuery({
    queryKey: ['webhook-config', 'kb-chat-processing'],
    queryFn: () => ChatWebhookService.getWebhookConfig(),
    staleTime: 30 * 1000, // 30 seconds
  });

  // Test webhook mutation
  const testWebhookMutation = useMutation({
    mutationFn: () => ChatWebhookService.testWebhookConnection(),
    onSuccess: (result) => {
      setTestResult(result);
      if (result.success) {
        toast({
          title: 'Webhook Test Successful',
          description: `Connection established in ${result.responseTime}ms`,
        });
      } else {
        toast({
          title: 'Webhook Test Failed',
          description: result.error,
          variant: 'destructive',
        });
      }
    },
    onError: (error) => {
      const errorResult = {
        success: false,
        error: error instanceof Error ? error.message : 'Test failed'
      };
      setTestResult(errorResult);
      toast({
        title: 'Test Error',
        description: errorResult.error,
        variant: 'destructive',
      });
    },
  });

  // Update webhook configuration mutation
  const updateConfigMutation = useMutation({
    mutationFn: (updates: Partial<any>) => ChatWebhookService.updateWebhookConfig(updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['webhook-config'] });
      toast({
        title: 'Configuration Updated',
        description: 'Webhook settings have been saved successfully.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Update Failed',
        description: error instanceof Error ? error.message : 'Failed to update configuration',
        variant: 'destructive',
      });
    },
  });

  const handleTestWebhook = () => {
    setTestResult(null);
    testWebhookMutation.mutate();
  };

  const handleToggleActive = (isActive: boolean) => {
    updateConfigMutation.mutate({ is_active: isActive });
  };

  const getStatusBadge = () => {
    if (!config) return null;

    if (!config.is_active) {
      return <Badge variant="secondary">Disabled</Badge>;
    }

    if (testResult) {
      return testResult.success ? 
        <Badge variant="default" className="bg-green-500">Active</Badge> :
        <Badge variant="destructive">Error</Badge>;
    }

    return <Badge variant="outline">Unknown</Badge>;
  };

  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Webhook className="h-5 w-5" />
            Chat Webhook Configuration
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="h-6 w-6 animate-spin" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!config) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Webhook className="h-5 w-5" />
            Chat Webhook Configuration
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              No webhook configuration found. Please set up your N8N webhook first.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Webhook className="h-5 w-5" />
            Chat Webhook Configuration
          </div>
          {getStatusBadge()}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Webhook Status */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-base font-medium">Webhook Status</Label>
              <p className="text-sm text-muted-foreground">
                Enable or disable webhook processing for chat messages
              </p>
            </div>
            <Switch
              checked={config.is_active}
              onCheckedChange={handleToggleActive}
              disabled={updateConfigMutation.isPending}
            />
          </div>

          {/* Test Result */}
          {testResult && (
            <Alert className={cn(
              testResult.success ? 'border-green-500 bg-green-50' : 'border-red-500 bg-red-50'
            )}>
              {testResult.success ? (
                <CheckCircle className="h-4 w-4 text-green-600" />
              ) : (
                <AlertCircle className="h-4 w-4 text-red-600" />
              )}
              <AlertDescription className={cn(
                testResult.success ? 'text-green-800' : 'text-red-800'
              )}>
                {testResult.success 
                  ? `Webhook is working! Response time: ${testResult.responseTime}ms`
                  : `Test failed: ${testResult.error}`
                }
              </AlertDescription>
            </Alert>
          )}
        </div>

        <Separator />

        {/* Webhook Details */}
        <div className="space-y-4">
          <div>
            <Label className="text-base font-medium">Webhook URL</Label>
            <div className="flex gap-2 mt-2">
              <div className="flex-1 relative">
                <Input
                  type={isUrlVisible ? 'text' : 'password'}
                  value={config.endpoint_url || 'Not configured'}
                  readOnly
                  className="pr-10"
                />
                <Button
                  variant="ghost"
                  size="sm"
                  className="absolute right-1 top-1 h-8 w-8 p-0"
                  onClick={() => setIsUrlVisible(!isUrlVisible)}
                >
                  {isUrlVisible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-sm font-medium">Timeout</Label>
              <Input
                value={`${config.timeout_seconds || 60} seconds`}
                readOnly
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-sm font-medium">Retry Attempts</Label>
              <Input
                value={config.retry_attempts || 3}
                readOnly
                className="mt-1"
              />
            </div>
          </div>
        </div>

        <Separator />

        {/* Test Connection */}
        <div className="space-y-4">
          <div>
            <Label className="text-base font-medium">Connection Test</Label>
            <p className="text-sm text-muted-foreground">
              Test the webhook connection to ensure it's working properly
            </p>
          </div>

          <Button
            onClick={handleTestWebhook}
            disabled={testWebhookMutation.isPending || !config.is_active}
            className="w-full"
          >
            {testWebhookMutation.isPending ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Testing Connection...
              </>
            ) : (
              <>
                <TestTube className="h-4 w-4 mr-2" />
                Test Webhook Connection
              </>
            )}
          </Button>
        </div>

        {/* Additional Information */}
        <Separator />
        
        <div className="space-y-2">
          <Label className="text-base font-medium">Integration Guide</Label>
          <div className="text-sm text-muted-foreground space-y-2">
            <p>Your N8N workflow should:</p>
            <ul className="list-disc list-inside space-y-1 ml-4">
              <li>Accept POST requests with chat message data</li>
              <li>Process the message using your AI model</li>
              <li>Search your knowledge base for relevant context</li>
              <li>Return response via the webhook-chat-response endpoint</li>
            </ul>
            <p className="mt-3">
              <strong>Response endpoint:</strong> 
              <code className="ml-1 px-1 py-0.5 bg-muted rounded text-xs">
                {window.location.origin}/functions/v1/webhook-chat-response
              </code>
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Hook for webhook configuration management
export function useWebhookConfig() {
  const queryClient = useQueryClient();

  const configQuery = useQuery({
    queryKey: ['webhook-config', 'kb-chat-processing'],
    queryFn: () => ChatWebhookService.getWebhookConfig(),
  });

  const testWebhook = useMutation({
    mutationFn: () => ChatWebhookService.testWebhookConnection(),
  });

  const updateConfig = useMutation({
    mutationFn: (updates: any) => ChatWebhookService.updateWebhookConfig(updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['webhook-config'] });
    },
  });

  return {
    config: configQuery.data,
    isLoading: configQuery.isLoading,
    error: configQuery.error,
    testWebhook: testWebhook.mutateAsync,
    updateConfig: updateConfig.mutateAsync,
    isTestingWebhook: testWebhook.isPending,
    isUpdatingConfig: updateConfig.isPending,
  };
}