// Phase 4.2: Multi-Webhook Analytics Dashboard
// Comprehensive analytics dashboard for monitoring multiple webhooks simultaneously

import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine
} from 'recharts';
import {
  Activity,
  AlertTriangle,
  CheckCircle,
  Clock,
  TrendingUp,
  TrendingDown,
  Zap,
  Search,
  Filter,
  Download,
  RefreshCw,
  BarChart3,
  PieChart as PieChartIcon,
  AlertCircle,
  Info
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { realtimeMonitoringService } from '@/services/webhook/RealtimeMonitoringService';
import type { WebhookRealtimeStatus, WebhookAlert } from '@/types/webhook-monitoring';
import { toast } from 'sonner';

interface WebhookAnalyticsDashboardProps {
  organizationId: string;
  className?: string;
}

interface DashboardMetrics {
  total_webhooks: number;
  active_webhooks: number;
  total_executions_24h: number;
  success_rate_24h: number;
  avg_response_time_24h: number;
  active_alerts: number;
  top_performers: WebhookRealtimeStatus[];
  recent_alerts: WebhookAlert[];
  performance_trends: PerformanceTrendData[];
  webhook_distribution: WebhookDistributionData[];
}

interface PerformanceTrendData {
  timestamp: string;
  total_executions: number;
  success_rate: number;
  avg_response_time: number;
  active_webhooks: number;
}

interface WebhookDistributionData {
  status: string;
  count: number;
  percentage: number;
  color: string;
}

interface FilterState {
  search: string;
  healthStatus: string[];
  minPerformanceScore: number;
  timeRange: '1h' | '6h' | '24h' | '7d';
}

const CHART_COLORS = {
  primary: '#3b82f6',
  success: '#22c55e',
  warning: '#f59e0b',
  error: '#ef4444',
  info: '#06b6d4',
  neutral: '#64748b'
};

const HEALTH_STATUS_COLORS = {
  healthy: '#22c55e',
  warning: '#f59e0b',
  critical: '#ef4444',
  unknown: '#64748b'
};

export const WebhookAnalyticsDashboard: React.FC<WebhookAnalyticsDashboardProps> = ({
  organizationId,
  className = ''
}) => {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [webhookStatuses, setWebhookStatuses] = useState<WebhookRealtimeStatus[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [filters, setFilters] = useState<FilterState>({
    search: '',
    healthStatus: [],
    minPerformanceScore: 0,
    timeRange: '24h'
  });

  // Load dashboard data
  useEffect(() => {
    loadDashboardData();
    const interval = setInterval(loadDashboardData, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, [organizationId, filters.timeRange]);

  // Set up real-time monitoring
  useEffect(() => {
    const connectMonitoring = async () => {
      await realtimeMonitoringService.connect();
      
      // Listen for webhook status changes
      realtimeMonitoringService.on('metrics_updated', handleMetricsUpdate);
      realtimeMonitoringService.on('alert_triggered', handleAlertTriggered);
      realtimeMonitoringService.on('execution_completed', handleExecutionUpdate);
    };

    connectMonitoring();
    
    return () => {
      realtimeMonitoringService.off('metrics_updated', handleMetricsUpdate);
      realtimeMonitoringService.off('alert_triggered', handleAlertTriggered);
      realtimeMonitoringService.off('execution_completed', handleExecutionUpdate);
    };
  }, []);

  const loadDashboardData = async () => {
    setIsLoading(true);
    try {
      // Load all webhook statuses
      const statuses = await realtimeMonitoringService.getAllWebhookStatuses({
        webhook_ids: filters.search ? [filters.search] : undefined,
        health_status: filters.healthStatus.length > 0 ? filters.healthStatus : undefined,
        min_performance_score: filters.minPerformanceScore > 0 ? filters.minPerformanceScore : undefined
      });

      setWebhookStatuses(statuses);

      // Calculate dashboard metrics
      const dashboardMetrics = await calculateDashboardMetrics(statuses);
      setMetrics(dashboardMetrics);

    } catch (error) {
      console.error('Failed to load dashboard data:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setIsLoading(false);
    }
  };

  const calculateDashboardMetrics = async (statuses: WebhookRealtimeStatus[]): Promise<DashboardMetrics> => {
    const timeRange = filters.timeRange;
    const endTime = new Date();
    const startTime = new Date();
    
    switch (timeRange) {
      case '1h': startTime.setHours(startTime.getHours() - 1); break;
      case '6h': startTime.setHours(startTime.getHours() - 6); break;
      case '24h': startTime.setHours(startTime.getHours() - 24); break;
      case '7d': startTime.setDate(startTime.getDate() - 7); break;
    }

    // Calculate basic metrics
    const totalWebhooks = statuses.length;
    const activeWebhooks = statuses.filter(s => s.overall_health !== 'unknown').length;
    const totalExecutions = statuses.reduce((sum, s) => 
      sum + (s.performance_metrics?.total_executions || 0), 0);
    const successfulExecutions = statuses.reduce((sum, s) => 
      sum + Math.round((s.performance_metrics?.total_executions || 0) * 
      (s.performance_metrics?.success_rate || 0) / 100), 0);
    const successRate = totalExecutions > 0 ? (successfulExecutions / totalExecutions) * 100 : 0;
    const avgResponseTime = statuses.reduce((sum, s) => 
      sum + (s.performance_metrics?.avg_response_time_ms || 0), 0) / Math.max(activeWebhooks, 1);
    const activeAlerts = statuses.reduce((sum, s) => 
      sum + (s.active_alerts?.length || 0), 0);

    // Get top performers
    const topPerformers = statuses
      .filter(s => s.performance_metrics?.performance_score > 7)
      .sort((a, b) => (b.performance_metrics?.performance_score || 0) - 
                      (a.performance_metrics?.performance_score || 0))
      .slice(0, 5);

    // Get recent alerts
    const recentAlerts = statuses
      .flatMap(s => s.active_alerts || [])
      .sort((a, b) => new Date(b.triggered_at).getTime() - new Date(a.triggered_at).getTime())
      .slice(0, 10);

    // Generate performance trends (mock data for now)
    const performanceTrends = generatePerformanceTrends(statuses, timeRange);

    // Calculate webhook distribution
    const healthCounts = statuses.reduce((acc, status) => {
      acc[status.overall_health] = (acc[status.overall_health] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const webhookDistribution = Object.entries(healthCounts).map(([status, count]) => ({
      status,
      count,
      percentage: (count / totalWebhooks) * 100,
      color: HEALTH_STATUS_COLORS[status as keyof typeof HEALTH_STATUS_COLORS] || HEALTH_STATUS_COLORS.unknown
    }));

    return {
      total_webhooks: totalWebhooks,
      active_webhooks: activeWebhooks,
      total_executions_24h: totalExecutions,
      success_rate_24h: Math.round(successRate * 10) / 10,
      avg_response_time_24h: Math.round(avgResponseTime),
      active_alerts: activeAlerts,
      top_performers: topPerformers,
      recent_alerts: recentAlerts,
      performance_trends: performanceTrends,
      webhook_distribution: webhookDistribution
    };
  };

  const generatePerformanceTrends = (statuses: WebhookRealtimeStatus[], timeRange: string): PerformanceTrendData[] => {
    // Generate time series data points
    const points = timeRange === '1h' ? 12 : timeRange === '6h' ? 12 : timeRange === '24h' ? 24 : 7;
    const interval = timeRange === '1h' ? 5 * 60 * 1000 : 
                    timeRange === '6h' ? 30 * 60 * 1000 :
                    timeRange === '24h' ? 60 * 60 * 1000 : 24 * 60 * 60 * 1000;

    const trends: PerformanceTrendData[] = [];
    const now = Date.now();

    for (let i = points - 1; i >= 0; i--) {
      const timestamp = new Date(now - (i * interval));
      
      // Calculate metrics for this time point (simplified simulation)
      const variationFactor = 0.8 + Math.random() * 0.4; // 0.8 to 1.2
      const totalExecutions = Math.round(statuses.length * 10 * variationFactor);
      const successRate = Math.max(85, Math.min(99, 95 + (Math.random() - 0.5) * 10));
      const avgResponseTime = Math.round(800 + Math.random() * 400);
      const activeWebhooks = Math.round(statuses.length * variationFactor);

      trends.push({
        timestamp: timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        total_executions: totalExecutions,
        success_rate: Math.round(successRate * 10) / 10,
        avg_response_time: avgResponseTime,
        active_webhooks: activeWebhooks
      });
    }

    return trends;
  };

  // Real-time event handlers
  const handleMetricsUpdate = () => {
    loadDashboardData();
  };

  const handleAlertTriggered = (alert: WebhookAlert) => {
    toast.warning(`New alert: ${alert.alert_message}`, {
      description: `Webhook: ${alert.webhook_id}`
    });
    loadDashboardData();
  };

  const handleExecutionUpdate = () => {
    // Debounced refresh to avoid too many updates
    setTimeout(loadDashboardData, 1000);
  };

  // Filter handlers
  const handleFilterChange = (key: keyof FilterState, value: any) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }));
  };

  // Filtered webhook statuses
  const filteredWebhooks = useMemo(() => {
    return webhookStatuses.filter(webhook => {
      // Search filter
      if (filters.search && !webhook.webhook_id.toLowerCase().includes(filters.search.toLowerCase()) &&
          !webhook.webhook_name?.toLowerCase().includes(filters.search.toLowerCase())) {
        return false;
      }

      // Health status filter
      if (filters.healthStatus.length > 0 && !filters.healthStatus.includes(webhook.overall_health)) {
        return false;
      }

      // Performance score filter
      if (filters.minPerformanceScore > 0 && 
          (webhook.performance_metrics?.performance_score || 0) < filters.minPerformanceScore) {
        return false;
      }

      return true;
    });
  }, [webhookStatuses, filters]);

  // Export data
  const exportDashboardData = () => {
    if (!metrics) return;
    
    const exportData = {
      exported_at: new Date().toISOString(),
      organization_id: organizationId,
      time_range: filters.timeRange,
      summary: {
        total_webhooks: metrics.total_webhooks,
        active_webhooks: metrics.active_webhooks,
        success_rate_24h: metrics.success_rate_24h,
        avg_response_time_24h: metrics.avg_response_time_24h,
        active_alerts: metrics.active_alerts
      },
      webhook_statuses: filteredWebhooks,
      performance_trends: metrics.performance_trends
    };

    const dataStr = JSON.stringify(exportData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `webhook-analytics-${filters.timeRange}-${Date.now()}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Render methods
  const renderOverviewTab = () => (
    <div className="space-y-6">
      {/* Key Metrics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Zap className="h-4 w-4 text-blue-500" />
              <div>
                <div className="text-2xl font-bold">{metrics?.total_webhooks || 0}</div>
                <div className="text-xs text-muted-foreground">Total Webhooks</div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Activity className="h-4 w-4 text-green-500" />
              <div>
                <div className="text-2xl font-bold">{metrics?.active_webhooks || 0}</div>
                <div className="text-xs text-muted-foreground">Active</div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <div>
                <div className="text-2xl font-bold">{metrics?.success_rate_24h || 0}%</div>
                <div className="text-xs text-muted-foreground">Success Rate</div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Clock className="h-4 w-4 text-orange-500" />
              <div>
                <div className="text-2xl font-bold">{metrics?.avg_response_time_24h || 0}ms</div>
                <div className="text-xs text-muted-foreground">Avg Response</div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="h-4 w-4 text-red-500" />
              <div>
                <div className="text-2xl font-bold">{metrics?.active_alerts || 0}</div>
                <div className="text-xs text-muted-foreground">Active Alerts</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Performance Trends */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Success Rate Trend
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={metrics?.performance_trends || []}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="timestamp" tick={{ fontSize: 12 }} />
                  <YAxis domain={[80, 100]} tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Area 
                    type="monotone" 
                    dataKey="success_rate" 
                    stroke={CHART_COLORS.success}
                    fill={CHART_COLORS.success}
                    fillOpacity={0.3}
                    strokeWidth={2}
                  />
                  <ReferenceLine y={95} stroke={CHART_COLORS.warning} strokeDasharray="5 5" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Response Time Trend
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={metrics?.performance_trends || []}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="timestamp" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Line 
                    type="monotone" 
                    dataKey="avg_response_time" 
                    stroke={CHART_COLORS.info}
                    strokeWidth={2}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Webhook Health Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PieChartIcon className="h-5 w-5" />
              Webhook Health Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={metrics?.webhook_distribution || []}
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={80}
                    dataKey="count"
                    label={({ status, percentage }) => 
                      `${status}: ${Math.round(percentage)}%`
                    }
                  >
                    {metrics?.webhook_distribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Execution Volume
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={metrics?.performance_trends || []}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="timestamp" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Bar dataKey="total_executions" fill={CHART_COLORS.primary} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );

  const renderWebhooksTab = () => (
    <div className="space-y-6">
      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search webhooks..."
                  value={filters.search}
                  onChange={(e) => handleFilterChange('search', e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Select 
                value={filters.healthStatus.join(',')} 
                onValueChange={(value) => handleFilterChange('healthStatus', value.split(',').filter(Boolean))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Health status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All statuses</SelectItem>
                  <SelectItem value="healthy">Healthy only</SelectItem>
                  <SelectItem value="warning">Warning only</SelectItem>
                  <SelectItem value="critical">Critical only</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Input
                type="number"
                placeholder="Min score (0-10)"
                value={filters.minPerformanceScore || ''}
                onChange={(e) => handleFilterChange('minPerformanceScore', parseFloat(e.target.value) || 0)}
                min={0}
                max={10}
                step={0.1}
              />
            </div>
            <div className="space-y-2">
              <Button 
                variant="outline" 
                onClick={loadDashboardData}
                className="w-full"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Webhook List */}
      <Card>
        <CardHeader>
          <CardTitle>Webhook Status ({filteredWebhooks.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-96">
            <div className="space-y-2">
              {filteredWebhooks.map((webhook) => (
                <div key={webhook.webhook_id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className={`w-3 h-3 rounded-full ${
                      webhook.overall_health === 'healthy' ? 'bg-green-500' :
                      webhook.overall_health === 'warning' ? 'bg-orange-500' :
                      webhook.overall_health === 'critical' ? 'bg-red-500' : 'bg-gray-500'
                    }`} />
                    <div>
                      <div className="font-medium">{webhook.webhook_name || webhook.webhook_id}</div>
                      <div className="text-xs text-muted-foreground">{webhook.webhook_id}</div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-4 text-sm">
                    {webhook.performance_metrics && (
                      <>
                        <div className="text-center">
                          <div>{Math.round(webhook.performance_metrics.success_rate)}%</div>
                          <div className="text-xs text-muted-foreground">Success</div>
                        </div>
                        <div className="text-center">
                          <div>{Math.round(webhook.performance_metrics.avg_response_time_ms)}ms</div>
                          <div className="text-xs text-muted-foreground">Avg Time</div>
                        </div>
                        <div className="text-center">
                          <div>{webhook.performance_metrics.performance_score}/10</div>
                          <div className="text-xs text-muted-foreground">Score</div>
                        </div>
                      </>
                    )}
                    {webhook.active_alerts && webhook.active_alerts.length > 0 && (
                      <Badge variant="destructive">{webhook.active_alerts.length} alerts</Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );

  const renderAlertsTab = () => (
    <div className="space-y-6">
      {/* Active Alerts */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-red-500" />
            Active Alerts ({metrics?.active_alerts || 0})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-96">
            <div className="space-y-2">
              {metrics?.recent_alerts.map((alert, index) => (
                <Alert key={index} variant={alert.alert_type === 'critical' ? 'destructive' : 'default'}>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="font-medium">{alert.alert_message}</div>
                        <div className="text-xs text-muted-foreground">
                          Webhook: {alert.webhook_id} • {new Date(alert.triggered_at).toLocaleString()}
                        </div>
                      </div>
                      <Badge variant={alert.alert_type === 'critical' ? 'destructive' : 'secondary'}>
                        {alert.alert_type}
                      </Badge>
                    </div>
                  </AlertDescription>
                </Alert>
              )) || (
                <div className="text-center py-8 text-muted-foreground">
                  <CheckCircle className="h-8 w-8 mx-auto mb-2 text-green-500" />
                  No active alerts
                </div>
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );

  if (isLoading) {
    return (
      <Card className={className}>
        <CardContent className="p-8">
          <div className="flex items-center justify-center space-x-2">
            <Activity className="h-5 w-5 animate-spin" />
            <span>Loading dashboard...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-6 w-6" />
              Webhook Analytics Dashboard
            </CardTitle>
            <CardDescription>
              Real-time monitoring and analytics for all webhooks
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Select value={filters.timeRange} onValueChange={(value: any) => handleFilterChange('timeRange', value)}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1h">Last Hour</SelectItem>
                <SelectItem value="6h">Last 6 Hours</SelectItem>
                <SelectItem value="24h">Last 24 Hours</SelectItem>
                <SelectItem value="7d">Last 7 Days</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" onClick={loadDashboardData}>
              <RefreshCw className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={exportDashboardData}>
              <Download className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="webhooks">Webhooks ({filteredWebhooks.length})</TabsTrigger>
            <TabsTrigger value="alerts">
              Alerts
              {metrics?.active_alerts && metrics.active_alerts > 0 && (
                <Badge variant="destructive" className="ml-2 px-1 py-0 text-xs">
                  {metrics.active_alerts}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="mt-6">
            {renderOverviewTab()}
          </TabsContent>

          <TabsContent value="webhooks" className="mt-6">
            {renderWebhooksTab()}
          </TabsContent>

          <TabsContent value="alerts" className="mt-6">
            {renderAlertsTab()}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};