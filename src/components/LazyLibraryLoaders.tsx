import React, { useState, useEffect } from 'react';
import { ComponentLoadingSkeleton } from '@/components/LoadingSkeletons';

interface LazyLibraryLoaderProps<T> {
  children: (library: T) => React.ReactNode;
  fallback?: React.ReactNode;
  onError?: (error: Error) => void;
}

// Generic library loader hook
export function useLibraryLoader<T>(
  importFn: () => Promise<T>,
  deps: any[] = []
): { library: T | null; loading: boolean; error: Error | null } {
  const [library, setLibrary] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let cancelled = false;

    const loadLibrary = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const loadedLibrary = await importFn();
        
        if (!cancelled) {
          setLibrary(loadedLibrary);
        }
      } catch (err) {
        if (!cancelled) {
          const error = err instanceof Error ? err : new Error('Failed to load library');
          setError(error);
          console.error('Library loading error:', error);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    loadLibrary();

    return () => {
      cancelled = true;
    };
  }, deps);

  return { library, loading, error };
}

// Charts library loader
export function LazyChartsLoader({ children, fallback, onError }: LazyLibraryLoaderProps<typeof import('recharts')>) {
  const { library, loading, error } = useLibraryLoader(() => import('recharts'));

  useEffect(() => {
    if (error && onError) {
      onError(error);
    }
  }, [error, onError]);

  if (loading) {
    return <>{fallback || <ComponentLoadingSkeleton />}</>;
  }

  if (error || !library) {
    return (
      <div className="flex items-center justify-center p-8 border rounded-md">
        <p className="text-sm text-muted-foreground">Failed to load charts library</p>
      </div>
    );
  }

  return <>{children(library)}</>;
}

// Date library loader
export function LazyDateLoader({ children, fallback, onError }: LazyLibraryLoaderProps<typeof import('date-fns')>) {
  const { library, loading, error } = useLibraryLoader(() => import('date-fns'));

  useEffect(() => {
    if (error && onError) {
      onError(error);
    }
  }, [error, onError]);

  if (loading) {
    return <>{fallback || <ComponentLoadingSkeleton />}</>;
  }

  if (error || !library) {
    return (
      <div className="flex items-center justify-center p-4">
        <p className="text-sm text-muted-foreground">Failed to load date library</p>
      </div>
    );
  }

  return <>{children(library)}</>;
}

// Form library loader
export function LazyFormLoader({ children, fallback, onError }: LazyLibraryLoaderProps<typeof import('react-hook-form')>) {
  const { library, loading, error } = useLibraryLoader(() => import('react-hook-form'));

  useEffect(() => {
    if (error && onError) {
      onError(error);
    }
  }, [error, onError]);

  if (loading) {
    return <>{fallback || <ComponentLoadingSkeleton />}</>;
  }

  if (error || !library) {
    return (
      <div className="flex items-center justify-center p-4">
        <p className="text-sm text-muted-foreground">Failed to load form library</p>
      </div>
    );
  }

  return <>{children(library)}</>;
}

// File processing library loader (simplified without external deps)
export function LazyFileLoader({ children, fallback, onError }: LazyLibraryLoaderProps<any>) {
  const { library, loading, error } = useLibraryLoader(() => 
    Promise.resolve({
      // Simple file processing utilities without external dependencies
      downloadFile: (data: string, filename: string, type: string = 'text/plain') => {
        const blob = new Blob([data], { type });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      },
    })
  );

  useEffect(() => {
    if (error && onError) {
      onError(error);
    }
  }, [error, onError]);

  if (loading) {
    return <>{fallback || <ComponentLoadingSkeleton />}</>;
  }

  if (error || !library) {
    return (
      <div className="flex items-center justify-center p-4">
        <p className="text-sm text-muted-foreground">Failed to load file processing library</p>
      </div>
    );
  }

  return <>{children(library)}</>;
}

// CSV processing library loader (without external dependencies)
export function LazyCsvLoader({ children, fallback, onError }: LazyLibraryLoaderProps<any>) {
  const { library, loading, error } = useLibraryLoader(() => 
    Promise.resolve({
      // Simple CSV parser without external library
      parse: (text: string) => {
        const lines = text.split('\n').filter(line => line.trim());
        if (lines.length === 0) return { data: [] };
        
        const headers = lines[0].split(',').map(h => h.trim());
        const data = lines.slice(1).map(line => {
          const values = line.split(',').map(v => v.trim());
          return headers.reduce((obj, header, index) => {
            obj[header] = values[index] || '';
            return obj;
          }, {} as any);
        });
        return { data };
      }
    })
  );

  useEffect(() => {
    if (error && onError) {
      onError(error);
    }
  }, [error, onError]);

  if (loading) {
    return <>{fallback || <ComponentLoadingSkeleton />}</>;
  }

  if (error || !library) {
    return (
      <div className="flex items-center justify-center p-4">
        <p className="text-sm text-muted-foreground">Failed to load CSV processing library</p>
      </div>
    );
  }

  return <>{children(library)}</>;
}

// Utility function to preload libraries
export const preloadLibraries = {
  charts: () => import('recharts'),
  dates: () => import('date-fns'),
  forms: () => import('react-hook-form'),
};

// Preload on user interaction
export function useLibraryPreloader() {
  const preloadOnHover = (libraryName: keyof typeof preloadLibraries) => {
    return {
      onMouseEnter: () => {
        preloadLibraries[libraryName]().catch(() => {
          // Ignore preload errors
        });
      }
    };
  };

  const preloadOnFocus = (libraryName: keyof typeof preloadLibraries) => {
    return {
      onFocus: () => {
        preloadLibraries[libraryName]().catch(() => {
          // Ignore preload errors
        });
      }
    };
  };

  return { preloadOnHover, preloadOnFocus };
}