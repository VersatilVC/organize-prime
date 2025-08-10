import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useOrganizationData } from '@/contexts/OrganizationContext';
import { kbService } from '../services/kbService';
import { KBCreateDialog } from '../components/KBCreateDialog';
import { KBCard } from '../components/KBCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { KBPermissionGuard } from '../components/shared/KBPermissionGuard';
import { useToast } from '@/hooks/use-toast';

export default function KBDatabases() {
  const { currentOrganization } = useOrganizationData();
  const orgId = currentOrganization?.id;
  const queryClient = useQueryClient();
  const { toast } = useToast();

  React.useEffect(() => {
    document.title = 'Knowledge Base - Knowledge Bases';
  }, []);

  const { data: configs = [], isLoading, refetch } = useQuery({
    queryKey: ['kb.configurations', orgId],
    enabled: !!orgId,
    staleTime: 60_000,
    gcTime: 10 * 60_000,
    queryFn: async () => orgId ? await kbService.listConfigurations(orgId) : [],
  });

  const deleteMutation = useMutation({
    mutationFn: async (configId: string) => orgId ? kbService.deleteConfiguration(orgId, configId) : Promise.reject('No org'),
    onSuccess: () => {
      toast({ title: 'Knowledge Base deleted' });
      queryClient.invalidateQueries({ queryKey: ['kb.configurations', orgId] });
    },
  });

  const duplicateMutation = useMutation({
    mutationFn: async (config: any) => orgId ? kbService.duplicateConfiguration(orgId, config) : Promise.reject('No org'),
    onSuccess: () => {
      toast({ title: 'Knowledge Base duplicated' });
      queryClient.invalidateQueries({ queryKey: ['kb.configurations', orgId] });
    },
  });

  const [search, setSearch] = React.useState('');
  const filtered = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return configs;
    return configs.filter((c: any) => (c.display_name || c.name || '').toLowerCase().includes(q));
  }, [configs, search]);

  return (
    <section aria-label="Knowledge Bases" className="space-y-4 p-4 md:p-6">
      <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Knowledge Bases</h1>
          <p className="text-sm text-muted-foreground">Create and manage your organization knowledge bases.</p>
        </div>
        <div className="flex items-center gap-2">
          <Input
            placeholder="Search KBs..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-56"
            aria-label="Search Knowledge Bases"
          />
          <KBPermissionGuard can="can_create_kb">
            <KBCreateDialog onCreated={() => refetch()} />
          </KBPermissionGuard>
        </div>
      </header>
      <Separator />

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-40 rounded-md border animate-pulse bg-muted" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((cfg: any) => (
            <KBCard
              key={cfg.id}
              config={cfg}
              onDuplicate={(c) => duplicateMutation.mutate(c)}
              onDelete={(c) => deleteMutation.mutate(c.id)}
            />
          ))}
          {filtered.length === 0 && (
            <div className="text-sm text-muted-foreground">No knowledge bases found.</div>
          )}
        </div>
      )}

      <footer className="pt-2">
        <Button variant="link" size="sm" onClick={() => refetch()}>Refresh</Button>
      </footer>
    </section>
  );
}

