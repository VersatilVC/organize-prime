import { useState, useEffect } from 'react';
import { imageCache } from '@/lib/local-storage';

interface UseImageCacheOptions {
  fallback?: string;
  enableCache?: boolean;
}

export function useImageCache(url: string | null | undefined, options: UseImageCacheOptions = {}) {
  const { fallback, enableCache = true } = options;
  const [cachedUrl, setCachedUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!url) {
      setCachedUrl(fallback || null);
      setLoading(false);
      return;
    }

    // Check cache first if enabled
    if (enableCache) {
      const cached = imageCache.get(url);
      if (cached) {
        setCachedUrl(cached);
        setLoading(false);
        return;
      }
    }

    // Load image and cache if needed
    const img = new Image();
    
    img.onload = () => {
      if (enableCache) {
        // Convert to base64 for caching (only for small images)
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        if (ctx && img.naturalWidth <= 200 && img.naturalHeight <= 200) {
          canvas.width = img.naturalWidth;
          canvas.height = img.naturalHeight;
          ctx.drawImage(img, 0, 0);
          
          try {
            const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
            imageCache.set(url, dataUrl);
            setCachedUrl(dataUrl);
          } catch {
            // Fallback to original URL if canvas conversion fails
            setCachedUrl(url);
          }
        } else {
          setCachedUrl(url);
        }
      } else {
        setCachedUrl(url);
      }
      
      setLoading(false);
      setError(null);
    };

    img.onerror = () => {
      setCachedUrl(fallback || null);
      setLoading(false);
      setError('Failed to load image');
    };

    img.src = url;

    return () => {
      img.onload = null;
      img.onerror = null;
    };
  }, [url, fallback, enableCache]);

  return {
    src: cachedUrl,
    loading,
    error,
  };
}

// Hook for avatar images with built-in fallback
export function useAvatarCache(url: string | null | undefined, fallback = '/placeholder.svg') {
  return useImageCache(url, { 
    fallback, 
    enableCache: true 
  });
}

// Hook for organization logos
export function useLogoCache(url: string | null | undefined) {
  return useImageCache(url, { 
    enableCache: true 
  });
}