import React, { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { useToast } from '@/hooks/use-toast';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';

export interface KBAppSettingsProps {
  app: { id: string; name: string; slug?: string };
}

const KB_KEYS = [
  'kb_enabled',
  'kb_default_embedding_model',
  'kb_global_file_size_mb',
  'kb_free_kb_limit',
  'kb_premium_kb_price_usd',
  'kb_enable_premium',
  'kb_enable_chat',
  'kb_enable_processing',
  'kb_enable_cross_kb_search',
  'kb_enable_analytics',
  'kb_default_chunk_size',
  'kb_default_chunk_overlap',
  'kb_default_temperature',
  'kb_default_max_tokens',
  'kb_processing_timeout_sec',
  'kb_n8n_base_url',
  'kb_n8n_master_api_key',
  'kb_n8n_webhook_file_processing',
  'kb_n8n_webhook_ai_chat',
  'kb_n8n_webhook_vector_search',
  'kb_n8n_webhook_batch_process',
  'kb_n8n_retry_max',
  'kb_n8n_retry_backoff',
  'kb_n8n_timeout_ms'
] as const;

const defaults = {
  kb_enabled: true,
  kb_default_embedding_model: 'text-embedding-ada-002',
  kb_global_file_size_mb: 50,
  kb_free_kb_limit: 1,
  kb_premium_kb_price_usd: 29,
  kb_enable_premium: true,
  kb_enable_chat: true,
  kb_enable_processing: true,
  kb_enable_cross_kb_search: false,
  kb_enable_analytics: true,
  kb_default_chunk_size: 1000,
  kb_default_chunk_overlap: 200,
  kb_default_temperature: 0.7,
  kb_default_max_tokens: 2000,
  kb_processing_timeout_sec: 300,
  kb_n8n_base_url: '',
  kb_n8n_master_api_key: '',
  kb_n8n_webhook_file_processing: '/webhook/kb-process-file',
  kb_n8n_webhook_ai_chat: '/webhook/kb-ai-chat',
  kb_n8n_webhook_vector_search: '/webhook/kb-vector-search',
  kb_n8n_webhook_batch_process: '/webhook/kb-batch-process',
  kb_n8n_retry_max: 3,
  kb_n8n_retry_backoff: 2,
  kb_n8n_timeout_ms: 30000
};

export const KBAppSettings: React.FC<KBAppSettingsProps> = ({ app }) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [cfg, setCfg] = useState(defaults);

  const { data: settings, isLoading } = useQuery({
    queryKey: ['kb-marketplace-settings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('marketplace_settings' as any)
        .select('key, value')
        .in('key', [...KB_KEYS]);
      if (error) throw error;
      const map: any = { ...defaults };
      (data || []).forEach((row: any) => { map[row.key] = row.value; });
      return map as typeof defaults;
    },
    staleTime: 5 * 60 * 1000,
  });

  useEffect(() => { if (settings) setCfg(settings); }, [settings]);

  const saveMutation = useMutation({
    mutationFn: async (values: typeof defaults) => {
      const updates = Object.entries(values).map(([key, value]) => ({
        key,
        value,
        description: `KB setting ${key}`,
        category: 'kb',
        updated_at: new Date().toISOString(),
      }));
      for (const u of updates) {
        const { error } = await supabase
          .from('marketplace_settings' as any)
          .upsert(u, { onConflict: 'key' });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast({ title: 'Knowledge Base settings saved' });
      queryClient.invalidateQueries({ queryKey: ['kb-marketplace-settings'] });
    },
    onError: (e) => {
      toast({ title: 'Failed to save', description: e instanceof Error ? e.message : 'Unknown error', variant: 'destructive' });
    }
  });

  const { data: webhookLogs } = useQuery({
    queryKey: ['kb-webhook-logs', app.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('marketplace_app_analytics')
        .select('event_type, event_data, created_at')
        .eq('app_id', app.id)
        .eq('event_category', 'n8n_integration')
        .order('created_at', { ascending: false })
        .limit(10);
      if (error) throw error;
      return data || [];
    },
  });

  const { data: systemUsage } = useQuery({
    queryKey: ['kb-system-usage', app.id],
    queryFn: async () => {
      const since = new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString();
      const { data, error } = await supabase
        .from('marketplace_app_analytics')
        .select('event_type')
        .eq('app_id', app.id)
        .gte('created_at', since);
      if (error) throw error;
      const counts: Record<string, number> = {};
      (data || []).forEach((e: any) => { counts[e.event_type] = (counts[e.event_type] || 0) + 1; });
      return counts;
    },
  });

  const isKb = useMemo(() => (app.slug || '').includes('knowledge') || app.name.toLowerCase().includes('knowledge'), [app.slug, app.name]);
  if (!isKb) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Knowledge Base Settings (System-wide)</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-10"><Loader2 className="h-5 w-5 animate-spin" /></div>
        ) : (
          <Tabs defaultValue="global" className="space-y-6">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="global">Global</TabsTrigger>
              <TabsTrigger value="flags">Feature Flags</TabsTrigger>
              <TabsTrigger value="defaults">Defaults</TabsTrigger>
              <TabsTrigger value="n8n">N8N Integration</TabsTrigger>
              <TabsTrigger value="analytics">System Analytics</TabsTrigger>
            </TabsList>

            <TabsContent value="global" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Enable Knowledge Base App</Label>
                    <p className="text-xs text-muted-foreground">Turn the KB app on or off system-wide</p>
                  </div>
                  <Switch checked={cfg.kb_enabled} onCheckedChange={(v) => setCfg((p) => ({ ...p, kb_enabled: v }))} />
                </div>
                <div>
                  <Label>Default Embedding Model</Label>
                  <Input value={cfg.kb_default_embedding_model} onChange={(e) => setCfg((p) => ({ ...p, kb_default_embedding_model: e.target.value }))} placeholder="text-embedding-ada-002" />
                </div>
                <div>
                  <Label>Global File Size Limit (MB)</Label>
                  <Input type="number" value={cfg.kb_global_file_size_mb} onChange={(e) => setCfg((p) => ({ ...p, kb_global_file_size_mb: Number(e.target.value) }))} />
                </div>
                <div>
                  <Label>Free KB Limit per Organization</Label>
                  <Input type="number" value={cfg.kb_free_kb_limit} onChange={(e) => setCfg((p) => ({ ...p, kb_free_kb_limit: Number(e.target.value) }))} />
                </div>
                <div>
                  <Label>Premium KB Pricing (USD/month)</Label>
                  <Input type="number" value={cfg.kb_premium_kb_price_usd} onChange={(e) => setCfg((p) => ({ ...p, kb_premium_kb_price_usd: Number(e.target.value) }))} />
                </div>
              </div>
              <div className="flex gap-2">
                <Button onClick={() => saveMutation.mutate(cfg)} disabled={saveMutation.isPending}>
                  {saveMutation.isPending ? 'Saving...' : 'Save Global Settings'}
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="flags" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Enable Premium KBs</Label>
                    <p className="text-xs text-muted-foreground">Allow creation of premium KBs</p>
                  </div>
                  <Switch checked={cfg.kb_enable_premium} onCheckedChange={(v) => setCfg((p) => ({ ...p, kb_enable_premium: v }))} />
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Enable AI Chat</Label>
                    <p className="text-xs text-muted-foreground">System-wide chat functionality</p>
                  </div>
                  <Switch checked={cfg.kb_enable_chat} onCheckedChange={(v) => setCfg((p) => ({ ...p, kb_enable_chat: v }))} />
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Enable File Processing</Label>
                    <p className="text-xs text-muted-foreground">Automatic file ingestion</p>
                  </div>
                  <Switch checked={cfg.kb_enable_processing} onCheckedChange={(v) => setCfg((p) => ({ ...p, kb_enable_processing: v }))} />
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Enable Cross-KB Search</Label>
                    <p className="text-xs text-muted-foreground">Search across multiple KBs</p>
                  </div>
                  <Switch checked={cfg.kb_enable_cross_kb_search} onCheckedChange={(v) => setCfg((p) => ({ ...p, kb_enable_cross_kb_search: v }))} />
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Enable Analytics</Label>
                    <p className="text-xs text-muted-foreground">Collect usage analytics</p>
                  </div>
                  <Switch checked={cfg.kb_enable_analytics} onCheckedChange={(v) => setCfg((p) => ({ ...p, kb_enable_analytics: v }))} />
                </div>
              </div>
              <Button onClick={() => saveMutation.mutate(cfg)} disabled={saveMutation.isPending}>{saveMutation.isPending ? 'Saving...' : 'Save Feature Flags'}</Button>
            </TabsContent>

            <TabsContent value="defaults" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <Label>Default Chunk Size</Label>
                  <Slider min={500} max={2000} step={50} value={[cfg.kb_default_chunk_size]} onValueChange={([v]) => setCfg((p) => ({ ...p, kb_default_chunk_size: v }))} />
                  <p className="text-xs text-muted-foreground mt-1">Defines how large each text chunk is for embedding.</p>
                </div>
                <div>
                  <Label>Default Chunk Overlap</Label>
                  <Slider min={0} max={500} step={25} value={[cfg.kb_default_chunk_overlap]} onValueChange={([v]) => setCfg((p) => ({ ...p, kb_default_chunk_overlap: v }))} />
                  <p className="text-xs text-muted-foreground mt-1">Overlap helps preserve context between chunks.</p>
                </div>
                <div>
                  <Label>Default Temperature</Label>
                  <Slider min={0} max={2} step={0.1} value={[cfg.kb_default_temperature]} onValueChange={([v]) => setCfg((p) => ({ ...p, kb_default_temperature: v }))} />
                </div>
                <div>
                  <Label>Default Max Tokens</Label>
                  <Input type="number" min={1000} max={16000} value={cfg.kb_default_max_tokens} onChange={(e) => setCfg((p) => ({ ...p, kb_default_max_tokens: Number(e.target.value) }))} />
                </div>
                <div>
                  <Label>Processing Timeout (seconds)</Label>
                  <Input type="number" min={60} max={600} value={cfg.kb_processing_timeout_sec} onChange={(e) => setCfg((p) => ({ ...p, kb_processing_timeout_sec: Number(e.target.value) }))} />
                </div>
              </div>
              <Button onClick={() => saveMutation.mutate(cfg)} disabled={saveMutation.isPending}>{saveMutation.isPending ? 'Saving...' : 'Save Defaults'}</Button>
            </TabsContent>

            <TabsContent value="n8n" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>N8N Base URL</Label>
                  <Input value={cfg.kb_n8n_base_url} onChange={(e) => setCfg((p) => ({ ...p, kb_n8n_base_url: e.target.value }))} placeholder="https://n8n.example.com" />
                </div>
                <div>
                  <Label>Master API Key</Label>
                  <Input type="password" value={cfg.kb_n8n_master_api_key} onChange={(e) => setCfg((p) => ({ ...p, kb_n8n_master_api_key: e.target.value }))} placeholder="••••••" />
                </div>
                <div>
                  <Label>File Processing Endpoint</Label>
                  <Input value={cfg.kb_n8n_webhook_file_processing} onChange={(e) => setCfg((p) => ({ ...p, kb_n8n_webhook_file_processing: e.target.value }))} />
                </div>
                <div>
                  <Label>AI Chat Endpoint</Label>
                  <Input value={cfg.kb_n8n_webhook_ai_chat} onChange={(e) => setCfg((p) => ({ ...p, kb_n8n_webhook_ai_chat: e.target.value }))} />
                </div>
                <div>
                  <Label>Vector Search Endpoint</Label>
                  <Input value={cfg.kb_n8n_webhook_vector_search} onChange={(e) => setCfg((p) => ({ ...p, kb_n8n_webhook_vector_search: e.target.value }))} />
                </div>
                <div>
                  <Label>Batch Processing Endpoint</Label>
                  <Input value={cfg.kb_n8n_webhook_batch_process} onChange={(e) => setCfg((p) => ({ ...p, kb_n8n_webhook_batch_process: e.target.value }))} />
                </div>
                <div>
                  <Label>Max Retries</Label>
                  <Input type="number" value={cfg.kb_n8n_retry_max} onChange={(e) => setCfg((p) => ({ ...p, kb_n8n_retry_max: Number(e.target.value) }))} />
                </div>
                <div>
                  <Label>Backoff Multiplier</Label>
                  <Input type="number" step={0.1} value={cfg.kb_n8n_retry_backoff} onChange={(e) => setCfg((p) => ({ ...p, kb_n8n_retry_backoff: Number(e.target.value) }))} />
                </div>
                <div>
                  <Label>Timeout (ms)</Label>
                  <Input type="number" value={cfg.kb_n8n_timeout_ms} onChange={(e) => setCfg((p) => ({ ...p, kb_n8n_timeout_ms: Number(e.target.value) }))} />
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button variant="secondary" onClick={async () => {
                  const base = (cfg.kb_n8n_base_url || '').replace(/\/+$/, '');
                  const url = `${base}${cfg.kb_n8n_webhook_file_processing}`;
                  try {
                    await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json', ...(cfg.kb_n8n_master_api_key ? { 'X-API-Key': cfg.kb_n8n_master_api_key } : {}) }, mode: 'no-cors', body: JSON.stringify({ ping: 'kb-admin-test', type: 'file' }) });
                    toast({ title: 'Request Sent', description: 'Check N8N execution logs.' });
                  } catch {
                    toast({ title: 'Webhook failed', variant: 'destructive' });
                  }
                }}>Test File Processing</Button>
                <Button variant="secondary" onClick={async () => {
                  const base = (cfg.kb_n8n_base_url || '').replace(/\/+$/, '');
                  const url = `${base}${cfg.kb_n8n_webhook_ai_chat}`;
                  try {
                    await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json', ...(cfg.kb_n8n_master_api_key ? { 'X-API-Key': cfg.kb_n8n_master_api_key } : {}) }, mode: 'no-cors', body: JSON.stringify({ ping: 'kb-admin-test', type: 'chat', message: 'Hello' }) });
                    toast({ title: 'Request Sent', description: 'Check N8N execution logs.' });
                  } catch {
                    toast({ title: 'Webhook failed', variant: 'destructive' });
                  }
                }}>Test AI Chat</Button>
                <Button onClick={() => saveMutation.mutate(cfg)} disabled={saveMutation.isPending}>{saveMutation.isPending ? 'Saving...' : 'Save N8N Settings'}</Button>
              </div>

              <div className="space-y-2">
                <h4 className="text-sm font-medium">Recent Webhook Executions</h4>
                <div className="space-y-2">
                  {(webhookLogs || []).map((log: any, idx: number) => (
                    <div key={idx} className="text-xs text-muted-foreground flex items-center justify-between border rounded p-2">
                      <span>{log.event_type}</span>
                      <span>{new Date(log.created_at).toLocaleString()}</span>
                    </div>
                  ))}
                  {(!webhookLogs || webhookLogs.length === 0) && (
                    <p className="text-xs text-muted-foreground">No webhook logs yet.</p>
                  )}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="analytics" className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card>
                  <CardHeader className="pb-2"><CardTitle className="text-sm">Page Views</CardTitle></CardHeader>
                  <CardContent><div className="text-2xl font-bold">{systemUsage?.page_view || 0}</div></CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2"><CardTitle className="text-sm">Feature Usage</CardTitle></CardHeader>
                  <CardContent><div className="text-2xl font-bold">{Object.values(systemUsage || {}).reduce((a: any, b: any) => a + (typeof b === 'number' ? b : 0), 0)}</div></CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2"><CardTitle className="text-sm">Errors</CardTitle></CardHeader>
                  <CardContent><div className="text-2xl font-bold">{systemUsage?.error || 0}</div></CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2"><CardTitle className="text-sm">Webhooks</CardTitle></CardHeader>
                  <CardContent><div className="text-2xl font-bold">{(webhookLogs || []).length}</div></CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        )}
      </CardContent>
    </Card>
  );
};
