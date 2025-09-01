// Content Idea File Upload Component
// Handles file and URL upload for content ideas with extraction support

import React, { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { 
  Upload, 
  Link, 
  X, 
  FileText, 
  AlertCircle, 
  CheckCircle,
  Loader2,
  RefreshCw,
  Eye,
  Plus
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useDropzone } from 'react-dropzone';
import { toast } from 'sonner';
import { 
  useUploadAndExtract, 
  useRetryExtraction,
  useExtractionSupport 
} from '@/hooks/content-creation/useContentIdeaExtraction';
import type { SourceFile } from '@/types/content-creation';

interface ContentIdeaFileUploadProps {
  ideaId: string;
  sourceFiles?: SourceFile[];
  extractionStatus?: 'none' | 'pending' | 'processing' | 'completed' | 'failed';
  onFilesChange?: (files: SourceFile[]) => void;
  onFileObjectsChange?: (files: File[]) => void;
  disabled?: boolean;
  className?: string;
}

export const ContentIdeaFileUpload: React.FC<ContentIdeaFileUploadProps> = ({
  ideaId,
  sourceFiles = [],
  extractionStatus = 'none',
  onFilesChange,
  onFileObjectsChange,
  disabled = false,
  className
}) => {
  const [urlInput, setUrlInput] = useState('');
  const [localFiles, setLocalFiles] = useState<SourceFile[]>(sourceFiles);
  const [localFileObjects, setLocalFileObjects] = useState<File[]>([]);

  const { isFileSupported, isUrlSupported, supportedFileTypes } = useExtractionSupport();
  const uploadAndExtractMutation = useUploadAndExtract();
  const retryExtractionMutation = useRetryExtraction();

  // Update local files when sourceFiles prop changes
  React.useEffect(() => {
    setLocalFiles(sourceFiles);
  }, [sourceFiles]);

  // Handle file drop
  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (disabled) return;

    const newSourceFiles: SourceFile[] = [];
    const invalidFiles: string[] = [];

    acceptedFiles.forEach(file => {
      if (isFileSupported(file)) {
        newSourceFiles.push({
          type: 'file',
          name: file.name,
          value: '', // Will be set during extraction
          size: file.size,
          mimeType: file.type,
          status: 'pending'
        });
      } else {
        invalidFiles.push(file.name);
      }
    });

    if (invalidFiles.length > 0) {
      toast.error(`Unsupported files: ${invalidFiles.join(', ')}`);
    }

    if (newSourceFiles.length > 0) {
      const validFiles = acceptedFiles.filter(file => isFileSupported(file));
      const updatedFiles = [...localFiles, ...newSourceFiles];
      const updatedFileObjects = [...localFileObjects, ...validFiles];
      
      setLocalFiles(updatedFiles);
      setLocalFileObjects(updatedFileObjects);
      onFilesChange?.(updatedFiles);
      onFileObjectsChange?.(updatedFileObjects);

      // Auto-trigger extraction if ideaId exists
      if (ideaId) {
        uploadAndExtractMutation.mutate({
          ideaId,
          files: validFiles,
          urls: []
        });
      }
    }
  }, [localFiles, localFileObjects, onFilesChange, onFileObjectsChange, ideaId, isFileSupported, uploadAndExtractMutation, disabled]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    disabled,
    accept: {
      'application/pdf': ['.pdf'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'application/msword': ['.doc'],
      'application/vnd.openxmlformats-officedocument.presentationml.presentation': ['.pptx'],
      'application/vnd.ms-powerpoint': ['.ppt'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls'],
      'text/plain': ['.txt'],
      'application/rtf': ['.rtf']
    }
  });

  // Handle URL addition
  const handleAddUrl = () => {
    if (!urlInput.trim() || disabled) return;

    if (!isUrlSupported(urlInput)) {
      toast.error('Please enter a valid URL');
      return;
    }

    const newSourceFile: SourceFile = {
      type: 'url',
      name: new URL(urlInput).hostname,
      value: urlInput,
      status: 'pending'
    };

    const updatedFiles = [...localFiles, newSourceFile];
    setLocalFiles(updatedFiles);
    onFilesChange?.(updatedFiles);
    setUrlInput('');

    // Auto-trigger extraction if ideaId exists
    if (ideaId) {
      uploadAndExtractMutation.mutate({
        ideaId,
        files: [],
        urls: [urlInput]
      });
    }
  };

  // Handle file removal
  const handleRemoveFile = (fileName: string) => {
    if (disabled) return;
    
    const updatedFiles = localFiles.filter(f => f.name !== fileName);
    const updatedFileObjects = localFileObjects.filter(f => f.name !== fileName);
    
    setLocalFiles(updatedFiles);
    setLocalFileObjects(updatedFileObjects);
    onFilesChange?.(updatedFiles);
    onFileObjectsChange?.(updatedFileObjects);
  };

  // Handle retry extraction
  const handleRetryExtraction = (fileName: string) => {
    if (!ideaId || disabled) return;
    
    retryExtractionMutation.mutate({
      ideaId,
      fileName
    });
  };

  // Handle preview content (placeholder for future implementation)
  const handlePreviewContent = (file: SourceFile) => {
    toast.info('Content preview coming soon!');
  };

  const getFileStatusIcon = (file: SourceFile) => {
    switch (file.status) {
      case 'pending':
        return <Loader2 className="h-4 w-4 text-muted-foreground animate-spin" />;
      case 'processing':
        return <Loader2 className="h-4 w-4 text-blue-600 animate-spin" />;
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'failed':
        return <AlertCircle className="h-4 w-4 text-red-600" />;
      default:
        return <FileText className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getFileStatusBadge = (file: SourceFile) => {
    switch (file.status) {
      case 'pending':
        return <Badge variant="outline">Pending</Badge>;
      case 'processing':
        return <Badge variant="secondary">Processing</Badge>;
      case 'completed':
        return <Badge variant="default">Complete</Badge>;
      case 'failed':
        return <Badge variant="destructive">Failed</Badge>;
      default:
        return <Badge variant="outline">Ready</Badge>;
    }
  };

  const isExtracting = uploadAndExtractMutation.isPending || retryExtractionMutation.isPending;

  return (
    <div className={cn("space-y-4", className)}>
      {/* File Upload Section */}
      <div>
        <Label className="text-sm font-medium mb-2 block">
          Examples
        </Label>
        <div
          {...getRootProps()}
          className={cn(
            "border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors",
            isDragActive
              ? "border-primary bg-primary/5"
              : "border-muted-foreground/25 hover:border-primary hover:bg-primary/5",
            disabled && "opacity-50 cursor-not-allowed"
          )}
        >
          <input {...getInputProps()} />
          <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
          <p className="text-sm text-muted-foreground mb-1">
            {isDragActive
              ? "Drop files here..."
              : "Drag & drop files here, or click to browse"}
          </p>
          <p className="text-xs text-muted-foreground">
            PDF, DOC, DOCX, TXT, MD files up to 10MB each
          </p>
        </div>
      </div>

      {/* URL Input Section */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Link className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">Add example URL</span>
        </div>
        <div className="flex gap-2">
          <Input
            placeholder="https://example.com/sample-content"
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleAddUrl()}
            disabled={disabled}
          />
          <Button
            type="button"
            onClick={handleAddUrl}
            disabled={!urlInput.trim() || disabled}
            size="sm"
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Files List */}
      {localFiles.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <Label className="text-sm font-medium">
              Files & URLs ({localFiles.length})
            </Label>
            {isExtracting && (
              <Badge variant="secondary" className="animate-pulse">
                <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                Extracting...
              </Badge>
            )}
          </div>

          <div className="space-y-2 max-h-48 overflow-y-auto">
            {localFiles.map((file, index) => (
              <div
                key={`${file.name}-${index}`}
                className="flex items-center justify-between p-3 bg-muted rounded-lg"
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  {getFileStatusIcon(file)}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-sm font-medium truncate">
                        {file.name}
                      </p>
                      {getFileStatusBadge(file)}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span>
                        {file.type === 'file' 
                          ? `${file.mimeType} • ${Math.round((file.size || 0) / 1024)} KB`
                          : 'Web Page'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1 ml-2">
                  {file.status === 'completed' && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handlePreviewContent(file)}
                      className="h-8 w-8 p-0"
                      title="Preview content"
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                  )}

                  {file.status === 'failed' && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleRetryExtraction(file.name)}
                      disabled={retryExtractionMutation.isPending}
                      className="h-8 w-8 p-0"
                      title="Retry extraction"
                    >
                      <RefreshCw className="h-4 w-4" />
                    </Button>
                  )}

                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleRemoveFile(file.name)}
                    disabled={disabled}
                    className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-100"
                    title="Remove file"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Error Display */}
      {localFiles.some(f => f.error) && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Some files failed to extract. Click retry button to try again.
          </AlertDescription>
        </Alert>
      )}

      {/* Help Text */}
      {localFiles.length === 0 && (
        <Alert>
          <FileText className="h-4 w-4" />
          <AlertDescription>
            Upload files or add URLs to extract content for your idea. This content will be used to generate AI suggestions and improve the idea development process.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
};