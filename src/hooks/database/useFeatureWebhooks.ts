import { useToast } from '@/hooks/use-toast';

export function useFeatureWebhooks(_featureId?: string) {
  const { toast } = useToast();

  // Ultra-simple mock implementation to avoid any complex initialization
  return {
    // Queries
    webhooks: [],
    isLoading: false,
    error: null,
    refetch: () => Promise.resolve(),
    useWebhooksByFeature: (_id: string) => ({ data: [], isLoading: false, error: null }),
    isWebhookSystemUnavailable: false,

    // Mutations
    createWebhook: async (_data: any) => {
      toast({
        title: 'Mock Success',
        description: 'Mock webhook created (tables not deployed)',
      });
      return { id: 'mock-id', name: 'Mock Webhook', url: 'https://example.com' };
    },
    updateWebhook: async (_data: any) => {
      toast({
        title: 'Mock Success', 
        description: 'Mock webhook updated (tables not deployed)',
      });
      return { id: 'mock-id', name: 'Mock Webhook', url: 'https://example.com' };
    },
    deleteWebhook: async (_id: string) => {
      toast({
        title: 'Mock Success',
        description: 'Mock webhook deleted (tables not deployed)',
      });
    },
    toggleWebhook: async (_data: any) => {
      toast({
        title: 'Mock Success',
        description: 'Mock webhook toggled (tables not deployed)',
      });
      return { id: 'mock-id', is_active: true };
    },
    testWebhook: async (_id: string) => {
      toast({
        title: 'Mock Test',
        description: 'Mock webhook test (edge function not deployed)',
      });
      return { status: 'success', response_time: 150 };
    },

    // Loading states
    isCreating: false,
    isUpdating: false,
    isDeleting: false,
    isToggling: false,
    isTesting: false
  };
}