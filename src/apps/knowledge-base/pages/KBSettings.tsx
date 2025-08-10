import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { useOrganizationData } from '@/contexts/OrganizationContext';
import { useKBAnalytics } from '../hooks/useKBAnalytics';
import { kbService } from '../services/kbService';
import { useToast } from '@/hooks/use-toast';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { DynamicSettingsForm } from '@/components/features/DynamicSettingsForm';
import { FeatureSettingsSchema } from '@/types/feature-settings';
import { useFeatureSettings } from '@/hooks/useFeatureSettings';
import { KBCreateDialog } from '../components/KBCreateDialog';
import { KBPermissionGuard } from '../components/shared/KBPermissionGuard';

export default function KBSettings() {
  React.useEffect(() => {
    document.title = 'Knowledge Base - Settings';
  }, []);

  const { currentOrganization } = useOrganizationData();
  const orgId = currentOrganization?.id;
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Load KB configurations
  const { data: configs = [], isLoading: loadingConfigs, refetch: refetchConfigs } = useQuery({
    queryKey: ['kb.configurations', orgId],
    enabled: !!orgId,
    queryFn: async () => orgId ? kbService.listConfigurations(orgId) : [],
    staleTime: 60_000,
  });

  const defaultKB = React.useMemo(() => configs.find((c: any) => c.is_default) || configs[0], [configs]);

  // Analytics for usage stats
  const { data: analytics } = useKBAnalytics();
  const kbPerf = React.useMemo(() => {
    const perf = (analytics?.kb_performance ?? []) as any[];
    if (!defaultKB) return null;
    return perf.find((p) => p.kb_id === defaultKB.id) || null;
  }, [analytics, defaultKB]);

  // Update default KB
  const updateMutation = useMutation({
    mutationFn: async (payload: any) => orgId ? kbService.updateConfiguration(orgId, payload) : Promise.reject('No org'),
    onSuccess: () => {
      toast({ title: 'Default KB updated' });
      queryClient.invalidateQueries({ queryKey: ['kb.configurations', orgId] });
    }
  });

  // Settings storage using feature slug "knowledge-base"
  const featureSlug = 'knowledge-base';
  const { settings, isLoading: settingsLoading, updateSettings, isUpdating } = useFeatureSettings(featureSlug);

  // Build settings schema covering requested areas
  const schema: FeatureSettingsSchema = React.useMemo(() => ({
    kb_recommendations: {
      title: 'Knowledge Bases',
      description: 'Recommended types and templates for new KBs',
      settings: {
        kb_types_enabled: { type: 'boolean', label: 'Enable Recommended Types', default: true },
      }
    },
    file_processing: {
      title: 'File Processing Configuration',
      description: 'Control how files are processed for indexing',
      requiresRole: 'admin',
      settings: {
        processing_defaultChunkSize: { type: 'number', label: 'Default Chunk Size', description: 'Tokens per chunk', default: 1000, validation: { min: 500, max: 2000 } },
        processing_defaultChunkOverlap: { type: 'number', label: 'Chunk Overlap', description: 'Overlap between chunks', default: 200, validation: { min: 0, max: 500 } },
        processing_embeddingModel: { type: 'select', label: 'Embedding Model', default: 'text-embedding-ada-002', options: [
          { value: 'text-embedding-ada-002', label: 'text-embedding-ada-002' },
          { value: 'text-embedding-3-small', label: 'text-embedding-3-small' },
          { value: 'text-embedding-3-large', label: 'text-embedding-3-large' },
        ]},
        processing_maxFileSize: { type: 'number', label: 'Max File Size (MB)', default: 50, validation: { min: 10, max: 100 } },
        processing_enableBatch: { type: 'boolean', label: 'Enable Batch Processing', default: true },
        processing_autoRetryFailed: { type: 'boolean', label: 'Auto-Retry Failed Files', default: true },
        processing_retentionDays: { type: 'number', label: 'Retention Period (days)', default: 180, validation: { min: 30, max: 365 } },
        processing_duplicateHandling: { type: 'select', label: 'Duplicate Handling', default: 'skip', options: [
          { value: 'skip', label: 'Skip' }, { value: 'overwrite', label: 'Overwrite' }, { value: 'version', label: 'Version' }
        ]},
        processing_metadataRequired: { type: 'boolean', label: 'Require Metadata on Upload', default: false },
      }
    },
    chat_configuration: {
      title: 'AI Chat Configuration',
      description: 'Default chat behavior and limits',
      settings: {
        chat_defaultModel: { type: 'select', label: 'Default Model', default: 'gpt-4', options: [
          { value: 'gpt-4', label: 'GPT-4' }, { value: 'gpt-3.5-turbo', label: 'GPT-3.5 Turbo' }
        ]},
        chat_defaultTemperature: { type: 'number', label: 'Default Temperature', default: 0.7, validation: { min: 0, max: 1 } },
        chat_maxResponseTokens: { type: 'number', label: 'Max Response Tokens', default: 2000, validation: { min: 500, max: 4000 } },
        chat_sourceLimit: { type: 'number', label: 'Source Document Limit', default: 5, validation: { min: 1, max: 10 } },
        chat_responseTimeout: { type: 'number', label: 'Response Timeout (sec)', default: 30, validation: { min: 15, max: 60 } },
        chat_enableModelSelection: { type: 'boolean', label: 'Allow Model Selection', default: true },
        chat_enableTemperatureControl: { type: 'boolean', label: 'Allow Temperature Control', default: true },
        chat_allowSharing: { type: 'boolean', label: 'Enable Conversation Sharing', default: false },
        chat_enableExport: { type: 'boolean', label: 'Enable Export', default: true },
        chat_historyRetentionDays: { type: 'number', label: 'Chat History Retention (days)', default: 90, validation: { min: 7, max: 365 } },
      }
    },
    team_management: {
      title: 'Team Management',
      description: 'Permissions and access control',
      requiresRole: 'admin',
      settings: {
        perm_defaultUploadAllowed: { type: 'boolean', label: 'Default Upload Permission', default: true },
        perm_kbCreationRoles: { type: 'multiselect', label: 'KB Creation Roles', default: ['admin'], options: [
          { value: 'user', label: 'User' }, { value: 'admin', label: 'Admin' }, { value: 'super_admin', label: 'Super Admin' }
        ]},
        perm_fileManagementRoles: { type: 'multiselect', label: 'File Management Roles', default: ['admin'], options: [
          { value: 'user', label: 'User' }, { value: 'admin', label: 'Admin' }, { value: 'super_admin', label: 'Super Admin' }
        ]},
        perm_analyticsRoles: { type: 'multiselect', label: 'Analytics Access Roles', default: ['admin'], options: [
          { value: 'user', label: 'User' }, { value: 'admin', label: 'Admin' }, { value: 'super_admin', label: 'Super Admin' }
        ]},
      }
    },
    integrations_api: {
      title: 'Integrations & API',
      description: 'Webhooks and external services',
      requiresRole: 'admin',
      settings: {
        integ_n8nWebhookUrl: { type: 'text', label: 'N8N Webhook URL', placeholder: 'https://...' },
        integ_n8nApiKey: { type: 'text', label: 'N8N API Key', sensitive: true, placeholder: 'Enter API key' },
        integ_webhookRetryCount: { type: 'number', label: 'Webhook Retry Count', default: 3, validation: { min: 0, max: 10 } },
        integ_rateLimitPerHour: { type: 'number', label: 'Rate Limit Per Hour', default: 1000, validation: { min: 10, max: 100000 } },
        integ_openaiApiKey: { type: 'text', label: 'OpenAI API Key', sensitive: true, placeholder: 'sk-...' },
      }
    },
    analytics_reporting: {
      title: 'Analytics & Reporting',
      description: 'Usage analytics and automated reports',
      settings: {
        analytics_enableUsageTracking: { type: 'boolean', label: 'Enable Usage Tracking', default: true },
        analytics_dataRetentionDays: { type: 'number', label: 'Data Retention (days)', default: 180, validation: { min: 30, max: 365 } },
        analytics_trackUserActivity: { type: 'boolean', label: 'Track User Activity', default: true },
        analytics_enableCostTracking: { type: 'boolean', label: 'Enable Cost Tracking', default: false },
        analytics_autoReportFrequency: { type: 'select', label: 'Automated Reports', default: 'monthly', options: [
          { value: 'weekly', label: 'Weekly' }, { value: 'monthly', label: 'Monthly' }
        ]},
      }
    },
  }), [/* no deps */]);

  const renderDefaultKBCard = () => (
    <Card>
      <CardHeader>
        <CardTitle>Default Knowledge Base</CardTitle>
        <CardDescription>Manage the default "Company Documents" knowledge base.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!defaultKB ? (
          <p className="text-sm text-muted-foreground">No default KB found.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Display Name</Label>
              <Input defaultValue={defaultKB.display_name} onBlur={(e) => updateMutation.mutate({ config_id: defaultKB.id, display_name: e.target.value })} />
            </div>
            <div>
              <Label>Status</Label>
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="capitalize">{defaultKB.status ?? 'active'}</Badge>
                {defaultKB.is_default && <Badge variant="outline">Default</Badge>}
                {defaultKB.is_premium ? <Badge>Premium</Badge> : <Badge variant="outline">Free</Badge>}
              </div>
            </div>
            <div className="md:col-span-2">
              <Label>Description</Label>
              <Textarea defaultValue={defaultKB.description ?? ''} onBlur={(e) => updateMutation.mutate({ config_id: defaultKB.id, description: e.target.value })} />
            </div>
            <div>
              <Label>Embedding Model</Label>
              <Select defaultValue={defaultKB.embedding_model ?? 'text-embedding-ada-002'} onValueChange={(v) => updateMutation.mutate({ config_id: defaultKB.id, embedding_model: v })}>
                <SelectTrigger><SelectValue placeholder="Select model" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="text-embedding-ada-002">text-embedding-ada-002</SelectItem>
                  <SelectItem value="text-embedding-3-small">text-embedding-3-small</SelectItem>
                  <SelectItem value="text-embedding-3-large">text-embedding-3-large</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Chunk Size</Label>
              <Input type="number" defaultValue={defaultKB.chunk_size ?? 1000} onBlur={(e) => updateMutation.mutate({ config_id: defaultKB.id, chunk_size: Number(e.target.value) })} />
            </div>
            <div>
              <Label>Chunk Overlap</Label>
              <Input type="number" defaultValue={defaultKB.chunk_overlap ?? 200} onBlur={(e) => updateMutation.mutate({ config_id: defaultKB.id, chunk_overlap: Number(e.target.value) })} />
            </div>
            <div className="md:col-span-2 grid grid-cols-3 gap-4">
              <div>
                <div className="text-xs text-muted-foreground">Files</div>
                <div className="text-base font-medium">{kbPerf?.file_count ?? defaultKB.file_count ?? 0}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Vectors</div>
                <div className="text-base font-medium">{kbPerf?.total_vectors ?? defaultKB.total_vectors ?? 0}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Avg Response (ms)</div>
                <div className="text-base font-medium">{Math.round(kbPerf?.avg_response_time ?? 0)}</div>
              </div>
            </div>
            <div className="md:col-span-2">
              <Button variant="destructive" disabled>Delete (Default KB)</Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );

  return (
    <section aria-label="Knowledge Base Settings" className="space-y-6 p-4 md:p-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Knowledge Base Settings</h1>
          <p className="text-sm text-muted-foreground">Configure company-level settings for the Knowledge Base app.</p>
        </div>
        <KBPermissionGuard can="can_create_kb">
          <KBCreateDialog onCreated={() => { refetchConfigs(); }} />
        </KBPermissionGuard>
      </header>

      {renderDefaultKBCard()}

      <Card>
        <CardHeader>
          <CardTitle>Additional Knowledge Bases</CardTitle>
          <CardDescription>Create premium KBs using recommended templates.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center gap-2">
          <Badge>Industry Research</Badge>
          <Badge>Competitor Intelligence</Badge>
          <Badge>News & Updates</Badge>
          <Badge variant="outline">Custom KB</Badge>
          <div className="text-xs text-muted-foreground ml-auto">Additional KBs require premium subscription.</div>
        </CardContent>
      </Card>

      <Tabs defaultValue="file_processing" className="space-y-4">
        <TabsList className="grid w-full md:w-auto md:inline-grid" style={{ gridTemplateColumns: 'repeat(6, minmax(0, 1fr))' }}>
          <TabsTrigger value="file_processing">File Processing</TabsTrigger>
          <TabsTrigger value="chat_configuration">AI Chat</TabsTrigger>
          <TabsTrigger value="team_management">Team</TabsTrigger>
          <TabsTrigger value="integrations_api">Integrations & API</TabsTrigger>
          <TabsTrigger value="analytics_reporting">Analytics</TabsTrigger>
          <TabsTrigger value="kb_recommendations">KB Config</TabsTrigger>
        </TabsList>

        {Object.entries(schema).map(([key, section]) => (
          <TabsContent key={key} value={key} className="space-y-4">
            <DynamicSettingsForm
              schema={{ [key]: section }}
              initialValues={settings}
              onSave={updateSettings}
              isLoading={settingsLoading}
              isSaving={isUpdating}
            />
          </TabsContent>
        ))}
      </Tabs>
    </section>
  );
}

