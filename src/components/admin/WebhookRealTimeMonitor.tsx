import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { 
  Activity,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Pause,
  Play,
  Bell,
  Volume2,
  VolumeX
} from 'lucide-react';

interface RealtimeWebhookEvent {
  id: string;
  webhook_id: string;
  webhook_name: string;
  feature_name: string;
  event_type: string;
  status: 'success' | 'failed' | 'timeout';
  status_code?: number;
  response_time_ms: number;
  error_message?: string;
  triggered_at: string;
  retry_count: number;
  is_test?: boolean;
}

interface MonitoringStats {
  events_per_minute: number;
  success_rate_last_hour: number;
  avg_response_time_last_hour: number;
  total_errors_last_hour: number;
  active_webhooks: number;
}

export function WebhookRealTimeMonitor() {
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [events, setEvents] = useState<RealtimeWebhookEvent[]>([]);
  const [stats, setStats] = useState<MonitoringStats>({
    events_per_minute: 0,
    success_rate_last_hour: 0,
    avg_response_time_last_hour: 0,
    total_errors_last_hour: 0,
    active_webhooks: 0
  });
  const [soundEnabled, setSoundEnabled] = useState(false);
  const [autoScroll, setAutoScroll] = useState(true);
  const [filterStatus, setFilterStatus] = useState<'all' | 'success' | 'failed' | 'timeout'>('all');

  // Audio context for notification sounds
  const playNotificationSound = useCallback((type: 'success' | 'error') => {
    if (!soundEnabled) return;

    // Create a simple beep sound using Web Audio API
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      oscillator.frequency.setValueAtTime(type === 'success' ? 800 : 400, audioContext.currentTime);
      oscillator.type = 'sine';

      gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);

      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.1);
    } catch (error) {
      console.warn('Could not play notification sound:', error);
    }
  }, [soundEnabled]);

  // Subscribe to real-time webhook events
  useEffect(() => {
    if (!isMonitoring) return;

    const channel = supabase
      .channel('webhook-logs-realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'webhook_logs'
        },
        async (payload) => {
          const newEvent = payload.new as any;
          
          // Fetch additional details like webhook name
          const { data: webhookData } = await supabase
            .from('feature_webhooks')
            .select(`
              name,
              features!feature_webhooks_feature_id_fkey(name)
            `)
            .eq('id', newEvent.webhook_id)
            .single();

          const enrichedEvent: RealtimeWebhookEvent = {
            id: newEvent.id,
            webhook_id: newEvent.webhook_id,
            webhook_name: webhookData?.name || 'Unknown Webhook',
            feature_name: webhookData?.features?.name || 'Unknown Feature',
            event_type: newEvent.event_type,
            status: newEvent.status,
            status_code: newEvent.status_code,
            response_time_ms: newEvent.response_time_ms,
            error_message: newEvent.error_message,
            triggered_at: newEvent.triggered_at,
            retry_count: newEvent.retry_count,
            is_test: newEvent.is_test
          };

          setEvents(prev => [enrichedEvent, ...prev.slice(0, 99)]); // Keep last 100 events

          // Play notification sound
          if (newEvent.status === 'success') {
            playNotificationSound('success');
          } else if (newEvent.status === 'failed' || newEvent.status === 'timeout') {
            playNotificationSound('error');
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isMonitoring, playNotificationSound]);

  // Update stats periodically
  useEffect(() => {
    if (!isMonitoring) return;

    const updateStats = async () => {
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
      const oneMinuteAgo = new Date(Date.now() - 60 * 1000).toISOString();

      try {
        // Events per minute
        const { count: eventsPerMinute } = await supabase
          .from('webhook_logs')
          .select('*', { count: 'exact', head: true })
          .gte('triggered_at', oneMinuteAgo);

        // Success rate last hour
        const { count: totalEventsHour } = await supabase
          .from('webhook_logs')
          .select('*', { count: 'exact', head: true })
          .gte('triggered_at', oneHourAgo);

        const { count: successfulEventsHour } = await supabase
          .from('webhook_logs')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'success')
          .gte('triggered_at', oneHourAgo);

        // Average response time last hour
        const { data: responseTimes } = await supabase
          .from('webhook_logs')
          .select('response_time_ms')
          .eq('status', 'success')
          .gte('triggered_at', oneHourAgo);

        const avgResponseTime = responseTimes && responseTimes.length > 0
          ? Math.round(responseTimes.reduce((sum, log) => sum + log.response_time_ms, 0) / responseTimes.length)
          : 0;

        // Total errors last hour
        const { count: errorsHour } = await supabase
          .from('webhook_logs')
          .select('*', { count: 'exact', head: true })
          .in('status', ['failed', 'timeout'])
          .gte('triggered_at', oneHourAgo);

        // Active webhooks
        const { count: activeWebhooks } = await supabase
          .from('feature_webhooks')
          .select('*', { count: 'exact', head: true })
          .eq('is_active', true);

        setStats({
          events_per_minute: eventsPerMinute || 0,
          success_rate_last_hour: totalEventsHour ? Math.round(((successfulEventsHour || 0) / totalEventsHour) * 100) : 0,
          avg_response_time_last_hour: avgResponseTime,
          total_errors_last_hour: errorsHour || 0,
          active_webhooks: activeWebhooks || 0
        });
      } catch (error) {
        console.error('Failed to update monitoring stats:', error);
      }
    };

    // Update immediately and then every 30 seconds
    updateStats();
    const interval = setInterval(updateStats, 30000);

    return () => clearInterval(interval);
  }, [isMonitoring]);

  const handleToggleMonitoring = () => {
    setIsMonitoring(!isMonitoring);
    if (!isMonitoring) {
      setEvents([]); // Clear events when starting fresh
    }
  };

  const getStatusBadge = (status: RealtimeWebhookEvent['status']) => {
    switch (status) {
      case 'success':
        return <Badge variant="default" className="bg-green-500"><CheckCircle className="h-3 w-3 mr-1" />Success</Badge>;
      case 'failed':
        return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />Failed</Badge>;
      case 'timeout':
        return <Badge variant="secondary"><Clock className="h-3 w-3 mr-1" />Timeout</Badge>;
    }
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString();
  };

  const filteredEvents = events.filter(event => 
    filterStatus === 'all' || event.status === filterStatus
  );

  return (
    <div className="space-y-6">
      {/* Control Panel */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              <CardTitle>Real-time Webhook Monitor</CardTitle>
              {isMonitoring && (
                <Badge variant="default" className="bg-green-500 animate-pulse">
                  <div className="w-2 h-2 bg-white rounded-full mr-2"></div>
                  Live
                </Badge>
              )}
            </div>
            <Button onClick={handleToggleMonitoring} variant={isMonitoring ? "destructive" : "default"}>
              {isMonitoring ? (
                <>
                  <Pause className="h-4 w-4 mr-2" />
                  Stop Monitoring
                </>
              ) : (
                <>
                  <Play className="h-4 w-4 mr-2" />
                  Start Monitoring
                </>
              )}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-6">
            <div className="flex items-center space-x-2">
              <Switch
                id="sound"
                checked={soundEnabled}
                onCheckedChange={setSoundEnabled}
              />
              <Label htmlFor="sound" className="flex items-center gap-1">
                {soundEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
                Sound Alerts
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                id="autoscroll"
                checked={autoScroll}
                onCheckedChange={setAutoScroll}
              />
              <Label htmlFor="autoscroll">Auto Scroll</Label>
            </div>
            <div className="flex items-center gap-2">
              <Label>Filter:</Label>
              <select 
                value={filterStatus} 
                onChange={(e) => setFilterStatus(e.target.value as any)}
                className="px-2 py-1 border rounded text-sm"
              >
                <option value="all">All Events</option>
                <option value="success">Success Only</option>
                <option value="failed">Failures Only</option>
                <option value="timeout">Timeouts Only</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Live Stats */}
      {isMonitoring && (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center space-x-2">
                <Activity className="h-4 w-4 text-blue-500" />
                <div>
                  <p className="text-2xl font-bold">{stats.events_per_minute}</p>
                  <p className="text-xs text-muted-foreground">Events/Min</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center space-x-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <div>
                  <p className="text-2xl font-bold">{stats.success_rate_last_hour}%</p>
                  <p className="text-xs text-muted-foreground">Success Rate (1h)</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center space-x-2">
                <Clock className="h-4 w-4 text-orange-500" />
                <div>
                  <p className="text-2xl font-bold">{stats.avg_response_time_last_hour}ms</p>
                  <p className="text-xs text-muted-foreground">Avg Response (1h)</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center space-x-2">
                <XCircle className="h-4 w-4 text-destructive" />
                <div>
                  <p className="text-2xl font-bold">{stats.total_errors_last_hour}</p>
                  <p className="text-xs text-muted-foreground">Errors (1h)</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center space-x-2">
                <Activity className="h-4 w-4 text-green-500" />
                <div>
                  <p className="text-2xl font-bold">{stats.active_webhooks}</p>
                  <p className="text-xs text-muted-foreground">Active Webhooks</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Events Stream */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-4 w-4" />
            Live Events
            <Badge variant="secondary">{filteredEvents.length}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!isMonitoring ? (
            <div className="text-center py-8 text-muted-foreground">
              <Activity className="h-8 w-8 mx-auto mb-2" />
              <p>Click "Start Monitoring" to see real-time webhook events</p>
            </div>
          ) : filteredEvents.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Clock className="h-8 w-8 mx-auto mb-2" />
              <p>Waiting for webhook events...</p>
            </div>
          ) : (
            <ScrollArea className="h-96">
              <div className="space-y-2">
                {filteredEvents.map((event, index) => (
                  <div key={event.id} className="border rounded-lg p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {getStatusBadge(event.status)}
                        <span className="text-sm font-medium">{event.webhook_name}</span>
                        <span className="text-xs text-muted-foreground">({event.feature_name})</span>
                        {event.is_test && (
                          <Badge variant="outline" className="text-xs">TEST</Badge>
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {formatTimestamp(event.triggered_at)}
                      </span>
                    </div>
                    
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span>Event: <code className="bg-muted px-1 rounded">{event.event_type}</code></span>
                      {event.status_code && (
                        <span>Code: <code className="bg-muted px-1 rounded">{event.status_code}</code></span>
                      )}
                      <span>Time: <code className="bg-muted px-1 rounded">{event.response_time_ms}ms</code></span>
                      {event.retry_count > 0 && (
                        <span>Retries: <code className="bg-muted px-1 rounded">{event.retry_count}</code></span>
                      )}
                    </div>

                    {event.error_message && (
                      <div className="mt-2">
                        <p className="text-xs text-destructive">
                          <AlertTriangle className="h-3 w-3 inline mr-1" />
                          {event.error_message}
                        </p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  );
}