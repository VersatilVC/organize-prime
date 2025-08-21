/**
 * Service provider hook for webhook services
 * Provides singleton access to webhook services with proper configuration
 */

import { useMemo } from 'react';
import { useOrganization } from '../contexts/OrganizationContext';
import { ElementWebhookService } from '../services/ElementWebhookService';
import { WebhookDiscoveryService } from '../services/WebhookDiscoveryService';
import { WebhookExecutionService } from '../services/WebhookExecutionService';
import { ServiceConfig } from '../services/base/BaseWebhookService';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const EDGE_FUNCTION_URL = `${SUPABASE_URL}/functions/v1/execute-element-webhook`;

export interface WebhookServices {
  elementService: ElementWebhookService;
  discoveryService: WebhookDiscoveryService;
  executionService: WebhookExecutionService;
}

export function useWebhookServices(): WebhookServices {
  const { currentOrganization } = useOrganization();

  return useMemo(() => {
    if (!currentOrganization) {
      throw new Error('Organization context is required for webhook services');
    }

    const serviceConfig: ServiceConfig = {
      organizationId: currentOrganization.id,
      enableLogging: import.meta.env.DEV,
      enableRateLimiting: true,
      rateLimitConfig: {
        maxRequests: 100,
        windowMs: 60000 // 1 minute
      }
    };

    const elementService = new ElementWebhookService(serviceConfig);
    
    const discoveryService = new WebhookDiscoveryService(serviceConfig, {
      autoApprove: false,
      minInteractionTime: 100,
      excludeSelectors: ['script', 'style', 'meta', 'link', 'title', '.tooltip', '.popover'],
      includeHidden: false,
      maxElementsPerPage: 500,
      scanInterval: 5000
    });

    const executionService = new WebhookExecutionService(serviceConfig, {
      edgeFunctionUrl: EDGE_FUNCTION_URL,
      maxConcurrentExecutions: 20,
      defaultTimeout: 30000,
      retryConfig: {
        maxRetries: 3,
        baseDelay: 1000,
        maxDelay: 10000
      }
    });

    return {
      elementService,
      discoveryService,
      executionService
    };
  }, [currentOrganization]);
}