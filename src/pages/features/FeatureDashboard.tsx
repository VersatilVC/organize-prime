import React from 'react';
import { useSimpleFeatureContext } from '@/contexts/SimpleFeatureContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Icons } from '@/components/ui/icons';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

export default function FeatureDashboard() {
  const { config, isLoading } = useSimpleFeatureContext();

  if (isLoading || !config) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
        <div className="space-y-4">
          <Skeleton className="h-8 w-48" />
          <div className="space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </div>
        </div>
      </div>
    );
  }

  // Mock data based on feature type
  const getFeatureStats = () => {
    switch (config.feature_slug) {
      case 'knowledge-base':
        return [
          { label: 'Total Documents', value: '1,234', icon: 'file', change: '+12%' },
          { label: 'Searches Today', value: '89', icon: 'search', change: '+5%' },
          { label: 'Active Collections', value: '24', icon: 'folder', change: '+2%' }
        ];
      case 'content-creation':
        return [
          { label: 'Active Projects', value: '18', icon: 'briefcase', change: '+8%' },
          { label: 'Content Pieces', value: '156', icon: 'edit', change: '+15%' },
          { label: 'Templates', value: '42', icon: 'layout', change: '+3%' }
        ];
      case 'market-intel':
        return [
          { label: 'Tracked Companies', value: '67', icon: 'users', change: '+4%' },
          { label: 'Active Signals', value: '12', icon: 'radar', change: '+2%' },
          { label: 'Funding Events', value: '5', icon: 'dollarSign', change: '+25%' }
        ];
      default:
        return [
          { label: 'Active Items', value: '24', icon: 'package', change: '+5%' },
          { label: 'Usage Today', value: '89', icon: 'activity', change: '+3%' },
          { label: 'Total Actions', value: '156', icon: 'zap', change: '+8%' }
        ];
    }
  };

  const getRecentActivity = () => {
    switch (config.feature_slug) {
      case 'knowledge-base':
        return [
          { action: 'Document uploaded: "Q4 Financial Report"', time: '2 minutes ago', type: 'upload' },
          { action: 'Search performed: "revenue analysis"', time: '15 minutes ago', type: 'search' },
          { action: 'Collection created: "2024 Reports"', time: '1 hour ago', type: 'create' },
          { action: 'Document indexed: "Marketing Strategy.pdf"', time: '2 hours ago', type: 'index' }
        ];
      case 'content-creation':
        return [
          { action: 'Project created: "Social Media Campaign"', time: '5 minutes ago', type: 'create' },
          { action: 'Template used: "Blog Post Template"', time: '30 minutes ago', type: 'template' },
          { action: 'Content published: "Product Launch Article"', time: '1 hour ago', type: 'publish' },
          { action: 'Collaboration started on "Newsletter Draft"', time: '2 hours ago', type: 'collaborate' }
        ];
      case 'market-intel':
        return [
          { action: 'New funding signal: "TechCorp raised $10M"', time: '10 minutes ago', type: 'signal' },
          { action: 'Competitor analysis updated: "MarketLeader Inc"', time: '1 hour ago', type: 'analysis' },
          { action: 'Report generated: "Weekly Market Summary"', time: '3 hours ago', type: 'report' },
          { action: 'Alert triggered: "New competitor detected"', time: '5 hours ago', type: 'alert' }
        ];
      default:
        return [
          { action: 'Feature accessed successfully', time: '5 minutes ago', type: 'access' },
          { action: 'Configuration updated', time: '1 hour ago', type: 'config' },
          { action: 'Data synchronized', time: '2 hours ago', type: 'sync' }
        ];
    }
  };

  const stats = getFeatureStats();
  const activities = getRecentActivity();

  return (
    <div className="space-y-6">
      {/* Overview Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {stats.map((stat, index) => {
          const IconComponent = Icons[stat.icon as keyof typeof Icons] || Icons.package;
          return (
            <Card key={index}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  {stat.label}
                </CardTitle>
                <IconComponent className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
                <p className="text-xs text-muted-foreground">
                  <Badge variant="secondary" className="text-xs">
                    {stat.change}
                  </Badge>
                  {' '}from last month
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>
            Common tasks and actions for {config.display_name}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {['create-content', 'search-data', 'generate-report', 'manage-settings'].map((action, index) => (
              <Button key={index} variant="outline" size="sm">
                {action.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
          <CardDescription>
            Latest actions and updates in {config.display_name}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {activities.map((activity, index) => (
              <div key={index} className="flex items-center space-x-4">
                <div className="w-2 h-2 rounded-full bg-primary"></div>
                <div className="flex-1">
                  <p className="text-sm font-medium">{activity.action}</p>
                  <p className="text-xs text-muted-foreground">{activity.time}</p>
                </div>
                <Badge variant="outline" className="text-xs">
                  {activity.type}
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Feature Widgets */}
      <div className="grid gap-4 md:grid-cols-2">
        {['analytics-overview', 'recent-items'].map((widget, index) => (
          <Card key={index}>
            <CardHeader>
              <CardTitle className="text-base">
                {widget.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-32 flex items-center justify-center text-muted-foreground">
                <p className="text-sm">Widget content coming soon...</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}