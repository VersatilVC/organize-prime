// Enhanced optimized dashboard with batch data loading
import React, { memo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { OptimizedIcon } from '@/lib/icon-optimizer';
import { useOptimizedDashboard } from '@/hooks/useOptimizedDashboard';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { formatDistanceToNow } from 'date-fns';

interface StatCardProps {
  title: string;
  value: number;
  icon: string;
  loading?: boolean;
  trend?: {
    value: number;
    isPositive: boolean;
  };
}

const StatCard = memo(function StatCard({ title, value, icon, loading, trend }: StatCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <OptimizedIcon name={icon} className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        {loading ? (
          <Skeleton className="h-8 w-16" />
        ) : (
          <div className="space-y-1">
            <div className="text-2xl font-bold">{value.toLocaleString()}</div>
            {trend && (
              <Badge variant={trend.isPositive ? 'default' : 'secondary'} className="text-xs">
                {trend.isPositive ? '↗' : '↘'} {Math.abs(trend.value)}%
              </Badge>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
});

const RecentActivityCard = memo(function RecentActivityCard({ 
  activity, 
  loading 
}: { 
  activity: any[]; 
  loading: boolean; 
}) {
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex items-center space-x-3">
                <Skeleton className="h-8 w-8 rounded-full" />
                <div className="space-y-1 flex-1">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Activity</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {activity.slice(0, 5).map((item) => (
            <div key={item.id} className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="h-2 w-2 bg-primary rounded-full" />
                <div>
                  <p className="text-sm font-medium">{item.action}</p>
                  <p className="text-xs text-muted-foreground">
                    by {item.user_name} • {formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
});

export const OptimizedDashboard = memo(function OptimizedDashboard() {
  const { stats, quickStats, recentActivity, isLoading } = useOptimizedDashboard();
  
  const mainStats = stats ? [
    { title: 'Total Users', value: stats.totalUsers, icon: 'users' },
    { title: 'Active Users', value: stats.activeUsers, icon: 'userCheck' },
    { title: 'Pending Invitations', value: stats.pendingInvitations, icon: 'userPlus' },
    { title: 'Total Feedback', value: stats.totalFeedback, icon: 'messageSquare' },
  ] : [];

  const quickStatsItems = quickStats ? [
    { title: 'Files Today', value: quickStats.files_uploaded_today, icon: 'upload' },
    { title: 'Pending Feedback', value: quickStats.feedback_pending, icon: 'clock' },
    { title: 'Active This Week', value: quickStats.active_users_week, icon: 'activity' },
    { title: 'Storage Used (MB)', value: quickStats.storage_used_mb, icon: 'harddrive' },
  ] : [];

  return (
    <div className="space-y-6">
      {/* Main Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {mainStats.map((stat) => (
          <StatCard
            key={stat.title}
            title={stat.title}
            value={stat.value}
            icon={stat.icon}
            loading={isLoading}
          />
        ))}
      </div>

      {/* Quick Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {quickStatsItems.map((stat) => (
          <StatCard
            key={stat.title}
            title={stat.title}
            value={stat.value}
            icon={stat.icon}
            loading={isLoading}
          />
        ))}
      </div>

      {/* Recent Activity */}
      <RecentActivityCard activity={recentActivity} loading={isLoading} />
    </div>
  );
});