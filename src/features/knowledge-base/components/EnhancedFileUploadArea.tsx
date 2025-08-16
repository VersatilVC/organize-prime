import React, { useCallback, useState, useMemo, useRef } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, File, X, CheckCircle, AlertCircle, Clock, Loader2, Play, Pause, RotateCcw } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useEnhancedFileUpload } from '../hooks/useEnhancedFileUpload';
import { useKnowledgeBases } from '../hooks/useKnowledgeBases';
import { cn } from '@/lib/utils';

interface EnhancedFileUploadAreaProps {
  selectedKbId?: string;
  onKbChange?: (kbId: string) => void;
  className?: string;
  maxFiles?: number;
  enableBatchUpload?: boolean;
  showAdvancedOptions?: boolean;
}

export function EnhancedFileUploadArea({ 
  selectedKbId, 
  onKbChange, 
  className,
  maxFiles = 10,
  enableBatchUpload = true,
  showAdvancedOptions = false
}: EnhancedFileUploadAreaProps) {
  const [localKbId, setLocalKbId] = useState<string>(selectedKbId || '');
  const [showProgress, setShowProgress] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  
  const dropzoneRef = useRef<HTMLDivElement>(null);
  
  const { 
    uploadFiles, 
    isUploading, 
    uploadProgress, 
    batchProgress,
    cancelUpload,
    clearCompleted,
    retryUpload,
    validateFiles,
    stats
  } = useEnhancedFileUpload({
    maxConcurrentUploads: 3,
    enableOptimisticUpdates: true,
    autoRetryFailures: true,
    maxRetries: 3
  });
  
  const { data: knowledgeBases, isLoading: kbLoading } = useKnowledgeBases();

  const currentKbId = selectedKbId || localKbId;

  const handleKbChange = useCallback((kbId: string) => {
    setLocalKbId(kbId);
    onKbChange?.(kbId);
  }, [onKbChange]);

  // File drop handling with validation
  const onDrop = useCallback(async (acceptedFiles: File[], rejectedFiles: any[]) => {
    if (!currentKbId) {
      // Focus on KB selector
      return;
    }

    // Show rejected files
    if (rejectedFiles.length > 0) {
      const reasons = rejectedFiles.map(f => 
        f.errors.map((e: any) => e.message).join(', ')
      ).join('; ');
      
      console.warn('Rejected files:', reasons);
    }

    // Validate files before upload
    if (acceptedFiles.length > 0) {
      setShowProgress(true);
      await uploadFiles({ files: acceptedFiles, kbId: currentKbId });
    }
  }, [currentKbId, uploadFiles]);

  // Dropzone configuration
  const { getRootProps, getInputProps, isDragActive, isDragReject } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'text/plain': ['.txt'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'application/msword': ['.doc'],
      'text/markdown': ['.md', '.markdown']
    },
    maxFiles,
    maxSize: 50 * 1024 * 1024, // 50MB
    disabled: !currentKbId || isUploading,
    multiple: enableBatchUpload
  });

  // Progress calculations
  const progressStats = useMemo(() => {
    if (uploadProgress.length === 0) return null;

    const total = uploadProgress.length;
    const completed = uploadProgress.filter(p => p.status === 'completed').length;
    const failed = uploadProgress.filter(p => p.status === 'error').length;
    const active = uploadProgress.filter(p => 
      ['validating', 'uploading', 'processing'].includes(p.status)
    ).length;

    const totalSize = uploadProgress.reduce((sum, p) => sum + p.fileSize, 0);
    const uploadedSize = uploadProgress.reduce((sum, p) => 
      sum + (p.fileSize * (p.progress / 100)), 0
    );

    return {
      total,
      completed,
      failed,
      active,
      totalSize,
      uploadedSize,
      overallProgress: total > 0 ? (completed / total) * 100 : 0
    };
  }, [uploadProgress]);

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatTime = (seconds: number): string => {
    if (seconds < 60) return `${Math.round(seconds)}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.round(seconds % 60);
    return `${minutes}m ${remainingSeconds}s`;
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'validating': return <Clock className="h-4 w-4 text-blue-500" />;
      case 'uploading': return <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />;
      case 'processing': return <Loader2 className="h-4 w-4 text-purple-500 animate-spin" />;
      case 'completed': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'error': return <AlertCircle className="h-4 w-4 text-red-500" />;
      case 'cancelled': return <X className="h-4 w-4 text-gray-500" />;
      default: return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      validating: 'secondary',
      uploading: 'default',
      processing: 'default',
      completed: 'default',
      error: 'destructive',
      cancelled: 'secondary'
    } as const;

    return (
      <Badge variant={variants[status as keyof typeof variants] || 'secondary'} className="flex items-center gap-1">
        {getStatusIcon(status)}
        <span className="capitalize">{status}</span>
      </Badge>
    );
  };

  return (
    <TooltipProvider>
      <div className={cn('space-y-4', className)}>
        {/* Knowledge Base Selection */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Knowledge Base</label>
          <Select 
            value={currentKbId} 
            onValueChange={handleKbChange}
            disabled={kbLoading || isUploading}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select a knowledge base" />
            </SelectTrigger>
            <SelectContent>
              {knowledgeBases?.map((kb) => (
                <SelectItem key={kb.id} value={kb.id}>
                  {kb.display_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {!currentKbId && (
            <p className="text-sm text-muted-foreground">
              Select a knowledge base before uploading files
            </p>
          )}
        </div>

        {/* Upload Area */}
        <div
          {...getRootProps()}
          ref={dropzoneRef}
          className={cn(
            'border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors',
            'hover:border-primary/50 hover:bg-primary/5',
            isDragActive && 'border-primary bg-primary/10',
            isDragReject && 'border-red-500 bg-red-50',
            !currentKbId && 'opacity-50 cursor-not-allowed',
            isUploading && 'pointer-events-none opacity-75'
          )}
        >
          <input {...getInputProps()} />
          
          <div className="space-y-4">
            <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
              <Upload className={cn(
                'h-8 w-8',
                isDragActive ? 'text-primary' : 'text-muted-foreground'
              )} />
            </div>
            
            <div>
              {isDragActive ? (
                <p className="text-lg font-medium text-primary">
                  Drop files here to upload
                </p>
              ) : (
                <>
                  <p className="text-lg font-medium">
                    Drag & drop files here, or click to browse
                  </p>
                  <p className="text-sm text-muted-foreground mt-2">
                    Supports PDF, TXT, DOCX, and Markdown files up to 50MB each
                  </p>
                  {enableBatchUpload && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Upload up to {maxFiles} files at once
                    </p>
                  )}
                </>
              )}
            </div>

            {!currentKbId && (
              <Alert className="text-left">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Please select a knowledge base before uploading files.
                </AlertDescription>
              </Alert>
            )}
          </div>
        </div>

        {/* Batch Progress Overview */}
        {batchProgress && (
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Upload Progress</CardTitle>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsPaused(!isPaused)}
                    disabled={batchProgress.completedFiles === batchProgress.totalFiles}
                  >
                    {isPaused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
                    {isPaused ? 'Resume' : 'Pause'}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={clearCompleted}
                    disabled={stats.completedUploads === 0}
                  >
                    Clear Completed
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Overall Progress Bar */}
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Overall Progress</span>
                  <span>{Math.round(batchProgress.overallProgress)}%</span>
                </div>
                <Progress value={batchProgress.overallProgress} className="h-2" />
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                <div className="space-y-1">
                  <div className="text-2xl font-bold text-blue-600">{stats.totalUploads}</div>
                  <div className="text-xs text-muted-foreground">Total Files</div>
                </div>
                <div className="space-y-1">
                  <div className="text-2xl font-bold text-green-600">{stats.completedUploads}</div>
                  <div className="text-xs text-muted-foreground">Completed</div>
                </div>
                <div className="space-y-1">
                  <div className="text-2xl font-bold text-orange-600">{stats.activeUploads}</div>
                  <div className="text-xs text-muted-foreground">Active</div>
                </div>
                <div className="space-y-1">
                  <div className="text-2xl font-bold text-red-600">{stats.failedUploads}</div>
                  <div className="text-xs text-muted-foreground">Failed</div>
                </div>
              </div>

              {/* Time Estimate */}
              {batchProgress.estimatedTimeRemaining && (
                <div className="text-center text-sm text-muted-foreground">
                  Estimated time remaining: {formatTime(batchProgress.estimatedTimeRemaining)}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Individual File Progress */}
        {showProgress && uploadProgress.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">File Details</CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowProgress(false)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4 max-h-64 overflow-y-auto">
                {uploadProgress.map((progress) => (
                  <div key={progress.fileId} className="space-y-2 p-3 border rounded-lg">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <File className="h-4 w-4 flex-shrink-0" />
                        <span className="font-medium truncate" title={progress.fileName}>
                          {progress.fileName}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {formatFileSize(progress.fileSize)}
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        {getStatusBadge(progress.status)}
                        
                        {['validating', 'uploading', 'processing'].includes(progress.status) && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => cancelUpload(progress.fileId)}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Cancel upload</TooltipContent>
                          </Tooltip>
                        )}
                        
                        {progress.status === 'error' && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => retryUpload(progress.fileId)}
                              >
                                <RotateCcw className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Retry upload</TooltipContent>
                          </Tooltip>
                        )}
                      </div>
                    </div>

                    {/* Progress Bar */}
                    {['uploading', 'processing'].includes(progress.status) && (
                      <div className="space-y-1">
                        <div className="flex justify-between text-xs">
                          <span className="capitalize">{progress.status}...</span>
                          <span>{Math.round(progress.progress)}%</span>
                        </div>
                        <Progress value={progress.progress} className="h-1" />
                        
                        {/* Upload Speed and Time Remaining */}
                        {progress.uploadSpeed && progress.timeRemaining && (
                          <div className="flex justify-between text-xs text-muted-foreground">
                            <span>{formatFileSize(progress.uploadSpeed)}/s</span>
                            <span>{formatTime(progress.timeRemaining)} remaining</span>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Error Message */}
                    {progress.error && (
                      <Alert className="mt-2">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription className="text-xs">
                          {progress.error}
                        </AlertDescription>
                      </Alert>
                    )}

                    {/* Validation Result */}
                    {progress.validationResult && !progress.validationResult.isValid && (
                      <div className="mt-2 space-y-1">
                        {progress.validationResult.errors.map((error, index) => (
                          <Alert key={index} className="py-2">
                            <AlertCircle className="h-4 w-4" />
                            <AlertDescription className="text-xs">
                              {error.message}
                            </AlertDescription>
                          </Alert>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Validation Errors */}
        {batchProgress && batchProgress.errors.length > 0 && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <div className="space-y-1">
                <div className="font-medium">Upload errors occurred:</div>
                {batchProgress.errors.map((error, index) => (
                  <div key={index} className="text-xs">{error}</div>
                ))}
              </div>
            </AlertDescription>
          </Alert>
        )}
      </div>
    </TooltipProvider>
  );
}