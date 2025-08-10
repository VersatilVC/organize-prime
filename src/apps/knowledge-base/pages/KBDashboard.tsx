import React from 'react';
import { useKBData } from '../hooks/useKBData';
import { KBStatsCard } from '../components/shared/KBStatsCard';

export default function KBDashboard() {
  const { stats, isLoading } = useKBData();

  React.useEffect(() => {
    document.title = 'Knowledge Base - Dashboard';
  }, []);

  return (
    <section aria-label="Knowledge Base Dashboard" className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <KBStatsCard title="Knowledge Bases" value={stats?.overview.knowledge_bases ?? 0} loading={isLoading} />
        <KBStatsCard title="Files" value={stats?.overview.total_files ?? 0} loading={isLoading} />
        <KBStatsCard title="Conversations" value={stats?.overview.conversations ?? 0} loading={isLoading} />
        <KBStatsCard title="Messages" value={stats?.overview.messages ?? 0} loading={isLoading} />
        <KBStatsCard title="Processing" value={stats?.overview.processing_files ?? 0} loading={isLoading} />
        <KBStatsCard title="Failed" value={stats?.overview.failed_files ?? 0} loading={isLoading} />
      </div>
    </section>
  );
}
