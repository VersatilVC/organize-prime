import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, File, X, CheckCircle, AlertCircle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { useFileUpload } from '../hooks/useFileUpload';
import { useKnowledgeBases } from '../hooks/useKnowledgeBases';
import { ProcessingProgress } from './ProcessingProgress';
import { cn } from '@/lib/utils';

interface FileUploadAreaProps {
  selectedKbId?: string;
  onKbChange?: (kbId: string) => void;
  className?: string;
}

interface SelectedFile {
  file: File;
  id: string;
  error?: string;
}

export function FileUploadArea({ selectedKbId, onKbChange, className }: FileUploadAreaProps) {
  const [selectedFiles, setSelectedFiles] = useState<SelectedFile[]>([]);
  const [localKbId, setLocalKbId] = useState<string>(selectedKbId || '');
  const [uploadedFileIds, setUploadedFileIds] = useState<string[]>([]);
  
  const { uploadFile, uploadProgress, clearProgress, isUploading } = useFileUpload();
  const { data: knowledgeBases, isLoading: kbLoading } = useKnowledgeBases();

  const currentKbId = selectedKbId || localKbId;

  const validateFile = useCallback((file: File): string | null => {
    // Check file type
    const allowedTypes = [
      'application/pdf',
      'text/plain',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/msword',
      'text/markdown'
    ];
    
    if (!allowedTypes.includes(file.type)) {
      return 'Unsupported file type. Please upload PDF, TXT, DOCX, or MD files.';
    }

    // Check file size (50MB max)
    const maxSize = 50 * 1024 * 1024;
    if (file.size > maxSize) {
      return 'File size must be less than 50MB.';
    }

    return null;
  }, []);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const newFiles: SelectedFile[] = acceptedFiles.map(file => {
      const error = validateFile(file);
      return {
        file,
        id: `${Date.now()}_${file.name}`,
        error: error || undefined
      };
    });

    setSelectedFiles(prev => [...prev, ...newFiles]);
  }, [validateFile]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'text/plain': ['.txt'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'application/msword': ['.doc'],
      'text/markdown': ['.md']
    },
    multiple: true,
    disabled: isUploading
  });

  const removeFile = useCallback((fileId: string) => {
    setSelectedFiles(prev => prev.filter(f => f.id !== fileId));
    clearProgress(fileId);
  }, [clearProgress]);

  const handleKbChange = useCallback((kbId: string) => {
    setLocalKbId(kbId);
    onKbChange?.(kbId);
  }, [onKbChange]);

  const handleUpload = useCallback(async () => {
    if (!currentKbId) {
      return;
    }

    const validFiles = selectedFiles.filter(f => !f.error);
    
    for (const selectedFile of validFiles) {
      try {
        const result = await uploadFile({ kbId: currentKbId, file: selectedFile.file });
        if (result?.id) {
          setUploadedFileIds(prev => [...prev, result.id]);
        }
      } catch (error) {
        console.error('Upload failed:', error);
      }
    }

    // Clear selected files after upload
    setSelectedFiles([]);
  }, [currentKbId, selectedFiles, uploadFile]);

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileIcon = (mimeType: string) => {
    if (mimeType.includes('pdf')) return '📄';
    if (mimeType.includes('word')) return '📝';
    if (mimeType.includes('text')) return '📄';
    return '📄';
  };

  const validFilesCount = selectedFiles.filter(f => !f.error).length;
  const hasErrors = selectedFiles.some(f => f.error);

  return (
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
      </div>

      {/* File Upload Area */}
      <Card className={cn(
        'border-2 border-dashed transition-colors',
        isDragActive ? 'border-primary bg-primary/5' : 'border-muted-foreground/25',
        isUploading && 'opacity-50 cursor-not-allowed'
      )}>
        <CardContent className="p-6">
          <div
            {...getRootProps()}
            className={cn(
              'flex flex-col items-center justify-center space-y-4 text-center cursor-pointer',
              isUploading && 'cursor-not-allowed'
            )}
          >
            <input {...getInputProps()} />
            <div className="p-4 rounded-full bg-muted">
              <Upload className="h-8 w-8 text-muted-foreground" />
            </div>
            <div className="space-y-2">
              <h3 className="text-lg font-medium">
                {isDragActive ? 'Drop files here' : 'Upload files'}
              </h3>
              <p className="text-sm text-muted-foreground">
                Drag and drop files here, or click to browse
              </p>
              <p className="text-xs text-muted-foreground">
                Supports PDF, TXT, DOCX, and MD files up to 50MB
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Selected Files List */}
      {selectedFiles.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-4">
              <h4 className="font-medium">
                Selected Files ({validFilesCount} valid)
              </h4>
              <Button
                onClick={handleUpload}
                disabled={!currentKbId || validFilesCount === 0 || isUploading}
                size="sm"
              >
                {isUploading ? 'Uploading...' : `Upload ${validFilesCount} files`}
              </Button>
            </div>

            <div className="space-y-2">
              {selectedFiles.map((selectedFile) => {
                const progress = uploadProgress[selectedFile.id];
                
                return (
                  <div
                    key={selectedFile.id}
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <div className="flex items-center space-x-3 flex-1">
                      <span className="text-lg">
                        {getFileIcon(selectedFile.file.type)}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {selectedFile.file.name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatFileSize(selectedFile.file.size)}
                        </p>
                        
                        {/* Progress bar for uploading files */}
                        {progress && (
                          <div className="mt-2 space-y-1">
                            <div className="flex items-center justify-between text-xs">
                              <span className="capitalize">{progress.status}</span>
                              {progress.status === 'uploading' && (
                                <span>{progress.progress}%</span>
                              )}
                            </div>
                            {progress.status === 'uploading' && (
                              <Progress value={progress.progress} className="h-1" />
                            )}
                          </div>
                        )}

                        {/* Error message */}
                        {selectedFile.error && (
                          <Alert className="mt-2">
                            <AlertCircle className="h-4 w-4" />
                            <AlertDescription className="text-xs">
                              {selectedFile.error}
                            </AlertDescription>
                          </Alert>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      {/* Status indicator */}
                      {progress ? (
                        <Badge 
                          variant={
                            progress.status === 'completed' ? 'default' :
                            progress.status === 'error' ? 'destructive' :
                            'secondary'
                          }
                        >
                          {progress.status === 'completed' && <CheckCircle className="h-3 w-3 mr-1" />}
                          {progress.status === 'error' && <AlertCircle className="h-3 w-3 mr-1" />}
                          {progress.status}
                        </Badge>
                      ) : selectedFile.error ? (
                        <Badge variant="destructive">
                          <AlertCircle className="h-3 w-3 mr-1" />
                          Invalid
                        </Badge>
                      ) : (
                        <Badge variant="outline">Ready</Badge>
                      )}

                      {/* Remove button */}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeFile(selectedFile.id)}
                        disabled={progress?.status === 'uploading'}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>

            {hasErrors && (
              <Alert className="mt-4">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Some files have validation errors and won't be uploaded. Please check the file types and sizes.
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      )}

      {/* Upload Progress Summary */}
      {Object.keys(uploadProgress).length > 0 && (
        <Card>
          <CardContent className="p-4">
            <h4 className="font-medium mb-3">Upload Progress</h4>
            <div className="space-y-2">
              {Object.values(uploadProgress).map((progress) => (
                <div key={progress.fileId} className="flex items-center justify-between text-sm">
                  <span className="truncate flex-1">{progress.fileName}</span>
                  <Badge 
                    variant={
                      progress.status === 'completed' ? 'default' :
                      progress.status === 'error' ? 'destructive' :
                      'secondary'
                    }
                  >
                    {progress.status}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Processing Progress for Uploaded Files */}
      {uploadedFileIds.length > 0 && (
        <div className="space-y-4">
          <h4 className="font-medium">File Processing Status</h4>
          {uploadedFileIds.map((fileId) => (
            <ProcessingProgress 
              key={fileId} 
              fileId={fileId}
              onComplete={() => {
                // Remove from tracking once completed
                setUploadedFileIds(prev => prev.filter(id => id !== fileId));
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}