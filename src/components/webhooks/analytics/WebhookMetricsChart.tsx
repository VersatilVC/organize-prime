// Phase 4.2: Performance Metrics Visualization Components
// Rich charts and analytics dashboards for webhook monitoring

import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  LineChart, 
  Line, 
  AreaChart, 
  Area, 
  BarChart, 
  Bar, 
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
  Clock, 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle, 
  CheckCircle,
  Zap,
  BarChart3,
  Calendar,
  Download,
  Refresh
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import type { WebhookPerformanceMetrics } from '@/types/webhook-monitoring';
import { toast } from 'sonner';

interface WebhookMetricsChartProps {
  webhookId: string;
  elementId: string;
  webhookName: string;
  timeRange?: '1h' | '6h' | '24h' | '7d' | '30d';
  className?: string;
}

interface MetricsDataPoint {
  timestamp: string;
  success_rate: number;
  response_time: number;
  total_executions: number;
  error_rate: number;
  performance_score: number;
}

interface PerformanceDistribution {
  range: string;
  count: number;
  percentage: number;
  color: string;
}

const CHART_COLORS = {
  success: '#22c55e',
  error: '#ef4444',
  warning: '#f59e0b',
  info: '#3b82f6',
  neutral: '#64748b'
};

const RESPONSE_TIME_THRESHOLDS = [
  { name: 'Excellent', max: 500, color: '#22c55e' },
  { name: 'Good', max: 1000, color: '#84cc16' },
  { name: 'Fair', max: 2000, color: '#f59e0b' },
  { name: 'Poor', max: 5000, color: '#f97316' },
  { name: 'Critical', max: Infinity, color: '#ef4444' }
];

export const WebhookMetricsChart: React.FC<WebhookMetricsChartProps> = ({
  webhookId,
  elementId,
  webhookName,
  timeRange = '24h',
  className = ''
}) => {
  const [metricsData, setMetricsData] = useState<MetricsDataPoint[]>([]);
  const [performanceDistribution, setPerformanceDistribution] = useState<PerformanceDistribution[]>([]);
  const [currentMetrics, setCurrentMetrics] = useState<WebhookPerformanceMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedTimeRange, setSelectedTimeRange] = useState(timeRange);
  const [activeTab, setActiveTab] = useState('overview');

  // Load metrics data
  useEffect(() => {
    loadMetricsData();
  }, [webhookId, elementId, selectedTimeRange]);

  const loadMetricsData = async () => {
    setIsLoading(true);
    try {
      // Get time range boundaries
      const endTime = new Date();
      const startTime = new Date();
      
      switch (selectedTimeRange) {
        case '1h': startTime.setHours(startTime.getHours() - 1); break;
        case '6h': startTime.setHours(startTime.getHours() - 6); break;
        case '24h': startTime.setHours(startTime.getHours() - 24); break;
        case '7d': startTime.setDate(startTime.getDate() - 7); break;
        case '30d': startTime.setDate(startTime.getDate() - 30); break;
      }

      // Fetch historical metrics
      const { data: historicalData, error: histError } = await supabase
        .from('webhook_performance_metrics')
        .select('*')
        .eq('webhook_id', webhookId)
        .eq('element_id', elementId)
        .gte('metric_window_start', startTime.toISOString())
        .lte('metric_window_end', endTime.toISOString())
        .order('metric_window_start', { ascending: true });

      if (histError) throw histError;

      // Transform data for charts
      const chartData: MetricsDataPoint[] = (historicalData || []).map(metric => ({
        timestamp: new Date(metric.metric_window_start).toLocaleString(),
        success_rate: metric.success_rate_percentage || 0,
        response_time: metric.avg_response_time_ms || 0,
        total_executions: metric.total_executions || 0,
        error_rate: metric.error_rate_percentage || 0,
        performance_score: metric.performance_score || 0
      }));

      setMetricsData(chartData);

      // Get current metrics (latest)
      if (historicalData && historicalData.length > 0) {
        setCurrentMetrics(historicalData[historicalData.length - 1]);
      }

      // Calculate performance distribution
      await calculatePerformanceDistribution(startTime, endTime);

    } catch (error) {
      console.error('Failed to load metrics data:', error);
      toast.error('Failed to load metrics data');
    } finally {
      setIsLoading(false);
    }
  };

  const calculatePerformanceDistribution = async (startTime: Date, endTime: Date) => {
    try {
      const { data: executions, error } = await supabase
        .from('webhook_executions')
        .select('response_time_ms')
        .eq('webhook_id', webhookId)
        .eq('element_id', elementId)
        .gte('execution_started_at', startTime.toISOString())
        .lte('execution_started_at', endTime.toISOString())
        .not('response_time_ms', 'is', null);

      if (error) throw error;

      const total = executions?.length || 0;
      if (total === 0) {
        setPerformanceDistribution([]);
        return;
      }

      const distribution = RESPONSE_TIME_THRESHOLDS.map((threshold, index) => {
        const previousMax = index > 0 ? RESPONSE_TIME_THRESHOLDS[index - 1].max : 0;
        const count = executions?.filter(exec => 
          exec.response_time_ms > previousMax && exec.response_time_ms <= threshold.max
        ).length || 0;

        return {
          range: threshold.name,
          count,
          percentage: (count / total) * 100,
          color: threshold.color
        };
      });

      setPerformanceDistribution(distribution);
    } catch (error) {
      console.error('Failed to calculate performance distribution:', error);
    }
  };

  // Memoized calculations
  const summaryStats = useMemo(() => {
    if (!currentMetrics) return null;

    return {
      totalRequests: currentMetrics.total_executions,
      successRate: Math.round(currentMetrics.success_rate_percentage || 0),
      avgResponseTime: Math.round(currentMetrics.avg_response_time_ms || 0),
      errorRate: Math.round(currentMetrics.error_rate_percentage || 0),
      performanceScore: Math.round((currentMetrics.performance_score || 0) * 10) / 10,
      trend: currentMetrics.performance_trend
    };
  }, [currentMetrics]);

  // Chart components
  const renderOverviewTab = () => (
    <div className="space-y-6">
      {/* Summary Cards */}
      {summaryStats && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <Activity className="h-4 w-4 text-blue-500" />
                <div>
                  <div className="text-2xl font-bold">{summaryStats.totalRequests}</div>
                  <div className="text-xs text-muted-foreground">Total Requests</div>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <div>
                  <div className="text-2xl font-bold">{summaryStats.successRate}%</div>
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
                  <div className="text-2xl font-bold">{summaryStats.avgResponseTime}ms</div>
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
                  <div className="text-2xl font-bold">{summaryStats.errorRate}%</div>
                  <div className="text-xs text-muted-foreground">Error Rate</div>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                {summaryStats.trend === 'improving' ? (
                  <TrendingUp className="h-4 w-4 text-green-500" />
                ) : summaryStats.trend === 'declining' ? (
                  <TrendingDown className="h-4 w-4 text-red-500" />
                ) : (
                  <BarChart3 className="h-4 w-4 text-gray-500" />
                )}
                <div>
                  <div className="text-2xl font-bold">{summaryStats.performanceScore}/10</div>
                  <div className="text-xs text-muted-foreground">Performance</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Success Rate Trend */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Success Rate Trend
          </CardTitle>
          <CardDescription>
            Webhook success rate over time
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={metricsData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="timestamp" tick={{ fontSize: 12 }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} />
                <Tooltip />
                <Area 
                  type="monotone" 
                  dataKey="success_rate" 
                  stroke={CHART_COLORS.success}
                  fill={CHART_COLORS.success}
                  fillOpacity={0.3}
                  strokeWidth={2}
                />
                <ReferenceLine y={95} stroke={CHART_COLORS.warning} strokeDasharray="5 5" label="Target" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Response Time Analysis */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Response Time Analysis
          </CardTitle>
          <CardDescription>
            Average response time trends and distribution
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Response Time Trend */}
            <div>
              <h4 className="text-sm font-medium mb-3">Response Time Trend</h4>
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={metricsData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="timestamp" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} />
                    <Tooltip />
                    <Line 
                      type="monotone" 
                      dataKey="response_time" 
                      stroke={CHART_COLORS.info}
                      strokeWidth={2}
                      dot={{ r: 3 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Performance Distribution */}
            <div>
              <h4 className="text-sm font-medium mb-3">Performance Distribution</h4>
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={performanceDistribution}
                      cx="50%"
                      cy="50%"
                      innerRadius={30}
                      outerRadius={80}
                      dataKey="percentage"
                      label={({ range, percentage }) => 
                        percentage > 0 ? `${range}: ${Math.round(percentage)}%` : ''
                      }
                    >
                      {performanceDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const renderDetailedTab = () => (
    <div className="space-y-6">
      {/* Performance Score Trend */}
      <Card>
        <CardHeader>
          <CardTitle>Performance Score Over Time</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={metricsData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="timestamp" tick={{ fontSize: 12 }} />
                <YAxis domain={[0, 10]} tick={{ fontSize: 12 }} />
                <Tooltip />
                <Area 
                  type="monotone" 
                  dataKey="performance_score" 
                  stroke={CHART_COLORS.info}
                  fill={CHART_COLORS.info}
                  fillOpacity={0.3}
                  strokeWidth={2}
                />
                <ReferenceLine y={7} stroke={CHART_COLORS.success} strokeDasharray="5 5" label="Good" />
                <ReferenceLine y={4} stroke={CHART_COLORS.warning} strokeDasharray="5 5" label="Fair" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Error Rate Trend */}
      <Card>
        <CardHeader>
          <CardTitle>Error Rate Analysis</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={metricsData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="timestamp" tick={{ fontSize: 12 }} />
                <YAxis domain={[0, 'dataMax + 5']} tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="error_rate" fill={CHART_COLORS.error} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Execution Volume */}
      <Card>
        <CardHeader>
          <CardTitle>Execution Volume</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={metricsData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="timestamp" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="total_executions" fill={CHART_COLORS.neutral} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const exportData = () => {
    const dataStr = JSON.stringify({
      webhook: { id: webhookId, name: webhookName },
      timeRange: selectedTimeRange,
      generatedAt: new Date().toISOString(),
      summary: summaryStats,
      metricsData,
      performanceDistribution
    }, null, 2);
    
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `webhook-metrics-${webhookId}-${selectedTimeRange}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  if (isLoading) {
    return (
      <Card className={className}>
        <CardContent className="p-8">
          <div className="flex items-center justify-center space-x-2">
            <Activity className="h-5 w-5 animate-spin" />
            <span>Loading metrics data...</span>
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
              <BarChart3 className="h-5 w-5" />
              Performance Metrics - {webhookName}
            </CardTitle>
            <CardDescription>
              Real-time performance analytics and trends
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Select value={selectedTimeRange} onValueChange={setSelectedTimeRange}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1h">Last Hour</SelectItem>
                <SelectItem value="6h">Last 6 Hours</SelectItem>
                <SelectItem value="24h">Last 24 Hours</SelectItem>
                <SelectItem value="7d">Last 7 Days</SelectItem>
                <SelectItem value="30d">Last 30 Days</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" onClick={loadMetricsData}>
              <Refresh className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={exportData}>
              <Download className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="detailed">Detailed Analysis</TabsTrigger>
          </TabsList>
          
          <TabsContent value="overview" className="mt-6">
            {renderOverviewTab()}
          </TabsContent>
          
          <TabsContent value="detailed" className="mt-6">
            {renderDetailedTab()}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};