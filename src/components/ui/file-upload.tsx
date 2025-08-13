import React, { useState, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Icons } from '@/components/ui/icons';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth-migration';
import { useOrganization } from '@/contexts/OrganizationContext';
import { toast } from '@/hooks/use-toast';

interface FileUploadProps {
  onFileUploaded: (filePath: string, fileName: string) => void;
  onFileRemoved: () => void;
  maxSize?: number; // in MB
  acceptedTypes?: string[];
  disabled?: boolean;
  className?: string;
}

interface UploadedFile {
  name: string;
  size: number;
  path: string;
  preview?: string;
}

export function FileUpload({
  onFileUploaded,
  onFileRemoved,
  maxSize = 10,
  acceptedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
  disabled = false,
  className
}: FileUploadProps) {
  const { user } = useAuth();
  const { currentOrganization } = useOrganization();
  const [isDragOver, setIsDragOver] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<UploadedFile | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const validateFile = (file: File): string | null => {
    if (file.size > maxSize * 1024 * 1024) {
      return `File size must be less than ${maxSize}MB`;
    }
    
    if (!acceptedTypes.includes(file.type)) {
      return `File type not supported. Please upload: ${acceptedTypes.map(type => type.split('/')[1]).join(', ')}`;
    }
    
    return null;
  };

  const generateFileName = (originalName: string) => {
    const timestamp = Date.now();
    const extension = originalName.split('.').pop();
    return `feedback-${timestamp}-${originalName}`;
  };

  const uploadFile = async (file: File) => {
    if (!user || !currentOrganization) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'User or organization not found.',
      });
      return;
    }

    const validation = validateFile(file);
    if (validation) {
      toast({
        variant: 'destructive',
        title: 'Invalid File',
        description: validation,
      });
      return;
    }

    setUploading(true);
    setUploadProgress(0);

    try {
      const fileName = generateFileName(file.name);
      const filePath = `${user.id}/${currentOrganization.id}/${fileName}`;

      // Create preview for images
      let preview: string | undefined;
      if (file.type.startsWith('image/')) {
        preview = URL.createObjectURL(file);
      }

      const { error } = await supabase.storage
        .from('feedback-attachments')
        .upload(filePath, file);

      if (error) throw error;

      // Simulate progress for better UX
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 100;
          }
          return prev + 10;
        });
      }, 100);

      const newUploadedFile: UploadedFile = {
        name: file.name,
        size: file.size,
        path: filePath,
        preview,
      };

      setUploadedFile(newUploadedFile);
      onFileUploaded(filePath, file.name);
      
      toast({
        title: 'Success',
        description: 'File uploaded successfully.',
      });

    } catch (error) {
      console.error('Upload error:', error);
      toast({
        variant: 'destructive',
        title: 'Upload Failed',
        description: 'Failed to upload file. Please try again.',
      });
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const handleFileSelect = useCallback((files: FileList | null) => {
    if (!files || files.length === 0) return;
    uploadFile(files[0]);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    if (!disabled) setIsDragOver(true);
  }, [disabled]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    if (disabled) return;
    
    const files = e.dataTransfer.files;
    handleFileSelect(files);
  }, [disabled, handleFileSelect]);

  const handleRemoveFile = async () => {
    if (!uploadedFile) return;

    try {
      // Remove from storage
      const { error } = await supabase.storage
        .from('feedback-attachments')
        .remove([uploadedFile.path]);

      if (error) throw error;

      // Clean up preview URL
      if (uploadedFile.preview) {
        URL.revokeObjectURL(uploadedFile.preview);
      }

      setUploadedFile(null);
      onFileRemoved();
      
      toast({
        title: 'File Removed',
        description: 'File has been removed successfully.',
      });

    } catch (error) {
      console.error('Remove error:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to remove file.',
      });
    }
  };

  const openFileDialog = () => {
    if (!disabled) {
      fileInputRef.current?.click();
    }
  };

  if (uploadedFile) {
    return (
      <div className={cn("border rounded-lg p-4", className)}>
        <div className="flex items-start space-x-4">
          {uploadedFile.preview && (
            <div className="flex-shrink-0">
              <img
                src={uploadedFile.preview}
                alt="Preview"
                className="w-16 h-16 object-cover rounded-md border"
              />
            </div>
          )}
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-2">
              <Icons.fileText className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium truncate">{uploadedFile.name}</span>
            </div>
            <p className="text-xs text-muted-foreground">
              {formatFileSize(uploadedFile.size)}
            </p>
            <div className="flex items-center space-x-1 mt-1">
              <Icons.checkCircle className="h-3 w-3 text-green-600" />
              <span className="text-xs text-green-600">Uploaded successfully</span>
            </div>
          </div>
          
          <Button
            variant="outline"
            size="sm"
            onClick={handleRemoveFile}
            disabled={disabled}
          >
            <Icons.trash className="h-4 w-4" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("relative", className)}>
      <input
        ref={fileInputRef}
        type="file"
        accept={acceptedTypes.join(',')}
        onChange={(e) => handleFileSelect(e.target.files)}
        className="hidden"
        disabled={disabled}
      />
      
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={openFileDialog}
        className={cn(
          "border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors",
          isDragOver ? "border-primary bg-primary/5" : "border-muted-foreground/25",
          disabled ? "opacity-50 cursor-not-allowed" : "hover:border-primary hover:bg-primary/5",
          uploading && "pointer-events-none"
        )}
      >
        {uploading ? (
          <div className="space-y-4">
            <div className="flex items-center justify-center">
              <Icons.upload className="h-8 w-8 text-primary animate-pulse" />
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium">Uploading...</p>
              <Progress value={uploadProgress} className="w-full" />
              <p className="text-xs text-muted-foreground">{uploadProgress}%</p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-center">
              <Icons.upload className="h-8 w-8 text-muted-foreground" />
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium">
                Drag and drop a screenshot here, or click to browse
              </p>
              <p className="text-xs text-muted-foreground">
                Supports: JPG, PNG, GIF, WebP • Max size: {maxSize}MB
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}