import * as React from 'react';
import { useProgressiveEnhancement, useAdaptiveLoading } from '@/hooks/useProgressiveEnhancement';
import { cn } from '@/lib/utils';

interface AdaptiveImageProps {
  src: string;
  alt: string;
  className?: string;
  width?: number;
  height?: number;
  priority?: 'high' | 'medium' | 'low';
  lazy?: boolean;
  placeholder?: 'blur' | 'empty' | React.ReactNode;
  sizes?: string;
  quality?: 'high' | 'medium' | 'low';
  onLoad?: () => void;
  onError?: () => void;
}

/**
 * Adaptive image component that adjusts quality and loading behavior
 * based on network conditions and device capabilities
 */
export function AdaptiveImage({
  src,
  alt,
  className,
  width,
  height,
  priority = 'medium',
  lazy = true,
  placeholder = 'blur',
  sizes,
  quality,
  onLoad,
  onError
}: AdaptiveImageProps) {
  const { shouldLazyLoad, imageFormat, shouldReduceAnimations } = useProgressiveEnhancement();
  const { getImageQuality } = useAdaptiveLoading();
  
  const [isLoaded, setIsLoaded] = React.useState(false);
  const [hasError, setHasError] = React.useState(false);
  const [isInView, setIsInView] = React.useState(!lazy || !shouldLazyLoad);
  
  const imgRef = React.useRef<HTMLImageElement>(null);
  const observerRef = React.useRef<IntersectionObserver | null>(null);

  // Determine actual quality to use
  const actualQuality = quality || getImageQuality();
  
  // Generate responsive image URLs based on quality and format
  const generateImageUrl = React.useCallback((baseSrc: string, targetQuality: string, format: string) => {
    // This would integrate with your image optimization service
    // For now, just return the base src with potential format change
    if (format === 'webp' && baseSrc.endsWith('.jpg')) {
      return baseSrc.replace('.jpg', '.webp');
    }
    return baseSrc;
  }, []);

  const optimizedSrc = generateImageUrl(src, actualQuality, imageFormat);
  
  // Set up intersection observer for lazy loading
  React.useEffect(() => {
    if (!lazy || !shouldLazyLoad || isInView) return;
    
    if ('IntersectionObserver' in window) {
      observerRef.current = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              setIsInView(true);
              observerRef.current?.disconnect();
            }
          });
        },
        {
          rootMargin: '50px' // Load images 50px before they come into view
        }
      );

      if (imgRef.current) {
        observerRef.current.observe(imgRef.current);
      }
    } else {
      // Fallback for browsers without IntersectionObserver
      setIsInView(true);
    }

    return () => {
      observerRef.current?.disconnect();
    };
  }, [lazy, shouldLazyLoad, isInView]);

  const handleLoad = React.useCallback(() => {
    setIsLoaded(true);
    onLoad?.();
  }, [onLoad]);

  const handleError = React.useCallback(() => {
    setHasError(true);
    onError?.();
  }, [onError]);

  // Generate placeholder
  const renderPlaceholder = () => {
    if (typeof placeholder === 'string') {
      switch (placeholder) {
        case 'blur':
          return (
            <div 
              className={cn(
                'bg-muted animate-pulse',
                className
              )}
              style={{ width, height }}
              aria-label="Loading image"
            />
          );
        case 'empty':
          return (
            <div 
              className={cn('bg-transparent', className)}
              style={{ width, height }}
            />
          );
      }
    }
    return placeholder;
  };

  // Don't render anything if not in view and lazy loading
  if (!isInView) {
    return (
      <div 
        ref={imgRef}
        className={cn(className)}
        style={{ width, height }}
      >
        {renderPlaceholder()}
      </div>
    );
  }

  // Show error state
  if (hasError) {
    return (
      <div 
        className={cn(
          'bg-muted border border-dashed border-muted-foreground/50 flex items-center justify-center',
          className
        )}
        style={{ width, height }}
        role="img"
        aria-label={`Failed to load image: ${alt}`}
      >
        <span className="text-muted-foreground text-sm">Image unavailable</span>
      </div>
    );
  }

  return (
    <div className="relative">
      {/* Placeholder while loading */}
      {!isLoaded && renderPlaceholder()}
      
      {/* Actual image */}
      <img
        ref={imgRef}
        src={optimizedSrc}
        alt={alt}
        className={cn(
          'transition-opacity duration-300',
          isLoaded ? 'opacity-100' : 'opacity-0',
          shouldReduceAnimations && 'transition-none',
          className
        )}
        width={width}
        height={height}
        sizes={sizes}
        loading={lazy && shouldLazyLoad ? 'lazy' : 'eager'}
        decoding={priority === 'high' ? 'sync' : 'async'}
        onLoad={handleLoad}
        onError={handleError}
        style={{
          width,
          height,
          position: isLoaded ? 'static' : 'absolute',
          top: isLoaded ? 'auto' : 0,
          left: isLoaded ? 'auto' : 0
        }}
      />
    </div>
  );
}

/**
 * Enhanced image component with multiple source formats
 */
export function ResponsiveImage({
  src,
  alt,
  className,
  width,
  height,
  priority = 'medium',
  lazy = true,
  sizes = '100vw',
  ...props
}: AdaptiveImageProps & { srcSet?: string }) {
  const { imageFormat, shouldLazyLoad } = useProgressiveEnhancement();
  const { getImageQuality } = useAdaptiveLoading();
  
  const [isLoaded, setIsLoaded] = React.useState(false);
  const [isInView, setIsInView] = React.useState(!lazy || !shouldLazyLoad);
  
  const pictureRef = React.useRef<HTMLElement>(null);
  
  const quality = getImageQuality();
  
  // Generate srcSet for different qualities
  const generateSrcSet = React.useCallback((baseSrc: string, format: string) => {
    const qualities = {
      low: '?q=40&w=400',
      medium: '?q=70&w=800', 
      high: '?q=90&w=1200'
    };
    
    return Object.entries(qualities)
      .map(([q, params]) => `${baseSrc}${params} ${q === 'low' ? '400w' : q === 'medium' ? '800w' : '1200w'}`)
      .join(', ');
  }, []);

  // Set up intersection observer
  React.useEffect(() => {
    if (!lazy || !shouldLazyLoad || isInView) return;
    
    if ('IntersectionObserver' in window && pictureRef.current) {
      const observer = new IntersectionObserver(
        (entries) => {
          if (entries[0].isIntersecting) {
            setIsInView(true);
            observer.disconnect();
          }
        },
        { rootMargin: '50px' }
      );
      
      observer.observe(pictureRef.current);
      
      return () => observer.disconnect();
    } else {
      setIsInView(true);
    }
  }, [lazy, shouldLazyLoad, isInView]);

  if (!isInView) {
    return (
      <div 
        ref={pictureRef}
        className={cn('bg-muted animate-pulse', className)}
        style={{ width, height }}
        aria-label="Loading image"
      />
    );
  }

  return (
    <picture ref={pictureRef}>
      {/* WebP source for supporting browsers */}
      {imageFormat === 'webp' && (
        <source
          srcSet={generateSrcSet(src.replace(/\.(jpg|jpeg|png)$/, '.webp'), 'webp')}
          sizes={sizes}
          type="image/webp"
        />
      )}
      
      {/* Fallback image */}
      <AdaptiveImage
        src={src}
        alt={alt}
        className={className}
        width={width}
        height={height}
        priority={priority}
        lazy={false} // Already handled by picture element
        onLoad={() => setIsLoaded(true)}
        {...props}
      />
    </picture>
  );
}

/**
 * Avatar component with adaptive loading
 */
export function AdaptiveAvatar({
  src,
  alt,
  size = 40,
  fallback,
  className,
  ...props
}: {
  src?: string;
  alt: string;
  size?: number;
  fallback?: React.ReactNode;
  className?: string;
} & Omit<AdaptiveImageProps, 'width' | 'height'>) {
  const [hasError, setHasError] = React.useState(false);

  if (!src || hasError) {
    return (
      <div 
        className={cn(
          'flex items-center justify-center bg-muted rounded-full',
          className
        )}
        style={{ width: size, height: size }}
      >
        {fallback || <span className="text-muted-foreground text-sm">{alt.charAt(0).toUpperCase()}</span>}
      </div>
    );
  }

  return (
    <AdaptiveImage
      src={src}
      alt={alt}
      width={size}
      height={size}
      className={cn('rounded-full object-cover', className)}
      priority="high" // Avatars are usually important
      onError={() => setHasError(true)}
      {...props}
    />
  );
}