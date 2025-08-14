import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { 
  TrendingUp, 
  Users, 
  MessageSquare, 
  Building, 
  Activity,
  Download,
  RefreshCw,
  BarChart3,
  PieChart,
  LineChart
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format, subDays, startOfDay, endOfDay } from 'date-fns';

interface AnalyticsData {
  totalUsers: number;
  totalOrganizations: number;
  totalFeedback: number;
  activeUsers: number;
  userGrowth: number;
  feedbackTrend: number;
  topOrganizations: { name: string; userCount: number }[];
  feedbackByStatus: { status: string; count: number }[];
  userActivityTimeline: { date: string; count: number }[];
}

interface AdvancedAnalyticsDashboardProps {
  className?: string;
}

export function AdvancedAnalyticsDashboard({ className }: AdvancedAnalyticsDashboardProps) {
  const [dateRange, setDateRange] = useState('7');
  const [refreshing, setRefreshing] = useState(false);

  const { data: analyticsData, isLoading, refetch } = useQuery({
    queryKey: ['advanced-analytics', dateRange],
    queryFn: async (): Promise<AnalyticsData> => {
      const endDate = endOfDay(new Date());
      const startDate = startOfDay(subDays(endDate, parseInt(dateRange)));

      // Get total counts
      const [usersResult, orgsResult, feedbackResult] = await Promise.all([
        supabase.from('profiles').select('id', { count: 'exact', head: true }),
        supabase.from('organizations').select('id', { count: 'exact', head: true }),
        supabase.from('feedback').select('id', { count: 'exact', head: true })
      ]);

      // Get recent activity
      const { data: recentUsers } = await supabase
        .from('profiles')
        .select('id, created_at')
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString());

      // Get previous period for growth calculation
      const prevStartDate = startOfDay(subDays(startDate, parseInt(dateRange)));
      const { data: prevUsers } = await supabase
        .from('profiles')
        .select('id')
        .gte('created_at', prevStartDate.toISOString())
        .lt('created_at', startDate.toISOString());

      // Get feedback by status
      const { data: feedbackByStatus } = await supabase
        .from('feedback')
        .select('status')
        .gte('created_at', startDate.toISOString());

      // Get top organizations by user count
      const { data: orgMemberships } = await supabase
        .from('memberships')
        .select(`
          organization_id,
          organizations!inner(name)
        `);

      // Process data
      const userGrowth = prevUsers ? 
        ((recentUsers?.length || 0) / (prevUsers.length || 1) - 1) * 100 : 0;

      const statusCounts = feedbackByStatus?.reduce((acc, item) => {
        acc[item.status] = (acc[item.status] || 0) + 1;
        return acc;
      }, {} as Record<string, number>) || {};

      const orgCounts = orgMemberships?.reduce((acc, item) => {
        const orgName = (item.organizations as any)?.name;
        if (orgName) {
          acc[orgName] = (acc[orgName] || 0) + 1;
        }
        return acc;
      }, {} as Record<string, number>) || {};

      const topOrganizations = Object.entries(orgCounts)
        .map(([name, count]) => ({ name, userCount: count }))
        .sort((a, b) => b.userCount - a.userCount)
        .slice(0, 5);

      // Generate daily user activity
      const userActivityTimeline = [];
      for (let i = parseInt(dateRange); i >= 0; i--) {
        const date = subDays(new Date(), i);
        const dayStart = startOfDay(date);
        const dayEnd = endOfDay(date);
        
        const dayUsers = recentUsers?.filter(user => {
          const userDate = new Date(user.created_at);
          return userDate >= dayStart && userDate <= dayEnd;
        }).length || 0;

        userActivityTimeline.push({
          date: format(date, 'MMM dd'),
          count: dayUsers
        });
      }

      return {
        totalUsers: usersResult.count || 0,
        totalOrganizations: orgsResult.count || 0,
        totalFeedback: feedbackResult.count || 0,
        activeUsers: recentUsers?.length || 0,
        userGrowth,
        feedbackTrend: 0, // Calculate based on feedback data
        topOrganizations,
        feedbackByStatus: Object.entries(statusCounts).map(([status, count]) => ({
          status,
          count
        })),
        userActivityTimeline
      };
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });

  const handleRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const exportData = () => {
    if (!analyticsData) return;
    
    const exportData = {
      generatedAt: new Date().toISOString(),
      dateRange: `${dateRange} days`,
      ...analyticsData
    };
    
    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: 'application/json'
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `analytics-${format(new Date(), 'yyyy-MM-dd')}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (isLoading) {
    return (
      <div className={`space-y-6 ${className}`}>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map(i => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="animate-pulse space-y-2">
                  <div className="h-4 bg-muted rounded w-3/4"></div>
                  <div className="h-8 bg-muted rounded w-1/2"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Select value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Last 7 days</SelectItem>
              <SelectItem value="30">Last 30 days</SelectItem>
              <SelectItem value="90">Last 90 days</SelectItem>
              <SelectItem value="365">Last year</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={refreshing}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button variant="outline" size="sm" onClick={exportData}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analyticsData?.totalUsers.toLocaleString()}</div>
            <div className="flex items-center text-xs text-muted-foreground">
              <TrendingUp className="h-3 w-3 mr-1" />
              {analyticsData?.userGrowth > 0 ? '+' : ''}{analyticsData?.userGrowth.toFixed(1)}% from last period
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Organizations</CardTitle>
            <Building className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analyticsData?.totalOrganizations.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Active organizations</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Feedback</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analyticsData?.totalFeedback.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">All time feedback</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Users</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analyticsData?.activeUsers.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Last {dateRange} days</p>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Analytics */}
      <Tabs defaultValue="organizations" className="space-y-4">
        <TabsList>
          <TabsTrigger value="organizations">Organizations</TabsTrigger>
          <TabsTrigger value="feedback">Feedback</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
        </TabsList>

        <TabsContent value="organizations" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Top Organizations
              </CardTitle>
              <CardDescription>Organizations by user count</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {analyticsData?.topOrganizations.map((org, index) => (
                  <div key={org.name} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium">
                        {index + 1}
                      </div>
                      <span className="font-medium">{org.name}</span>
                    </div>
                    <Badge variant="secondary">{org.userCount} users</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="feedback" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <PieChart className="h-5 w-5" />
                Feedback by Status
              </CardTitle>
              <CardDescription>Distribution of feedback status</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {analyticsData?.feedbackByStatus.map((item) => (
                  <div key={item.status} className="flex items-center justify-between">
                    <span className="capitalize font-medium">{item.status}</span>
                    <Badge variant={item.status === 'resolved' ? 'default' : 'secondary'}>
                      {item.count}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="activity" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <LineChart className="h-5 w-5" />
                User Registration Timeline
              </CardTitle>
              <CardDescription>New user registrations over time</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {analyticsData?.userActivityTimeline.map((day) => (
                  <div key={day.date} className="flex items-center justify-between text-sm">
                    <span>{day.date}</span>
                    <div className="flex items-center gap-2">
                      <div className="w-24 bg-muted rounded-full h-2">
                        <div 
                          className="bg-primary h-2 rounded-full" 
                          style={{ 
                            width: `${Math.max(5, (day.count / Math.max(...(analyticsData?.userActivityTimeline.map(d => d.count) || [1]))) * 100)}%` 
                          }}
                        />
                      </div>
                      <span className="w-8 text-right">{day.count}</span>
                    </div>
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