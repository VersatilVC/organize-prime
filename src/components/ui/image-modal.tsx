import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Icons } from '@/components/ui/icons';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface ImageModalProps {
  images: Array<{
    path: string;
    name: string;
    uploadedAt?: string;
  }>;
  currentIndex: number;
  isOpen: boolean;
  onClose: () => void;
  onIndexChange: (index: number) => void;
  canDownload?: boolean;
}

export function ImageModal({
  images,
  currentIndex,
  isOpen,
  onClose,
  onIndexChange,
  canDownload = false
}: ImageModalProps) {
  const [imageUrls, setImageUrls] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState<Record<string, boolean>>({});
  const [errors, setErrors] = useState<Record<string, boolean>>({});

  const currentImage = images[currentIndex];

  // Load image URLs from Supabase storage
  useEffect(() => {
    if (!isOpen || !currentImage) return;

    const loadImageUrl = async (path: string) => {
      if (imageUrls[path] || loading[path]) return;

      setLoading(prev => ({ ...prev, [path]: true }));
      
      try {
        const { data, error } = await supabase.storage
          .from('feedback-attachments')
          .createSignedUrl(path, 3600); // 1 hour expiry

        if (error) throw error;

        setImageUrls(prev => ({ ...prev, [path]: data.signedUrl }));
        setErrors(prev => ({ ...prev, [path]: false }));
      } catch (error) {
        console.error('Error loading image:', error);
        setErrors(prev => ({ ...prev, [path]: true }));
      } finally {
        setLoading(prev => ({ ...prev, [path]: false }));
      }
    };

    // Load current and adjacent images
    const indicesToLoad = [
      Math.max(0, currentIndex - 1),
      currentIndex,
      Math.min(images.length - 1, currentIndex + 1)
    ];

    indicesToLoad.forEach(index => {
      if (images[index]) {
        loadImageUrl(images[index].path);
      }
    });
  }, [isOpen, currentIndex, currentImage?.path, images, imageUrls, loading]);

  const handlePrevious = () => {
    if (currentIndex > 0) {
      onIndexChange(currentIndex - 1);
    }
  };

  const handleNext = () => {
    if (currentIndex < images.length - 1) {
      onIndexChange(currentIndex + 1);
    }
  };

  const handleDownload = async () => {
    if (!currentImage || !canDownload) return;

    try {
      const { data, error } = await supabase.storage
        .from('feedback-attachments')
        .download(currentImage.path);

      if (error) throw error;

      // Create download link
      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = currentImage.name;
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

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      switch (e.key) {
        case 'Escape':
          onClose();
          break;
        case 'ArrowLeft':
          handlePrevious();
          break;
        case 'ArrowRight':
          handleNext();
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, currentIndex, images.length]);

  if (!currentImage) return null;

  const imageUrl = imageUrls[currentImage.path];
  const isLoading = loading[currentImage.path];
  const hasError = errors[currentImage.path];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl w-full h-[90vh] p-0">
        <DialogHeader className="p-6 pb-2">
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <DialogTitle className="truncate">{currentImage.name}</DialogTitle>
              {currentImage.uploadedAt && (
                <p className="text-sm text-muted-foreground mt-1">
                  Uploaded {new Date(currentImage.uploadedAt).toLocaleDateString()}
                </p>
              )}
            </div>
            
            <div className="flex items-center space-x-2 ml-4">
              {images.length > 1 && (
                <span className="text-sm text-muted-foreground">
                  {currentIndex + 1} of {images.length}
                </span>
              )}
              
              {canDownload && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDownload}
                >
                  <Icons.download className="h-4 w-4 mr-2" />
                  Download
                </Button>
              )}
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 relative bg-black/5 mx-6 mb-6 rounded-lg overflow-hidden">
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center">
              <Icons.loader className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          )}
          
          {hasError && (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-muted-foreground">
              <Icons.alertCircle className="h-12 w-12 mb-2" />
              <p>Failed to load image</p>
            </div>
          )}
          
          {imageUrl && !hasError && (
            <img
              src={imageUrl}
              alt={currentImage.name}
              className="w-full h-full object-contain"
              onError={() => setErrors(prev => ({ ...prev, [currentImage.path]: true }))}
            />
          )}

          {/* Navigation buttons */}
          {images.length > 1 && (
            <>
              <Button
                variant="secondary"
                size="icon"
                className={cn(
                  "absolute left-4 top-1/2 -translate-y-1/2 bg-black/20 hover:bg-black/40 text-white border-0",
                  currentIndex === 0 && "opacity-50 cursor-not-allowed"
                )}
                onClick={handlePrevious}
                disabled={currentIndex === 0}
              >
                <Icons.chevronLeft className="h-4 w-4" />
              </Button>
              
              <Button
                variant="secondary"
                size="icon"
                className={cn(
                  "absolute right-4 top-1/2 -translate-y-1/2 bg-black/20 hover:bg-black/40 text-white border-0",
                  currentIndex === images.length - 1 && "opacity-50 cursor-not-allowed"
                )}
                onClick={handleNext}
                disabled={currentIndex === images.length - 1}
              >
                <Icons.chevronRight className="h-4 w-4" />
              </Button>
            </>
          )}
        </div>

        {/* Thumbnail strip for multiple images */}
        {images.length > 1 && (
          <div className="px-6 pb-6">
            <div className="flex space-x-2 overflow-x-auto">
              {images.map((image, index) => (
                <button
                  key={image.path}
                  onClick={() => onIndexChange(index)}
                  className={cn(
                    "flex-shrink-0 w-16 h-16 border-2 rounded overflow-hidden transition-colors",
                    index === currentIndex ? "border-primary" : "border-border hover:border-primary/50"
                  )}
                >
                  {imageUrls[image.path] && (
                    <img
                      src={imageUrls[image.path]}
                      alt={image.name}
                      className="w-full h-full object-cover"
                    />
                  )}
                </button>
              ))}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}