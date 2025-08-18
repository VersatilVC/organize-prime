import React from 'react';
import { logger } from '@/lib/secure-logger';

interface LazyImportOptions {
  maxRetries?: number;
  retryDelay?: number;
  fallbackComponent?: React.ComponentType;
}

/**
 * Enhanced lazy import with retry mechanism and error handling
 */
export function lazyImport<T extends React.ComponentType<any>>(
  importFn: () => Promise<{ default: T }>,
  options: LazyImportOptions = {}
): React.LazyExoticComponent<T> {
  const { maxRetries = 3, retryDelay = 1000 } = options;

  const importWithRetry = async (): Promise<{ default: T }> => {
    let lastError: Error;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await importFn();
      } catch (error) {
        lastError = error as Error;
        logger.warn(`Lazy import failed (attempt ${attempt}/${maxRetries})`, {
          error: lastError.message,
          attempt,
          maxRetries
        });

        if (attempt < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, retryDelay * attempt));
        }
      }
    }

    logger.error('Lazy import failed after all retries', {
      error: lastError!.message,
      maxRetries
    });
    
    throw lastError!;
  };

  return React.lazy(importWithRetry);
}

/**
 * Enhanced lazy import for named exports with retry mechanism
 */
export function lazyImportNamed<T extends React.ComponentType<any>>(
  importFn: () => Promise<Record<string, any>>,
  namedExport: string,
  options: LazyImportOptions = {}
): React.LazyExoticComponent<T> {
  return lazyImport(
    () => importFn().then(module => ({ default: module[namedExport] })),
    options
  );
}

/**
 * Create a lazy import with consistent error boundaries
 */
export function createLazyRoute<T extends React.ComponentType<any>>(
  importFn: () => Promise<{ default: T }>,
  options: LazyImportOptions = {}
): React.LazyExoticComponent<T> {
  return lazyImport(importFn, {
    maxRetries: 2,
    retryDelay: 800,
    ...options
  });
}