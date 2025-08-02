import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Icons } from '@/components/ui/icons';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { ImageModal } from './image-modal';

interface AttachmentViewerProps {
  attachments: string[] | null;
  canDownload?: boolean;
  className?: string;
}

interface AttachmentInfo {
  path: string;
  name: string;
  size?: number;
  uploadedAt?: string;
  thumbnailUrl?: string;
  error?: boolean;
}

export function AttachmentViewer({ 
  attachments, 
  canDownload = false, 
  className 
}: AttachmentViewerProps) {
  const [attachmentInfos, setAttachmentInfos] = useState<AttachmentInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  useEffect(() => {
    if (!attachments || attachments.length === 0) {
      setLoading(false);
      return;
    }

    const loadAttachmentInfo = async () => {
      setLoading(true);
      
      try {
        const infos: AttachmentInfo[] = await Promise.all(
          attachments.map(async (path) => {
            try {
              // Extract filename from path
              const fileName = path.split('/').pop() || 'Unknown file';
              
              // Get file metadata
              const { data: fileData, error: fileError } = await supabase.storage
                .from('feedback-attachments')
                .list(path.substring(0, path.lastIndexOf('/')), {
                  search: fileName
                });

              let size: number | undefined;
              let uploadedAt: string | undefined;

              if (!fileError && fileData && fileData.length > 0) {
                const fileInfo = fileData.find(f => f.name === fileName);
                if (fileInfo) {
                  size = fileInfo.metadata?.size;
                  uploadedAt = fileInfo.created_at;
                }
              }

              // Generate thumbnail URL
              const { data: urlData, error: urlError } = await supabase.storage
                .from('feedback-attachments')
                .createSignedUrl(path, 3600); // 1 hour expiry

              return {
                path,
                name: fileName,
                size,
                uploadedAt,
                thumbnailUrl: urlError ? undefined : urlData.signedUrl,
                error: !!urlError
              };
            } catch (error) {
              console.error('Error loading attachment info:', error);
              return {
                path,
                name: path.split('/').pop() || 'Unknown file',
                error: true
              };
            }
          })
        );

        setAttachmentInfos(infos);
      } catch (error) {
        console.error('Error loading attachments:', error);
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'Failed to load attachments.',
        });
      } finally {
        setLoading(false);
      }
    };

    loadAttachmentInfo();
  }, [attachments]);

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return 'Unknown size';
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleImageClick = (index: number) => {
    setCurrentImageIndex(index);
    setModalOpen(true);
  };

  const handleDownload = async (attachment: AttachmentInfo) => {
    if (!canDownload) return;

    try {
      const { data, error } = await supabase.storage
        .from('feedback-attachments')
        .download(attachment.path);

      if (error) throw error;

      // Create download link
      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = attachment.name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({
        title: 'Download Started',
        description: 'File download has started.',
      });
    } catch (error) {
      console.error('Download error:', error);
      toast({
        variant: 'destructive',
        title: 'Download Failed',
        description: 'Failed to download the file.',
      });
    }
  };

  if (!attachments || attachments.length === 0) {
    return null;
  }

  if (loading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Icons.image className="h-5 w-5" />
            <span>Attachments</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="aspect-square bg-muted animate-pulse rounded-lg" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const validAttachments = attachmentInfos.filter(info => !info.error);
  const errorAttachments = attachmentInfos.filter(info => info.error);

  return (
    <>
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Icons.image className="h-5 w-5" />
              <span>Attachments</span>
              <Badge variant="secondary">{attachmentInfos.length}</Badge>
            </div>
            
            {canDownload && validAttachments.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  // Download all files
                  validAttachments.forEach(attachment => {
                    handleDownload(attachment);
                  });
                }}
              >
                <Icons.download className="h-4 w-4 mr-2" />
                Download All
              </Button>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Image thumbnails grid */}
          {validAttachments.length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {validAttachments.map((attachment, index) => (
                <div
                  key={attachment.path}
                  className="group relative aspect-square bg-muted rounded-lg overflow-hidden cursor-pointer hover:ring-2 hover:ring-primary transition-all"
                  onClick={() => handleImageClick(index)}
                >
                  {attachment.thumbnailUrl ? (
                    <img
                      src={attachment.thumbnailUrl}
                      alt={attachment.name}
                      className="w-full h-full object-cover transition-transform group-hover:scale-105"
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Icons.image className="h-8 w-8 text-muted-foreground" />
                    </div>
                  )}
                  
                  {/* Overlay with file info */}
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-3">
                    <p className="text-white text-xs font-medium truncate">
                      {attachment.name}
                    </p>
                    {attachment.size && (
                      <p className="text-white/80 text-xs">
                        {formatFileSize(attachment.size)}
                      </p>
                    )}
                  </div>

                  {/* View icon */}
                  <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="bg-black/60 rounded-full p-1">
                      <Icons.eye className="h-4 w-4 text-white" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* File list view for admin */}
          {canDownload && validAttachments.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-muted-foreground">File Details</h4>
              {validAttachments.map((attachment) => (
                <div
                  key={attachment.path}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div className="flex items-center space-x-3 flex-1 min-w-0">
                    <Icons.fileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{attachment.name}</p>
                      <div className="flex items-center space-x-4 text-xs text-muted-foreground">
                        {attachment.size && (
                          <span>{formatFileSize(attachment.size)}</span>
                        )}
                        {attachment.uploadedAt && (
                          <span>
                            Uploaded {new Date(attachment.uploadedAt).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDownload(attachment)}
                  >
                    <Icons.download className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}

          {/* Error attachments */}
          {errorAttachments.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-destructive">Failed to Load</h4>
              {errorAttachments.map((attachment) => (
                <div
                  key={attachment.path}
                  className="flex items-center space-x-3 p-3 border border-destructive/20 rounded-lg"
                >
                  <Icons.alertTriangle className="h-4 w-4 text-destructive flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{attachment.name}</p>
                    <p className="text-xs text-muted-foreground">Failed to load attachment</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Image Modal */}
      <ImageModal
        images={validAttachments.map(attachment => ({
          path: attachment.path,
          name: attachment.name,
          uploadedAt: attachment.uploadedAt
        }))}
        currentIndex={currentImageIndex}
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onIndexChange={setCurrentImageIndex}
        canDownload={canDownload}
      />
    </>
  );
}