// Phase 4.2: Webhook Notification and Alerting System
// Real-time notifications for webhook failures, performance issues, and system events

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Bell,
  BellRing,
  BellOff,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  Mail,
  MessageSquare,
  Smartphone,
  Settings,
  Plus,
  Trash2,
  Edit,
  Volume2,
  VolumeX
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { realtimeMonitoringService } from '@/services/webhook/RealtimeMonitoringService';
import type { WebhookAlert } from '@/types/webhook-monitoring';
import { toast } from 'sonner';

interface WebhookNotificationCenterProps {
  organizationId: string;
  userId: string;
  className?: string;
}

interface NotificationRule {
  id: string;
  name: string;
  description: string;
  webhook_id?: string;
  element_id?: string;
  trigger_conditions: {
    failure_threshold: number;
    response_time_threshold: number;
    error_rate_threshold: number;
    performance_score_threshold: number;
  };
  notification_channels: {
    in_app: boolean;
    email: boolean;
    sms: boolean;
    slack: boolean;
    webhook: boolean;
  };
  notification_settings: {
    email_address?: string;
    phone_number?: string;
    slack_channel?: string;
    webhook_url?: string;
  };
  is_enabled: boolean;
  cooldown_minutes: number;
  escalation_rules?: EscalationRule[];
  created_at: string;
  updated_at: string;
}

interface EscalationRule {
  level: number;
  delay_minutes: number;
  channels: string[];
  recipients: string[];
}

interface NotificationHistory {
  id: string;
  rule_id: string;
  webhook_id: string;
  alert_type: 'critical' | 'warning' | 'info';
  message: string;
  channels_sent: string[];
  delivery_status: Record<string, 'pending' | 'sent' | 'failed'>;
  triggered_at: string;
  acknowledged_at?: string;
  acknowledged_by?: string;
}

const ALERT_TYPES = [
  { value: 'failure', label: 'Webhook Failures', icon: XCircle, color: 'text-red-500' },
  { value: 'performance', label: 'Performance Issues', icon: Clock, color: 'text-orange-500' },
  { value: 'availability', label: 'Availability Issues', icon: AlertTriangle, color: 'text-yellow-500' },
  { value: 'success', label: 'Recovery Notifications', icon: CheckCircle, color: 'text-green-500' }
];

const NOTIFICATION_CHANNELS = [
  { id: 'in_app', label: 'In-App', icon: Bell },
  { id: 'email', label: 'Email', icon: Mail },
  { id: 'sms', label: 'SMS', icon: Smartphone },
  { id: 'slack', label: 'Slack', icon: MessageSquare },
  { id: 'webhook', label: 'Webhook', icon: Bell }
];

export const WebhookNotificationCenter: React.FC<WebhookNotificationCenterProps> = ({
  organizationId,
  userId,
  className = ''
}) => {
  const [notificationRules, setNotificationRules] = useState<NotificationRule[]>([]);
  const [notificationHistory, setNotificationHistory] = useState<NotificationHistory[]>([]);
  const [activeAlerts, setActiveAlerts] = useState<WebhookAlert[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('alerts');
  const [selectedRule, setSelectedRule] = useState<NotificationRule | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Load notification data
  useEffect(() => {
    loadNotificationData();
    const interval = setInterval(loadNotificationData, 30000);
    return () => clearInterval(interval);
  }, [organizationId]);

  // Set up real-time notifications
  useEffect(() => {
    const connectMonitoring = async () => {
      await realtimeMonitoringService.connect();
      
      // Listen for new alerts
      realtimeMonitoringService.on('alert_triggered', handleNewAlert);
      realtimeMonitoringService.on('alert_resolved', handleAlertResolved);
    };

    connectMonitoring();
    
    return () => {
      realtimeMonitoringService.off('alert_triggered', handleNewAlert);
      realtimeMonitoringService.off('alert_resolved', handleAlertResolved);
    };
  }, []);

  const loadNotificationData = async () => {
    setIsLoading(true);
    try {
      // Load notification rules
      const { data: rules, error: rulesError } = await supabase
        .from('webhook_notification_rules')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('created_by', userId)
        .order('created_at', { ascending: false });

      if (rulesError) throw rulesError;
      setNotificationRules(rules || []);

      // Load recent notification history
      const { data: history, error: historyError } = await supabase
        .from('webhook_notification_history')
        .select('*')
        .eq('organization_id', organizationId)
        .order('triggered_at', { ascending: false })
        .limit(100);

      if (historyError) throw historyError;
      setNotificationHistory(history || []);

      // Load active alerts
      const { data: alerts, error: alertsError } = await supabase
        .from('webhook_alerts')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('is_resolved', false)
        .order('triggered_at', { ascending: false });

      if (alertsError) throw alertsError;
      setActiveAlerts(alerts || []);

    } catch (error) {
      console.error('Failed to load notification data:', error);
      toast.error('Failed to load notification settings');
    } finally {
      setIsLoading(false);
    }
  };

  // Real-time event handlers
  const handleNewAlert = async (alert: WebhookAlert) => {
    setActiveAlerts(prev => [alert, ...prev]);
    
    // Play notification sound
    if (soundEnabled) {
      const audio = new Audio('/notification-sound.wav');
      audio.play().catch(() => {}); // Ignore if no sound file
    }
    
    // Show in-app notification
    toast.error(alert.alert_message, {
      description: `Webhook: ${alert.webhook_id}`,
      duration: 5000,
    });
    
    // Process notification rules
    await processAlertThroughRules(alert);
  };

  const handleAlertResolved = (alert: WebhookAlert) => {
    setActiveAlerts(prev => prev.filter(a => a.id !== alert.id));
    
    toast.success(`Alert resolved: ${alert.alert_message}`, {
      description: `Webhook: ${alert.webhook_id}`,
    });
  };

  const processAlertThroughRules = async (alert: WebhookAlert) => {
    const applicableRules = notificationRules.filter(rule => 
      rule.is_enabled && 
      (!rule.webhook_id || rule.webhook_id === alert.webhook_id)
    );

    for (const rule of applicableRules) {
      if (shouldTriggerRule(rule, alert)) {
        await executeNotificationRule(rule, alert);
      }
    }
  };

  const shouldTriggerRule = (rule: NotificationRule, alert: WebhookAlert): boolean => {
    const conditions = rule.trigger_conditions;
    
    // Check alert type and severity
    if (alert.alert_type === 'critical' || alert.alert_type === 'warning') {
      return true;
    }
    
    // Check specific thresholds if available in alert metadata
    if (alert.alert_data) {
      const data = alert.alert_data as any;
      
      if (data.error_rate && data.error_rate >= conditions.error_rate_threshold) {
        return true;
      }
      
      if (data.response_time && data.response_time >= conditions.response_time_threshold) {
        return true;
      }
      
      if (data.performance_score && data.performance_score <= conditions.performance_score_threshold) {
        return true;
      }
    }
    
    return false;
  };

  const executeNotificationRule = async (rule: NotificationRule, alert: WebhookAlert) => {
    const channels = rule.notification_channels;
    const deliveryStatus: Record<string, 'pending' | 'sent' | 'failed'> = {};
    const channelsSent: string[] = [];

    try {
      // Send in-app notification (already handled above)
      if (channels.in_app) {
        channelsSent.push('in_app');
        deliveryStatus.in_app = 'sent';
      }

      // Send email notification
      if (channels.email && rule.notification_settings.email_address) {
        try {
          await sendEmailNotification(rule, alert);
          channelsSent.push('email');
          deliveryStatus.email = 'sent';
        } catch (error) {
          deliveryStatus.email = 'failed';
        }
      }

      // Send webhook notification
      if (channels.webhook && rule.notification_settings.webhook_url) {
        try {
          await sendWebhookNotification(rule, alert);
          channelsSent.push('webhook');
          deliveryStatus.webhook = 'sent';
        } catch (error) {
          deliveryStatus.webhook = 'failed';
        }
      }

      // Record notification in history
      await supabase.from('webhook_notification_history').insert({
        organization_id: organizationId,
        rule_id: rule.id,
        webhook_id: alert.webhook_id,
        alert_type: alert.alert_type,
        message: alert.alert_message,
        channels_sent: channelsSent,
        delivery_status: deliveryStatus,
        triggered_at: new Date().toISOString()
      });

    } catch (error) {
      console.error('Failed to execute notification rule:', error);
    }
  };

  const sendEmailNotification = async (rule: NotificationRule, alert: WebhookAlert) => {
    // Use Supabase Edge Function to send email
    await supabase.functions.invoke('send-notification-email', {
      body: {
        to: rule.notification_settings.email_address,
        subject: `Webhook Alert: ${alert.alert_message}`,
        webhook_id: alert.webhook_id,
        alert_type: alert.alert_type,
        alert_message: alert.alert_message,
        rule_name: rule.name
      }
    });
  };

  const sendWebhookNotification = async (rule: NotificationRule, alert: WebhookAlert) => {
    const response = await fetch(rule.notification_settings.webhook_url!, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        webhook_id: alert.webhook_id,
        alert_type: alert.alert_type,
        alert_message: alert.alert_message,
        triggered_at: alert.triggered_at,
        rule_name: rule.name
      })
    });

    if (!response.ok) {
      throw new Error(`Webhook notification failed: ${response.statusText}`);
    }
  };

  const acknowledgeAlert = async (alertId: string) => {
    try {
      await supabase
        .from('webhook_alerts')
        .update({
          is_acknowledged: true,
          acknowledged_at: new Date().toISOString(),
          acknowledged_by: userId
        })
        .eq('id', alertId);

      setActiveAlerts(prev => prev.map(alert => 
        alert.id === alertId 
          ? { ...alert, is_acknowledged: true, acknowledged_by: userId }
          : alert
      ));

      toast.success('Alert acknowledged');
    } catch (error) {
      console.error('Failed to acknowledge alert:', error);
      toast.error('Failed to acknowledge alert');
    }
  };

  const createNotificationRule = async (ruleData: Partial<NotificationRule>) => {
    try {
      const { data, error } = await supabase
        .from('webhook_notification_rules')
        .insert({
          ...ruleData,
          organization_id: organizationId,
          created_by: userId,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) throw error;

      setNotificationRules(prev => [data, ...prev]);
      setIsCreateDialogOpen(false);
      toast.success('Notification rule created');
    } catch (error) {
      console.error('Failed to create notification rule:', error);
      toast.error('Failed to create notification rule');
    }
  };

  const deleteNotificationRule = async (ruleId: string) => {
    try {
      await supabase
        .from('webhook_notification_rules')
        .delete()
        .eq('id', ruleId);

      setNotificationRules(prev => prev.filter(rule => rule.id !== ruleId));
      toast.success('Notification rule deleted');
    } catch (error) {
      console.error('Failed to delete notification rule:', error);
      toast.error('Failed to delete notification rule');
    }
  };

  // Render methods
  const renderActiveAlerts = () => (
    <div className="space-y-4">
      {activeAlerts.map(alert => (
        <Alert key={alert.id} variant={alert.alert_type === 'critical' ? 'destructive' : 'default'}>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <div className="flex justify-between items-start">
              <div>
                <div className="font-medium">{alert.alert_message}</div>
                <div className="text-sm text-muted-foreground">
                  Webhook: {alert.webhook_id} • {new Date(alert.triggered_at).toLocaleString()}
                </div>
              </div>
              <div className="flex gap-2">
                <Badge variant={alert.alert_type === 'critical' ? 'destructive' : 'secondary'}>
                  {alert.alert_type}
                </Badge>
                {!alert.is_acknowledged && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => acknowledgeAlert(alert.id)}
                  >
                    Acknowledge
                  </Button>
                )}
              </div>
            </div>
          </AlertDescription>
        </Alert>
      ))}
      
      {activeAlerts.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          <CheckCircle className="h-8 w-8 mx-auto mb-2 text-green-500" />
          No active alerts
        </div>
      )}
    </div>
  );

  const renderNotificationRules = () => (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium">Notification Rules</h3>
        <Button onClick={() => setIsCreateDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Rule
        </Button>
      </div>

      {notificationRules.map(rule => (
        <Card key={rule.id}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  {rule.name}
                  {!rule.is_enabled && <Badge variant="secondary">Disabled</Badge>}
                </CardTitle>
                <CardDescription>{rule.description}</CardDescription>
              </div>
              <div className="flex gap-2">
                <Switch
                  checked={rule.is_enabled}
                  onCheckedChange={async (checked) => {
                    await supabase
                      .from('webhook_notification_rules')
                      .update({ is_enabled: checked })
                      .eq('id', rule.id);
                    setNotificationRules(prev => prev.map(r => 
                      r.id === rule.id ? { ...r, is_enabled: checked } : r
                    ));
                  }}
                />
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setSelectedRule(rule)}
                >
                  <Edit className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => deleteNotificationRule(rule.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2">
              {Object.entries(rule.notification_channels)
                .filter(([_, enabled]) => enabled)
                .map(([channel]) => {
                  const channelConfig = NOTIFICATION_CHANNELS.find(c => c.id === channel);
                  if (!channelConfig) return null;
                  return (
                    <Badge key={channel} variant="outline">
                      <channelConfig.icon className="h-3 w-3 mr-1" />
                      {channelConfig.label}
                    </Badge>
                  );
                })}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );

  const renderNotificationHistory = () => (
    <ScrollArea className="h-96">
      <div className="space-y-2">
        {notificationHistory.map(notification => (
          <div key={notification.id} className="flex items-center justify-between p-3 border rounded-lg">
            <div>
              <div className="font-medium">{notification.message}</div>
              <div className="text-sm text-muted-foreground">
                {new Date(notification.triggered_at).toLocaleString()}
              </div>
            </div>
            <div className="flex gap-2">
              {notification.channels_sent.map(channel => (
                <Badge key={channel} variant="outline" className="text-xs">
                  {channel}
                </Badge>
              ))}
            </div>
          </div>
        ))}
      </div>
    </ScrollArea>
  );

  const renderSettings = () => (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>General Settings</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Sound Notifications</Label>
              <div className="text-sm text-muted-foreground">
                Play sound when new alerts are received
              </div>
            </div>
            <div className="flex items-center gap-2">
              {soundEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
              <Switch
                checked={soundEnabled}
                onCheckedChange={setSoundEnabled}
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  if (isLoading) {
    return (
      <Card className={className}>
        <CardContent className="p-8">
          <div className="flex items-center justify-center space-x-2">
            <Bell className="h-5 w-5 animate-spin" />
            <span>Loading notifications...</span>
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
              <BellRing className="h-6 w-6" />
              Webhook Notifications
              {activeAlerts.length > 0 && (
                <Badge variant="destructive">{activeAlerts.length}</Badge>
              )}
            </CardTitle>
            <CardDescription>
              Manage webhook alerts and notification preferences
            </CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="alerts">
              Active Alerts
              {activeAlerts.length > 0 && (
                <Badge variant="destructive" className="ml-2 px-1 py-0 text-xs">
                  {activeAlerts.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="rules">Rules ({notificationRules.length})</TabsTrigger>
            <TabsTrigger value="history">History</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>

          <TabsContent value="alerts" className="mt-6">
            {renderActiveAlerts()}
          </TabsContent>

          <TabsContent value="rules" className="mt-6">
            {renderNotificationRules()}
          </TabsContent>

          <TabsContent value="history" className="mt-6">
            {renderNotificationHistory()}
          </TabsContent>

          <TabsContent value="settings" className="mt-6">
            {renderSettings()}
          </TabsContent>
        </Tabs>
      </CardContent>

      {/* Create Rule Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create Notification Rule</DialogTitle>
            <DialogDescription>
              Set up automated notifications for webhook events
            </DialogDescription>
          </DialogHeader>
          {/* Add notification rule creation form here */}
        </DialogContent>
      </Dialog>
    </Card>
  );
};