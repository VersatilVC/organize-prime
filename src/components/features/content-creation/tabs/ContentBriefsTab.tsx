// Content Briefs Tab - Phase 3: UI Components

import React, { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { DataTable } from '@/components/composition/DataTable';
import { getContentBriefColumns } from '../columns/contentBriefColumns';
import { 
  useContentBriefs,
  useDeleteContentBrief,
  useGenerateContentFromBrief,
  useUpdateContentBrief,
  useContentTypeOptions
} from '@/hooks/content-creation';
import type { 
  ContentBriefWithDetails,
  ContentBriefFilters
} from '@/types/content-creation';
import { 
  Plus, 
  Search, 
  FileText,
  Sparkles,
  Filter,
  Download,
  Check,
  X
} from 'lucide-react';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';

interface ContentBriefsTabProps {
  onCreateBrief: () => void;
  onEditBrief: (brief: ContentBriefWithDetails) => void;
  onGenerateContent?: (brief: ContentBriefWithDetails) => void;
  onViewBrief?: (briefId: string) => void;
  className?: string;
}

export const ContentBriefsTab = React.memo<ContentBriefsTabProps>(({
  onCreateBrief,
  onEditBrief,
  onGenerateContent,
  onViewBrief,
  className
}) => {
  // State management
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [contentTypeFilter, setContentTypeFilter] = useState<string>('all');
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState<string>('created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [deleteBrief, setDeleteBrief] = useState<ContentBriefWithDetails | null>(null);
  const [page, setPage] = useState(1);

  // Build filters object
  const filters: ContentBriefFilters = useMemo(() => {
    const result: ContentBriefFilters = {};
    if (searchQuery.trim()) result.search = searchQuery.trim();
    if (statusFilter && statusFilter !== 'all') result.status = statusFilter as any;
    if (contentTypeFilter && contentTypeFilter !== 'all') result.content_type = contentTypeFilter;
    return result;
  }, [searchQuery, statusFilter, contentTypeFilter]);

  // Data fetching
  const {
    data: briefsResponse,
    isLoading,
    error,
    refetch
  } = useContentBriefs(filters, { page, limit: 10, sortBy, sortOrder });

  const { data: contentTypeOptions = [] } = useContentTypeOptions();

  // Mutations
  const deleteBriefMutation = useDeleteContentBrief({
    onSuccess: () => {
      setDeleteBrief(null);
      refetch();
    }
  });

  const generateContentMutation = useGenerateContentFromBrief('', {
    onSuccess: () => {
      if (onGenerateContent) {
        // Navigate to content items tab or show success notification
        toast.success('Content generated successfully!');
      }
    }
  });

  const updateBriefMutation = useUpdateContentBrief('', {
    onSuccess: () => refetch()
  });

  // Event handlers
  const handleSort = (key: string) => {
    if (sortBy === key) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(key);
      setSortOrder('asc');
    }
  };

  const handleView = (brief: ContentBriefWithDetails) => {
    if (onViewBrief) {
      onViewBrief(brief.id);
    } else {
      console.log('View brief:', brief.id);
      toast.info('Brief details view - coming soon!');
    }
  };

  const handleDelete = (brief: ContentBriefWithDetails) => {
    setDeleteBrief(brief);
  };

  const confirmDelete = () => {
    if (deleteBrief) {
      deleteBriefMutation.mutate(deleteBrief.id);
    }
  };

  const handleGenerateContent = (brief: ContentBriefWithDetails) => {
    if (onGenerateContent) {
      onGenerateContent(brief);
    } else {
      // Default implementation - call the mutation directly
      generateContentMutation.mutate({ 
        format: 'standard',
        tone: brief.tone || 'professional',
        length: 'medium' 
      });
    }
  };

  const handleApprove = (brief: ContentBriefWithDetails) => {
    updateBriefMutation.mutate({
      ...brief,
      status: 'approved'
    });
    toast.success('Brief approved successfully!');
  };

  const handleReject = (brief: ContentBriefWithDetails) => {
    updateBriefMutation.mutate({
      ...brief,
      status: 'archived'
    });
    toast.success('Brief rejected and archived');
  };

  const handleItemSelect = (itemId: string, selected: boolean) => {
    setSelectedItems(prev => 
      selected 
        ? [...prev, itemId]
        : prev.filter(id => id !== itemId)
    );
  };

  const handleSelectAll = (selected: boolean) => {
    setSelectedItems(selected ? (briefsResponse?.data.map(item => item.id) || []) : []);
  };

  const handleBulkApprove = () => {
    if (selectedItems.length === 0) {
      toast.error('Please select briefs to approve');
      return;
    }
    
    // Implement bulk approval
    toast.info(`Bulk approve ${selectedItems.length} briefs - coming soon!`);
  };

  const handleBulkExport = () => {
    if (selectedItems.length === 0) {
      toast.error('Please select briefs to export');
      return;
    }
    
    toast.info('Bulk export coming soon!', {
      description: `Export ${selectedItems.length} selected briefs to CSV/JSON.`
    });
  };

  // Column configuration
  const columns = getContentBriefColumns({
    onEdit: onEditBrief,
    onDelete: handleDelete,
    onGenerateContent: handleGenerateContent,
    onView: handleView,
    onApprove: handleApprove,
    onReject: handleReject
  });

  // Loading state
  if (isLoading) {
    return (
      <div className={className}>
        <div className="space-y-6">
          {/* Header skeleton */}
          <div className="flex flex-col sm:flex-row gap-4">
            <Skeleton className="h-10 flex-1" />
            <Skeleton className="h-10 w-32" />
            <Skeleton className="h-10 w-40" />
          </div>
          
          {/* Action buttons skeleton */}
          <div className="flex flex-col sm:flex-row gap-4">
            <Skeleton className="h-10 w-40" />
            <Skeleton className="h-10 w-32" />
          </div>

          {/* Table skeleton */}
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className={className}>
        <div className="text-center py-8">
          <div className="text-destructive mb-2">Error loading content briefs</div>
          <div className="text-sm text-muted-foreground mb-4">{error.message}</div>
          <Button onClick={() => refetch()} variant="outline">
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  const briefs = briefsResponse?.data || [];
  const totalCount = briefsResponse?.pagination.total || 0;
  const approvedCount = briefs.filter(brief => brief.status === 'approved').length;

  return (
    <div className={className}>
      {/* Header with title and description */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
            <FileText className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h2 className="text-xl font-semibold">Content Briefs</h2>
            <p className="text-sm text-muted-foreground">
              Detailed specifications and requirements for content creation
            </p>
          </div>
        </div>
        
        {totalCount > 0 && (
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-sm">
              {totalCount} brief{totalCount === 1 ? '' : 's'}
            </Badge>
            {approvedCount > 0 && (
              <Badge variant="secondary" className="text-sm">
                {approvedCount} ready to generate
              </Badge>
            )}
            {selectedItems.length > 0 && (
              <Badge variant="secondary" className="text-sm">
                {selectedItems.length} selected
              </Badge>
            )}
          </div>
        )}
      </div>

      {/* Action Buttons Row */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="flex gap-2">
          <Button onClick={onCreateBrief} className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Create Brief
          </Button>
        </div>
        
        <div className="flex gap-2 sm:ml-auto">
          {selectedItems.length > 0 && (
            <>
              <Button onClick={handleBulkApprove} variant="outline" size="sm">
                <Check className="h-4 w-4 mr-2" />
                Approve ({selectedItems.length})
              </Button>
              <Button onClick={handleBulkExport} variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                Export ({selectedItems.length})
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Filters Row */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search briefs by title, requirements, or keywords..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-32">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="in_progress">In Progress</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="archived">Archived</SelectItem>
          </SelectContent>
        </Select>

        <Select value={contentTypeFilter} onValueChange={setContentTypeFilter}>
          <SelectTrigger className="w-full sm:w-40">
            <SelectValue placeholder="Content Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            {contentTypeOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Data Table or Empty State */}
      {briefs.length === 0 ? (
        <EmptyState
          icon={FileText}
          title={searchQuery || statusFilter !== 'all' || contentTypeFilter !== 'all' 
            ? "No briefs found" 
            : "No content briefs yet"
          }
          description={
            searchQuery || statusFilter !== 'all' || contentTypeFilter !== 'all'
              ? "Try adjusting your search filters"
              : "Create your first content brief to define detailed requirements for your content"
          }
          action={
            !searchQuery && statusFilter === 'all' && contentTypeFilter === 'all' ? (
              <Button onClick={onCreateBrief} className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Create First Brief
              </Button>
            ) : undefined
          }
        />
      ) : (
        <DataTable
          data={briefs}
          columns={columns}
          selectedItems={selectedItems}
          onItemSelect={handleItemSelect}
          onSelectAll={handleSelectAll}
          getItemId={(item) => item.id}
          sortBy={sortBy}
          sortOrder={sortOrder}
          onSort={handleSort}
          isLoading={isLoading}
          emptyMessage="No briefs match your criteria"
          className="rounded-lg border"
        />
      )}

      {/* Pagination */}
      {briefsResponse && briefsResponse.pagination.totalPages > 1 && (
        <div className="flex items-center justify-between mt-6">
          <div className="text-sm text-muted-foreground">
            Showing {(page - 1) * 10 + 1} to {Math.min(page * 10, totalCount)} of {totalCount} briefs
          </div>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={!briefsResponse.pagination.hasPreviousPage}
            >
              Previous
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setPage(p => p + 1)}
              disabled={!briefsResponse.pagination.hasNextPage}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      {/* Quick Stats */}
      {totalCount > 0 && (
        <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center p-4 bg-muted/50 rounded-lg">
            <div className="text-2xl font-bold text-blue-600">
              {briefs.filter(b => b.status === 'approved').length}
            </div>
            <div className="text-sm text-muted-foreground">Ready to Generate</div>
          </div>
          <div className="text-center p-4 bg-muted/50 rounded-lg">
            <div className="text-2xl font-bold text-orange-600">
              {briefs.filter(b => b.status === 'in_progress').length}
            </div>
            <div className="text-sm text-muted-foreground">In Progress</div>
          </div>
          <div className="text-center p-4 bg-muted/50 rounded-lg">
            <div className="text-2xl font-bold text-green-600">
              {briefs.filter(b => b.status === 'completed').length}
            </div>
            <div className="text-sm text-muted-foreground">Completed</div>
          </div>
          <div className="text-center p-4 bg-muted/50 rounded-lg">
            <div className="text-2xl font-bold text-gray-600">
              {briefs.reduce((sum, brief) => sum + brief.content_items_count, 0)}
            </div>
            <div className="text-sm text-muted-foreground">Content Items</div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteBrief} onOpenChange={() => setDeleteBrief(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Content Brief</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deleteBrief?.title}"? This action cannot be undone.
              {deleteBrief?.content_items_count && deleteBrief.content_items_count > 0 && (
                <div className="mt-2 text-sm font-medium text-amber-600">
                  Warning: This brief has {deleteBrief.content_items_count} associated content item{deleteBrief.content_items_count > 1 ? 's' : ''}. 
                  They will remain but will lose the connection to this brief.
                </div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmDelete}
              disabled={deleteBriefMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteBriefMutation.isPending ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
});

ContentBriefsTab.displayName = 'ContentBriefsTab';