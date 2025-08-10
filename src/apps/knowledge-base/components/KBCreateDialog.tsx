import React, { useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { useOrganizationData } from '@/contexts/OrganizationContext';
import { kbService } from '../services/kbService';
import { useToast } from '@/hooks/use-toast';

interface KBCreateDialogProps {
  onCreated?: () => void;
}

export function KBCreateDialog({ onCreated }: KBCreateDialogProps) {
  const { currentOrganization } = useOrganizationData();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({
    name: '',
    display_name: '',
    description: '',
    embedding_model: 'text-embedding-ada-002',
    chunk_size: 1000,
    chunk_overlap: 200,
    table_suffix: 'kb_default',
    is_premium: true,
    type: 'industry_research' as 'industry_research' | 'competitor_intel' | 'news_updates' | 'custom',
  });

  const canContinueBasic = form.name.trim().length > 2 && form.display_name.trim().length > 2;
  const canContinueConfig = form.table_suffix.trim().length > 2;

  const recommendedTypes = useMemo(() => ([
    { key: 'industry_research', label: 'Industry Research', premium: true },
    { key: 'competitor_intel', label: 'Competitor Intelligence', premium: true },
    { key: 'news_updates', label: 'News & Updates', premium: true },
    { key: 'custom', label: 'Custom', premium: true },
  ] as const), []);

  const handleSubmit = async () => {
    if (!currentOrganization) return;
    setSubmitting(true);
    try {
      await kbService.createConfiguration(currentOrganization.id, form);
      toast({ title: 'Knowledge Base created', description: `${form.display_name} is ready.` });
      setOpen(false);
      setStep(1);
      onCreated?.();
    } catch (e: any) {
      toast({ title: 'Creation failed', description: e?.message ?? 'Please try again', variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) setStep(1); }}>
      <DialogTrigger asChild>
        <Button>Create Knowledge Base</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>New Knowledge Base</DialogTitle>
        </DialogHeader>
        <Tabs value={`step-${step}`} className="w-full">
          <TabsList className="grid grid-cols-4 w-full">
            <TabsTrigger value="step-1">Basic Info</TabsTrigger>
            <TabsTrigger value="step-2">Configuration</TabsTrigger>
            <TabsTrigger value="step-3">Type</TabsTrigger>
            <TabsTrigger value="step-4">Review</TabsTrigger>
          </TabsList>
          <Separator className="my-2" />

          <TabsContent value="step-1" className="space-y-4">
            <div>
              <Label htmlFor="name">Name</Label>
              <Input id="name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="internal-name" />
            </div>
            <div>
              <Label htmlFor="display">Display Name</Label>
              <Input id="display" value={form.display_name} onChange={(e) => setForm({ ...form, display_name: e.target.value })} placeholder="Customer Knowledge Base" />
            </div>
            <div>
              <Label htmlFor="desc">Description</Label>
              <Textarea id="desc" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Short description" />
            </div>
          </TabsContent>

          <TabsContent value="step-2" className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Embedding Model</Label>
              <Select value={form.embedding_model} onValueChange={(v) => setForm({ ...form, embedding_model: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select model" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="text-embedding-ada-002">text-embedding-ada-002</SelectItem>
                  <SelectItem value="text-embedding-3-large">text-embedding-3-large</SelectItem>
                  <SelectItem value="text-embedding-3-small">text-embedding-3-small</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Chunk Size</Label>
              <Input type="number" value={form.chunk_size} onChange={(e) => setForm({ ...form, chunk_size: Number(e.target.value) })} />
            </div>
            <div>
              <Label>Chunk Overlap</Label>
              <Input type="number" value={form.chunk_overlap} onChange={(e) => setForm({ ...form, chunk_overlap: Number(e.target.value) })} />
            </div>
            <div>
              <Label>Table Suffix</Label>
              <Input value={form.table_suffix} onChange={(e) => setForm({ ...form, table_suffix: e.target.value.replace(/\s+/g, '_') })} />
            </div>
          </TabsContent>

          <TabsContent value="step-3" className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {recommendedTypes.map((t) => (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => setForm({ ...form, type: t.key as any, is_premium: t.premium })}
                  className={`rounded-md border p-3 text-left ${form.type === t.key ? 'ring-2 ring-primary' : ''}`}
                >
                  <div className="font-medium">{t.label}</div>
                  <div className="text-xs text-muted-foreground">{t.premium ? 'Premium' : 'Free'}</div>
                </button>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="step-4" className="space-y-2">
            <div className="text-sm">Please review your configuration before creating:</div>
            <div className="rounded-md border p-3 text-sm">
              <div><span className="text-muted-foreground">Name:</span> {form.name}</div>
              <div><span className="text-muted-foreground">Display Name:</span> {form.display_name}</div>
              <div><span className="text-muted-foreground">Table Suffix:</span> {form.table_suffix}</div>
              <div><span className="text-muted-foreground">Embedding Model:</span> {form.embedding_model}</div>
              <div><span className="text-muted-foreground">Chunk:</span> {form.chunk_size} / {form.chunk_overlap}</div>
              <div><span className="text-muted-foreground">Plan:</span> {form.is_premium ? 'Premium' : 'Free'}</div>
            </div>
          </TabsContent>
        </Tabs>
        <DialogFooter className="flex items-center justify-between">
          <div className="text-xs text-muted-foreground">Premium features may incur additional costs.</div>
          <div className="flex gap-2">
            {step > 1 && (
              <Button variant="outline" onClick={() => setStep((s) => Math.max(1, s - 1))}>Back</Button>
            )}
            {step < 4 && (
              <Button onClick={() => setStep((s) => Math.min(4, s + 1))} disabled={(step === 1 && !canContinueBasic) || (step === 2 && !canContinueConfig)}>
                Continue
              </Button>
            )}
            {step === 4 && (
              <Button onClick={handleSubmit} disabled={submitting}>
                {submitting ? 'Creating...' : 'Create'}
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
