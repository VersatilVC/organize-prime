/**
 * Webhook Live Monitor Component
 * Real-time monitoring of webhook executions and status
 */

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { 
  Activity, 
  Play, 
  Pause, 
  RefreshCw, 
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle 
} from 'lucide-react';

export function WebhookLiveMonitor() {
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);

  // Mock real-time execution data
  const recentExecutions = [
    {
      id: '1',
      webhookId: 'wh-123',
      feature: 'knowledge-base',
      element: 'search-button',
      status: 'success',
      responseTime: 245,
      timestamp: new Date(Date.now() - 2000),
    },
    {
      id: '2',
      webhookId: 'wh-456',
      feature: 'user-management',
      element: 'invite-button',
      status: 'success',
      responseTime: 189,
      timestamp: new Date(Date.now() - 15000),
    },
    {
      id: '3',
      webhookId: 'wh-789',
      feature: 'feedback',
      element: 'submit-form',
      status: 'error',
      responseTime: 5000,
      timestamp: new Date(Date.now() - 32000),
      error: 'Connection timeout',
    },
    {
      id: '4',
      webhookId: 'wh-321',
      feature: 'notifications',
      element: 'mark-read',
      status: 'success',
      responseTime: 123,
      timestamp: new Date(Date.now() - 45000),
    },
  ];

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'error':
        return <XCircle className="h-4 w-4 text-red-600" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-yellow-600" />;
      default:
        return <Clock className="h-4 w-4 text-gray-600" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'success':
        return <Badge className="bg-green-100 text-green-800">Success</Badge>;
      case 'error':
        return <Badge variant="destructive">Error</Badge>;
      case 'warning':
        return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">Warning</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  const formatTimestamp = (timestamp: Date) => {
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - timestamp.getTime()) / 1000);
    
    if (diffInSeconds < 60) {
      return `${diffInSeconds}s ago`;
    } else if (diffInSeconds < 3600) {
      return `${Math.floor(diffInSeconds / 60)}m ago`;
    } else {
      return timestamp.toLocaleTimeString();
    }
  };

  return (
    <div className="space-y-6">
      {/* Monitor Controls */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Live Webhook Monitor
              </CardTitle>
              <CardDescription>
                Real-time monitoring of webhook executions across all features
              </CardDescription>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center space-x-2">
                <Switch
                  id="auto-refresh"
                  checked={autoRefresh}
                  onCheckedChange={setAutoRefresh}
                />
                <Label htmlFor="auto-refresh" className="text-sm">
                  Auto-refresh
                </Label>
              </div>
              <Button
                variant={isMonitoring ? "destructive" : "default"}
                size="sm"
                onClick={() => setIsMonitoring(!isMonitoring)}
                className="flex items-center gap-2"
              >
                {isMonitoring ? (
                  <>
                    <Pause className="h-4 w-4" />
                    Stop Monitoring
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4" />
                    Start Monitoring
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Current Status */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Webhooks</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">24</div>
            <p className="text-xs text-muted-foreground">
              Currently enabled and monitoring
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Executions (Last Hour)</CardTitle>
            <RefreshCw className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">157</div>
            <p className="text-xs text-muted-foreground">
              <span className="text-green-600">142 successful</span>, <span className="text-red-600">15 failed</span>
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Response Time</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">278ms</div>
            <p className="text-xs text-muted-foreground">
              Last 100 executions
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Live Execution Feed */}
      <Card>
        <CardHeader>
          <CardTitle>Live Execution Feed</CardTitle>
          <CardDescription>
            Recent webhook executions in real-time
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!isMonitoring ? (
            <div className="text-center py-8 text-muted-foreground">
              <Activity className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Click "Start Monitoring" to view live webhook executions</p>
            </div>
          ) : (
            <div className="space-y-3">
              {recentExecutions.map((execution) => (
                <div
                  key={execution.id}
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    {getStatusIcon(execution.status)}
                    <div>
                      <p className="font-medium">
                        {execution.feature} → #{execution.element}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Webhook ID: {execution.webhookId}
                        {execution.error && (
                          <span className="text-red-600 ml-2">• {execution.error}</span>
                        )}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-sm font-medium">{execution.responseTime}ms</p>
                      <p className="text-xs text-muted-foreground">
                        {formatTimestamp(execution.timestamp)}
                      </p>
                    </div>
                    {getStatusBadge(execution.status)}
                  </div>
                </div>
              ))}
              
              {recentExecutions.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No recent executions</p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* System Health */}
      <Card>
        <CardHeader>
          <CardTitle>System Health</CardTitle>
          <CardDescription>
            Overall health status of the webhook system
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm">Database Connection</span>
                <Badge className="bg-green-100 text-green-800">Healthy</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Edge Function Status</span>
                <Badge className="bg-green-100 text-green-800">Operational</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Queue Processing</span>
                <Badge className="bg-green-100 text-green-800">Normal</Badge>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm">Error Rate (Last Hour)</span>
                <Badge variant="secondary">2.1%</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Queue Depth</span>
                <Badge variant="secondary">3 pending</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">System Load</span>
                <Badge className="bg-green-100 text-green-800">Low</Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}