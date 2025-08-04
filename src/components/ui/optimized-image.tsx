import { useState, useEffect, ImgHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertTriangle } from 'lucide-react';

interface OptimizedImageProps extends Omit<ImgHTMLAttributes<HTMLImageElement>, 'onLoad' | 'onError'> {
  fallback?: string;
  showSkeleton?: boolean;
  aspectRatio?: 'square' | 'video' | 'portrait' | 'landscape';
  sizes?: string;
  priority?: boolean;
  quality?: number;
}

export const OptimizedImage = ({ 
  className, 
  fallback = '/placeholder.svg', 
  showSkeleton = true,
  aspectRatio,
  alt,
  sizes = '100vw',
  priority = false,
  quality = 75,
  ...props 
}: OptimizedImageProps) => {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [currentSrc, setCurrentSrc] = useState<string>(fallback);

  // Generate responsive image URLs if using a CDN
  const generateSrcSet = (baseSrc: string) => {
    if (!baseSrc || baseSrc.startsWith('data:') || baseSrc.startsWith('blob:')) {
      return baseSrc;
    }

    // Example for Supabase Storage with transform
    if (baseSrc.includes('supabase')) {
      const sizes = [320, 640, 768, 1024, 1280];
      return sizes
        .map(size => `${baseSrc}?width=${size}&quality=${quality} ${size}w`)
        .join(', ');
    }

    return baseSrc;
  };

  useEffect(() => {
    if (!props.src) {
      setCurrentSrc(fallback);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setHasError(false);

    const img = new Image();
    
    img.onload = () => {
      setCurrentSrc(props.src!);
      setIsLoading(false);
    };
    
    img.onerror = () => {
      setCurrentSrc(fallback);
      setIsLoading(false);
      setHasError(true);
    };

    img.src = props.src;
  }, [props.src, fallback]);

  const aspectRatioClass = aspectRatio ? {
    'square': 'aspect-square',
    'video': 'aspect-video', 
    'portrait': 'aspect-[3/4]',
    'landscape': 'aspect-[4/3]'
  }[aspectRatio] : '';

  return (
    <div className={cn("relative overflow-hidden", aspectRatioClass, className)}>
      {isLoading && showSkeleton && (
        <Skeleton className="absolute inset-0 w-full h-full" />
      )}
      
      {hasError ? (
        <div className="absolute inset-0 flex items-center justify-center bg-muted text-muted-foreground">
          <div className="text-center p-4">
            <AlertTriangle className="h-8 w-8 mx-auto mb-2" aria-hidden="true" />
            <p className="text-sm">Failed to load image</p>
          </div>
        </div>
      ) : (
        <img
          {...props}
          alt={alt || ''}
          src={currentSrc}
          srcSet={generateSrcSet(currentSrc)}
          sizes={sizes}
          loading={priority ? 'eager' : 'lazy'}
          className={cn(
            "object-cover w-full h-full transition-opacity duration-300",
            isLoading ? "opacity-0" : "opacity-100"
          )}
          style={{
            filter: hasError ? 'grayscale(100%)' : 'none',
            ...props.style
          }}
        />
      )}
    </div>
  );
};

// Avatar image with fallback initials
export const AvatarImage = ({ 
  src, 
  alt, 
  fallbackText, 
  size = 'md',
  className 
}: {
  src?: string;
  alt: string;
  fallbackText?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}) => {
  const [hasError, setHasError] = useState(false);
  
  const sizeClasses = {
    'sm': 'h-8 w-8 text-xs',
    'md': 'h-10 w-10 text-sm', 
    'lg': 'h-12 w-12 text-base',
    'xl': 'h-16 w-16 text-lg'
  };

  const getInitials = (text: string) => {
    return text
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .substring(0, 2)
      .toUpperCase();
  };

  if (!src || hasError) {
    return (
      <div className={cn(
        "rounded-full bg-muted flex items-center justify-center font-medium text-muted-foreground",
        sizeClasses[size],
        className
      )}>
        {fallbackText ? getInitials(fallbackText) : alt.charAt(0).toUpperCase()}
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      onError={() => setHasError(true)}
      className={cn(
        "rounded-full object-cover",
        sizeClasses[size],
        className
      )}
      loading="lazy"
    />
  );
};