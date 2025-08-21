/**
 * React hooks for webhook discovery and element scanning
 * Provides DOM scanning, element registry, and auto-discovery functionality
 */

import { useQuery, useMutation, useQueryClient, UseQueryResult, UseMutationResult } from '@tanstack/react-query';
import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { useWebhookServices } from './useWebhookServices';
import {
  DiscoveredElement,
  PageElement,
  ElementRegistration,
  ElementUpdate,
  DiscoverySession,
  DiscoveryStatus,
  ElementChanges,
  WebhookSuggestion
} from '../types/webhook';

// Query key factory for discovery operations
export const discoveryQueryKeys = {
  all: ['discovery'] as const,
  elements: () => [...discoveryQueryKeys.all, 'elements'] as const,
  pageElements: (featureSlug: string, pagePath: string) => 
    [...discoveryQueryKeys.elements(), 'page', featureSlug, pagePath] as const,
  allPageElements: (featureSlug: string) => 
    [...discoveryQueryKeys.elements(), 'feature', featureSlug] as const,
  registry: () => [...discoveryQueryKeys.all, 'registry'] as const,
  registryForFeature: (featureSlug: string) => 
    [...discoveryQueryKeys.registry(), featureSlug] as const,
  sessions: () => [...discoveryQueryKeys.all, 'sessions'] as const,
  session: (sessionId: string) => 
    [...discoveryQueryKeys.sessions(), sessionId] as const,
  changes: (featureSlug: string, pagePath: string) => 
    [...discoveryQueryKeys.all, 'changes', featureSlug, pagePath] as const,
  suggestions: (elements: DiscoveredElement[]) => 
    [...discoveryQueryKeys.all, 'suggestions', elements] as const,
};

/**
 * Scan page elements for webhook opportunities
 */
export function useElementDiscovery(
  featureSlug: string,
  pagePath?: string
): UseQueryResult<DiscoveredElement[]> {
  const { discoveryService } = useWebhookServices();
  const currentPath = pagePath || (typeof window !== 'undefined' ? window.location.pathname : '');

  return useQuery({
    queryKey: discoveryQueryKeys.pageElements(featureSlug, currentPath),
    queryFn: () => discoveryService.scanPageElements(featureSlug, currentPath),
    enabled: !!(featureSlug && currentPath),
    staleTime: 30 * 1000, // 30 seconds - DOM changes frequently
    retry: (failureCount, error) => {
      // Don't retry DOM scanning errors
      if (error?.message?.includes('DOM')) return false;
      return failureCount < 2;
    }
  });
}

/**
 * Scan all pages for a feature
 */
export function useFeatureElementDiscovery(featureSlug: string): UseQueryResult<Map<string, DiscoveredElement[]>> {
  const { discoveryService } = useWebhookServices();

  return useQuery({
    queryKey: discoveryQueryKeys.allPageElements(featureSlug),
    queryFn: () => discoveryService.scanAllPages(featureSlug),
    enabled: !!featureSlug,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 1
  });
}

/**
 * Get registered elements from the database
 */
export function useElementRegistry(featureSlug?: string): UseQueryResult<PageElement[]> {
  const { discoveryService } = useWebhookServices();

  return useQuery({
    queryKey: featureSlug 
      ? discoveryQueryKeys.registryForFeature(featureSlug)
      : discoveryQueryKeys.registry(),
    queryFn: () => discoveryService.getRegisteredElements(featureSlug),
    staleTime: 10 * 60 * 1000, // 10 minutes - registry doesn't change often
  });
}

/**
 * Register a discovered element
 */
export function useRegisterElement(): UseMutationResult<PageElement, Error, ElementRegistration> {
  const { discoveryService } = useWebhookServices();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (registration: ElementRegistration) => 
      discoveryService.registerElement(registration),
    onSuccess: (element, variables) => {
      // Invalidate registry queries
      queryClient.invalidateQueries({ queryKey: discoveryQueryKeys.registry() });
      queryClient.invalidateQueries({ 
        queryKey: discoveryQueryKeys.registryForFeature(variables.featureSlug) 
      });

      toast.success('Element registered successfully', {
        description: `Registered ${variables.displayName}`,
      });
    },
    onError: (error) => {
      toast.error('Failed to register element', {
        description: error.message,
      });
    },
  });
}

/**
 * Update element registry
 */
export function useUpdateElementRegistry(): UseMutationResult<
  PageElement,
  Error,
  { elementId: string; updates: ElementUpdate }
> {
  const { discoveryService } = useWebhookServices();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ elementId, updates }) => 
      discoveryService.updateElementRegistry(elementId, updates),
    onSuccess: (element) => {
      // Update cache
      queryClient.invalidateQueries({ queryKey: discoveryQueryKeys.registry() });
      queryClient.invalidateQueries({ 
        queryKey: discoveryQueryKeys.registryForFeature(element.featureSlug) 
      });

      toast.success('Element updated successfully');
    },
    onError: (error) => {
      toast.error('Failed to update element', {
        description: error.message,
      });
    },
  });
}

/**
 * Auto-discovery session management
 */
export function useAutoDiscovery(featureSlug: string) {
  const { discoveryService } = useWebhookServices();
  const queryClient = useQueryClient();
  const [session, setSession] = useState<DiscoverySession | null>(null);
  const unsubscribeRef = useRef<(() => void) | null>(null);

  const startDiscovery = useMutation({
    mutationFn: () => discoveryService.startAutoDiscovery(featureSlug),
    onSuccess: (newSession) => {
      setSession(newSession);
      
      // Subscribe to element changes
      unsubscribeRef.current = discoveryService.subscribeToElementChanges((changes) => {
        // Invalidate relevant queries when changes are detected
        queryClient.invalidateQueries({ 
          queryKey: discoveryQueryKeys.pageElements(changes.featureSlug, changes.pagePath) 
        });
        
        toast.info('New elements discovered', {
          description: `Found ${changes.added.length} new interactive elements`,
        });
      });

      toast.success('Auto-discovery started', {
        description: 'Monitoring page for new interactive elements',
      });
    },
    onError: (error) => {
      toast.error('Failed to start auto-discovery', {
        description: error.message,
      });
    },
  });

  const stopDiscovery = useMutation({
    mutationFn: () => {
      if (!session) throw new Error('No active session');
      return discoveryService.stopAutoDiscovery(session.id);
    },
    onSuccess: () => {
      setSession(null);
      
      // Unsubscribe from changes
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }

      // Refresh registry after discovery session
      queryClient.invalidateQueries({ queryKey: discoveryQueryKeys.registry() });
      
      toast.success('Auto-discovery stopped');
    },
    onError: (error) => {
      toast.error('Failed to stop auto-discovery', {
        description: error.message,
      });
    },
  });

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
      }
    };
  }, []);

  return {
    session,
    isActive: !!session && session.status === 'active',
    startDiscovery: startDiscovery.mutateAsync,
    stopDiscovery: stopDiscovery.mutateAsync,
    isStarting: startDiscovery.isPending,
    isStopping: stopDiscovery.isPending,
  };
}

/**
 * Get discovery session status
 */
export function useDiscoveryStatus(sessionId: string): UseQueryResult<DiscoveryStatus> {
  const { discoveryService } = useWebhookServices();

  return useQuery({
    queryKey: discoveryQueryKeys.session(sessionId),
    queryFn: () => discoveryService.getDiscoveryStatus(sessionId),
    enabled: !!sessionId,
    refetchInterval: 5000, // Poll every 5 seconds for active sessions
    staleTime: 1000, // Always considered stale for real-time updates
  });
}

/**
 * Compare element changes between scans
 */
export function useElementChanges(
  featureSlug: string,
  pagePath: string
): UseMutationResult<ElementChanges, Error, void> {
  const { discoveryService } = useWebhookServices();

  return useMutation({
    mutationFn: () => discoveryService.compareElementChanges(featureSlug, pagePath),
    onSuccess: (changes) => {
      if (changes.added.length > 0 || changes.removed.length > 0 || changes.modified.length > 0) {
        toast.info('Page changes detected', {
          description: `${changes.added.length} added, ${changes.removed.length} removed, ${changes.modified.length} modified`,
        });
      } else {
        toast.success('No changes detected', {
          description: 'Page elements are stable',
        });
      }
    },
    onError: (error) => {
      toast.error('Failed to compare elements', {
        description: error.message,
      });
    },
  });
}

/**
 * Generate webhook suggestions for discovered elements
 */
export function useWebhookSuggestions(elements: DiscoveredElement[]): UseQueryResult<WebhookSuggestion[]> {
  const { discoveryService } = useWebhookServices();

  return useQuery({
    queryKey: discoveryQueryKeys.suggestions(elements),
    queryFn: () => discoveryService.suggestWebhookMappings(elements),
    enabled: elements.length > 0,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Real-time element change monitoring
 */
export function useElementChangeMonitoring(
  featureSlug: string,
  onChanges?: (changes: ElementChanges) => void
) {
  const { discoveryService } = useWebhookServices();
  const [isMonitoring, setIsMonitoring] = useState(false);
  const unsubscribeRef = useRef<(() => void) | null>(null);

  const startMonitoring = useCallback(() => {
    if (isMonitoring) return;

    unsubscribeRef.current = discoveryService.subscribeToElementChanges((changes) => {
      if (changes.featureSlug === featureSlug) {
        onChanges?.(changes);
      }
    });

    setIsMonitoring(true);
  }, [discoveryService, featureSlug, onChanges, isMonitoring]);

  const stopMonitoring = useCallback(() => {
    if (!isMonitoring) return;

    if (unsubscribeRef.current) {
      unsubscribeRef.current();
      unsubscribeRef.current = null;
    }

    setIsMonitoring(false);
  }, [isMonitoring]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
      }
    };
  }, []);

  return {
    isMonitoring,
    startMonitoring,
    stopMonitoring,
  };
}

/**
 * Bulk element registration
 */
export function useBulkRegisterElements(): UseMutationResult<
  PageElement[],
  Error,
  ElementRegistration[]
> {
  const registerElement = useRegisterElement();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (registrations: ElementRegistration[]) => {
      const results: PageElement[] = [];
      
      // Process in batches to avoid overwhelming the system
      const batchSize = 5;
      for (let i = 0; i < registrations.length; i += batchSize) {
        const batch = registrations.slice(i, i + batchSize);
        const batchResults = await Promise.allSettled(
          batch.map(registration => registerElement.mutateAsync(registration))
        );
        
        batchResults.forEach((result, index) => {
          if (result.status === 'fulfilled') {
            results.push(result.value);
          } else {
            console.warn(`Failed to register element ${batch[index].elementId}:`, result.reason);
          }
        });
      }
      
      return results;
    },
    onSuccess: (results, variables) => {
      // Invalidate registry queries
      queryClient.invalidateQueries({ queryKey: discoveryQueryKeys.registry() });
      
      // Invalidate feature-specific queries
      const features = new Set(variables.map(v => v.featureSlug));
      features.forEach(featureSlug => {
        queryClient.invalidateQueries({ 
          queryKey: discoveryQueryKeys.registryForFeature(featureSlug) 
        });
      });

      toast.success(`Registered ${results.length} elements`, {
        description: `Successfully registered ${results.length} out of ${variables.length} elements`,
      });
    },
    onError: (error) => {
      toast.error('Bulk registration failed', {
        description: error.message,
      });
    },
  });
}

/**
 * Smart element discovery with automatic filtering
 */
export function useSmartElementDiscovery(featureSlug: string, options?: {
  autoRegister?: boolean;
  minConfidence?: number;
  excludeTypes?: string[];
}) {
  const discovery = useElementDiscovery(featureSlug);
  const suggestions = useWebhookSuggestions(discovery.data || []);
  const registerElement = useRegisterElement();
  const bulkRegister = useBulkRegisterElements();

  const { 
    autoRegister = false, 
    minConfidence = 0.7, 
    excludeTypes = [] 
  } = options || {};

  // Filter high-confidence elements
  const highConfidenceElements = discovery.data?.filter(element => {
    if (excludeTypes.includes(element.elementType)) return false;
    
    const suggestion = suggestions.data?.find(s => s.elementId === element.elementId);
    return suggestion && suggestion.confidence >= minConfidence;
  }) || [];

  // Auto-register high-confidence elements
  useEffect(() => {
    if (autoRegister && highConfidenceElements.length > 0 && suggestions.data) {
      const registrations: ElementRegistration[] = highConfidenceElements.map(element => ({
        featureSlug,
        pagePath: window.location.pathname,
        elementId: element.elementId,
        displayName: element.textContent || element.elementId,
        elementType: element.elementType,
        cssSelector: element.cssSelector,
        xpath: element.xpath,
        attributes: element.attributes,
        description: `Auto-discovered ${element.elementType} element`
      }));

      bulkRegister.mutate(registrations);
    }
  }, [autoRegister, highConfidenceElements, suggestions.data, bulkRegister, featureSlug]);

  return {
    allElements: discovery.data || [],
    highConfidenceElements,
    suggestions: suggestions.data || [],
    isScanning: discovery.isLoading,
    isAnalyzing: suggestions.isLoading,
    isRegistering: bulkRegister.isPending,
    scanError: discovery.error,
    analysisError: suggestions.error,
    registrationError: bulkRegister.error,
    
    // Manual actions
    rescan: discovery.refetch,
    registerHighConfidence: () => {
      if (highConfidenceElements.length === 0) return Promise.resolve([]);
      
      const registrations: ElementRegistration[] = highConfidenceElements.map(element => ({
        featureSlug,
        pagePath: window.location.pathname,
        elementId: element.elementId,
        displayName: element.textContent || element.elementId,
        elementType: element.elementType,
        cssSelector: element.cssSelector,
        xpath: element.xpath,
        attributes: element.attributes,
        description: `High-confidence ${element.elementType} element`
      }));

      return bulkRegister.mutateAsync(registrations);
    }
  };
}