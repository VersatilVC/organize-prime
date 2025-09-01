import React, { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { DataTable, TableColumn } from '@/components/composition/DataTable';
import { ContentTypeForm } from './ContentTypeForm';
import { useContentTypes } from '@/features/content-creation/hooks/useContentTypes';
import { useContentExtraction } from '@/features/content-creation/hooks/useContentExtraction';
import { ContentType } from '@/features/content-creation/types/contentCreationTypes';
import { useQueryClient } from '@tanstack/react-query';
import { MarkdownModal } from '@/components/ui/markdown-viewer';
import { 
  Plus, 
  Search, 
  Edit, 
  Trash2, 
  Eye,
  FileText,
  Target,
  Clock,
  Activity,
  Sparkles,
  CheckCircle,
  AlertCircle,
  Loader2
} from 'lucide-react';
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
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';

interface ContentTypesTabProps {
  className?: string;
}

export const ContentTypesTab = React.memo<ContentTypesTabProps>(({ className }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedContentType, setSelectedContentType] = useState<ContentType | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [deleteContentType, setDeleteContentType] = useState<ContentType | null>(null);
  const [sortBy, setSortBy] = useState<string>('usage_count');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [extractingContentTypes, setExtractingContentTypes] = useState<Set<string>>(new Set());
  
  const queryClient = useQueryClient();

  const {
    contentTypes,
    isLoading,
    error,
    deleteContentType: deleteContentTypeFn,
    updateContentType,
    updateUsageCount,
    isDeleting
  } = useContentTypes();
  
  const { 
    isConfigured: isExtractionConfigured,
    isExtracting,
    extractFromFile,
    extractFromUrl 
  } = useContentExtraction();

  // Filter content types based on search query
  const filteredContentTypes = useMemo(() => {
    if (!searchQuery.trim()) return contentTypes;
    
    const query = searchQuery.toLowerCase();
    return contentTypes.filter(contentType =>
      contentType.name.toLowerCase().includes(query) ||
      contentType.description?.toLowerCase().includes(query) ||
      contentType.type_category.toLowerCase().includes(query)
    );
  }, [contentTypes, searchQuery]);

  // Sort content types
  const sortedContentTypes = useMemo(() => {
    return [...filteredContentTypes].sort((a, b) => {
      let aValue: any = a[sortBy as keyof ContentType];
      let bValue: any = b[sortBy as keyof ContentType];

      // Handle special sorting cases
      if (sortBy === 'created_at' || sortBy === 'updated_at') {
        aValue = new Date(aValue);
        bValue = new Date(bValue);
      }

      if (typeof aValue === 'string') {
        aValue = aValue.toLowerCase();
        bValue = bValue.toLowerCase();
      }

      if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });
  }, [filteredContentTypes, sortBy, sortOrder]);

  // Handle sorting
  const handleSort = (key: string) => {
    if (sortBy === key) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(key);
      setSortOrder('asc');
    }
  };

  // Handle edit
  const handleEdit = (contentType: ContentType) => {
    setSelectedContentType(contentType);
    setIsFormOpen(true);
  };

  // Handle view - show content structure if available
  const handleView = (contentType: ContentType) => {
    console.log('👀 Viewing content type:', contentType.name);
    
    if (contentType.content_structure) {
      // Content structure will be displayed via MarkdownModal trigger
      return;
    }
    
    // Fallback to showing content type details if no content structure
    const details = [
      `Name: ${contentType.name}`,
      `Description: ${contentType.description || 'No description'}`,
      `Category: ${contentType.type_category}`,
      `Target Word Count: ${contentType.target_word_count || 'Not specified'}`,
      `Examples: ${contentType.examples?.length || 0}`,
      `Usage Count: ${contentType.usage_count}`,
      `Status: ${(contentType as any).extraction_status || 'No extraction yet'}`,
    ].join('\n');
    
    alert(`Content Type Details:\n\n${details}`);
    
    // Note: This should NOT increment usage count - usage only counts actual content generation
  };

  // Handle delete
  const handleDelete = (contentType: ContentType) => {
    setDeleteContentType(contentType);
  };

  const confirmDelete = () => {
    if (deleteContentType) {
      deleteContentTypeFn(deleteContentType.id);
      setDeleteContentType(null);
    }
  };

  // Handle content extraction for a content type
  const handleExtractContent = async (contentType: ContentType) => {
    console.log('🎯 EXTRACTION START - Content type:', contentType.name);
    console.log('🎯 Examples found:', contentType.examples?.length || 0);
    
    if (!contentType.examples || contentType.examples.length === 0) {
      console.log('❌ No examples found, aborting extraction');
      return;
    }

    // Add to extracting set
    console.log('🔄 Adding to extracting set:', contentType.id);
    setExtractingContentTypes(prev => new Set(prev).add(contentType.id));

    try {
      console.log('🚀 Starting bulk extraction for content type:', contentType.name);
      console.log('📋 Examples to process:', JSON.stringify(contentType.examples, null, 2));
      
      for (const example of contentType.examples) {
        try {
          console.log('📥 Processing example:', example);
          
          if (example.type === 'url') {
            console.log('🌐 Processing URL example:', example.value);
            
            // Validate URL format and ensure it's a proper HTTP/HTTPS URL
            try {
              const url = new URL(example.value);
              if (!['http:', 'https:'].includes(url.protocol)) {
                throw new Error(`Invalid URL protocol: ${url.protocol}. Only HTTP and HTTPS URLs are supported.`);
              }
              console.log('🔄 Calling extractFromUrl...');
              await extractFromUrl(example.value, contentType.id);
              console.log('✅ URL extraction completed');
            } catch (urlError) {
              console.log('❌ Invalid URL format, skipping:', example.value);
              console.log('❌ URL Error details:', urlError);
              // Don't throw - just skip invalid URLs and continue with other examples
              console.log('⏭️ Continuing with next example...');
            }
          }
          else if (example.type === 'file') {
            console.log('📁 Processing file example:', example.value);
            
            // Check if the value is a valid URL (signed URL from Supabase Storage)
            if (example.value.startsWith('http')) {
              console.log('📁 File has signed URL, downloading and processing as file...');
              
              try {
                // Download the file from the signed URL
                console.log('⬇️ Downloading file from:', example.value);
                const response = await fetch(example.value);
                if (!response.ok) {
                  throw new Error(`Failed to download file: ${response.status} ${response.statusText}`);
                }
                
                const blob = await response.blob();
                const filename = example.description || 'downloaded-file';
                const file = new File([blob], filename, { type: blob.type });
                
                console.log('📦 Downloaded file:', {
                  name: file.name,
                  size: file.size,
                  type: file.type
                });
                
                console.log('🔄 Calling extractFromFile for downloaded file...');
                await extractFromFile(file, contentType.id);
                console.log('✅ File extraction completed');
              } catch (downloadError) {
                console.error('❌ Failed to download and process file:', downloadError);
                // Fallback to URL extraction if file download fails
                console.log('🔄 Falling back to URL extraction...');
                await extractFromUrl(example.value, contentType.id);
              }
            } else {
              console.log('⚠️ File example does not contain a valid URL:', example.value);
              console.log('💡 Skipping - cannot extract from filename alone without a valid URL');
            }
          } else {
            console.log('❓ Unknown example type:', example.type);
          }
        } catch (exampleError) {
          console.error('❌ Failed to extract from individual example:', example, exampleError);
        }
      }
      
      console.log('✅ All examples processed for:', contentType.name);
    } catch (mainError) {
      console.error('❌ Main extraction error:', mainError);
    } finally {
      console.log('🧹 Cleanup: Removing from extracting set');
      // Remove from extracting set
      setExtractingContentTypes(prev => {
        const newSet = new Set(prev);
        newSet.delete(contentType.id);
        console.log('🧹 Updated extracting set size:', newSet.size);
        return newSet;
      });
      
      console.log('🔄 Invalidating React Query cache...');
      try {
        // Use a simpler invalidation approach
        await queryClient.invalidateQueries({ 
          queryKey: ['content-types'], 
          exact: false 
        });
        console.log('✅ Cache invalidated successfully');
      } catch (cacheError) {
        console.error('❌ Cache invalidation error:', cacheError);
      }
    }
  };

  // Table columns configuration
  const columns: TableColumn<ContentType>[] = [
    {
      key: 'name',
      label: 'Name',
      sortable: true,
      render: (contentType) => (
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
            <FileText className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <div className="font-medium">{contentType.name}</div>
            {contentType.description && (
              <div className="text-sm text-muted-foreground line-clamp-1">
                {contentType.description}
              </div>
            )}
          </div>
        </div>
      ),
      width: '300px'
    },
    {
      key: 'type_category',
      label: 'Category',
      sortable: true,
      render: (contentType) => (
        <Badge variant={contentType.type_category === 'major' ? 'default' : 'secondary'}>
          {contentType.type_category === 'major' ? 'Major' : 
           contentType.type_category === 'derivative' ? 'Derivative' : 'Both'}
        </Badge>
      ),
      width: '120px'
    },
    {
      key: 'target_word_count',
      label: 'Target Words',
      sortable: true,
      render: (contentType) => (
        <div className="flex items-center gap-2">
          <Target className="h-4 w-4 text-muted-foreground" />
          <span>{contentType.target_word_count || 'N/A'}</span>
        </div>
      ),
      width: '120px'
    },
    {
      key: 'examples',
      label: 'Examples',
      render: (contentType) => (
        <div className="flex items-center gap-2">
          <span className="text-sm">
            {contentType.examples && contentType.examples.length > 0 
              ? `${contentType.examples.length} example${contentType.examples.length === 1 ? '' : 's'}`
              : 'No examples'
            }
          </span>
        </div>
      ),
      width: '100px'
    },
    {
      key: 'usage_count',
      label: 'Usage',
      sortable: true,
      render: (contentType) => (
        <div className="flex items-center gap-2">
          <Activity className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium">{contentType.usage_count}</span>
        </div>
      ),
      width: '100px'
    },
    {
      key: 'extraction_status',
      label: 'Extraction',
      render: (contentType) => {

        const status = (contentType as any).extraction_status || 'pending';
        const hasExamples = contentType.examples && contentType.examples.length > 0;
        
        if (!hasExamples) {
          return (
            <Badge variant="outline" className="text-muted-foreground">
              No examples
            </Badge>
          );
        }

        switch (status) {
          case 'completed':
            return (
              <Badge variant="outline" className="text-green-600 border-green-600">
                <CheckCircle className="h-3 w-3 mr-1" />
                Extracted
              </Badge>
            );
          case 'processing':
            return (
              <Badge variant="outline" className="text-blue-600 border-blue-600">
                <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                Processing
              </Badge>
            );
          case 'failed':
            return (
              <Badge variant="outline" className="text-red-600 border-red-600">
                <AlertCircle className="h-3 w-3 mr-1" />
                Failed
              </Badge>
            );
          default:
            return (
              <Badge variant="outline" className="text-amber-600 border-amber-600">
                <Clock className="h-3 w-3 mr-1" />
                Pending
              </Badge>
            );
        }
      },
      width: '120px'
    },
    {
      key: 'content_structure',
      label: 'Structure',
      render: (contentType) => (
        <div className="flex items-center justify-center">
          {contentType.content_structure ? (
            <Badge variant="outline" className="text-green-600 border-green-600">
              <FileText className="h-3 w-3 mr-1" />
              Available
            </Badge>
          ) : (
            <Badge variant="outline" className="text-muted-foreground">
              No Structure
            </Badge>
          )}
        </div>
      ),
      width: '110px'
    },
    {
      key: 'updated_at',
      label: 'Last Updated',
      sortable: true,
      render: (contentType) => (
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">
            {new Date(contentType.updated_at).toLocaleDateString()}
          </span>
        </div>
      ),
      width: '150px'
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (contentType) => (
        <div className="flex items-center gap-2">
          {contentType.content_structure ? (
            <MarkdownModal
              content={contentType.content_structure}
              title={`Content Structure - ${contentType.name}`}
              fileName={`${contentType.name.toLowerCase().replace(/\s+/g, '-')}-structure.md`}
              editable={true}
              onSave={async (newContent) => {
                // Update the content structure
                try {
                  await updateContentType({
                    id: contentType.id,
                    content_structure: newContent
                  });
                } catch (error) {
                  console.error('Failed to update content structure:', error);
                  throw error;
                }
              }}
              trigger={
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0"
                  title="View and edit content structure"
                >
                  <Eye className="h-4 w-4" />
                </Button>
              }
            />
          ) : (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleView(contentType)}
              className="h-8 w-8 p-0"
              title="View content type details"
            >
              <Eye className="h-4 w-4" />
            </Button>
          )}
          {contentType.examples && contentType.examples.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={async () => {
                try {
                  console.log('🖱️ BUTTON: Extract button clicked for:', contentType.name);
                  await handleExtractContent(contentType);
                  console.log('🖱️ BUTTON: Extract handler completed');
                } catch (buttonError) {
                  console.error('🖱️ BUTTON: Extract button error:', buttonError);
                }
              }}
              className="h-8 w-8 p-0 text-blue-600 hover:text-blue-700"
              disabled={extractingContentTypes.has(contentType.id)}
              title="Extract content from examples"
            >
              {extractingContentTypes.has(contentType.id) ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4" />
              )}
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleEdit(contentType)}
            className="h-8 w-8 p-0"
          >
            <Edit className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleDelete(contentType)}
            className="h-8 w-8 p-0 text-destructive hover:text-destructive"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
      width: '120px'
    }
  ];

  if (error) {
    return (
      <div className="text-center py-8">
        <div className="text-destructive mb-2">Error loading content types</div>
        <div className="text-sm text-muted-foreground">{error.message}</div>
      </div>
    );
  }

  return (
    <div className={className}>
      {/* Header Actions */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search content types..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button
          onClick={() => {
            setSelectedContentType(null);
            setIsFormOpen(true);
          }}
          className="flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          Add Content Type
        </Button>
      </div>

      {/* Content Types Table */}
      {isLoading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      ) : sortedContentTypes.length === 0 ? (
        <EmptyState
          icon={FileText}
          title={searchQuery ? "No content types found" : "No content types yet"}
          description={
            searchQuery 
              ? "Try adjusting your search query"
              : "Create your first content type to start organizing your content creation process"
          }
          action={
            !searchQuery ? (
              <Button
                onClick={() => {
                  setSelectedContentType(null);
                  setIsFormOpen(true);
                }}
                className="flex items-center gap-2"
              >
                <Plus className="h-4 w-4" />
                Add Content Type
              </Button>
            ) : undefined
          }
        />
      ) : (
        <DataTable
          data={sortedContentTypes}
          columns={columns}
          sortBy={sortBy}
          sortOrder={sortOrder}
          onSort={handleSort}
          className="rounded-lg border"
        />
      )}

      {/* Content Type Form Modal */}
      <ContentTypeForm
        isOpen={isFormOpen}
        onClose={() => {
          setIsFormOpen(false);
          setSelectedContentType(null);
        }}
        contentType={selectedContentType}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteContentType} onOpenChange={() => setDeleteContentType(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Content Type</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deleteContentType?.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
});

ContentTypesTab.displayName = 'ContentTypesTab';