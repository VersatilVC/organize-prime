import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  useWebhookReliability, 
  useWebhookActions, 
  useWebhookDeliveryLogs,
  type WebhookConnectionHealth,
  type WebhookDeliveryStats 
} from '@/hooks/database/useWebhookReliability';
import { 
  AlertTriangle, 
  CheckCircle, 
  XCircle, 
  RefreshCw, 
  Activity,
  TrendingUp,
  Clock,
  Zap
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface WebhookReliabilityMonitorProps {
  className?: string;
  organizationId?: string;
}

export const WebhookReliabilityMonitor = React.memo<WebhookReliabilityMonitorProps>(({ 
  className, 
  organizationId 
}) => {
  const { data: healthData, isLoading, error, refetch } = useWebhookReliability();
  const { data: deliveryLogs, isLoading: isLoadingLogs } = useWebhookDeliveryLogs(organizationId);
  const { retryFailed, isRetrying } = useWebhookActions();

  if (error) {
    return (
      <Alert variant=\"destructive\" className={className}>
        <AlertTriangle className=\"h-4 w-4\" />
        <AlertDescription>
          Failed to load webhook reliability data: {error.message}
        </AlertDescription>
      </Alert>
    );
  }

  if (isLoading) {
    return (
      <div className={`space-y-4 ${className}`}>
        <Skeleton className=\"h-32 w-full\" />
        <Skeleton className=\"h-48 w-full\" />
        <Skeleton className=\"h-64 w-full\" />
      </div>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'bg-green-500';
      case 'degraded': return 'bg-yellow-500';
      case 'down': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy': return <CheckCircle className=\"h-4 w-4 text-green-600\" />;
      case 'degraded': return <AlertTriangle className=\"h-4 w-4 text-yellow-600\" />;
      case 'down': return <XCircle className=\"h-4 w-4 text-red-600\" />;
      default: return <Activity className=\"h-4 w-4 text-gray-600\" />;
    }
  };

  const getDeliveryStatusBadge = (status: string) => {
    const variants = {
      'delivered': { variant: 'default' as const, className: 'bg-green-100 text-green-800' },
      'pending': { variant: 'secondary' as const, className: 'bg-blue-100 text-blue-800' },
      'retrying': { variant: 'secondary' as const, className: 'bg-yellow-100 text-yellow-800' },
      'failed': { variant: 'destructive' as const, className: 'bg-red-100 text-red-800' }
    };

    const config = variants[status as keyof typeof variants] || variants.pending;\n    \n    return (\n      <Badge variant={config.variant} className={config.className}>\n        {status}\n      </Badge>\n    );\n  };\n\n  return (\n    <div className={`space-y-6 ${className}`}>\n      {/* Header */}\n      <div className=\"flex items-center justify-between\">\n        <div>\n          <h2 className=\"text-2xl font-bold\">Webhook Reliability Monitor</h2>\n          <p className=\"text-muted-foreground\">Monitor webhook health and delivery status</p>\n        </div>\n        <div className=\"flex gap-2\">\n          <Button \n            variant=\"outline\" \n            onClick={() => refetch()}\n            disabled={isLoading}\n          >\n            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />\n            Refresh\n          </Button>\n          <Button \n            onClick={() => retryFailed()}\n            disabled={isRetrying}\n            className=\"bg-blue-600 hover:bg-blue-700\"\n          >\n            <Zap className={`h-4 w-4 mr-2 ${isRetrying ? 'animate-pulse' : ''}`} />\n            {isRetrying ? 'Retrying...' : 'Retry Failed'}\n          </Button>\n        </div>\n      </div>\n\n      {/* Overview Cards */}\n      <div className=\"grid grid-cols-1 md:grid-cols-3 gap-4\">\n        <Card>\n          <CardHeader className=\"flex flex-row items-center justify-between space-y-0 pb-2\">\n            <CardTitle className=\"text-sm font-medium\">Pending Deliveries</CardTitle>\n            <Clock className=\"h-4 w-4 text-muted-foreground\" />\n          </CardHeader>\n          <CardContent>\n            <div className=\"text-2xl font-bold\">{healthData?.pendingDeliveries || 0}</div>\n            <p className=\"text-xs text-muted-foreground\">\n              Webhooks waiting to be delivered\n            </p>\n          </CardContent>\n        </Card>\n\n        <Card>\n          <CardHeader className=\"flex flex-row items-center justify-between space-y-0 pb-2\">\n            <CardTitle className=\"text-sm font-medium\">Connection Health</CardTitle>\n            <Activity className=\"h-4 w-4 text-muted-foreground\" />\n          </CardHeader>\n          <CardContent>\n            <div className=\"text-2xl font-bold\">\n              {healthData?.connectionHealth?.filter(h => h.connection_status === 'healthy').length || 0}\n              <span className=\"text-sm font-normal text-muted-foreground\">/{healthData?.connectionHealth?.length || 0}</span>\n            </div>\n            <p className=\"text-xs text-muted-foreground\">\n              Healthy connections\n            </p>\n          </CardContent>\n        </Card>\n\n        <Card>\n          <CardHeader className=\"flex flex-row items-center justify-between space-y-0 pb-2\">\n            <CardTitle className=\"text-sm font-medium\">Success Rate</CardTitle>\n            <TrendingUp className=\"h-4 w-4 text-muted-foreground\" />\n          </CardHeader>\n          <CardContent>\n            <div className=\"text-2xl font-bold\">\n              {healthData?.deliveryStats?.[0]?.success_rate || 0}%\n            </div>\n            <p className=\"text-xs text-muted-foreground\">\n              Last 24 hours\n            </p>\n          </CardContent>\n        </Card>\n      </div>\n\n      {/* Connection Health */}\n      <Card>\n        <CardHeader>\n          <CardTitle>Connection Health Status</CardTitle>\n          <CardDescription>\n            Real-time status of webhook connections\n          </CardDescription>\n        </CardHeader>\n        <CardContent>\n          {healthData?.connectionHealth && healthData.connectionHealth.length > 0 ? (\n            <div className=\"space-y-4\">\n              {healthData.connectionHealth.map((connection, index) => (\n                <div \n                  key={`${connection.organization_id}-${connection.trigger_name}`}\n                  className=\"flex items-center justify-between p-4 border rounded-lg\"\n                >\n                  <div className=\"flex items-center gap-3\">\n                    {getStatusIcon(connection.connection_status)}\n                    <div>\n                      <div className=\"font-medium\">\n                        {connection.organizations?.name || 'Unknown Organization'}\n                      </div>\n                      <div className=\"text-sm text-muted-foreground\">\n                        {connection.trigger_name.replace('n8n_trigger_', '').slice(0, 8)}...\n                      </div>\n                    </div>\n                  </div>\n                  \n                  <div className=\"flex items-center gap-4\">\n                    <div className=\"text-right text-sm\">\n                      <div className=\"font-medium\">\n                        {connection.consecutive_failures} failures\n                      </div>\n                      <div className=\"text-muted-foreground\">\n                        {connection.last_successful_delivery \n                          ? `Last success: ${formatDistanceToNow(new Date(connection.last_successful_delivery), { addSuffix: true })}`\n                          : 'No successful delivery'\n                        }\n                      </div>\n                    </div>\n                    <Badge \n                      variant={connection.connection_status === 'healthy' ? 'default' : 'destructive'}\n                      className={`${getStatusColor(connection.connection_status)} text-white`}\n                    >\n                      {connection.connection_status}\n                    </Badge>\n                  </div>\n                </div>\n              ))}\n            </div>\n          ) : (\n            <div className=\"text-center py-8 text-muted-foreground\">\n              No webhook connections found\n            </div>\n          )}\n        </CardContent>\n      </Card>\n\n      {/* Delivery Statistics */}\n      {healthData?.deliveryStats && healthData.deliveryStats.length > 0 && (\n        <Card>\n          <CardHeader>\n            <CardTitle>Delivery Statistics (24h)</CardTitle>\n            <CardDescription>\n              Webhook delivery performance by organization\n            </CardDescription>\n          </CardHeader>\n          <CardContent>\n            <div className=\"space-y-4\">\n              {healthData.deliveryStats.map((stats) => (\n                <div \n                  key={stats.organization_id}\n                  className=\"flex items-center justify-between p-4 border rounded-lg\"\n                >\n                  <div>\n                    <div className=\"font-medium\">{stats.organization_name}</div>\n                    <div className=\"text-sm text-muted-foreground\">\n                      {stats.total_deliveries} total deliveries\n                    </div>\n                  </div>\n                  \n                  <div className=\"flex items-center gap-6\">\n                    <div className=\"text-center\">\n                      <div className=\"text-2xl font-bold text-green-600\">\n                        {stats.successful_deliveries}\n                      </div>\n                      <div className=\"text-xs text-muted-foreground\">Success</div>\n                    </div>\n                    \n                    <div className=\"text-center\">\n                      <div className=\"text-2xl font-bold text-red-600\">\n                        {stats.failed_deliveries}\n                      </div>\n                      <div className=\"text-xs text-muted-foreground\">Failed</div>\n                    </div>\n                    \n                    <div className=\"text-center\">\n                      <div className=\"text-2xl font-bold text-blue-600\">\n                        {stats.success_rate}%\n                      </div>\n                      <div className=\"text-xs text-muted-foreground\">Rate</div>\n                    </div>\n                    \n                    <div className=\"text-center\">\n                      <div className=\"text-2xl font-bold text-yellow-600\">\n                        {stats.avg_retry_count}\n                      </div>\n                      <div className=\"text-xs text-muted-foreground\">Avg Retries</div>\n                    </div>\n                  </div>\n                </div>\n              ))}\n            </div>\n          </CardContent>\n        </Card>\n      )}\n\n      {/* Recent Delivery Logs */}\n      <Card>\n        <CardHeader>\n          <CardTitle>Recent Delivery Logs</CardTitle>\n          <CardDescription>\n            Latest webhook delivery attempts and their status\n          </CardDescription>\n        </CardHeader>\n        <CardContent>\n          {isLoadingLogs ? (\n            <div className=\"space-y-2\">\n              {[...Array(5)].map((_, i) => (\n                <Skeleton key={i} className=\"h-16 w-full\" />\n              ))}\n            </div>\n          ) : deliveryLogs && deliveryLogs.length > 0 ? (\n            <div className=\"space-y-2\">\n              {deliveryLogs.slice(0, 20).map((log) => (\n                <div \n                  key={log.id}\n                  className=\"flex items-center justify-between p-3 border rounded hover:bg-muted/50\"\n                >\n                  <div className=\"flex items-center gap-3\">\n                    <div>\n                      <div className=\"font-medium text-sm\">\n                        {log.table_name} - {log.trigger_name.replace('n8n_trigger_', '').slice(0, 8)}...\n                      </div>\n                      <div className=\"text-xs text-muted-foreground\">\n                        {formatDistanceToNow(new Date(log.created_at), { addSuffix: true })}\n                        {log.error_message && (\n                          <span className=\"ml-2 text-red-600\">• {log.error_message}</span>\n                        )}\n                      </div>\n                    </div>\n                  </div>\n                  \n                  <div className=\"flex items-center gap-2\">\n                    {log.retry_count > 0 && (\n                      <Badge variant=\"outline\" className=\"text-xs\">\n                        {log.retry_count}/{log.max_retries} retries\n                      </Badge>\n                    )}\n                    {getDeliveryStatusBadge(log.delivery_status)}\n                  </div>\n                </div>\n              ))}\n            </div>\n          ) : (\n            <div className=\"text-center py-8 text-muted-foreground\">\n              No delivery logs found\n            </div>\n          )}\n        </CardContent>\n      </Card>\n    </div>\n  );\n});\n\nWebhookReliabilityMonitor.displayName = 'WebhookReliabilityMonitor';"