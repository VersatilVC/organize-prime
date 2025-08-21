// Phase 4.5: Preview Analytics Integration  
// Real-time webhook execution analytics within preview mode

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
// Note: Using simple chart representation instead of recharts for compatibility
import {
  BarChart3,
  TrendingUp,
  Clock,
  AlertCircle,
  CheckCircle,
  XCircle,
  Zap,
  Target,
  Activity,
  Eye,
  EyeOff,
  RefreshCw,
  Filter,
  X,
  Calendar,
  Timer,
  Gauge,
  AlertTriangle,
  Info,
  Layers
} from 'lucide-react';
import { usePreview } from './PreviewController';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganization } from '@/contexts/OrganizationContext';
import { toast } from 'sonner';

interface WebhookExecution {
  id: string;
  element_signature: string;
  element_name: string;
  webhook_url: string;
  status: 'success' | 'failure' | 'timeout' | 'pending';
  response_time_ms: number;
  executed_at: string;
  error_message?: string;
  payload_size: number;
  response_code?: number;
}

interface ElementAnalytics {
  element_signature: string;
  element_name: string;
  total_executions: number;
  success_rate: number;
  avg_response_time: number;
  last_execution: string;
  failure_count: number;
  performance_score: number;
}

interface PreviewAnalyticsProps {
  className?: string;
}

const ANALYTICS_COLORS = {
  success: '#22c55e',
  failure: '#ef4444',
  timeout: '#f59e0b',
  pending: '#6b7280'
};

const PERFORMANCE_THRESHOLDS = {
  excellent: 90,
  good: 75,
  fair: 50,
  poor: 0
};

export function PreviewAnalytics({ className = '' }: PreviewAnalyticsProps) {
  const { state } = usePreview();
  const { currentOrganization } = useOrganization();
  const [isVisible, setIsVisible] = useState(false);
  const [selectedTimeRange, setSelectedTimeRange] = useState('24h');
  const [selectedElement, setSelectedElement] = useState<string | null>(null);
  const [showRealtimeUpdates, setShowRealtimeUpdates] = useState(true);
  const [analyticsFilter, setAnalyticsFilter] = useState<'all' | 'success' | 'failure' | 'timeout'>('all');

  // Don't render if preview mode is disabled
  if (!state.isEnabled) {
    return null;
  }

  // Get webhook executions for current elements
  const { data: executions, refetch: refetchExecutions } = useQuery({
    queryKey: ['webhook-executions', currentOrganization?.id, selectedTimeRange],
    queryFn: async () => {
      const timeRangeHours = selectedTimeRange === '24h' ? 24 : 
                            selectedTimeRange === '7d' ? 168 : 
                            selectedTimeRange === '30d' ? 720 : 24;
      
      const since = new Date(Date.now() - timeRangeHours * 60 * 60 * 1000).toISOString();

      const { data, error } = await supabase
        .from('webhook_executions')
        .select(`
          id,
          element_signature,
          webhook_url,
          status,
          response_time_ms,
          executed_at,
          error_message,
          payload_size,
          response_code,
          element_webhooks!inner(
            element_registry!inner(
              element_signature,
              display_name
            )
          )
        `)
        .eq('organization_id', currentOrganization?.id)
        .gte('executed_at', since)
        .order('executed_at', { ascending: false });

      if (error) throw error;

      return (data || []).map(execution => ({
        id: execution.id,
        element_signature: execution.element_signature,
        element_name: execution.element_webhooks?.element_registry?.display_name || 'Unknown Element',
        webhook_url: execution.webhook_url,
        status: execution.status as WebhookExecution['status'],
        response_time_ms: execution.response_time_ms || 0,
        executed_at: execution.executed_at,
        error_message: execution.error_message,
        payload_size: execution.payload_size || 0,
        response_code: execution.response_code
      }));
    },
    enabled: isVisible && !!currentOrganization?.id,
    refetchInterval: showRealtimeUpdates ? 5000 : false
  });

  // Calculate element analytics
  const elementAnalytics = useMemo(() => {
    if (!executions) return [];

    const analyticsMap = new Map<string, ElementAnalytics>();

    executions.forEach(execution => {
      const existing = analyticsMap.get(execution.element_signature);
      
      if (existing) {
        existing.total_executions++;
        if (execution.status === 'success') {
          existing.success_rate = ((existing.success_rate * (existing.total_executions - 1)) + 100) / existing.total_executions;
        } else {
          existing.success_rate = (existing.success_rate * (existing.total_executions - 1)) / existing.total_executions;
          existing.failure_count++;
        }
        existing.avg_response_time = ((existing.avg_response_time * (existing.total_executions - 1)) + execution.response_time_ms) / existing.total_executions;
        if (execution.executed_at > existing.last_execution) {
          existing.last_execution = execution.executed_at;
        }
      } else {
        analyticsMap.set(execution.element_signature, {
          element_signature: execution.element_signature,
          element_name: execution.element_name,
          total_executions: 1,
          success_rate: execution.status === 'success' ? 100 : 0,
          avg_response_time: execution.response_time_ms,
          last_execution: execution.executed_at,
          failure_count: execution.status === 'failure' ? 1 : 0,
          performance_score: calculatePerformanceScore(execution.status === 'success' ? 100 : 0, execution.response_time_ms)
        });
      }
    });

    // Recalculate performance scores
    analyticsMap.forEach(analytics => {
      analytics.performance_score = calculatePerformanceScore(analytics.success_rate, analytics.avg_response_time);
    });

    return Array.from(analyticsMap.values());
  }, [executions]);

  // Filter executions based on current filter
  const filteredExecutions = useMemo(() => {
    if (!executions) return [];
    if (analyticsFilter === 'all') return executions;
    return executions.filter(exec => exec.status === analyticsFilter);
  }, [executions, analyticsFilter]);

  // Calculate performance score
  const calculatePerformanceScore = useCallback((successRate: number, avgResponseTime: number): number => {
    // Weight success rate (70%) and response time (30%)
    const successScore = successRate;
    const responseScore = Math.max(0, 100 - (avgResponseTime / 50)); // 50ms = perfect, 5000ms = 0
    return Math.round((successScore * 0.7) + (responseScore * 0.3));
  }, []);

  // Get performance level
  const getPerformanceLevel = useCallback((score: number) => {
    if (score >= PERFORMANCE_THRESHOLDS.excellent) return { level: 'excellent', color: '#22c55e', label: 'Excellent' };
    if (score >= PERFORMANCE_THRESHOLDS.good) return { level: 'good', color: '#3b82f6', label: 'Good' };
    if (score >= PERFORMANCE_THRESHOLDS.fair) return { level: 'fair', color: '#f59e0b', label: 'Fair' };
    return { level: 'poor', color: '#ef4444', label: 'Poor' };
  }, []);

  // Highlight elements with analytics
  const highlightElementsWithAnalytics = useCallback(() => {
    elementAnalytics.forEach(analytics => {
      const element = document.querySelector(`[data-webhook-signature="${analytics.element_signature}"]`) as HTMLElement;
      if (element) {
        const performance = getPerformanceLevel(analytics.performance_score);
        element.style.boxShadow = `inset 0 0 0 2px ${performance.color}`;
        element.setAttribute('data-performance-score', analytics.performance_score.toString());
        element.setAttribute('data-success-rate', Math.round(analytics.success_rate).toString());
        element.setAttribute('data-total-executions', analytics.total_executions.toString());
      }
    });
  }, [elementAnalytics, getPerformanceLevel]);

  // Clear element highlighting
  const clearElementHighlighting = useCallback(() => {
    document.querySelectorAll('[data-webhook-signature]').forEach(element => {
      const htmlElement = element as HTMLElement;
      htmlElement.style.boxShadow = '';
      htmlElement.removeAttribute('data-performance-score');
      htmlElement.removeAttribute('data-success-rate');
      htmlElement.removeAttribute('data-total-executions');
    });
  }, []);

  // Apply/remove analytics highlighting
  useEffect(() => {
    if (isVisible && elementAnalytics.length > 0) {
      highlightElementsWithAnalytics();
    } else {
      clearElementHighlighting();
    }

    return () => clearElementHighlighting();
  }, [isVisible, elementAnalytics, highlightElementsWithAnalytics, clearElementHighlighting]);

  // Prepare chart data
  const chartData = useMemo(() => {
    if (!executions) return [];

    // Group executions by hour for line chart
    const hourlyData = new Map<string, { success: number; failure: number; timeout: number }>();
    
    executions.forEach(execution => {
      const hour = new Date(execution.executed_at).toISOString().slice(0, 13) + ':00';
      const existing = hourlyData.get(hour) || { success: 0, failure: 0, timeout: 0 };
      
      if (execution.status === 'success') existing.success++;
      else if (execution.status === 'failure') existing.failure++;
      else if (execution.status === 'timeout') existing.timeout++;
      
      hourlyData.set(hour, existing);
    });

    return Array.from(hourlyData.entries())
      .map(([hour, data]) => ({
        time: new Date(hour).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
        ...data
      }))
      .slice(-24); // Show last 24 data points
  }, [executions]);

  // Status distribution for pie chart
  const statusDistribution = useMemo(() => {
    if (!executions) return [];

    const distribution = executions.reduce((acc, execution) => {
      acc[execution.status] = (acc[execution.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(distribution).map(([status, count]) => ({
      name: status,
      value: count,
      color: ANALYTICS_COLORS[status as keyof typeof ANALYTICS_COLORS]
    }));
  }, [executions]);

  if (!isVisible) {
    // Show compact analytics trigger button
    return createPortal(
      <div className={`fixed bottom-4 left-4 z-[10002] ${className}`} data-preview-system="true">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size="sm"
                variant="outline"
                className="bg-white shadow-lg border-emerald-200"
                onClick={() => setIsVisible(true)}
              >
                <BarChart3 className="h-4 w-4" />
                <span className="ml-1 text-xs">Analytics</span>
                {executions && executions.length > 0 && (
                  <Badge variant="secondary" className="ml-2 text-xs">
                    {executions.length}
                  </Badge>
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>View webhook execution analytics</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>,
      document.body
    );
  }

  return createPortal(
    <div className={`fixed bottom-4 left-4 z-[10002] w-96 max-h-[70vh] ${className}`} data-preview-system="true">
      <Card className="border-emerald-200 bg-white shadow-lg">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-emerald-600" />
              <CardTitle className="text-lg text-emerald-900">Analytics</CardTitle>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                id="realtime"
                checked={showRealtimeUpdates}
                onCheckedChange={setShowRealtimeUpdates}
              />
              <Label htmlFor="realtime" className="text-xs">Live</Label>
              <Button
                size="sm"
                variant="outline"
                onClick={() => refetchExecutions()}
              >
                <RefreshCw className="h-3 w-3" />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setIsVisible(false)}
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          </div>
          <CardDescription className="text-emerald-700">
            Real-time webhook execution metrics
          </CardDescription>
        </CardHeader>

        <CardContent>
          {/* Controls */}
          <div className="flex items-center gap-2 mb-4">
            <Select value={selectedTimeRange} onValueChange={setSelectedTimeRange}>
              <SelectTrigger className="w-20 h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="24h">24h</SelectItem>
                <SelectItem value="7d">7d</SelectItem>
                <SelectItem value="30d">30d</SelectItem>
              </SelectContent>
            </Select>

            <Select value={analyticsFilter} onValueChange={(value) => setAnalyticsFilter(value as any)}>
              <SelectTrigger className="w-24 h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="success">Success</SelectItem>
                <SelectItem value="failure">Failure</SelectItem>
                <SelectItem value="timeout">Timeout</SelectItem>
              </SelectContent>
            </Select>

            <div className="text-xs text-gray-500 ml-auto">
              {filteredExecutions.length} executions
            </div>
          </div>

          <ScrollArea className="h-80">
            {/* Summary Stats */}
            <div className="grid grid-cols-2 gap-2 mb-4">
              <Card className="p-3">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <div>
                    <div className="text-lg font-semibold text-green-600">
                      {Math.round(((filteredExecutions.filter(e => e.status === 'success').length / filteredExecutions.length) || 0) * 100)}%
                    </div>
                    <div className="text-xs text-gray-500">Success Rate</div>
                  </div>
                </div>
              </Card>

              <Card className="p-3">
                <div className="flex items-center gap-2">
                  <Timer className="h-4 w-4 text-blue-500" />
                  <div>
                    <div className="text-lg font-semibold text-blue-600">
                      {Math.round(filteredExecutions.reduce((acc, e) => acc + e.response_time_ms, 0) / filteredExecutions.length || 0)}ms
                    </div>
                    <div className="text-xs text-gray-500">Avg Response</div>
                  </div>
                </div>
              </Card>
            </div>

            {/* Execution Timeline Chart */}
            {chartData.length > 0 && (
              <div className="mb-4">
                <h4 className="text-sm font-medium mb-2">Execution Timeline</h4>
                <div className="h-32 w-full bg-gray-50 rounded border p-2">
                  <div className="flex items-end justify-between h-full gap-1">
                    {chartData.slice(-12).map((data, index) => (
                      <div key={index} className="flex flex-col items-center flex-1">
                        <div className="flex flex-col justify-end h-20 w-full">
                          {data.success > 0 && (
                            <div 
                              className="bg-green-500 w-full rounded-t"
                              style={{ height: `${(data.success / Math.max(...chartData.map(d => d.success + d.failure + d.timeout))) * 80}px` }}
                            />
                          )}
                          {data.failure > 0 && (
                            <div 
                              className="bg-red-500 w-full"
                              style={{ height: `${(data.failure / Math.max(...chartData.map(d => d.success + d.failure + d.timeout))) * 80}px` }}
                            />
                          )}
                          {data.timeout > 0 && (
                            <div 
                              className="bg-orange-500 w-full rounded-b"
                              style={{ height: `${(data.timeout / Math.max(...chartData.map(d => d.success + d.failure + d.timeout))) * 80}px` }}
                            />
                          )}
                        </div>
                        <div className="text-xs text-gray-500 mt-1 transform rotate-45 origin-bottom-left">
                          {data.time}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="flex justify-center gap-4 mt-2 text-xs">
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-3 bg-green-500 rounded" />
                    <span>Success</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-3 bg-red-500 rounded" />
                    <span>Failure</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-3 bg-orange-500 rounded" />
                    <span>Timeout</span>
                  </div>
                </div>
              </div>
            )}

            {/* Element Performance */}
            {elementAnalytics.length > 0 && (
              <div className="mb-4">
                <h4 className="text-sm font-medium mb-2">Element Performance</h4>
                <div className="space-y-2">
                  {elementAnalytics.slice(0, 5).map(analytics => {
                    const performance = getPerformanceLevel(analytics.performance_score);
                    return (
                      <div key={analytics.element_signature} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium truncate">{analytics.element_name}</div>
                          <div className="text-xs text-gray-500">
                            {analytics.total_executions} executions
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge 
                            variant="outline" 
                            style={{ borderColor: performance.color, color: performance.color }}
                            className="text-xs"
                          >
                            {analytics.performance_score}
                          </Badge>
                          <div className="text-xs text-right">
                            <div>{Math.round(analytics.success_rate)}%</div>
                            <div className="text-gray-500">{Math.round(analytics.avg_response_time)}ms</div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Recent Executions */}
            <div>
              <h4 className="text-sm font-medium mb-2">Recent Executions</h4>
              <div className="space-y-1">
                {filteredExecutions.slice(0, 10).map(execution => (
                  <div key={execution.id} className="flex items-center justify-between p-2 text-xs border-l-2" 
                       style={{ borderLeftColor: ANALYTICS_COLORS[execution.status] }}>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">{execution.element_name}</div>
                      <div className="text-gray-500">{new Date(execution.executed_at).toLocaleTimeString()}</div>
                    </div>
                    <div className="flex items-center gap-1">
                      <Badge 
                        variant={execution.status === 'success' ? 'default' : 'destructive'}
                        className="text-xs"
                      >
                        {execution.status}
                      </Badge>
                      <span className="text-gray-500">{execution.response_time_ms}ms</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {filteredExecutions.length === 0 && (
              <div className="text-center py-8">
                <Activity className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                <p className="text-sm text-gray-600">No executions found</p>
                <p className="text-xs text-gray-500 mt-1">
                  Webhook executions will appear here in real-time
                </p>
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>
    </div>,
    document.body
  );
}