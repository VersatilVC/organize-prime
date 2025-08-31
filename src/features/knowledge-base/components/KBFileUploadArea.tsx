import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, File, X, CheckCircle, AlertCircle, Clock, Loader2, RotateCcw, Link, Plus } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useKnowledgeBases } from '../hooks/useKnowledgeBases';
import { useKBExtraction } from '../hooks/useKBExtraction';
import { cn } from '@/lib/utils';

interface KBFileUploadAreaProps {
  selectedKbId?: string;
  onKbChange?: (kbId: string) => void;
  className?: string;
  maxFiles?: number;
  enableBatchUpload?: boolean;
  showAdvancedOptions?: boolean;
}

export function KBFileUploadArea({ 
  selectedKbId, 
  onKbChange, 
  className,
  maxFiles = 10,
  enableBatchUpload = true,
  showAdvancedOptions = false
}: KBFileUploadAreaProps) {
  const [localKbId, setLocalKbId] = useState<string>(selectedKbId || '');
  const [urlInput, setUrlInput] = useState<string>('');
  const [urlFilename, setUrlFilename] = useState<string>('');
  const [showProgress, setShowProgress] = useState(false);
  
  // KB extraction hook
  const { 
    extractions, 
    isExtracting, 
    stats,
    extractFiles,
    extractUrl,
    retryExtraction,
    clearCompleted,
    removeExtraction
  } = useKBExtraction();
  
  const { data: knowledgeBases, isLoading: kbLoading } = useKnowledgeBases();

  const currentKbId = selectedKbId || localKbId;

  const handleKbChange = useCallback((kbId: string) => {
    setLocalKbId(kbId);
    onKbChange?.(kbId);
  }, [onKbChange]);

  // File drop handling with validation
  const onDrop = useCallback(async (acceptedFiles: File[], rejectedFiles: any[]) => {
    if (!currentKbId) {
      return;
    }

    // Show rejected files
    if (rejectedFiles.length > 0) {
      const reasons = rejectedFiles.map(f => 
        f.errors.map((e: any) => e.message).join(', ')
      ).join('; ');
      
      console.warn('Rejected files:', reasons);
    }

    // Extract files using our new service
    if (acceptedFiles.length > 0) {
      setShowProgress(true);
      await extractFiles(acceptedFiles, currentKbId, {
        generateEmbeddings: true
      });
    }
  }, [currentKbId, extractFiles]);

  // Handle URL submission
  const handleUrlSubmit = useCallback(async () => {
    if (!urlInput.trim() || !currentKbId) return;

    try {
      // Validate URL
      new URL(urlInput);
    } catch {
      return;
    }

    setShowProgress(true);
    
    await extractUrl(
      urlInput.trim(), 
      currentKbId, 
      urlFilename.trim() || undefined,
      { generateEmbeddings: true }
    );

    // Clear form
    setUrlInput('');
    setUrlFilename('');
  }, [urlInput, urlFilename, currentKbId, extractUrl]);

  // Dropzone configuration
  const { getRootProps, getInputProps, isDragActive, isDragReject } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'text/plain': ['.txt'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'application/msword': ['.doc'],
      'text/markdown': ['.md', '.markdown'],
      'application/vnd.openxmlformats-officedocument.presentationml.presentation': ['.pptx'],
      'application/vnd.ms-powerpoint': ['.ppt'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls'],
      'application/rtf': ['.rtf'],
      'application/vnd.oasis.opendocument.text': ['.odt']
    },
    maxFiles,
    maxSize: 50 * 1024 * 1024, // 50MB
    disabled: !currentKbId || isExtracting,
    multiple: enableBatchUpload
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return <Clock className="h-4 w-4 text-blue-500" />;
      case 'uploading': return <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />;
      case 'processing': return <Loader2 className="h-4 w-4 text-purple-500 animate-spin" />;
      case 'completed': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'failed': return <AlertCircle className="h-4 w-4 text-red-500" />;
      default: return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      pending: 'secondary',
      uploading: 'default',
      processing: 'default',
      completed: 'default',
      failed: 'destructive',
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
          <Label>Knowledge Base</Label>
          <Select 
            value={currentKbId} 
            onValueChange={handleKbChange}
            disabled={kbLoading || isExtracting}
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

        {/* Upload Tabs */}
        <Tabs defaultValue="files" className="space-y-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="files" className="flex items-center gap-2">
              <Upload className="h-4 w-4" />
              Upload Files
            </TabsTrigger>
            <TabsTrigger value="urls" className="flex items-center gap-2">
              <Link className="h-4 w-4" />
              Add URLs
            </TabsTrigger>
          </TabsList>

          {/* File Upload Tab */}
          <TabsContent value="files" className="space-y-4">
            <div
              {...getRootProps()}
              className={cn(
                'border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors',
                'hover:border-primary/50 hover:bg-primary/5',
                isDragActive && 'border-primary bg-primary/10',
                isDragReject && 'border-red-500 bg-red-50',
                !currentKbId && 'opacity-50 cursor-not-allowed',
                isExtracting && 'pointer-events-none opacity-75'
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
                        Supports PDF, DOC, DOCX, PPT, PPTX, XLS, XLSX, TXT, MD, RTF, ODT files up to 50MB each
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
          </TabsContent>

          {/* URL Upload Tab */}
          <TabsContent value="urls" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Add Content from URL</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="url-input">URL</Label>
                  <Input
                    id="url-input"
                    type="url"
                    placeholder="https://example.com/article"
                    value={urlInput}
                    onChange={(e) => setUrlInput(e.target.value)}
                    disabled={!currentKbId || isExtracting}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="filename-input">Filename (optional)</Label>
                  <Input
                    id="filename-input"
                    type="text"
                    placeholder="article.html"
                    value={urlFilename}
                    onChange={(e) => setUrlFilename(e.target.value)}
                    disabled={!currentKbId || isExtracting}
                  />
                  <p className="text-xs text-muted-foreground">
                    If not provided, filename will be generated from URL
                  </p>
                </div>

                <Button
                  onClick={handleUrlSubmit}
                  disabled={!urlInput.trim() || !currentKbId || isExtracting}
                  className="w-full"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Extract Content from URL
                </Button>

                {!currentKbId && (
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      Please select a knowledge base before adding URLs.
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Extraction Progress */}
        {extractions.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Processing Status</CardTitle>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={clearCompleted}
                    disabled={stats.completed === 0}
                  >
                    Clear Completed
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowProgress(false)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Stats Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                <div className="space-y-1">
                  <div className="text-2xl font-bold text-blue-600">{stats.total}</div>
                  <div className="text-xs text-muted-foreground">Total</div>
                </div>
                <div className="space-y-1">
                  <div className="text-2xl font-bold text-green-600">{stats.completed}</div>
                  <div className="text-xs text-muted-foreground">Completed</div>
                </div>
                <div className="space-y-1">
                  <div className="text-2xl font-bold text-orange-600">{stats.processing}</div>
                  <div className="text-xs text-muted-foreground">Processing</div>
                </div>
                <div className="space-y-1">
                  <div className="text-2xl font-bold text-red-600">{stats.failed}</div>
                  <div className="text-xs text-muted-foreground">Failed</div>
                </div>
              </div>

              {/* Individual Extraction Progress */}
              <div className="space-y-3 max-h-64 overflow-y-auto">
                {extractions.map((extraction) => (
                  <div key={extraction.id} className="space-y-2 p-3 border rounded-lg">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <File className="h-4 w-4 flex-shrink-0" />
                        <span className="font-medium truncate" title={extraction.fileName}>
                          {extraction.fileName}
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        {getStatusBadge(extraction.status)}
                        
                        {extraction.status === 'failed' && extraction.fileId && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => retryExtraction(extraction.fileId!, extraction.fileName)}
                              >
                                <RotateCcw className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Retry extraction</TooltipContent>
                          </Tooltip>
                        )}

                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => removeExtraction(extraction.id)}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Remove from list</TooltipContent>
                        </Tooltip>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    {['uploading', 'processing'].includes(extraction.status) && (
                      <div className="space-y-1">
                        <div className="flex justify-between text-xs">
                          <span>{extraction.message}</span>
                          <span>{Math.round(extraction.progress)}%</span>
                        </div>
                        <Progress value={extraction.progress} className="h-1" />
                      </div>
                    )}

                    {/* Status Message */}
                    <p className="text-sm text-muted-foreground">
                      {extraction.message}
                      {extraction.chunks && extraction.embeddings && (
                        <span className="ml-2">
                          • {extraction.chunks} chunks • {extraction.embeddings} embeddings
                        </span>
                      )}
                    </p>

                    {/* Error Message */}
                    {extraction.error && (
                      <Alert className="mt-2">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription className="text-xs">
                          {extraction.error}
                        </AlertDescription>
                      </Alert>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </TooltipProvider>
  );
}