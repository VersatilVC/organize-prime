import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

interface KBStatsCardProps {
  title: string;
  value: number | string;
  loading?: boolean;
}

export const KBStatsCard = React.memo(function KBStatsCard({ title, value, loading }: KBStatsCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <Skeleton className="h-8 w-24" />
        ) : (
          <div className="text-2xl font-semibold">{value}</div>
        )}
      </CardContent>
    </Card>
  );
});
