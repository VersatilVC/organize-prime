import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  useWebsiteScanConfigs, 
  useStartWebsiteScan, 
  useDeleteScanConfig,
  type WebsiteScanConfig 
} from '@/features/knowledge-base/hooks/useWebsiteScanning';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { useOrganization } from '@/contexts/OrganizationContext';
import { supabase } from '@/integrations/supabase/client';
import { 
  Globe, 
  Loader2, 
  Search, 
  RefreshCw, 
  AlertCircle, 
  CheckCircle,
  Clock,
  XCircle,
  Settings
} from 'lucide-react';

// Interface moved to hooks file

interface KnowledgeBase {
  id: string;
  display_name: string;
  name: string;
  status: string;
}

const scanFrequencyOptions = [
  { value: 'manual', label: 'Manual Only' },
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
];

const defaultExcludePatterns = [
  '*/privacy*',
  '*/terms*',
  '*/cookie*',
  '*/legal/*',
  '*/sitemap*',
  '*/robots.txt',
  '*/feed*',
  '*/rss*'
];

export function WebsiteIntegrationSettings() {
  const { currentOrganization } = useOrganization();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [websiteUrl, setWebsiteUrl] = useState('');
  const [selectedKbId, setSelectedKbId] = useState('');
  const [maxPages, setMaxPages] = useState(100);
  const [scanFrequency, setScanFrequency] = useState<'manual' | 'daily' | 'weekly' | 'monthly'>('manual');
  const [excludePatterns, setExcludePatterns] = useState(defaultExcludePatterns.join('\n'));
  const [includePatterns, setIncludePatterns] = useState('');
  const [isScanning, setIsScanning] = useState(false);

  // Fetch knowledge bases
  const { data: knowledgeBases, isLoading: kbLoading } = useQuery({
    queryKey: ['knowledge-bases', currentOrganization?.id],
    queryFn: async () => {
      if (!currentOrganization?.id) return [];
      
      const { data, error } = await supabase
        .from('kb_configurations')
        .select('id, display_name, name, status')
        .eq('organization_id', currentOrganization.id)
        .eq('status', 'active')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as KnowledgeBase[];
    },
    enabled: !!currentOrganization?.id,
  });

  // Use custom hooks for website scanning
  const { data: scanConfigs, isLoading: scanConfigsLoading, refetch: refetchScanConfigs } = useWebsiteScanConfigs(currentOrganization?.id);
  const startScanMutation = useStartWebsiteScan();
  const deleteScanMutation = useDeleteScanConfig();

  const handleStartScan = () => {
    if (!websiteUrl || !selectedKbId) {
      toast({
        title: 'Missing Information',
        description: 'Please enter a website URL and select a knowledge base.',
        variant: 'destructive',
      });
      return;
    }

    // Validate URL
    try {
      new URL(websiteUrl);
    } catch {
      toast({
        title: 'Invalid URL',
        description: 'Please enter a valid website URL.',
        variant: 'destructive',
      });
      return;
    }

    setIsScanning(true);

    const excludePatternsArray = excludePatterns
      .split('\n')
      .map(pattern => pattern.trim())
      .filter(pattern => pattern.length > 0);

    const includePatternsArray = includePatterns
      .split('\n')
      .map(pattern => pattern.trim())
      .filter(pattern => pattern.length > 0);

    startScanMutation.mutate({
      action: 'scan',
      websiteUrl,
      kbId: selectedKbId,
      options: {
        maxPages,
        scanType: 'full',
        excludePatterns: excludePatternsArray,
        includePatterns: includePatternsArray.length > 0 ? includePatternsArray : undefined
      }
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'scanning':
        return <Badge variant="secondary" className="flex items-center gap-1">
          <Loader2 className="h-3 w-3 animate-spin" />
          Scanning
        </Badge>;
      case 'completed':
        return <Badge variant="default" className="flex items-center gap-1">
          <CheckCircle className="h-3 w-3" />
          Completed
        </Badge>;
      case 'failed':
        return <Badge variant="destructive" className="flex items-center gap-1">
          <XCircle className="h-3 w-3" />
          Failed
        </Badge>;
      default:
        return <Badge variant="outline" className="flex items-center gap-1">
          <Clock className="h-3 w-3" />
          Inactive
        </Badge>;
    }
  };

  if (!currentOrganization) {
    return (
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Please select an organization to manage website integration.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Website Integration</h2>
        <p className="text-muted-foreground">
          Automatically scan and index your company website into a knowledge base for AI-powered search.
        </p>
      </div>

      {/* New Website Scan Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            Scan Website
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Website URL */}
          <div className="space-y-2">
            <Label htmlFor="website_url">Website URL *</Label>
            <Input
              id="website_url"
              type="url"
              value={websiteUrl}
              onChange={(e) => setWebsiteUrl(e.target.value)}
              placeholder="https://example.com"
              disabled={isScanning}
            />
            <p className="text-sm text-muted-foreground">
              Enter your company's main website URL. The scanner will automatically discover pages.
            </p>
          </div>

          {/* Knowledge Base Selection */}
          <div className="space-y-2">
            <Label htmlFor="knowledge_base">Target Knowledge Base *</Label>
            <Select 
              value={selectedKbId} 
              onValueChange={setSelectedKbId}
              disabled={kbLoading || isScanning}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select knowledge base" />
              </SelectTrigger>
              <SelectContent>
                {knowledgeBases?.map((kb) => (
                  <SelectItem key={kb.id} value={kb.id}>
                    {kb.display_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {knowledgeBases?.length === 0 && (
              <p className="text-sm text-muted-foreground">
                No knowledge bases found. Create one first in Knowledge Base settings.
              </p>
            )}
          </div>

          {/* Advanced Options */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="max_pages">Maximum Pages</Label>
              <Input
                id="max_pages"
                type="number"
                value={maxPages}
                onChange={(e) => setMaxPages(parseInt(e.target.value) || 100)}
                min="1"
                max="10000"
                disabled={isScanning}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="scan_frequency">Scan Frequency</Label>
              <Select 
                value={scanFrequency} 
                onValueChange={(value: any) => setScanFrequency(value)}
                disabled={isScanning}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {scanFrequencyOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Exclude Patterns */}
          <div className="space-y-2">
            <Label htmlFor="exclude_patterns">Exclude Patterns (one per line)</Label>
            <Textarea
              id="exclude_patterns"
              value={excludePatterns}
              onChange={(e) => setExcludePatterns(e.target.value)}
              placeholder="*/privacy*&#10;*/terms*&#10;*/legal/*"
              rows={4}
              disabled={isScanning}
            />
            <p className="text-sm text-muted-foreground">
              URL patterns to exclude from scanning. Use * as wildcard. Default patterns are pre-filled.
            </p>
          </div>

          {/* Include Patterns */}
          <div className="space-y-2">
            <Label htmlFor="include_patterns">Include Patterns (optional, one per line)</Label>
            <Textarea
              id="include_patterns"
              value={includePatterns}
              onChange={(e) => setIncludePatterns(e.target.value)}
              placeholder="/blog/*&#10;/docs/*&#10;/help/*"
              rows={3}
              disabled={isScanning}
            />
            <p className="text-sm text-muted-foreground">
              Leave empty to scan all pages. If specified, only matching pages will be scanned.
            </p>
          </div>

          <Button 
            onClick={handleStartScan} 
            disabled={isScanning || !websiteUrl || !selectedKbId}
            className="w-full"
          >
            {isScanning ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Starting Scan...
              </>
            ) : (
              <>
                <Search className="h-4 w-4 mr-2" />
                Scan Website
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Existing Scan Configurations */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Scan Configurations
            </div>
            <Button variant="outline" size="sm" onClick={() => refetchScanConfigs()}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {scanConfigsLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : scanConfigs?.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Globe className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No website scan configurations found.</p>
              <p className="text-sm">Configure and scan your first website above.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {scanConfigs?.map((config) => (
                <div key={config.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium">{config.website_domain}</h4>
                      {getStatusBadge(config.scan_status)}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Knowledge Base: {config.kb_display_name}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Max Pages: {config.max_pages} • Frequency: {scanFrequencyOptions.find(opt => opt.value === config.scan_frequency)?.label}
                    </p>
                    {config.last_scan_at && (
                      <p className="text-xs text-muted-foreground">
                        Last scan: {new Date(config.last_scan_at).toLocaleString()}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => {
                        setWebsiteUrl(config.website_url);
                        setSelectedKbId(config.kb_id);
                        setMaxPages(config.max_pages);
                        setScanFrequency(config.scan_frequency);
                        setExcludePatterns(config.exclude_patterns?.join('\n') || '');
                        setIncludePatterns(config.include_patterns?.join('\n') || '');
                      }}
                    >
                      <Search className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => deleteScanMutation.mutate({ 
                        configId: config.id, 
                        organizationId: currentOrganization!.id 
                      })}
                      disabled={deleteScanMutation.isPending}
                    >
                      <XCircle className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Help & Information */}
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          <strong>How it works:</strong> The scanner discovers pages through sitemaps and links, 
          extracts clean text content, and stores it in your selected knowledge base for AI-powered search. 
          JavaScript-rendered content is supported, and the system respects robots.txt files.
        </AlertDescription>
      </Alert>
    </div>
  );
}