/**
 * Offline support hooks for webhook operations
 * Provides queue management, sync strategies, and offline-first functionality
 */

import { useEffect, useState, useCallback } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  CreateElementWebhookRequest,
  UpdateElementWebhookRequest,
  WebhookExecutionRequest,
  ElementWebhook
} from '../types/webhook';

// Offline operation types
interface OfflineOperation {
  id: string;
  type: 'create_webhook' | 'update_webhook' | 'delete_webhook' | 'execute_webhook';
  data: any;
  timestamp: string;
  retryCount: number;
  maxRetries: number;
}

interface OfflineStore {
  operations: OfflineOperation[];
  lastSync: string | null;
}

class WebhookOfflineManager {
  private storageKey = 'webhook-offline-operations';
  private syncInProgress = false;

  private getStore(): OfflineStore {
    try {
      const stored = localStorage.getItem(this.storageKey);
      return stored ? JSON.parse(stored) : { operations: [], lastSync: null };
    } catch {
      return { operations: [], lastSync: null };
    }
  }

  private setStore(store: OfflineStore): void {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(store));
    } catch (error) {
      console.warn('Failed to store offline operations:', error);
    }
  }

  addOperation(operation: Omit<OfflineOperation, 'id' | 'timestamp' | 'retryCount'>): string {
    const store = this.getStore();
    const id = `offline_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const newOperation: OfflineOperation = {
      ...operation,
      id,
      timestamp: new Date().toISOString(),
      retryCount: 0,
    };

    store.operations.push(newOperation);
    this.setStore(store);
    
    return id;
  }

  removeOperation(id: string): void {
    const store = this.getStore();
    store.operations = store.operations.filter(op => op.id !== id);
    this.setStore(store);
  }

  getOperations(): OfflineOperation[] {
    return this.getStore().operations;
  }

  updateRetryCount(id: string): void {
    const store = this.getStore();
    const operation = store.operations.find(op => op.id === id);
    if (operation) {
      operation.retryCount++;
      this.setStore(store);
    }
  }

  clear(): void {
    this.setStore({ operations: [], lastSync: new Date().toISOString() });
  }

  async syncOperations(services: {
    elementService: any;
    executionService: any;
  }): Promise<{ successful: number; failed: number }> {
    if (this.syncInProgress) {
      return { successful: 0, failed: 0 };
    }

    this.syncInProgress = true;
    const operations = this.getOperations();
    let successful = 0;
    let failed = 0;

    try {
      for (const operation of operations) {
        try {
          await this.executeOperation(operation, services);
          this.removeOperation(operation.id);
          successful++;
        } catch (error) {
          console.warn(`Failed to sync operation ${operation.id}:`, error);
          
          // Increment retry count
          this.updateRetryCount(operation.id);
          
          // Remove operation if max retries exceeded
          if (operation.retryCount >= operation.maxRetries) {
            this.removeOperation(operation.id);
          }
          
          failed++;
        }
      }

      // Update last sync time
      const store = this.getStore();
      store.lastSync = new Date().toISOString();
      this.setStore(store);

    } finally {
      this.syncInProgress = false;
    }

    return { successful, failed };
  }

  private async executeOperation(
    operation: OfflineOperation,
    services: { elementService: any; executionService: any }
  ): Promise<void> {
    const { elementService, executionService } = services;

    switch (operation.type) {
      case 'create_webhook':
        await elementService.createWebhook(operation.data as CreateElementWebhookRequest);
        break;
      
      case 'update_webhook':
        await elementService.updateWebhook(operation.data.id, operation.data.updates);
        break;
      
      case 'delete_webhook':
        await elementService.deleteWebhook(operation.data.id);
        break;
      
      case 'execute_webhook':
        await executionService.executeWebhook(operation.data as WebhookExecutionRequest);
        break;
      
      default:
        throw new Error(`Unknown operation type: ${operation.type}`);
    }
  }
}

// Singleton instance
const offlineManager = new WebhookOfflineManager();

/**
 * Hook for managing offline operations
 */
export function useWebhookOffline() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pendingOperations, setPendingOperations] = useState<OfflineOperation[]>([]);
  const queryClient = useQueryClient();

  // Monitor online status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Update pending operations
  useEffect(() => {
    const updatePendingOperations = () => {
      setPendingOperations(offlineManager.getOperations());
    };

    updatePendingOperations();
    
    // Listen for storage changes (from other tabs)
    window.addEventListener('storage', updatePendingOperations);
    
    return () => {
      window.removeEventListener('storage', updatePendingOperations);
    };
  }, []);

  // Auto-sync when coming back online
  useEffect(() => {
    if (isOnline && pendingOperations.length > 0) {
      // Trigger sync after a short delay to ensure connection is stable
      const timer = setTimeout(() => {
        // This would need to be called from a component that has access to services
        // For now, we'll emit an event that can be caught by the app
        window.dispatchEvent(new CustomEvent('webhook-sync-needed'));
      }, 1000);

      return () => clearTimeout(timer);
    }
  }, [isOnline, pendingOperations.length]);

  const addOfflineOperation = useCallback((
    type: OfflineOperation['type'],
    data: any,
    maxRetries: number = 3
  ) => {
    const id = offlineManager.addOperation({ type, data, maxRetries });
    setPendingOperations(offlineManager.getOperations());
    
    toast.info('Operation queued for when online', {
      description: 'This action will be completed when connection is restored',
    });
    
    return id;
  }, []);

  const removeOfflineOperation = useCallback((id: string) => {
    offlineManager.removeOperation(id);
    setPendingOperations(offlineManager.getOperations());
  }, []);

  const clearAllOperations = useCallback(() => {
    offlineManager.clear();
    setPendingOperations([]);
    toast.success('Offline queue cleared');
  }, []);

  return {
    isOnline,
    pendingOperations,
    hasPendingOperations: pendingOperations.length > 0,
    addOfflineOperation,
    removeOfflineOperation,
    clearAllOperations,
  };
}

/**
 * Hook for offline-aware webhook creation
 */
export function useOfflineWebhookCreation() {
  const { isOnline, addOfflineOperation } = useWebhookOffline();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (request: CreateElementWebhookRequest) => {
      if (!isOnline) {
        // Store for later sync
        addOfflineOperation('create_webhook', request);
        
        // Create optimistic update
        const tempId = `temp_${Date.now()}`;
        const optimisticWebhook: ElementWebhook = {
          id: tempId,
          organizationId: 'temp',
          featureSlug: request.featureSlug,
          pagePath: request.pagePath,
          elementId: request.elementId,
          endpointUrl: request.endpointUrl,
          httpMethod: request.httpMethod,
          payloadTemplate: request.payloadTemplate || {},
          headers: request.headers || {},
          timeoutSeconds: request.timeoutSeconds || 30,
          retryCount: request.retryCount || 3,
          rateLimitPerMinute: request.rateLimitPerMinute || 60,
          isActive: request.isActive !== false,
          healthStatus: 'unknown',
          createdBy: 'current-user',
          updatedBy: 'current-user',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          totalExecutions: 0,
          successfulExecutions: 0,
          failedExecutions: 0,
          averageResponseTime: 0,
        };

        // Add to cache optimistically
        queryClient.setQueryData(
          ['webhooks', 'detail', tempId],
          optimisticWebhook
        );

        return optimisticWebhook;
      }

      throw new Error('Online creation should use regular hook');
    },
    onSuccess: (webhook) => {
      toast.success('Webhook queued for creation', {
        description: 'Will be created when connection is restored',
      });
    },
  });
}

/**
 * Hook for offline-aware webhook updates
 */
export function useOfflineWebhookUpdate() {
  const { isOnline, addOfflineOperation } = useWebhookOffline();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: UpdateElementWebhookRequest }) => {
      if (!isOnline) {
        // Store for later sync
        addOfflineOperation('update_webhook', { id, updates });
        
        // Apply optimistic update
        queryClient.setQueryData(['webhooks', 'detail', id], (old: ElementWebhook | undefined) => {
          if (!old) return old;
          
          return {
            ...old,
            ...updates,
            updatedAt: new Date().toISOString(),
          };
        });

        return null;
      }

      throw new Error('Online update should use regular hook');
    },
    onSuccess: () => {
      toast.success('Webhook update queued', {
        description: 'Changes will be saved when connection is restored',
      });
    },
  });
}

/**
 * Hook for offline-aware webhook execution
 */
export function useOfflineWebhookExecution() {
  const { isOnline, addOfflineOperation } = useWebhookOffline();

  return useMutation({
    mutationFn: async (request: WebhookExecutionRequest) => {
      if (!isOnline) {
        // Store for later execution
        addOfflineOperation('execute_webhook', request, 5); // More retries for executions
        
        return {
          success: false,
          executionId: `offline_${Date.now()}`,
          webhookId: request.webhookId || '',
          responseTime: 0,
          error: {
            type: 'OFFLINE_QUEUED',
            message: 'Execution queued for when online',
            details: {},
            retryable: true,
            suggestedAction: 'Wait for connection to be restored',
          },
          metadata: {
            attempts: 0,
            networkLatency: 0,
            processingTime: 0,
            queueTime: Date.now(),
          },
        };
      }

      throw new Error('Online execution should use regular hook');
    },
    onSuccess: () => {
      toast.info('Webhook execution queued', {
        description: 'Will be executed when connection is restored',
      });
    },
  });
}

/**
 * Hook for manual sync trigger
 */
export function useWebhookSync() {
  const { pendingOperations } = useWebhookOffline();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (services: { elementService: any; executionService: any }) => {
      const result = await offlineManager.syncOperations(services);
      
      // Invalidate all webhook queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['webhooks'] });
      queryClient.invalidateQueries({ queryKey: ['executions'] });
      
      return result;
    },
    onSuccess: ({ successful, failed }) => {
      if (successful > 0) {
        toast.success(`Synced ${successful} operations`, {
          description: failed > 0 ? `${failed} operations failed` : 'All operations completed',
        });
      }
      
      if (failed > 0 && successful === 0) {
        toast.error(`Failed to sync ${failed} operations`, {
          description: 'Some operations will be retried automatically',
        });
      }
    },
    onError: (error) => {
      toast.error('Sync failed', {
        description: error.message,
      });
    },
  });
}

/**
 * Context provider for offline webhook management
 */
export function useWebhookOfflineProvider() {
  const offlineState = useWebhookOffline();
  const sync = useWebhookSync();

  // Listen for sync events
  useEffect(() => {
    const handleSyncNeeded = () => {
      // This would need services passed from context
      // For now, we'll just log
      console.log('Sync needed but services not available');
    };

    window.addEventListener('webhook-sync-needed', handleSyncNeeded);
    
    return () => {
      window.removeEventListener('webhook-sync-needed', handleSyncNeeded);
    };
  }, []);

  return {
    ...offlineState,
    sync: sync.mutateAsync,
    isSyncing: sync.isPending,
    syncError: sync.error,
  };
}

/**
 * Utility function to check if a webhook operation can be performed offline
 */
export function canPerformOffline(operationType: string): boolean {
  const offlineOperations = [
    'create_webhook',
    'update_webhook',
    'delete_webhook',
    'execute_webhook', // Can be queued
  ];
  
  return offlineOperations.includes(operationType);
}

/**
 * Utility function to estimate sync time based on pending operations
 */
export function estimateSyncTime(operations: OfflineOperation[]): number {
  // Rough estimates in milliseconds
  const timeEstimates = {
    create_webhook: 2000,
    update_webhook: 1500,
    delete_webhook: 1000,
    execute_webhook: 3000,
  };
  
  return operations.reduce((total, op) => {
    return total + (timeEstimates[op.type] || 2000);
  }, 0);
}