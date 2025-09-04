import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  useWebsiteScanConfigs, 
  useWebsitePages,
  type WebsiteScanConfig,
  type WebsitePage 
} from '../hooks/useWebsiteScanning';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useEffectiveOrganization } from '@/hooks/useEffectiveOrganization';
import { useKnowledgeBases } from '../hooks/useKnowledgeBases';
import { supabase } from '@/integrations/supabase/client';
import { 
  Globe, 
  ExternalLink, 
  Search, 
  RefreshCw, 
  Calendar,
  FileText,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  Loader2
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

// Interfaces moved to hooks file

interface WebsitePagesListProps {
  selectedKbId?: string;
  onKbChange?: (kbId: string) => void;
}

export function WebsitePagesList({ selectedKbId, onKbChange }: WebsitePagesListProps) {
  const { effectiveOrganization } = useEffectiveOrganization();
  const { data: knowledgeBases } = useKnowledgeBases();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Use custom hooks
  const { data: scanConfigs, isLoading: scanConfigsLoading } = useWebsiteScanConfigs(effectiveOrganization?.id);

  // Get active scan config for selected KB
  const activeScanConfig = scanConfigs?.find(config => 
    selectedKbId ? config.kb_id === selectedKbId : true
  );

  const { data: websitePages, isLoading: pagesLoading, refetch } = useWebsitePages(
    effectiveOrganization?.id, 
    activeScanConfig?.id
  );

  // Filter pages based on search and status
  const filteredPages = websitePages?.filter(page => {
    const matchesSearch = searchQuery === '' || 
      page.page_title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      page.page_url.toLowerCase().includes(searchQuery.toLowerCase()) ||
      page.page_description?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || page.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  }) || [];

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'indexed':
        return (
          <Badge variant="default" className="flex items-center gap-1">
            <CheckCircle className="h-3 w-3" />
            Indexed
          </Badge>
        );
      case 'processing':
        return (
          <Badge variant="secondary" className="flex items-center gap-1">
            <Loader2 className="h-3 w-3 animate-spin" />
            Processing
          </Badge>
        );
      case 'failed':
        return (
          <Badge variant="destructive" className="flex items-center gap-1">
            <XCircle className="h-3 w-3" />
            Failed
          </Badge>
        );
      case 'discovered':
        return (
          <Badge variant="outline" className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            Discovered
          </Badge>
        );
      case 'excluded':
        return (
          <Badge variant="secondary" className="flex items-center gap-1">
            <XCircle className="h-3 w-3" />
            Excluded
          </Badge>
        );
      default:
        return (
          <Badge variant="outline">
            {status}
          </Badge>
        );
    }
  };

  const getStats = () => {
    if (!websitePages) return { total: 0, indexed: 0, failed: 0, processing: 0 };
    
    return {
      total: websitePages.length,
      indexed: websitePages.filter(p => p.status === 'indexed').length,
      failed: websitePages.filter(p => p.status === 'failed').length,
      processing: websitePages.filter(p => p.status === 'processing').length
    };
  };

  const stats = getStats();

  if (!effectiveOrganization) {
    return (
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Please select an organization to view website pages.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header and Controls */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Website Pages</h3>
          <p className="text-sm text-muted-foreground">
            Pages crawled and indexed from your website
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Knowledge Base Selector */}
      {knowledgeBases && knowledgeBases.length > 0 && (
        <div className="flex items-center gap-4">
          <label className="text-sm font-medium">Knowledge Base:</label>
          <Select value={selectedKbId || ''} onValueChange={onKbChange}>
            <SelectTrigger className="w-64">
              <SelectValue placeholder="Select knowledge base" />
            </SelectTrigger>
            <SelectContent>
              {knowledgeBases.map((kb) => (
                <SelectItem key={kb.id} value={kb.id}>
                  {kb.display_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Stats Cards */}
      {activeScanConfig && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center">
                <Globe className="h-8 w-8 text-muted-foreground" />
                <div className="ml-4">
                  <p className="text-sm font-medium">Total Pages</p>
                  <p className="text-2xl font-bold">{stats.total}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center">
                <CheckCircle className="h-8 w-8 text-green-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium">Indexed</p>
                  <p className="text-2xl font-bold">{stats.indexed}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center">
                <Loader2 className="h-8 w-8 text-blue-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium">Processing</p>
                  <p className="text-2xl font-bold">{stats.processing}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center">
                <XCircle className="h-8 w-8 text-red-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium">Failed</p>
                  <p className="text-2xl font-bold">{stats.failed}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters and Search */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <Input
            placeholder="Search pages by title, URL, or description..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="indexed">Indexed</SelectItem>
            <SelectItem value="processing">Processing</SelectItem>
            <SelectItem value="failed">Failed</SelectItem>
            <SelectItem value="discovered">Discovered</SelectItem>
            <SelectItem value="excluded">Excluded</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Website Configuration Info */}
      {activeScanConfig && (
        <Alert>
          <Globe className="h-4 w-4" />
          <AlertDescription>
            <div className="flex items-center justify-between">
              <span>
                <strong>Website:</strong> {activeScanConfig.website_domain} • 
                <strong> Status:</strong> {activeScanConfig.scan_status} • 
                {activeScanConfig.last_scan_at && (
                  <><strong> Last scan:</strong> {formatDistanceToNow(new Date(activeScanConfig.last_scan_at), { addSuffix: true })}</>
                )}
              </span>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Pages List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Pages ({filteredPages.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {scanConfigsLoading || pagesLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin" />
              <span className="ml-2">Loading website pages...</span>
            </div>
          ) : !activeScanConfig ? (
            <div className="text-center py-8">
              <Globe className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h4 className="text-lg font-semibold mb-2">No Website Configuration Found</h4>
              <p className="text-muted-foreground mb-4">
                {selectedKbId 
                  ? "This knowledge base doesn't have website scanning configured."
                  : "No knowledge base selected."}
              </p>
              <p className="text-sm text-muted-foreground">
                Go to Company Settings → Website Integration to scan your website.
              </p>
            </div>
          ) : filteredPages.length === 0 ? (
            <div className="text-center py-8">
              <Search className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h4 className="text-lg font-semibold mb-2">No Pages Found</h4>
              <p className="text-muted-foreground">
                {searchQuery || statusFilter !== 'all'
                  ? "No pages match your search criteria."
                  : "No pages have been crawled yet. Start a website scan to index pages."}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredPages.map((page) => (
                <div 
                  key={page.id} 
                  className="flex items-start justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium truncate pr-4">
                          {page.page_title || 'Untitled Page'}
                        </h4>
                        <div className="flex items-center gap-2 mt-1">
                          <a
                            href={page.page_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-blue-600 hover:underline flex items-center gap-1 truncate"
                          >
                            {page.page_url}
                            <ExternalLink className="h-3 w-3 flex-shrink-0" />
                          </a>
                        </div>
                      </div>
                      <div className="flex-shrink-0">
                        {getStatusBadge(page.status)}
                      </div>
                    </div>

                    {page.page_description && (
                      <p className="text-sm text-muted-foreground mb-2 line-clamp-2">
                        {page.page_description}
                      </p>
                    )}

                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <FileText className="h-3 w-3" />
                        {page.word_count} words
                      </span>
                      {page.embedding_count > 0 && (
                        <span className="flex items-center gap-1">
                          <CheckCircle className="h-3 w-3" />
                          {page.embedding_count} embeddings
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {formatDistanceToNow(new Date(page.last_crawled_at), { addSuffix: true })}
                      </span>
                    </div>

                    {page.error_message && (
                      <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-sm text-red-700">
                        <strong>Error:</strong> {page.error_message}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}