import React, { useState, useRef, useCallback } from 'react';
import { 
  Upload, 
  File, 
  MoreVertical, 
  Search, 
  Filter,
  ChevronDown,
  ChevronUp,
  Grid,
  List,
  RefreshCw,
  Download,
  Trash2,
  Eye,
  X,
  Plus
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerTrigger } from '@/components/ui/drawer';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useDropzone } from 'react-dropzone';
import { cn } from '@/lib/utils';

interface MobileFileManagerProps {
  files: Array<{
    id: string;
    name: string;
    size: number;
    status: 'uploading' | 'processing' | 'completed' | 'error';
    progress?: number;
    error?: string;
    createdAt: string;
    kbName?: string;
  }>;
  onUpload: (files: File[]) => void;
  onDelete: (id: string) => void;
  onRetry: (id: string) => void;
  onView: (id: string) => void;
  isUploading?: boolean;
  searchTerm: string;
  onSearchChange: (term: string) => void;
  filterStatus: string;
  onFilterChange: (status: string) => void;
}

export function MobileFileManager({
  files,
  onUpload,
  onDelete,
  onRetry,
  onView,
  isUploading = false,
  searchTerm,
  onSearchChange,
  filterStatus,
  onFilterChange
}: MobileFileManagerProps) {
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Touch gesture handling for swipe actions
  const [touchStart, setTouchStart] = useState<{ x: number; y: number } | null>(null);
  const [touchEnd, setTouchEnd] = useState<{ x: number; y: number } | null>(null);
  
  // Mobile dropzone with touch enhancements
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: onUpload,
    accept: {
      'application/pdf': ['.pdf'],
      'text/plain': ['.txt'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'application/msword': ['.doc'],
      'text/markdown': ['.md']
    },
    maxSize: 50 * 1024 * 1024,
    disabled: isUploading,
    noClick: true // We'll handle clicks manually for better mobile UX
  });
  
  const handleTouchStart = useCallback((e: React.TouchEvent, fileId: string) => {
    const touch = e.touches[0];
    setTouchStart({ x: touch.clientX, y: touch.clientY });
    setSelectedFile(fileId);
  }, []);
  
  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!touchStart) return;
    
    const touch = e.touches[0];
    setTouchEnd({ x: touch.clientX, y: touch.clientY });
  }, [touchStart]);
  
  const handleTouchEnd = useCallback((fileId: string) => {
    if (!touchStart || !touchEnd) return;
    
    const deltaX = touchEnd.x - touchStart.x;
    const deltaY = Math.abs(touchEnd.y - touchStart.y);
    
    // Swipe detection (horizontal swipe > 50px, vertical movement < 30px)
    if (Math.abs(deltaX) > 50 && deltaY < 30) {
      if (deltaX > 0) {
        // Right swipe - view file
        onView(fileId);
      } else {
        // Left swipe - delete file
        onDelete(fileId);
      }
    }
    
    setTouchStart(null);
    setTouchEnd(null);
    setSelectedFile(null);
  }, [touchStart, touchEnd, onView, onDelete]);
  
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };
  
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-500';
      case 'error': return 'bg-red-500';
      case 'uploading': return 'bg-blue-500';
      case 'processing': return 'bg-yellow-500';
      default: return 'bg-gray-500';
    }
  };
  
  const filteredFiles = files.filter(file => {
    const matchesSearch = file.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filterStatus === 'all' || file.status === filterStatus;
    return matchesSearch && matchesFilter;
  });
  
  const statusCounts = files.reduce((acc, file) => {
    acc[file.status] = (acc[file.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="space-y-4 pb-20"> {/* Extra bottom padding for mobile navigation */}
      {/* Mobile Header */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
        <div className="flex items-center justify-between p-4">
          <h1 className="text-xl font-semibold">Files ({filteredFiles.length})</h1>
          
          <div className="flex items-center gap-2">
            {/* View toggle */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
              className="h-9 w-9 p-0"
            >
              {viewMode === 'grid' ? <List className="h-4 w-4" /> : <Grid className="h-4 w-4" />}
            </Button>
            
            {/* Filters */}
            <Sheet open={showFilters} onOpenChange={setShowFilters}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="sm" className="h-9 w-9 p-0">
                  <Filter className="h-4 w-4" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-80">
                <SheetHeader>
                  <SheetTitle>Filters</SheetTitle>
                </SheetHeader>
                <div className="mt-6 space-y-4">
                  {/* Search */}
                  <div>
                    <label className="text-sm font-medium">Search</label>
                    <div className="relative mt-1">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search files..."
                        value={searchTerm}
                        onChange={(e) => onSearchChange(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                  </div>
                  
                  {/* Status filter */}
                  <div>
                    <label className="text-sm font-medium">Status</label>
                    <div className="mt-2 space-y-2">
                      {[
                        { value: 'all', label: 'All Files', count: files.length },
                        { value: 'completed', label: 'Completed', count: statusCounts.completed || 0 },
                        { value: 'processing', label: 'Processing', count: statusCounts.processing || 0 },
                        { value: 'uploading', label: 'Uploading', count: statusCounts.uploading || 0 },
                        { value: 'error', label: 'Failed', count: statusCounts.error || 0 }
                      ].map((option) => (
                        <button
                          key={option.value}
                          onClick={() => onFilterChange(option.value)}
                          className={cn(
                            'w-full flex items-center justify-between p-3 rounded-lg border text-left transition-colors',
                            filterStatus === option.value
                              ? 'border-primary bg-primary/10'
                              : 'border-border hover:bg-accent'
                          )}
                        >
                          <span className="font-medium">{option.label}</span>
                          <Badge variant="secondary">{option.count}</Badge>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
        
        {/* Search bar */}
        <div className="px-4 pb-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search files..."
              value={searchTerm}
              onChange={(e) => onSearchChange(e.target.value)}
              className="pl-10 h-10"
            />
          </div>
        </div>
      </div>
      
      {/* Upload Area */}
      <div className="px-4">
        <div
          {...getRootProps()}
          className={cn(
            'border-2 border-dashed rounded-lg p-6 text-center transition-colors',
            'active:scale-95 transition-transform',
            isDragActive && 'border-primary bg-primary/5'
          )}
        >
          <input {...getInputProps()} ref={fileInputRef} />
          
          <Upload className={cn(
            'mx-auto h-8 w-8 mb-3',
            isDragActive ? 'text-primary' : 'text-muted-foreground'
          )} />
          
          <p className="font-medium mb-1">
            {isDragActive ? 'Drop files here' : 'Upload Files'}
          </p>
          <p className="text-sm text-muted-foreground mb-3">
            PDF, Word, text files up to 50MB
          </p>
          
          <Button
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="touch-manipulation"
            size="sm"
          >
            <Plus className="h-4 w-4 mr-2" />
            Choose Files
          </Button>
        </div>
      </div>
      
      {/* File List */}
      {filteredFiles.length === 0 ? (
        <div className="px-4">
          <Card>
            <CardContent className="text-center py-8">
              <File className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="font-medium mb-2">No files found</h3>
              <p className="text-sm text-muted-foreground">
                {searchTerm ? 'Try adjusting your search terms' : 'Upload your first file to get started'}
              </p>
            </CardContent>
          </Card>
        </div>
      ) : (
        <div className="px-4">
          {viewMode === 'grid' ? (
            // Grid view
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {filteredFiles.map((file) => (
                <Card
                  key={file.id}
                  className={cn(
                    'transition-all duration-200 touch-manipulation',
                    selectedFile === file.id && 'scale-95 bg-accent'
                  )}
                  onTouchStart={(e) => handleTouchStart(e, file.id)}
                  onTouchMove={handleTouchMove}
                  onTouchEnd={() => handleTouchEnd(file.id)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center space-x-2">
                        <File className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                        <div className={cn(
                          'h-2 w-2 rounded-full flex-shrink-0',
                          getStatusColor(file.status)
                        )} />
                      </div>
                      
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => onView(file.id)}>
                            <Eye className="h-4 w-4 mr-2" />
                            View Details
                          </DropdownMenuItem>
                          {file.status === 'error' && (
                            <DropdownMenuItem onClick={() => onRetry(file.id)}>
                              <RefreshCw className="h-4 w-4 mr-2" />
                              Retry
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem 
                            onClick={() => onDelete(file.id)}
                            className="text-red-600"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                    
                    <h3 className="font-medium text-sm mb-2 line-clamp-2" title={file.name}>
                      {file.name}
                    </h3>
                    
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>{formatFileSize(file.size)}</span>
                        {file.kbName && (
                          <span className="truncate max-w-20" title={file.kbName}>
                            {file.kbName}
                          </span>
                        )}
                      </div>
                      
                      <Badge
                        variant={
                          file.status === 'completed' ? 'default' :
                          file.status === 'error' ? 'destructive' :
                          'secondary'
                        }
                        className="w-full justify-center text-xs"
                      >
                        {file.status === 'uploading' && file.progress && (
                          <span>{file.progress}% • </span>
                        )}
                        <span className="capitalize">{file.status}</span>
                      </Badge>
                      
                      {file.status === 'uploading' && file.progress && (
                        <Progress value={file.progress} className="h-1" />
                      )}
                      
                      {file.error && (
                        <p className="text-xs text-red-600 line-clamp-2" title={file.error}>
                          {file.error}
                        </p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            // List view
            <div className="space-y-2">
              {filteredFiles.map((file) => (
                <Card
                  key={file.id}
                  className={cn(
                    'transition-all duration-200 touch-manipulation',
                    selectedFile === file.id && 'scale-95 bg-accent'
                  )}
                  onTouchStart={(e) => handleTouchStart(e, file.id)}
                  onTouchMove={handleTouchMove}
                  onTouchEnd={() => handleTouchEnd(file.id)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center space-x-3">
                      <div className="flex items-center space-x-2 flex-shrink-0">
                        <File className="h-5 w-5 text-muted-foreground" />
                        <div className={cn(
                          'h-2 w-2 rounded-full',
                          getStatusColor(file.status)
                        )} />
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate" title={file.name}>
                          {file.name}
                        </p>
                        <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                          <span>{formatFileSize(file.size)}</span>
                          <span>•</span>
                          <span className="capitalize">{file.status}</span>
                          {file.kbName && (
                            <>
                              <span>•</span>
                              <span className="truncate max-w-20" title={file.kbName}>
                                {file.kbName}
                              </span>
                            </>
                          )}
                        </div>
                        
                        {file.status === 'uploading' && file.progress && (
                          <Progress value={file.progress} className="h-1 mt-2" />
                        )}
                        
                        {file.error && (
                          <p className="text-xs text-red-600 mt-1 line-clamp-1" title={file.error}>
                            {file.error}
                          </p>
                        )}
                      </div>
                      
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => onView(file.id)}>
                            <Eye className="h-4 w-4 mr-2" />
                            View
                          </DropdownMenuItem>
                          {file.status === 'error' && (
                            <DropdownMenuItem onClick={() => onRetry(file.id)}>
                              <RefreshCw className="h-4 w-4 mr-2" />
                              Retry
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem 
                            onClick={() => onDelete(file.id)}
                            className="text-red-600"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}
      
      {/* Swipe hint */}
      {filteredFiles.length > 0 && (
        <div className="px-4">
          <Alert>
            <AlertDescription className="text-xs">
              💡 Tip: Swipe right to view file details, swipe left to delete
            </AlertDescription>
          </Alert>
        </div>
      )}
    </div>
  );
}