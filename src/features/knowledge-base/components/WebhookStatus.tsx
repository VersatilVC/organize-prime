import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { 
  Badge, 
  BadgeProps 
} from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Alert, 
  AlertDescription 
} from '@/components/ui/alert';
import { 
  Activity, 
  CheckCircle, 
  XCircle, 
  Clock, 
  Zap,
  RefreshCw,
  AlertTriangle,
  TrendingUp
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { KBFileProcessingService } from '../services/KBFileProcessingService';

interface WebhookStatusProps {
  className?: string;
}

export function WebhookStatus({ className }: WebhookStatusProps) {
  const [isTesting, setIsTesting] = useState(false);
  const [lastTestResult, setLastTestResult] = useState<{ success: boolean; timestamp: Date } | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Get webhook health status
  const { data: health, isLoading, error, refetch } = useQuery({
    queryKey: ['webhook-health'],
    queryFn: () => KBFileProcessingService.getWebhookHealth(),
    refetchInterval: 30000, // Refresh every 30 seconds
    staleTime: 10000, // Consider fresh for 10 seconds
  });

  // Test webhook mutation
  const testMutation = useMutation({
    mutationFn: () => KBFileProcessingService.testWebhookConnection(),
    onMutate: () => setIsTesting(true),
    onSettled: () => setIsTesting(false),
    onSuccess: (result) => {
      setLastTestResult({ success: result.success, timestamp: new Date() });
      
      if (result.success) {
        toast({
          title: '✅ Webhook Test Successful!',
          description: `N8N webhook responded in ${result.responseTime}ms with status ${result.statusCode || 200}. Your integration is working correctly.`,
          duration: 5000,
        });
      } else {
        toast({
          title: '❌ Webhook Test Failed',
          description: `${result.error}. Please check your N8N webhook URL and configuration.`,
          variant: 'destructive',
          duration: 7000,
        });
      }
      // Refresh health status
      queryClient.invalidateQueries({ queryKey: ['webhook-health'] });
    },
    onError: (error) => {
      setLastTestResult({ success: false, timestamp: new Date() });
      
      toast({
        title: '❌ Webhook Test Failed',
        description: `Unable to test webhook: ${error instanceof Error ? error.message : 'Unknown error'}. Please check your webhook configuration.`,
        variant: 'destructive',
        duration: 7000,
      });
    },
  });

  const getHealthBadge = (): { variant: BadgeProps['variant']; label: string; icon: React.ElementType } => {
    if (isLoading) {
      return { variant: 'secondary', label: 'Checking...', icon: Clock };
    }
    
    if (error || !health) {
      return { variant: 'destructive', label: 'Error', icon: XCircle };
    }
    
    if (health.isHealthy) {
      return { variant: 'default', label: 'Healthy', icon: CheckCircle };
    }
    
    if (health.successRate < 50) {
      return { variant: 'destructive', label: 'Unhealthy', icon: XCircle };
    }
    
    return { variant: 'secondary', label: 'Warning', icon: AlertTriangle };
  };

  const healthBadge = getHealthBadge();
  const HealthIcon = healthBadge.icon;

  const formatDate = (date?: Date) => {
    if (!date) return 'Never';
    return new Intl.DateTimeFormat('en-US', {
      dateStyle: 'short',
      timeStyle: 'short'
    }).format(date);
  };

  if (error) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Webhook Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Failed to load webhook status. Please check your connection.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            N8N Webhook Status
          </CardTitle>
          
          <div className="flex items-center gap-2">
            <Badge variant={healthBadge.variant} className="flex items-center gap-1">
              <HealthIcon className="h-3 w-3" />
              {healthBadge.label}
            </Badge>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => testMutation.mutate()}
              disabled={isTesting || testMutation.isPending}
            >
              {isTesting ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Testing...
                </>
              ) : (
                <>
                  <Zap className="h-4 w-4 mr-2" />
                  Test Connection
                </>
              )}
            </Button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="text-center">
              <Clock className="h-8 w-8 animate-pulse mx-auto mb-2 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Loading webhook status...</p>
            </div>
          </div>
        ) : health ? (
          <div className="space-y-6">
            {/* Status Overview */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold">{health.totalCalls}</div>
                <div className="text-xs text-muted-foreground">Total Calls</div>
              </div>
              
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {health.successRate.toFixed(1)}%
                </div>
                <div className="text-xs text-muted-foreground">Success Rate</div>
              </div>
              
              <div className="text-center">
                <div className="text-2xl font-bold">
                  {health.avgResponseTime.toFixed(0)}ms
                </div>
                <div className="text-xs text-muted-foreground">Avg Response</div>
              </div>
              
              <div className="text-center">
                <div className="text-sm font-medium">
                  {formatDate(health.lastSuccessful)}
                </div>
                <div className="text-xs text-muted-foreground">Last Success</div>
              </div>
            </div>

            {/* Health Messages */}
            {!health.isHealthy && health.lastError && (
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>{health.lastError}</AlertDescription>
              </Alert>
            )}

            {health.isHealthy && health.successRate === 100 && health.totalCalls > 0 && (
              <Alert>
                <CheckCircle className="h-4 w-4" />
                <AlertDescription>
                  Webhook is performing perfectly with 100% success rate!
                </AlertDescription>
              </Alert>
            )}

            {health.totalCalls === 0 && (
              <Alert>
                <Activity className="h-4 w-4" />
                <AlertDescription>
                  No webhook calls have been made yet. Upload a file to test the integration.
                </AlertDescription>
              </Alert>
            )}

            {/* Last Test Result */}
            {lastTestResult && (
              <Alert className={lastTestResult.success ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}>
                {lastTestResult.success ? (
                  <>
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <AlertDescription className="text-green-800">
                      ✅ Last webhook test was successful at {formatDate(lastTestResult.timestamp)}
                    </AlertDescription>
                  </>
                ) : (
                  <>
                    <XCircle className="h-4 w-4 text-red-600" />
                    <AlertDescription className="text-red-800">
                      ❌ Last webhook test failed at {formatDate(lastTestResult.timestamp)}
                    </AlertDescription>
                  </>
                )}
              </Alert>
            )}

            {/* Performance Indicators */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div className="flex items-center gap-2">
                <TrendingUp className={`h-4 w-4 ${
                  health.successRate >= 95 ? 'text-green-500' :
                  health.successRate >= 80 ? 'text-yellow-500' : 'text-red-500'
                }`} />
                <span>
                  Reliability: {
                    health.successRate >= 95 ? 'Excellent' :
                    health.successRate >= 80 ? 'Good' :
                    health.successRate >= 50 ? 'Fair' : 'Poor'
                  }
                </span>
              </div>
              
              <div className="flex items-center gap-2">
                <Clock className={`h-4 w-4 ${
                  health.avgResponseTime <= 1000 ? 'text-green-500' :
                  health.avgResponseTime <= 5000 ? 'text-yellow-500' : 'text-red-500'
                }`} />
                <span>
                  Speed: {
                    health.avgResponseTime <= 1000 ? 'Fast' :
                    health.avgResponseTime <= 5000 ? 'Moderate' : 'Slow'
                  }
                </span>
              </div>
              
              <div className="flex items-center gap-2">
                <Activity className={`h-4 w-4 ${
                  health.isHealthy ? 'text-green-500' : 'text-red-500'
                }`} />
                <span>
                  Status: {health.isHealthy ? 'Operational' : 'Issues Detected'}
                </span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between pt-4 border-t">
              <Button
                variant="outline"
                size="sm"
                onClick={() => refetch()}
                disabled={isLoading}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                Refresh Status
              </Button>
              
              <div className="text-xs text-muted-foreground">
                Auto-refreshes every 30 seconds
              </div>
            </div>
          </div>
        ) : (
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Unable to determine webhook status. Please check the configuration.
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}