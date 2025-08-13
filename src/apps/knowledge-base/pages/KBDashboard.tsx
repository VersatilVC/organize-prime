import React, { useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useKBData } from '../hooks/useKBData';
import { useKBAnalytics } from '../hooks/useKBAnalytics';
import { KBStatsCard } from '../components/shared/KBStatsCard';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { DashboardLineChart, DashboardBarChart, DashboardPieChart } from '@/components/ChartWidget';
import { ChartLoadingSkeleton } from '@/components/LoadingSkeletons';
import { NotificationBell } from '@/components/NotificationBell';
import { useAuth } from '@/contexts/AuthContext';
import { useOrganizationData } from '@/contexts/OrganizationContext';
import { useKBContext } from '../context/KBContext';
import { KBPermissionGuard } from '../components/shared/KBPermissionGuard';
import { useToast } from '@/hooks/use-toast';

export default function KBDashboard() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const { currentOrganization } = useOrganizationData();
  const { stats, isLoading } = useKBData();
  const { data: analytics, isLoading: analyticsLoading } = useKBAnalytics();
  const { configurations, processingFileCount, activeConversations } = useKBContext();

  React.useEffect(() => {
    document.title = 'Knowledge Base Dashboard | OrganizePrime';
    const metaDesc = document.querySelector('meta[name="description"]');
    if (!metaDesc) {
      const m = document.createElement('meta');
      m.name = 'description';
      m.content = 'Knowledge Base dashboard with analytics, activity, and quick actions.';
      document.head.appendChild(m);
    } else {
      metaDesc.setAttribute('content', 'Knowledge Base dashboard with analytics, activity, and quick actions.');
    }
  }, []);

  const displayName = user?.user_metadata?.full_name || user?.email || 'there';
  const orgName = currentOrganization?.name || 'Organization';

  // Derived chart data with safe fallbacks
  const fileTrends = useMemo(() => analytics?.file_upload_trends ?? [], [analytics]);
  const chatActivity = useMemo(() => analytics?.chat_activity ?? [], [analytics]);
  const usageDistribution = useMemo(() => analytics?.kb_usage_distribution ?? [], [analytics]);

  // Simple CSV export for current analytics dataset
  const exportCSV = (rows: any[], filename: string) => {
    try {
      const csvRows = [
        Object.keys(rows[0] ?? {}).join(','),
        ...rows.map((r) => Object.values(r).map((v) => JSON.stringify(v ?? '')).join(',')),
      ];
      const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${filename}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      toast({ title: 'Export failed', description: 'Could not export CSV. Please try again.' });
    }
  };

  // Quick search submit
  const [search, setSearch] = useState('');
  const onSearch = (e: React.FormEvent) => {
    e.preventDefault();
    navigate(`/features/knowledge-base/databases?query=${encodeURIComponent(search)}`);
  };

  return (
    <section aria-label="Knowledge Base Dashboard" className="space-y-6 p-4 md:p-6">
      {/* Header */}
      <header className="flex flex-col gap-4">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-2xl font-semibold">Welcome to Knowledge Base, {displayName}</h1>
            <p className="text-sm text-muted-foreground">
              {orgName} • {configurations.length} KBs •{' '}
              <Badge variant="secondary" className="align-middle">{processingFileCount} processing</Badge>
              <span className="mx-2">•</span>
              <Badge variant="outline" className="align-middle">{activeConversations} active chats</Badge>
            </p>
          </div>
          <div className="flex items-center gap-2">
            <NotificationBell />
            <KBPermissionGuard can="can_upload">
              <Button asChild variant="secondary">
                <Link to="/features/knowledge-base/files">Upload Files</Link>
              </Button>
            </KBPermissionGuard>
            <KBPermissionGuard can="can_chat">
              <Button asChild>
                <Link to="/features/knowledge-base/chat">Start Chat</Link>
              </Button>
            </KBPermissionGuard>
            <KBPermissionGuard can="can_create_kb">
              <Button asChild variant="outline">
                <Link to="/features/knowledge-base/databases">Create KB</Link>
              </Button>
            </KBPermissionGuard>
          </div>
        </div>
        <Separator />
      </header>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <KBStatsCard title="Knowledge Bases" value={stats?.overview?.knowledge_bases ?? 0} loading={isLoading} />
        <KBStatsCard title="Files" value={stats?.overview?.total_files ?? 0} loading={isLoading} />
        <KBStatsCard title="Conversations" value={stats?.overview?.conversations ?? 0} loading={isLoading} />
        <KBStatsCard title="Messages" value={stats?.overview?.messages ?? 0} loading={isLoading} />
        <KBStatsCard title="Processing" value={stats?.overview?.processing_files ?? 0} loading={isLoading} />
        <KBStatsCard title="Failed" value={stats?.overview?.failed_files ?? 0} loading={isLoading} />
      </div>

      {/* Charts */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>File Upload Trends</CardTitle>
            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline" onClick={() => exportCSV(fileTrends, 'file_upload_trends')}>Export CSV</Button>
            </div>
          </CardHeader>
          <CardContent>
            {analyticsLoading ? (
              <ChartLoadingSkeleton />
            ) : (
              <DashboardLineChart data={fileTrends} width={800} height={260} />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>KB Usage Distribution</CardTitle>
            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline" onClick={() => exportCSV(usageDistribution, 'kb_usage_distribution')}>Export CSV</Button>
            </div>
          </CardHeader>
          <CardContent>
            {analyticsLoading ? (
              <ChartLoadingSkeleton />
            ) : (
              <DashboardPieChart data={usageDistribution} width={360} height={260} />
            )}
          </CardContent>
        </Card>
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Chat Activity</CardTitle>
            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline" onClick={() => exportCSV(chatActivity, 'chat_activity')}>Export CSV</Button>
            </div>
          </CardHeader>
          <CardContent>
            {analyticsLoading ? (
              <ChartLoadingSkeleton />
            ) : (
              <DashboardBarChart data={chatActivity} width={800} height={260} />
            )}
          </CardContent>
        </Card>

        {/* Quick Actions Panel */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <form onSubmit={onSearch} className="flex gap-2">
              <Input
                placeholder="Search Knowledge..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                aria-label="Search Knowledge"
              />
              <Button type="submit" variant="secondary">Search</Button>
            </form>
            <div className="flex flex-wrap gap-2">
              <KBPermissionGuard can="can_upload">
                <Button asChild variant="secondary">
                  <Link to="/features/knowledge-base/files">Upload Documents</Link>
                </Button>
              </KBPermissionGuard>
              <KBPermissionGuard can="can_chat">
                <Button asChild>
                  <Link to="/features/knowledge-base/chat">Ask AI</Link>
                </Button>
              </KBPermissionGuard>
            </div>
          </CardContent>
          <CardFooter>
            <p className="text-xs text-muted-foreground">Actions adapt to your permissions.</p>
          </CardFooter>
        </Card>
      </section>

      {/* Recent Activity */}
      <section className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <Card className="xl:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Recent Activity</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {isLoading && (
              <div className="space-y-3">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <Skeleton className="h-10 w-10 rounded-full" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-1/2" />
                      <Skeleton className="h-3 w-1/3" />
                    </div>
                  </div>
                ))}
              </div>
            )}
            {!isLoading && (stats?.recent_activity ?? []).slice(0, 8).map((item: any, idx: number) => (
              <div key={idx} className="flex items-center justify-between gap-3 py-2">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-full bg-muted" aria-hidden />
                  <div>
                    <p className="text-sm font-medium">{item.title ?? 'Activity'}</p>
                    <p className="text-xs text-muted-foreground">{item.description ?? ''}</p>
                  </div>
                </div>
                <Badge variant={item.status === 'failed' ? 'destructive' : item.status === 'processing' ? 'secondary' : 'outline'}>
                  {item.status ?? 'success'}
                </Badge>
              </div>
            ))}
            {!isLoading && (!stats?.recent_activity || stats.recent_activity.length === 0) && (
              <p className="text-sm text-muted-foreground">No recent activity yet.</p>
            )}
          </CardContent>
        </Card>

        {/* Knowledge Bases Overview */}
        <Card>
          <CardHeader>
            <CardTitle>Knowledge Bases</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-3">
              {configurations.length === 0 && (
                <p className="text-sm text-muted-foreground">No KBs yet. Get started by creating one.</p>
              )}
              {configurations.slice(0, 6).map((kb) => (
                <div key={kb.id} className="flex items-center justify-between rounded-md border p-3">
                  <div>
                    <p className="text-sm font-medium">{kb.display_name ?? kb.name}</p>
                    <p className="text-xs text-muted-foreground">ID: {kb.id}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button asChild size="sm" variant="ghost">
                      <Link to={`/features/knowledge-base/files?kbId=${kb.id}`}>Files</Link>
                    </Button>
                    <Button asChild size="sm" variant="ghost">
                      <Link to={`/features/knowledge-base/chat?kbId=${kb.id}`}>Chat</Link>
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
          <CardFooter>
            <Button asChild variant="link" className="px-0"> 
              <Link to="/features/knowledge-base/databases">View all</Link>
            </Button>
          </CardFooter>
        </Card>
      </section>
    </section>
  );
}
