// Optimized dashboard with improved loading and performance
import React, { memo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { OptimizedIcon } from '@/lib/icon-optimizer';
import { useDashboardData } from '@/hooks/useDashboardData';
import { Skeleton } from '@/components/ui/skeleton';

interface StatCardProps {
  title: string;
  value: number;
  icon: string;
  loading?: boolean;
}

const StatCard = memo(function StatCard({ title, value, icon, loading }: StatCardProps) {
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
          <div className="text-2xl font-bold">{value.toLocaleString()}</div>
        )}
      </CardContent>
    </Card>
  );
});

export const OptimizedDashboard = memo(function OptimizedDashboard() {
  const { organizations, users, notifications, feedback, loading } = useDashboardData();
  
  const stats = [
    { title: 'Organizations', value: organizations, icon: 'building' },
    { title: 'Users', value: users, icon: 'users' },
    { title: 'Notifications', value: notifications, icon: 'bell' },
    { title: 'Feedback', value: feedback, icon: 'messageSquare' },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {stats.map((stat) => (
        <StatCard
          key={stat.title}
          title={stat.title}
          value={stat.value}
          icon={stat.icon}
          loading={loading}
        />
      ))}
    </div>
  );
});