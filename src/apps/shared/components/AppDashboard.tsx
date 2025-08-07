import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Activity, Settings, TrendingUp, Users, Zap } from 'lucide-react';
import { useAppContext } from './AppLayout';
import { useQuery } from '@tanstack/react-query';
import { AppAnalyticsService } from '../services/AppAnalyticsService';

export interface AppDashboardProps {
  title?: string;
  description?: string;
  actions?: React.ReactNode;
  children?: React.ReactNode;
  showAnalytics?: boolean;
  showQuickActions?: boolean;
  customWidgets?: React.ReactNode[];
}

export function AppDashboard({
  title,
  description,
  actions,
  children,
  showAnalytics = true,
  showQuickActions = true,
  customWidgets = [],
}: AppDashboardProps) {
  const appContext = useAppContext();

  // Get app analytics
  const { data: analytics, isLoading: analyticsLoading } = useQuery({
    queryKey: ['app-analytics', appContext.appId, appContext.organizationId],
    queryFn: async () => {
      const endDate = new Date().toISOString();
      const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(); // 30 days ago
      
      return AppAnalyticsService.getAppAnalytics(
        appContext.appId,
        appContext.organizationId,
        startDate,
        endDate
      );
    },
    enabled: showAnalytics,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const dashboardTitle = title || `${appContext.appName} Dashboard`;
  const dashboardDescription = description || `Overview and management for ${appContext.appName}`;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{dashboardTitle}</h1>
          <p className="text-muted-foreground mt-1">{dashboardDescription}</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary">
            {appContext.configuration.status === 'active' ? 'Active' : 'Inactive'}
          </Badge>
          {actions}
        </div>
      </div>

      {/* Analytics Cards */}
      {showAnalytics && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Page Views</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {analyticsLoading ? '...' : analytics?.pageViews || 0}
              </div>
              <p className="text-xs text-muted-foreground">Last 30 days</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Users</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {analyticsLoading ? '...' : analytics?.uniqueUsers || 0}
              </div>
              <p className="text-xs text-muted-foreground">Unique users</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Sessions</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {analyticsLoading ? '...' : analytics?.sessions || 0}
              </div>
              <p className="text-xs text-muted-foreground">Total sessions</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg. Session</CardTitle>
              <Zap className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {analyticsLoading ? '...' : `${Math.round((analytics?.averageSessionDuration || 0) / 60)}m`}
              </div>
              <p className="text-xs text-muted-foreground">Duration</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Main Content */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          {showAnalytics && <TabsTrigger value="analytics">Analytics</TabsTrigger>}
          {showQuickActions && <TabsTrigger value="actions">Quick Actions</TabsTrigger>}
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          {/* Custom Widgets */}
          {customWidgets.length > 0 && (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {customWidgets.map((widget, index) => (
                <div key={index}>{widget}</div>
              ))}
            </div>
          )}

          {/* Main Content */}
          {children || (
            <Card>
              <CardHeader>
                <CardTitle>Welcome to {appContext.appName}</CardTitle>
                <CardDescription>
                  Get started by exploring the features and configuring your app settings.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col gap-4">
                  <p className="text-sm text-muted-foreground">
                    This app is currently active and ready to use. You can access all features 
                    through the navigation menu or the quick actions below.
                  </p>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm">
                      <Settings className="h-4 w-4 mr-2" />
                      Configure Settings
                    </Button>
                    <Button variant="outline" size="sm">
                      View Documentation
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {showAnalytics && (
          <TabsContent value="analytics" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Feature Usage</CardTitle>
                  <CardDescription>Most used features in the last 30 days</CardDescription>
                </CardHeader>
                <CardContent>
                  {analyticsLoading ? (
                    <div className="space-y-2">
                      <div className="h-4 bg-muted rounded animate-pulse" />
                      <div className="h-4 bg-muted rounded animate-pulse w-3/4" />
                      <div className="h-4 bg-muted rounded animate-pulse w-1/2" />
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {Object.entries(analytics?.featureUsage || {}).length > 0 ? (
                        Object.entries(analytics.featureUsage)
                          .sort(([, a], [, b]) => b - a)
                          .slice(0, 5)
                          .map(([feature, count]) => (
                            <div key={feature} className="flex justify-between items-center">
                              <span className="text-sm">{feature}</span>
                              <Badge variant="secondary">{count}</Badge>
                            </div>
                          ))
                      ) : (
                        <p className="text-sm text-muted-foreground">No feature usage data available</p>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>System Health</CardTitle>
                  <CardDescription>App performance and error tracking</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Error Rate</span>
                      <Badge variant={analytics?.errors === 0 ? "secondary" : "destructive"}>
                        {analyticsLoading ? '...' : `${analytics?.errors || 0} errors`}
                      </Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Status</span>
                      <Badge variant="secondary">Healthy</Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Last Updated</span>
                      <span className="text-sm text-muted-foreground">
                        {appContext.configuration.lastUsedAt 
                          ? new Date(appContext.configuration.lastUsedAt).toLocaleDateString()
                          : 'Never'
                        }
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        )}

        {showQuickActions && (
          <TabsContent value="actions" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
                <CardDescription>Common tasks and shortcuts</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  <Button 
                    variant="outline" 
                    className="h-20 flex-col gap-2"
                    onClick={() => appContext.trackEvent('quick_action_settings')}
                  >
                    <Settings className="h-6 w-6" />
                    <span>App Settings</span>
                  </Button>
                  
                  <Button 
                    variant="outline" 
                    className="h-20 flex-col gap-2"
                    onClick={() => appContext.trackEvent('quick_action_refresh')}
                  >
                    <Activity className="h-6 w-6" />
                    <span>Refresh Data</span>
                  </Button>
                  
                  <Button 
                    variant="outline" 
                    className="h-20 flex-col gap-2"
                    onClick={() => appContext.trackEvent('quick_action_analytics')}
                  >
                    <TrendingUp className="h-6 w-6" />
                    <span>View Analytics</span>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}