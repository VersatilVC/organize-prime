// Content Items Tab - Phase 3: UI Components

import React, { useState, useMemo, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { DataTable } from '@/components/composition/DataTable';
import { getContentItemColumns } from '../columns/contentItemColumns';
import { 
  useContentItems,
  useDeleteContentItem,
  useCreateDerivatives,
  useUpdateContentItem,
  usePublishContentItem,
  useArchiveContentItem,
  useContentTypeOptions
} from '@/hooks/content-creation';
import type { 
  ContentItemWithDetails,
  ContentItemFilters
} from '@/types/content-creation';
import { 
  Plus, 
  Search, 
  FileText,
  Star,
  Filter,
  Download,
  Upload,
  Archive,
  Copy,
  Eye,
  Sparkles,
  Bot
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

interface ContentItemsTabProps {
  onCreateItem: () => void;
  onEditItem: (item: ContentItemWithDetails) => void;
  className?: string;
}

export const ContentItemsTab = React.memo<ContentItemsTabProps>(({
  onCreateItem,
  onEditItem,
  className
}) => {
  // State management
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [contentTypeFilter, setContentTypeFilter] = useState<string>('all');
  const [itemTypeFilter, setItemTypeFilter] = useState<string>('all');
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState<string>('created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [deleteItem, setDeleteItem] = useState<ContentItemWithDetails | null>(null);
  const [page, setPage] = useState(1);
  
  // Derivatives dialog state
  const [derivativesItem, setDerivativesItem] = useState<ContentItemWithDetails | null>(null);
  const [selectedDerivativeTypes, setSelectedDerivativeTypes] = useState<string[]>([]);
  
  // Full item viewer state
  const [viewingItem, setViewingItem] = useState<ContentItemWithDetails | null>(null);

  // Build filters object
  const filters: ContentItemFilters = useMemo(() => {
    const result: ContentItemFilters = {};
    if (searchQuery.trim()) result.search = searchQuery.trim();
    if (statusFilter && statusFilter !== 'all') result.status = statusFilter as any;
    if (contentTypeFilter && contentTypeFilter !== 'all') result.content_type = contentTypeFilter;
    if (itemTypeFilter === 'major') result.is_major_item = true;
    if (itemTypeFilter === 'derivative') result.is_major_item = false;
    return result;
  }, [searchQuery, statusFilter, contentTypeFilter, itemTypeFilter]);

  // Data fetching
  const {
    data: itemsResponse,
    isLoading,
    error,
    refetch
  } = useContentItems(filters, { page, limit: 10, sortBy, sortOrder });

  // Real-time updates - refetch every 10 seconds when items are being generated
  useEffect(() => {
    const interval = setInterval(() => {
      refetch();
    }, 10000); // 10 seconds

    return () => clearInterval(interval);
  }, [refetch]);

  const { data: contentTypeOptions = [] } = useContentTypeOptions();

  // Mutations
  const deleteItemMutation = useDeleteContentItem({
    onSuccess: () => {
      setDeleteItem(null);
      refetch();
    }
  });

  const createDerivativesMutation = useCreateDerivatives('', {
    onSuccess: () => {
      setDerivativesItem(null);
      setSelectedDerivativeTypes([]);
      refetch();
    }
  });

  const publishItemMutation = usePublishContentItem('', {
    onSuccess: () => refetch()
  });

  const archiveItemMutation = useArchiveContentItem('', {
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

  const handleView = (item: ContentItemWithDetails) => {
    setViewingItem(item);
  };

  const handleDelete = (item: ContentItemWithDetails) => {
    setDeleteItem(item);
  };

  const confirmDelete = () => {
    if (deleteItem) {
      deleteItemMutation.mutate(deleteItem.id);
    }
  };

  const handleCreateDerivatives = (item: ContentItemWithDetails) => {
    setDerivativesItem(item);
    setSelectedDerivativeTypes([]);
  };

  const handleConfirmDerivatives = () => {
    if (derivativesItem && selectedDerivativeTypes.length > 0) {
      createDerivativesMutation.mutate(selectedDerivativeTypes);
    }
  };

  const handlePublish = (item: ContentItemWithDetails) => {
    publishItemMutation.mutate();
    toast.loading('Publishing content item...', { duration: 2000 });
  };

  const handleArchive = (item: ContentItemWithDetails) => {
    archiveItemMutation.mutate();
  };

  const handleDuplicate = (item: ContentItemWithDetails) => {
    // Placeholder for duplication
    toast.info('Duplicate content item - coming soon!');
  };

  const handleItemSelect = (itemId: string, selected: boolean) => {
    setSelectedItems(prev => 
      selected 
        ? [...prev, itemId]
        : prev.filter(id => id !== itemId)
    );
  };

  const handleSelectAll = (selected: boolean) => {
    setSelectedItems(selected ? (itemsResponse?.data.map(item => item.id) || []) : []);
  };

  const handleBulkPublish = () => {
    if (selectedItems.length === 0) {
      toast.error('Please select items to publish');
      return;
    }
    
    toast.info(`Bulk publish ${selectedItems.length} items - coming soon!`);
  };

  const handleBulkArchive = () => {
    if (selectedItems.length === 0) {
      toast.error('Please select items to archive');
      return;
    }
    
    toast.info(`Bulk archive ${selectedItems.length} items - coming soon!`);
  };

  const handleBulkExport = () => {
    if (selectedItems.length === 0) {
      toast.error('Please select items to export');
      return;
    }
    
    toast.info('Bulk export coming soon!', {
      description: `Export ${selectedItems.length} selected content items.`
    });
  };

  // Column configuration
  const columns = getContentItemColumns({
    onEdit: onEditItem,
    onDelete: handleDelete,
    onCreateDerivatives: handleCreateDerivatives,
    onView: handleView,
    onPublish: handlePublish,
    onArchive: handleArchive,
    onDuplicate: handleDuplicate
  });

  // Derivative type options
  const derivativeTypeOptions = [
    { id: 'social_media', label: 'Social Media Post', description: 'Condensed version for social platforms' },
    { id: 'email_newsletter', label: 'Email Newsletter', description: 'Email-friendly format' },
    { id: 'video_script', label: 'Video Script', description: 'Script for video content' },
    { id: 'infographic', label: 'Infographic', description: 'Visual data representation' },
    { id: 'podcast_outline', label: 'Podcast Outline', description: 'Audio content structure' },
    { id: 'press_release', label: 'Press Release', description: 'News announcement format' }
  ];

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
          <div className="text-destructive mb-2">Error loading content items</div>
          <div className="text-sm text-muted-foreground mb-4">{error.message}</div>
          <Button onClick={() => refetch()} variant="outline">
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  const items = itemsResponse?.data || [];
  const totalCount = itemsResponse?.pagination.total || 0;
  const majorItems = items.filter(item => item.is_major_item);
  const publishedItems = items.filter(item => item.status === 'published');
  const generatedItems = items.filter(item => item.generation_method === 'n8n_workflow');

  return (
    <div className={className}>
      {/* Header with title and description */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-green-100 dark:bg-green-900/20 rounded-lg">
            <FileText className="h-5 w-5 text-green-600 dark:text-green-400" />
          </div>
          <div>
            <h2 className="text-xl font-semibold">Content Items</h2>
            <p className="text-sm text-muted-foreground">
              Final content pieces ready for publication and derivative creation
            </p>
          </div>
        </div>
        
        {totalCount > 0 && (
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-sm">
              {totalCount} item{totalCount === 1 ? '' : 's'}
            </Badge>
            {majorItems.length > 0 && (
              <Badge variant="default" className="text-sm">
                <Star className="h-3 w-3 mr-1" />
                {majorItems.length} major
              </Badge>
            )}
            {publishedItems.length > 0 && (
              <Badge variant="secondary" className="text-sm">
                {publishedItems.length} published
              </Badge>
            )}
            {generatedItems.length > 0 && (
              <Badge variant="outline" className="text-sm border-purple-200 text-purple-600 bg-purple-50">
                <Bot className="h-3 w-3 mr-1" />
                {generatedItems.length} AI generated
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
          <Button onClick={onCreateItem} className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Create Item
          </Button>
        </div>
        
        <div className="flex gap-2 sm:ml-auto">
          {selectedItems.length > 0 && (
            <>
              <Button onClick={handleBulkPublish} variant="outline" size="sm">
                <Upload className="h-4 w-4 mr-2" />
                Publish ({selectedItems.length})
              </Button>
              <Button onClick={handleBulkArchive} variant="outline" size="sm">
                <Archive className="h-4 w-4 mr-2" />
                Archive ({selectedItems.length})
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
            placeholder="Search content items by title or content..."
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
            <SelectItem value="review">Review</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="published">Published</SelectItem>
            <SelectItem value="archived">Archived</SelectItem>
          </SelectContent>
        </Select>

        <Select value={itemTypeFilter} onValueChange={setItemTypeFilter}>
          <SelectTrigger className="w-full sm:w-32">
            <SelectValue placeholder="Item Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="major">Major Items</SelectItem>
            <SelectItem value="derivative">Derivatives</SelectItem>
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
      {items.length === 0 ? (
        <EmptyState
          icon={FileText}
          title={searchQuery || statusFilter !== 'all' || contentTypeFilter !== 'all' || itemTypeFilter !== 'all'
            ? "No content items found" 
            : "No content items yet"
          }
          description={
            searchQuery || statusFilter !== 'all' || contentTypeFilter !== 'all' || itemTypeFilter !== 'all'
              ? "Try adjusting your search filters"
              : "Create your first content item or generate content from approved briefs"
          }
          action={
            !searchQuery && statusFilter === 'all' && contentTypeFilter === 'all' && itemTypeFilter === 'all' ? (
              <Button onClick={onCreateItem} className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Create First Item
              </Button>
            ) : undefined
          }
        />
      ) : (
        <DataTable
          data={items}
          columns={columns}
          selectedItems={selectedItems}
          onItemSelect={handleItemSelect}
          onSelectAll={handleSelectAll}
          getItemId={(item) => item.id}
          sortBy={sortBy}
          sortOrder={sortOrder}
          onSort={handleSort}
          isLoading={isLoading}
          emptyMessage="No content items match your criteria"
          className="rounded-lg border"
        />
      )}

      {/* Pagination */}
      {itemsResponse && itemsResponse.pagination.totalPages > 1 && (
        <div className="flex items-center justify-between mt-6">
          <div className="text-sm text-muted-foreground">
            Showing {(page - 1) * 10 + 1} to {Math.min(page * 10, totalCount)} of {totalCount} items
          </div>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={!itemsResponse.pagination.hasPreviousPage}
            >
              Previous
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setPage(p => p + 1)}
              disabled={!itemsResponse.pagination.hasNextPage}
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
            <div className="text-2xl font-bold text-yellow-600 flex items-center justify-center gap-1">
              <Star className="h-5 w-5" />
              {majorItems.length}
            </div>
            <div className="text-sm text-muted-foreground">Major Items</div>
          </div>
          <div className="text-center p-4 bg-muted/50 rounded-lg">
            <div className="text-2xl font-bold text-green-600">
              {publishedItems.length}
            </div>
            <div className="text-sm text-muted-foreground">Published</div>
          </div>
          <div className="text-center p-4 bg-muted/50 rounded-lg">
            <div className="text-2xl font-bold text-blue-600">
              {items.filter(i => i.status === 'review').length}
            </div>
            <div className="text-sm text-muted-foreground">In Review</div>
          </div>
          <div className="text-center p-4 bg-muted/50 rounded-lg">
            <div className="text-2xl font-bold text-gray-600">
              {items.reduce((sum, item) => sum + item.derivatives_count, 0)}
            </div>
            <div className="text-sm text-muted-foreground">Total Derivatives</div>
          </div>
        </div>
      )}

      {/* Full Item Viewer Modal */}
      <Dialog open={!!viewingItem} onOpenChange={() => setViewingItem(null)}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              {viewingItem?.title}
              {viewingItem?.generation_method === 'n8n_workflow' && (
                <Badge variant="outline" className="border-purple-200 text-purple-600 bg-purple-50">
                  <Bot className="h-3 w-3 mr-1" />
                  AI Generated
                </Badge>
              )}
            </DialogTitle>
            <DialogDescription className="flex flex-col gap-2">
              <div className="flex items-center gap-4 text-sm">
                <span>Type: {viewingItem?.content_type}</span>
                <span>Status: {viewingItem?.status}</span>
                {viewingItem?.brief_title && (
                  <span>From: {viewingItem.brief_title}</span>
                )}
              </div>
              {viewingItem?.generation_metadata?.generated_at && (
                <span className="text-xs text-muted-foreground">
                  Generated: {new Date(viewingItem.generation_metadata.generated_at).toLocaleString()}
                </span>
              )}
            </DialogDescription>
          </DialogHeader>
          
          <div className="mt-4">
            {viewingItem?.content ? (
              <div className="prose prose-sm max-w-none">
                <div className="whitespace-pre-wrap bg-muted/50 p-4 rounded-lg border">
                  {viewingItem.content}
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                No content available
              </div>
            )}
          </div>

          <DialogFooter className="mt-6">
            <Button variant="outline" onClick={() => setViewingItem(null)}>
              Close
            </Button>
            <Button 
              onClick={() => {
                if (viewingItem) {
                  handleCreateDerivatives(viewingItem);
                  setViewingItem(null);
                }
              }}
              disabled={!viewingItem?.can_create_derivatives}
            >
              <Copy className="h-4 w-4 mr-2" />
              Create Derivatives
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Derivatives Dialog */}
      <Dialog open={!!derivativesItem} onOpenChange={() => setDerivativesItem(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create Derivatives</DialogTitle>
            <DialogDescription>
              Select the types of derivative content to generate from "{derivativesItem?.title}"
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
            {derivativeTypeOptions.map((option) => (
              <div key={option.id} className="flex items-start space-x-3 p-3 border rounded-lg">
                <Checkbox
                  id={option.id}
                  checked={selectedDerivativeTypes.includes(option.id)}
                  onCheckedChange={(checked) => {
                    setSelectedDerivativeTypes(prev =>
                      checked
                        ? [...prev, option.id]
                        : prev.filter(id => id !== option.id)
                    );
                  }}
                />
                <div className="grid gap-1.5 leading-none">
                  <Label htmlFor={option.id} className="font-medium cursor-pointer">
                    {option.label}
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    {option.description}
                  </p>
                </div>
              </div>
            ))}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDerivativesItem(null)}>
              Cancel
            </Button>
            <Button 
              onClick={handleConfirmDerivatives}
              disabled={selectedDerivativeTypes.length === 0 || createDerivativesMutation.isPending}
            >
              {createDerivativesMutation.isPending ? (
                <>Creating...</>
              ) : (
                <>
                  <Copy className="h-4 w-4 mr-2" />
                  Create {selectedDerivativeTypes.length} Derivative{selectedDerivativeTypes.length === 1 ? '' : 's'}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteItem} onOpenChange={() => setDeleteItem(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Content Item</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deleteItem?.title}"? This action cannot be undone.
              {deleteItem?.derivatives_count && deleteItem.derivatives_count > 0 && (
                <div className="mt-2 text-sm font-medium text-amber-600">
                  Warning: This item has {deleteItem.derivatives_count} derivative{deleteItem.derivatives_count > 1 ? 's' : ''}. 
                  They will also be deleted.
                </div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmDelete}
              disabled={deleteItemMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteItemMutation.isPending ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
});

ContentItemsTab.displayName = 'ContentItemsTab';