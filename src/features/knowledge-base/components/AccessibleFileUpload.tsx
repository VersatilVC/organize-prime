import React, { useRef, useState, useCallback, useId } from 'react';
import { useDropzone } from 'react-dropzone';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { 
  Upload, 
  File, 
  X, 
  CheckCircle, 
  AlertCircle, 
  Keyboard,
  Eye,
  VolumeX,
  Volume2
} from 'lucide-react';
import { cn } from '@/lib/utils';

// Screen reader announcements hook
function useScreenReader() {
  const [announcements, setAnnouncements] = useState<string[]>([]);
  const [isEnabled, setIsEnabled] = useState(true);
  
  const announce = useCallback((message: string, priority: 'polite' | 'assertive' = 'polite') => {
    if (!isEnabled) return;
    
    setAnnouncements(prev => [...prev, message]);
    
    // Auto-clear after announcing
    setTimeout(() => {
      setAnnouncements(prev => prev.slice(1));
    }, 100);
  }, [isEnabled]);
  
  const toggle = useCallback(() => {
    setIsEnabled(prev => !prev);
  }, []);
  
  return { announcements, announce, isEnabled, toggle };
}

// Keyboard navigation hook
function useKeyboardNavigation(items: any[], onAction: (index: number, action: string) => void) {
  const [focusedIndex, setFocusedIndex] = useState(-1);
  
  const handleKeyDown = useCallback((event: React.KeyboardEvent) => {
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        setFocusedIndex(prev => Math.min(items.length - 1, prev + 1));
        break;
      case 'ArrowUp':
        event.preventDefault();
        setFocusedIndex(prev => Math.max(0, prev - 1));
        break;
      case 'Home':
        event.preventDefault();
        setFocusedIndex(0);
        break;
      case 'End':
        event.preventDefault();
        setFocusedIndex(items.length - 1);
        break;
      case 'Enter':
      case ' ':
        event.preventDefault();
        if (focusedIndex >= 0) {
          onAction(focusedIndex, 'select');
        }
        break;
      case 'Delete':
        event.preventDefault();
        if (focusedIndex >= 0) {
          onAction(focusedIndex, 'delete');
        }
        break;
      case 'Escape':
        event.preventDefault();
        setFocusedIndex(-1);
        break;
    }
  }, [items.length, focusedIndex, onAction]);
  
  return { focusedIndex, setFocusedIndex, handleKeyDown };
}

interface AccessibleFileUploadProps {
  files: Array<{
    id: string;
    name: string;
    size: number;
    status: 'uploading' | 'completed' | 'error' | 'pending';
    progress?: number;
    error?: string;
  }>;
  onUpload: (files: File[]) => void;
  onRemove: (id: string) => void;
  onRetry: (id: string) => void;
  isUploading?: boolean;
  className?: string;
}

export function AccessibleFileUpload({
  files,
  onUpload,
  onRemove,
  onRetry,
  isUploading = false,
  className
}: AccessibleFileUploadProps) {
  const { announcements, announce, isEnabled: screenReaderEnabled, toggle: toggleScreenReader } = useScreenReader();
  const { focusedIndex, setFocusedIndex, handleKeyDown } = useKeyboardNavigation(files, (index, action) => {
    const file = files[index];
    if (!file) return;
    
    switch (action) {
      case 'delete':
        onRemove(file.id);
        announce(`Removed ${file.name}`, 'assertive');
        break;
      case 'select':
        if (file.status === 'error') {
          onRetry(file.id);
          announce(`Retrying upload for ${file.name}`, 'assertive');
        }
        break;
    }
  });
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropzoneRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  
  // Unique IDs for accessibility
  const uploadAreaId = useId();
  const fileListId = useId();
  const instructionsId = useId();
  const statusId = useId();
  
  // Dropzone with accessibility enhancements
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: (acceptedFiles, rejectedFiles) => {
      if (acceptedFiles.length > 0) {
        onUpload(acceptedFiles);
        announce(`${acceptedFiles.length} files selected for upload`, 'assertive');
      }
      
      if (rejectedFiles.length > 0) {
        announce(`${rejectedFiles.length} files rejected due to invalid format or size`, 'assertive');
      }
    },
    accept: {
      'application/pdf': ['.pdf'],
      'text/plain': ['.txt'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'application/msword': ['.doc'],
      'text/markdown': ['.md']
    },
    maxSize: 50 * 1024 * 1024,
    disabled: isUploading
  });
  
  // Keyboard handlers
  const handleFileInputKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      fileInputRef.current?.click();
    }
  };
  
  const handleListKeyDown = (event: React.KeyboardEvent) => {
    handleKeyDown(event);
  };
  
  // Focus management
  const focusFileList = useCallback(() => {
    if (files.length > 0 && listRef.current) {
      listRef.current.focus();
      setFocusedIndex(0);
    }
  }, [files.length, setFocusedIndex]);
  
  // Format file size for screen readers
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 bytes';
    const k = 1024;
    const sizes = ['bytes', 'kilobytes', 'megabytes', 'gigabytes'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    const size = parseFloat((bytes / Math.pow(k, i)).toFixed(1));
    return `${size} ${sizes[i]}`;
  };
  
  // Get status description for screen readers
  const getStatusDescription = (file: any): string => {
    switch (file.status) {
      case 'uploading':
        return `Uploading, ${file.progress || 0}% complete`;
      case 'completed':
        return 'Upload completed successfully';
      case 'error':
        return `Upload failed: ${file.error || 'Unknown error'}`;
      case 'pending':
        return 'Pending upload';
      default:
        return file.status;
    }
  };
  
  // Calculate upload statistics for screen reader
  const uploadStats = React.useMemo(() => {
    const total = files.length;
    const completed = files.filter(f => f.status === 'completed').length;
    const failed = files.filter(f => f.status === 'error').length;
    const uploading = files.filter(f => f.status === 'uploading').length;
    
    return { total, completed, failed, uploading };
  }, [files]);
  
  return (
    <div className={cn('space-y-4', className)}>
      {/* Screen reader controls */}
      <div className="flex justify-end">
        <Button
          variant="ghost"
          size="sm"
          onClick={toggleScreenReader}
          className="text-xs"
          aria-label={screenReaderEnabled ? 'Disable screen reader announcements' : 'Enable screen reader announcements'}
        >
          {screenReaderEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
          <span className="ml-1">Screen Reader</span>
        </Button>
      </div>
      
      {/* Upload area */}
      <Card>
        <CardHeader>
          <CardTitle id={uploadAreaId}>File Upload</CardTitle>
        </CardHeader>
        <CardContent>
          <div
            {...getRootProps()}
            ref={dropzoneRef}
            className={cn(
              'border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors',
              'focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2',
              isDragActive && 'border-primary bg-primary/5',
              isUploading && 'opacity-50 cursor-not-allowed'
            )}
            role="button"
            tabIndex={0}
            aria-labelledby={uploadAreaId}
            aria-describedby={instructionsId}
            onKeyDown={handleFileInputKeyDown}
          >
            <input 
              {...getInputProps()} 
              ref={fileInputRef}
              aria-describedby={instructionsId}
            />
            
            <Upload className={cn(
              'mx-auto h-12 w-12 mb-4',
              isDragActive ? 'text-primary' : 'text-muted-foreground'
            )} aria-hidden="true" />
            
            <div>
              <p className="text-lg font-medium mb-2">
                {isDragActive ? 'Drop files here' : 'Upload Files'}
              </p>
              <p id={instructionsId} className="text-sm text-muted-foreground">
                Drag and drop files here, or press Enter to browse. 
                Supports PDF, Word, text, and Markdown files up to 50MB each.
              </p>
            </div>
            
            {/* Keyboard shortcuts help */}
            <details className="mt-4 text-left">
              <summary className="text-sm text-muted-foreground cursor-pointer hover:text-foreground">
                <Keyboard className="inline h-4 w-4 mr-1" aria-hidden="true" />
                Keyboard shortcuts
              </summary>
              <div className="mt-2 text-xs text-muted-foreground space-y-1">
                <div><kbd className="px-1 py-0.5 bg-muted rounded">Enter/Space</kbd> - Browse files</div>
                <div><kbd className="px-1 py-0.5 bg-muted rounded">↑/↓</kbd> - Navigate file list</div>
                <div><kbd className="px-1 py-0.5 bg-muted rounded">Delete</kbd> - Remove focused file</div>
                <div><kbd className="px-1 py-0.5 bg-muted rounded">Enter</kbd> - Retry failed upload</div>
                <div><kbd className="px-1 py-0.5 bg-muted rounded">Esc</kbd> - Clear selection</div>
              </div>
            </details>
          </div>
        </CardContent>
      </Card>
      
      {/* Upload status summary */}
      {files.length > 0 && (
        <div 
          id={statusId}
          aria-live="polite"
          aria-atomic="true"
          className="sr-only"
        >
          {uploadStats.total} files total. 
          {uploadStats.completed} completed, 
          {uploadStats.uploading} uploading, 
          {uploadStats.failed} failed.
        </div>
      )}
      
      {/* File list */}
      {files.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle id={fileListId}>
                Files ({files.length})
              </CardTitle>
              <Button
                variant="outline"
                size="sm"
                onClick={focusFileList}
                aria-label="Focus file list for keyboard navigation"
              >
                <Eye className="h-4 w-4 mr-1" />
                Focus List
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div
              ref={listRef}
              role="listbox"
              aria-labelledby={fileListId}
              aria-describedby={statusId}
              tabIndex={0}
              onKeyDown={handleListKeyDown}
              className="space-y-2 max-h-64 overflow-y-auto focus:outline-none focus:ring-2 focus:ring-ring rounded"
            >
              {files.map((file, index) => (
                <div
                  key={file.id}
                  role="option"
                  aria-selected={index === focusedIndex}
                  className={cn(
                    'flex items-center justify-between p-3 border rounded-lg transition-colors',
                    index === focusedIndex && 'ring-2 ring-ring bg-accent',
                    'hover:bg-accent/50'
                  )}
                >
                  <div className="flex items-center space-x-3 flex-1 min-w-0">
                    <File className="h-5 w-5 flex-shrink-0" aria-hidden="true" />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate" title={file.name}>
                        {file.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatFileSize(file.size)}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    {/* Status badge with screen reader text */}
                    <Badge
                      variant={
                        file.status === 'completed' ? 'default' :
                        file.status === 'error' ? 'destructive' :
                        'secondary'
                      }
                      className="flex items-center gap-1"
                    >
                      {file.status === 'uploading' && (
                        <div className="h-3 w-3 border-2 border-white border-t-transparent rounded-full animate-spin" aria-hidden="true" />
                      )}
                      {file.status === 'completed' && <CheckCircle className="h-3 w-3" aria-hidden="true" />}
                      {file.status === 'error' && <AlertCircle className="h-3 w-3" aria-hidden="true" />}
                      <span className="sr-only">{getStatusDescription(file)}</span>
                      <span aria-hidden="true" className="capitalize">{file.status}</span>
                    </Badge>
                    
                    {/* Action buttons */}
                    {file.status === 'error' && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onRetry(file.id)}
                        aria-label={`Retry upload for ${file.name}`}
                      >
                        <span className="sr-only">Retry</span>
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                      </Button>
                    )}
                    
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onRemove(file.id)}
                      aria-label={`Remove ${file.name} from upload list`}
                    >
                      <span className="sr-only">Remove</span>
                      <X className="h-4 w-4" aria-hidden="true" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
            
            {/* Progress summary */}
            <div className="mt-4 text-sm text-muted-foreground">
              <div className="flex justify-between items-center">
                <span>Upload Progress</span>
                <span>
                  {uploadStats.completed} of {uploadStats.total} completed
                </span>
              </div>
              <Progress 
                value={(uploadStats.completed / uploadStats.total) * 100} 
                className="mt-2"
                aria-label={`Overall upload progress: ${uploadStats.completed} of ${uploadStats.total} files completed`}
              />
            </div>
          </CardContent>
        </Card>
      )}
      
      {/* Live region for screen reader announcements */}
      <div aria-live="assertive" aria-atomic="true" className="sr-only">
        {announcements.map((announcement, index) => (
          <div key={index}>{announcement}</div>
        ))}
      </div>
      
      {/* Error alerts */}
      {uploadStats.failed > 0 && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {uploadStats.failed} file{uploadStats.failed > 1 ? 's' : ''} failed to upload. 
            Use the retry button or check the file format and size.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}