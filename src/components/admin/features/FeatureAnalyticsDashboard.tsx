import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DatePickerWithRange } from '@/components/ui/date-picker';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DashboardAreaChart, DashboardBarChart, DashboardPieChart } from '@/components/ChartWidget';
import { TrendingUp, TrendingDown, Users, Activity, Download, Eye, MousePointer, Package } from 'lucide-react';
import { useFeatureAnalytics } from '@/hooks/database/useFeatureAnalytics';
import { useSystemFeatures } from '@/hooks/database/useSystemFeatures';
import { addDays } from 'date-fns';

export function FeatureAnalyticsDashboard() {
  const { analytics, usageStats, isLoading, getAnalyticsByFeature, getEventCounts, getUsageTrends } = useFeatureAnalytics();
  const { features } = useSystemFeatures();
  
  const [selectedFeature, setSelectedFeature] = useState<string>('all');
  const [dateRange, setDateRange] = useState<{
    from?: Date;
    to?: Date;
  }>({
    from: addDays(new Date(), -30),
    to: new Date(),
  });

  const filteredAnalytics = selectedFeature === 'all' 
    ? analytics 
    : getAnalyticsByFeature(selectedFeature);

  const eventCounts = getEventCounts(filteredAnalytics);
  const usageTrends = getUsageTrends(filteredAnalytics, 30);

  const featureUsageData = features.map(feature => {
    const featureAnalytics = getAnalyticsByFeature(feature.slug);
    const counts = getEventCounts(featureAnalytics);
    return {
      name: feature.display_name,
      slug: feature.slug,
      installs: counts.installs,
      page_views: counts.page_views,
      actions: counts.actions,
      total: counts.total,
    };
  }).sort((a, b) => b.total - a.total);

  const eventTypeData = [
    { name: 'Page Views', value: eventCounts.page_views, color: '#3b82f6' },
    { name: 'Actions', value: eventCounts.actions, color: '#10b981' },
    { name: 'Installs', value: eventCounts.installs, color: '#f59e0b' },
    { name: 'Enables', value: eventCounts.enables, color: '#8b5cf6' },
    { name: 'Disables', value: eventCounts.disables, color: '#ef4444' },
    { name: 'Uninstalls', value: eventCounts.uninstalls, color: '#6b7280' },
  ].filter(item => item.value > 0);

  const topFeatures = featureUsageData.slice(0, 5);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Feature Analytics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            <span className="ml-2">Loading analytics...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Filters */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Feature Analytics Dashboard</CardTitle>
              <p className="text-sm text-muted-foreground">
                Monitor feature usage, adoption, and engagement metrics
              </p>
            </div>
            <div className="flex items-center gap-4">
              <Select value={selectedFeature} onValueChange={setSelectedFeature}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Select feature" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Features</SelectItem>
                  {features.map(feature => (
                    <SelectItem key={feature.slug} value={feature.slug}>
                      {feature.display_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <DatePickerWithRange
                value={dateRange}
                onChange={setDateRange}
              />
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Events</p>
                <p className="text-3xl font-bold">{eventCounts.total.toLocaleString()}</p>
              </div>
              <Activity className="h-8 w-8 text-muted-foreground" />
            </div>
            <div className="flex items-center mt-2">
              <TrendingUp className="h-4 w-4 text-green-500 mr-1" />
              <span className="text-sm text-green-500">+12.5%</span>
              <span className="text-sm text-muted-foreground ml-1">from last month</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Page Views</p>
                <p className="text-3xl font-bold">{eventCounts.page_views.toLocaleString()}</p>
              </div>
              <Eye className="h-8 w-8 text-muted-foreground" />
            </div>
            <div className="flex items-center mt-2">
              <TrendingUp className="h-4 w-4 text-green-500 mr-1" />
              <span className="text-sm text-green-500">+8.2%</span>
              <span className="text-sm text-muted-foreground ml-1">from last month</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Feature Installs</p>
                <p className="text-3xl font-bold">{eventCounts.installs.toLocaleString()}</p>
              </div>
              <Download className="h-8 w-8 text-muted-foreground" />
            </div>
            <div className="flex items-center mt-2">
              <TrendingDown className="h-4 w-4 text-red-500 mr-1" />
              <span className="text-sm text-red-500">-2.1%</span>
              <span className="text-sm text-muted-foreground ml-1">from last month</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">User Actions</p>
                <p className="text-3xl font-bold">{eventCounts.actions.toLocaleString()}</p>
              </div>
              <MousePointer className="h-8 w-8 text-muted-foreground" />
            </div>
            <div className="flex items-center mt-2">
              <TrendingUp className="h-4 w-4 text-green-500 mr-1" />
              <span className="text-sm text-green-500">+15.3%</span>
              <span className="text-sm text-muted-foreground ml-1">from last month</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="features">Feature Performance</TabsTrigger>
          <TabsTrigger value="trends">Trends</TabsTrigger>
          <TabsTrigger value="events">Event Types</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            {/* Usage Trends */}
            <Card>
              <CardHeader>
                <CardTitle>Usage Trends (30 Days)</CardTitle>
              </CardHeader>
              <CardContent>
                <DashboardAreaChart 
                  data={usageTrends} 
                  height={300}
                  dataKey="count"
                />
              </CardContent>
            </Card>

            {/* Event Type Distribution */}
            <Card>
              <CardHeader>
                <CardTitle>Event Type Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <DashboardPieChart 
                  data={eventTypeData} 
                  height={300}
                  dataKey="value"
                />
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="features" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Top Performing Features</CardTitle>
              <p className="text-sm text-muted-foreground">
                Features ranked by total activity
              </p>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {topFeatures.map((feature, index) => (
                  <div key={feature.slug} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center space-x-4">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                        <span className="text-sm font-bold text-primary">#{index + 1}</span>
                      </div>
                      <div>
                        <p className="font-medium">{feature.name}</p>
                        <p className="text-sm text-muted-foreground">{feature.slug}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-6">
                      <div className="text-center">
                        <p className="text-sm font-medium">{feature.installs}</p>
                        <p className="text-xs text-muted-foreground">Installs</p>
                      </div>
                      <div className="text-center">
                        <p className="text-sm font-medium">{feature.page_views}</p>
                        <p className="text-xs text-muted-foreground">Views</p>
                      </div>
                      <div className="text-center">
                        <p className="text-sm font-medium">{feature.actions}</p>
                        <p className="text-xs text-muted-foreground">Actions</p>
                      </div>
                      <Badge variant="secondary">{feature.total} total</Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="trends" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Feature Usage Comparison</CardTitle>
            </CardHeader>
            <CardContent>
              <DashboardBarChart 
                data={featureUsageData.slice(0, 10)} 
                height={400}
                dataKey="page_views"
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="events" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Recent Events</CardTitle>
              <p className="text-sm text-muted-foreground">
                Latest feature usage events
              </p>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {filteredAnalytics.slice(0, 20).map((event) => (
                  <div key={event.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className={`w-2 h-2 rounded-full ${
                        event.event_type === 'install' ? 'bg-green-500' :
                        event.event_type === 'uninstall' ? 'bg-red-500' :
                        event.event_type === 'page_view' ? 'bg-blue-500' :
                        event.event_type === 'action_trigger' ? 'bg-purple-500' :
                        'bg-gray-500'
                      }`} />
                      <div>
                        <p className="text-sm font-medium">
                          {event.feature_slug} - {event.event_type.replace('_', ' ')}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(event.created_at).toLocaleString()}
                        </p>
                      </div>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {event.event_type}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}