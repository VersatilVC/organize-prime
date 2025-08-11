import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { RefreshCw, TestTube, Activity, AlertTriangle } from 'lucide-react';
import { N8NWebhookService } from '@/services/N8NWebhookService';
import { useWebhookTest } from '@/hooks/useWebhookCall';
import { toast } from 'sonner';

interface WebhookMonitorProps {
  featureSlug: string;
}

export const WebhookMonitor: React.FC<WebhookMonitorProps> = ({ featureSlug }) => {
  const { testWebhook, isTesting } = useWebhookTest();

  // Get webhook health status
  const { data: webhookHealth, refetch, isLoading } = useQuery({
    queryKey: ['webhook-health', featureSlug],
    queryFn: () => N8NWebhookService.getWebhookHealth(featureSlug),
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  const handleTestWebhook = async (webhookId: string) => {
    try {
      await testWebhook(webhookId);
      refetch(); // Refresh health status after test
    } catch (error) {
      // Error handling is done in the hook
    }
  };

  const getHealthColor = (successRate: number) => {
    if (successRate >= 90) return 'bg-green-500';
    if (successRate >= 70) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const getHealthStatus = (successRate: number) => {
    if (successRate >= 90) return 'Healthy';
    if (successRate >= 70) return 'Warning';
    return 'Critical';
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-base font-medium">
          <Activity className="w-4 h-4 inline mr-2" />
          Webhook Monitor
        </CardTitle>
        <Button
          variant="outline"
          size="sm"
          onClick={() => refetch()}
          disabled={isLoading}
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
          <div className="text-center py-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="text-sm text-muted-foreground mt-2">Loading webhook status...</p>
          </div>
        ) : webhookHealth ? (
          <>
            {/* Health Overview */}
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">{webhookHealth.active}</div>
                <div className="text-xs text-muted-foreground">Active Webhooks</div>
              </div>
              <div className="text-center">
                <div className="flex items-center justify-center gap-2">
                  <div 
                    className={`w-3 h-3 rounded-full ${getHealthColor(webhookHealth.successRate)}`}
                  />
                  <span className="text-sm font-medium">
                    {getHealthStatus(webhookHealth.successRate)}
                  </span>
                </div>
                <div className="text-xs text-muted-foreground">
                  {webhookHealth.successRate.toFixed(1)}% Success Rate
                </div>
              </div>
            </div>

            {/* Status Details */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Total Configured:</span>
                <Badge variant="secondary">{webhookHealth.total}</Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Last Tested:</span>
                <span className="text-sm">
                  {webhookHealth.lastTested 
                    ? new Date(webhookHealth.lastTested).toLocaleString()
                    : 'Never'
                  }
                </span>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                className="flex-1"
                onClick={() => {
                  // This would open a detailed webhook configuration modal
                  toast.info('Webhook configuration panel would open here');
                }}
              >
                <TestTube className="w-4 h-4 mr-2" />
                Configure
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="flex-1"
                onClick={() => {
                  // This would show webhook logs
                  toast.info('Webhook logs panel would open here');
                }}
              >
                <Activity className="w-4 h-4 mr-2" />
                View Logs
              </Button>
            </div>

            {/* Health Warnings */}
            {webhookHealth.successRate < 90 && (
              <div className="flex items-start gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <AlertTriangle className="w-4 h-4 text-yellow-600 mt-0.5" />
                <div className="text-sm">
                  <div className="font-medium text-yellow-800">Webhook Health Warning</div>
                  <div className="text-yellow-700">
                    Some webhooks are failing. Check configuration and test connections.
                  </div>
                </div>
              </div>
            )}

            {webhookHealth.active === 0 && (
              <div className="flex items-start gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <Activity className="w-4 h-4 text-blue-600 mt-0.5" />
                <div className="text-sm">
                  <div className="font-medium text-blue-800">No Active Webhooks</div>
                  <div className="text-blue-700">
                    Configure webhooks to enable automation for this feature.
                  </div>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-4">
            <AlertTriangle className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">Failed to load webhook status</p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              className="mt-2"
            >
              Retry
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};