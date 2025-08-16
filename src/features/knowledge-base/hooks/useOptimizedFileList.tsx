import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useDebounce } from '@/hooks/useDebounce';
import { useVirtualizer } from '@tanstack/react-virtual';
import { useOrganization } from '@/contexts/OrganizationContext';
import { getKBFiles, KBFile } from '../services/fileUploadApi';
import { useKBFileStatus } from './useKBFileStatus';

interface UseOptimizedFileListOptions {
  pageSize?: number;
  enableVirtualization?: boolean;
  debounceMs?: number;
  staleTime?: number;
  prefetchPages?: number;
  enableOptimisticUpdates?: boolean;
}

interface FileFilter {
  search: string;
  status: string;
  kbId: string;
  dateRange?: { start: Date; end: Date };
  fileType?: string;
  sortBy: 'name' | 'date' | 'size' | 'status';
  sortOrder: 'asc' | 'desc';
}

const DEFAULT_OPTIONS: Required<UseOptimizedFileListOptions> = {
  pageSize: 20,
  enableVirtualization: true,
  debounceMs: 300,
  staleTime: 5 * 60 * 1000, // 5 minutes
  prefetchPages: 2,
  enableOptimisticUpdates: true
};

export function useOptimizedFileList(options: UseOptimizedFileListOptions = {}) {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const { currentOrganization } = useOrganization();
  const queryClient = useQueryClient();
  
  // State management
  const [filters, setFilters] = useState<FileFilter>({
    search: '',
    status: 'all',
    kbId: 'all',
    sortBy: 'date',
    sortOrder: 'desc'
  });
  
  const [currentPage, setCurrentPage] = useState(0);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const parentRef = useRef<HTMLDivElement>(null);
  
  // Debounced search
  const debouncedSearch = useDebounce(filters.search, opts.debounceMs);
  const debouncedFilters = useDebounce(filters, opts.debounceMs);
  
  // Real-time status updates
  const { fileStatuses, isConnected } = useKBFileStatus(currentOrganization?.id);
  
  // Generate cache key based on filters
  const cacheKey = useMemo(() => 
    JSON.stringify({
      orgId: currentOrganization?.id,
      search: debouncedSearch,
      status: debouncedFilters.status,
      kbId: debouncedFilters.kbId,
      sortBy: debouncedFilters.sortBy,
      sortOrder: debouncedFilters.sortOrder
    })
  , [currentOrganization?.id, debouncedSearch, debouncedFilters]);
  
  // Optimized file fetching with pagination
  const {
    data: pagesData,
    isLoading,
    isFetching,
    error,
    refetch,
    hasNextPage,
    fetchNextPage,
    isFetchingNextPage
  } = useQuery({
    queryKey: ['kb-files-optimized', cacheKey, currentPage],
    queryFn: async ({ pageParam = 0 }) => {
      if (!currentOrganization?.id) return { files: [], totalCount: 0 };
      
      const result = await getKBFiles(
        currentOrganization.id,
        debouncedFilters.kbId === 'all' ? undefined : debouncedFilters.kbId,
        pageParam * opts.pageSize,
        opts.pageSize
      );
      
      return {
        ...result,
        page: pageParam
      };
    },
    enabled: !!currentOrganization?.id,
    staleTime: opts.staleTime,
    refetchOnWindowFocus: false,
    keepPreviousData: true,
    getNextPageParam: (lastPage, pages) => {
      const totalPages = Math.ceil(lastPage.totalCount / opts.pageSize);
      const nextPage = pages.length;
      return nextPage < totalPages ? nextPage : undefined;
    }
  });
  
  // Flatten paginated data
  const allFiles = useMemo(() => {
    if (!pagesData?.pages) return [];
    return pagesData.pages.flatMap(page => page.files);
  }, [pagesData]);
  
  // Apply client-side filtering and sorting
  const filteredAndSortedFiles = useMemo(() => {
    let filtered = [...allFiles];
    
    // Apply search filter
    if (debouncedSearch) {
      const searchLower = debouncedSearch.toLowerCase();
      filtered = filtered.filter(file =>
        file.file_name.toLowerCase().includes(searchLower) ||
        file.kb_configuration?.display_name?.toLowerCase().includes(searchLower)
      );
    }
    
    // Apply status filter
    if (debouncedFilters.status !== 'all') {
      filtered = filtered.filter(file => {
        // Check real-time status first
        const realtimeStatus = fileStatuses.get(file.id);
        const currentStatus = realtimeStatus?.status || file.status;
        return currentStatus === debouncedFilters.status;
      });
    }
    
    // Apply date range filter
    if (debouncedFilters.dateRange) {
      const { start, end } = debouncedFilters.dateRange;
      filtered = filtered.filter(file => {
        const fileDate = new Date(file.created_at);
        return fileDate >= start && fileDate <= end;
      });
    }
    
    // Apply file type filter
    if (debouncedFilters.fileType) {
      filtered = filtered.filter(file => 
        file.mime_type.includes(debouncedFilters.fileType!)
      );
    }
    
    // Apply sorting
    filtered.sort((a, b) => {
      let aVal: any, bVal: any;
      
      switch (debouncedFilters.sortBy) {
        case 'name':
          aVal = a.file_name.toLowerCase();
          bVal = b.file_name.toLowerCase();
          break;
        case 'size':
          aVal = a.file_size;
          bVal = b.file_size;
          break;
        case 'status':
          // Use real-time status if available
          aVal = fileStatuses.get(a.id)?.status || a.status;
          bVal = fileStatuses.get(b.id)?.status || b.status;
          break;
        case 'date':
        default:
          aVal = new Date(a.created_at);
          bVal = new Date(b.created_at);
          break;
      }
      
      if (aVal < bVal) return debouncedFilters.sortOrder === 'asc' ? -1 : 1;
      if (aVal > bVal) return debouncedFilters.sortOrder === 'asc' ? 1 : -1;
      return 0;
    });
    
    return filtered;
  }, [allFiles, debouncedSearch, debouncedFilters, fileStatuses]);
  
  // Virtual scrolling setup
  const virtualizer = useVirtualizer({
    count: filteredAndSortedFiles.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 80, // Estimated row height
    overscan: 10, // Render extra items for smooth scrolling
  });
  
  // Optimistic updates for file operations
  const updateFileOptimistically = useCallback((
    fileId: string, 
    updates: Partial<KBFile>
  ) => {
    if (!opts.enableOptimisticUpdates) return;
    
    queryClient.setQueryData(['kb-files-optimized', cacheKey], (oldData: any) => {
      if (!oldData?.pages) return oldData;
      
      return {
        ...oldData,
        pages: oldData.pages.map((page: any) => ({
          ...page,
          files: page.files.map((file: KBFile) =>
            file.id === fileId ? { ...file, ...updates } : file
          )
        }))
      };
    });
  }, [queryClient, cacheKey, opts.enableOptimisticUpdates]);
  
  // Prefetch next pages
  useEffect(() => {
    if (hasNextPage && !isFetchingNextPage) {
      const currentVisibleRange = virtualizer.getVirtualItems();
      const lastVisibleIndex = currentVisibleRange[currentVisibleRange.length - 1]?.index || 0;
      const totalVisible = filteredAndSortedFiles.length;
      
      // Prefetch when 80% through current data
      if (lastVisibleIndex > totalVisible * 0.8) {
        fetchNextPage();
      }
    }
  }, [virtualizer.getVirtualItems(), filteredAndSortedFiles.length, hasNextPage, isFetchingNextPage, fetchNextPage]);
  
  // Load more files (for non-virtualized lists)
  const loadMore = useCallback(async () => {
    if (hasNextPage && !isFetchingNextPage) {
      setIsLoadingMore(true);
      try {
        await fetchNextPage();
      } finally {
        setIsLoadingMore(false);
      }
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);
  
  // Filter update functions
  const updateFilters = useCallback((newFilters: Partial<FileFilter>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
    setCurrentPage(0); // Reset to first page
  }, []);
  
  const setSearch = useCallback((search: string) => {
    updateFilters({ search });
  }, [updateFilters]);
  
  const setStatusFilter = useCallback((status: string) => {
    updateFilters({ status });
  }, [updateFilters]);
  
  const setKbFilter = useCallback((kbId: string) => {
    updateFilters({ kbId });
  }, [updateFilters]);
  
  const setSorting = useCallback((sortBy: FileFilter['sortBy'], sortOrder?: FileFilter['sortOrder']) => {
    updateFilters({ 
      sortBy, 
      sortOrder: sortOrder || (filters.sortBy === sortBy && filters.sortOrder === 'asc' ? 'desc' : 'asc')
    });
  }, [filters.sortBy, filters.sortOrder, updateFilters]);
  
  const clearFilters = useCallback(() => {
    setFilters({
      search: '',
      status: 'all',
      kbId: 'all',
      sortBy: 'date',
      sortOrder: 'desc'
    });
    setCurrentPage(0);
  }, []);
  
  // Enhanced file operations with optimistic updates
  const enhancedOperations = useMemo(() => ({
    updateFileStatus: (fileId: string, status: KBFile['status'], error?: string) => {
      updateFileOptimistically(fileId, { 
        status, 
        processing_error: error,
        updated_at: new Date().toISOString()
      });
    },
    
    deleteFile: (fileId: string) => {
      // Optimistically remove from list
      queryClient.setQueryData(['kb-files-optimized', cacheKey], (oldData: any) => {
        if (!oldData?.pages) return oldData;
        
        return {
          ...oldData,
          pages: oldData.pages.map((page: any) => ({
            ...page,
            files: page.files.filter((file: KBFile) => file.id !== fileId),
            totalCount: page.totalCount - 1
          }))
        };
      });
    },
    
    addFile: (newFile: KBFile) => {
      // Optimistically add to beginning of list
      queryClient.setQueryData(['kb-files-optimized', cacheKey], (oldData: any) => {
        if (!oldData?.pages) return oldData;
        
        const newPages = [...oldData.pages];
        if (newPages[0]) {
          newPages[0] = {
            ...newPages[0],
            files: [newFile, ...newPages[0].files],
            totalCount: newPages[0].totalCount + 1
          };
        }
        
        return { ...oldData, pages: newPages };
      });
    }
  }), [queryClient, cacheKey, updateFileOptimistically]);
  
  // Statistics
  const stats = useMemo(() => {
    const total = filteredAndSortedFiles.length;
    const byStatus = filteredAndSortedFiles.reduce((acc, file) => {
      const status = fileStatuses.get(file.id)?.status || file.status;
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    return {
      total,
      visible: filteredAndSortedFiles.length,
      pending: byStatus.pending || 0,
      processing: byStatus.processing || 0,
      completed: byStatus.completed || 0,
      error: byStatus.error || 0,
      hasFilters: debouncedSearch || debouncedFilters.status !== 'all' || debouncedFilters.kbId !== 'all'
    };
  }, [filteredAndSortedFiles, fileStatuses, debouncedSearch, debouncedFilters]);
  
  return {
    // Data
    files: filteredAndSortedFiles,
    allFiles,
    totalCount: pagesData?.pages?.[0]?.totalCount || 0,
    
    // Loading states
    isLoading: isLoading || (debouncedSearch !== filters.search),
    isFetching,
    isLoadingMore,
    error,
    
    // Pagination
    hasNextPage,
    loadMore,
    currentPage,
    
    // Virtual scrolling
    virtualizer: opts.enableVirtualization ? virtualizer : null,
    parentRef,
    
    // Filters
    filters,
    updateFilters,
    setSearch,
    setStatusFilter,
    setKbFilter,
    setSorting,
    clearFilters,
    
    // Real-time
    isConnected,
    fileStatuses,
    
    // Operations
    ...enhancedOperations,
    
    // Stats
    stats,
    
    // Actions
    refetch,
    invalidate: () => queryClient.invalidateQueries({ queryKey: ['kb-files-optimized'] })
  };
}

// Custom hook for debounced search
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}