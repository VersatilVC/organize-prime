import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/auth/AuthProvider';

export interface WebhookConfig {
  id: string;
  name: string;
  url: string;
  description?: string;
  feature_id: string;
  feature_name?: string;
  feature_category?: string;
  event_types: string[];
  is_active: boolean;
  secret_key?: string;
  timeout_seconds: number;
  retry_attempts: number;
  created_at: string;
  updated_at: string;
  created_by?: string;
  last_triggered?: string;
  success_count: number;
  failure_count: number;
  avg_response_time: number;
}

export interface CreateWebhookRequest {
  name: string;
  url: string;
  description?: string;
  feature_id: string;
  event_types: string[];
  is_active?: boolean;
  timeout_seconds?: number;
  retry_attempts?: number;
}

export interface UpdateWebhookRequest extends Partial<CreateWebhookRequest> {
  id: string;
}

// Simulation fallback function
async function simulateWebhookTest(webhookId: string) {
  // This is used when the edge function is not available
  const testResult = {
    status: 'success',
    status_code: 200,
    response_time: Math.floor(Math.random() * 500) + 100,
    response_body: {
      message: 'Simulated test - Edge function not deployed',
      note: 'Deploy the test-webhook edge function for real testing'
    },
    request_headers: {
      'Content-Type': 'application/json',
      'X-Test': 'true'
    },
    payload_size: 250
  };

  console.log('🔔 Using webhook test simulation');
  console.log('📋 Simulated result:', testResult);
  
  return testResult;
}

export function useFeatureWebhooks(featureId?: string, enabled = true) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // First, check if webhook system is available
  const systemCheckQuery = useQuery({
    queryKey: ['webhook-system-check'],
    queryFn: async (): Promise<{ available: boolean }> => {
      try {
        const { data, error } = await supabase
          .from('feature_webhooks')
          .select('id', { count: 'exact', head: true })
          .limit(1);

        if (error) {
          console.warn('🔍 System check error:', error);
          // Table doesn't exist
          if (error.message?.includes('relation "public.feature_webhooks" does not exist') || 
              error.code === 'PGRST116' || 
              error.code === '42P01') {
            console.warn('📋 Webhook system not available - tables do not exist');
            return { available: false };
          }
        }
        console.log('✅ Webhook system is available');
        return { available: true };
      } catch (error: any) {
        console.warn('🔍 System check caught error:', error);
        return { available: false };
      }
    },
    enabled: enabled && !!user,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    retry: false, // Don't retry system checks
  });

  // Only fetch webhooks if system is available
  const webhooksQuery = useQuery({
    queryKey: ['feature-webhooks', featureId],
    queryFn: async (): Promise<WebhookConfig[]> => {
      let query = supabase
        .from('feature_webhooks')
        .select(`
          *,
          system_feature_configs!feature_webhooks_feature_id_fkey(
            feature_slug,
            display_name,
            category
          )
        `);

      // Filter by feature if specified
      if (featureId) {
        query = query.eq('feature_id', featureId);
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) {
        console.warn('🔍 Webhooks query error:', error);
        throw error;
      }

      const webhooks = data?.map(webhook => ({
        ...webhook,
        feature_name: webhook.system_feature_configs?.display_name || 'Unknown Feature',
        feature_category: webhook.system_feature_configs?.category || 'Unknown Category',
        event_types: webhook.event_types || ['webhook.test'], // Default event type
        // Provide default values using actual column names from your schema
        success_count: webhook.success_count || webhook.success_calls || 0,
        failure_count: webhook.failure_count || webhook.failed_calls || 0,
        total_calls: webhook.total_calls || 0,
        avg_response_time: webhook.avg_response_time || 0,
        last_triggered: webhook.last_triggered || webhook.last_tested_at || null
      })) || [];

      console.log('✅ Successfully fetched webhooks:', webhooks.length);
      return webhooks;
    },
    enabled: enabled && !!user && systemCheckQuery.data?.available === true,
    retry: (failureCount, error: any) => {
      // Don't retry on 400 errors (table not found)
      if (error?.status === 400 || error?.statusCode === 400) {
        console.warn('🚫 Not retrying 400 error - table likely does not exist');
        return false;
      }
      // Default retry logic for other errors (max 3 retries)
      return failureCount < 3;
    }
  });

  // Fetch webhooks for a specific feature
  const useWebhooksByFeature = (featureId: string) => {
    return useQuery({
      queryKey: ['feature-webhooks', featureId],
      queryFn: async (): Promise<WebhookConfig[]> => {
        const { data, error } = await supabase
          .from('feature_webhooks')
          .select(`
            *,
            system_feature_configs!feature_webhooks_feature_id_fkey(
              feature_slug,
              display_name,
              category
            )
          `)
          .eq('feature_id', featureId)
          .order('created_at', { ascending: false });

        if (error) throw error;

        return data?.map(webhook => ({
          ...webhook,
          feature_name: webhook.system_feature_configs?.display_name || 'Unknown Feature',
          feature_category: webhook.system_feature_configs?.category || 'Unknown Category',
          event_types: webhook.event_types || ['webhook.test'], // Default event type
          // Provide default values using actual column names from your schema
          success_count: webhook.success_count || webhook.success_calls || 0,
          failure_count: webhook.failure_count || webhook.failed_calls || 0,
          total_calls: webhook.total_calls || 0,
          avg_response_time: webhook.avg_response_time || 0,
          last_triggered: webhook.last_triggered || webhook.last_tested_at || null
        })) || [];
      },
      enabled: enabled && !!user && !!featureId
    });
  };

  // Create webhook mutation
  const createWebhookMutation = useMutation({
    mutationFn: async (webhook: CreateWebhookRequest): Promise<WebhookConfig> => {
      console.log('🔍 createWebhook mutation started:', webhook);
      
      if (!user?.id) {
        console.error('❌ User not authenticated');
        throw new Error('User not authenticated');
      }

      try {
        // Generate a secure secret key for the webhook
        const secretKey = `whsec_${Math.random().toString(36).substring(2, 15)}${Math.random().toString(36).substring(2, 15)}`;

        // Use a minimal approach first to avoid constraint conflicts
        // Add timestamp to name to avoid duplicate name conflicts
        const uniqueName = `${webhook.name}_${Date.now()}`;
        
        const webhookData = {
          name: uniqueName,
          url: webhook.url, // url column is NOT NULL and must be provided
          endpoint_url: webhook.url, // Also populate endpoint_url for compatibility
          description: webhook.description || null,
          feature_id: webhook.feature_id,
          event_types: webhook.event_types || ['webhook.test'],
          is_active: webhook.is_active ?? true,
          timeout_seconds: webhook.timeout_seconds ?? 30,
          retry_attempts: webhook.retry_attempts ?? 3,
          secret_key: secretKey,
          created_by: user.id
        };

        console.warn('🔍 DETAILED WEBHOOK DATA:', {
          webhookData,
          featureId: webhook.feature_id,
          userId: user.id,
          originalWebhook: webhook,
          dataString: JSON.stringify(webhookData, null, 2)
        });

        // Check if feature_id exists in system_feature_configs table (the correct table)
        const { data: featureCheck, error: featureError } = await supabase
          .from('system_feature_configs')
          .select('id, feature_slug, display_name')
          .eq('id', webhook.feature_id)
          .single();

        console.log('🔍 FEATURE VALIDATION RESULT:', {
          featureId: webhook.feature_id,
          error: featureError,
          exists: !!featureCheck,
          featureData: featureCheck
        });

        if (featureError || !featureCheck) {
          console.error('❌ FEATURE VALIDATION ERROR - Feature not found in system_features table');
          
          // Let's also check what tables the feature might be in
          const { data: allFeatures, error: allFeaturesError } = await supabase
            .from('system_feature_configs')
            .select('id, feature_slug, display_name')
            .limit(10);
            
          console.log('🔍 Available features in system_features table:', {
            features: allFeatures,
            featureDetails: allFeatures?.map(f => ({ id: f.id, name: f.display_name, slug: f.feature_slug })),
            error: allFeaturesError,
            lookingFor: webhook.feature_id
          });
          
          // Let's also check what table the feature was originally retrieved from
          console.log('🔍 Original feature being edited:', {
            featureId: webhook.feature_id,
            featureName: webhook.feature_name || 'unknown'
          });
          
          throw new Error(`Feature with ID ${webhook.feature_id} does not exist in system_features table. Check if the feature is in the correct table.`);
        }

        console.log('✅ Feature exists:', featureCheck);

        const { data, error } = await supabase
          .from('feature_webhooks')
          .insert(webhookData)
          .select(`
            *,
            system_feature_configs!feature_webhooks_feature_id_fkey(
              feature_slug,
              display_name,
              category
            )
          `)
          .single();

        if (error) {
          console.warn('❌ DETAILED INSERT ERROR:', {
            message: error.message,
            code: error.code,
            details: error.details,
            hint: error.hint,
            fullError: error,
            errorString: JSON.stringify(error, null, 2)
          });
          
          // Log specific details for 409 conflicts
          if (error.code === '23505' || error.message?.includes('duplicate') || error.message?.includes('unique')) {
            console.error('🔍 DUPLICATE KEY ERROR - This suggests a unique constraint violation');
            console.error('🔍 Webhook data that caused conflict:', webhookData);
          }
          
          throw error;
        }

        console.log('✅ Webhook inserted successfully:', data);

        const result = {
          ...data,
          // Provide safe defaults for all expected fields
          url: data.url || data.endpoint_url || webhook.url,
          description: data.description || webhook.description,
          is_active: data.is_active !== undefined ? data.is_active : (webhook.is_active ?? true),
          secret_key: data.secret_key || secretKey,
          timeout_seconds: data.timeout_seconds || webhook.timeout_seconds || 30,
          retry_attempts: data.retry_attempts || webhook.retry_attempts || 3,
          created_by: data.created_by || user.id,
          feature_name: data.system_features?.name || 'Unknown Feature',
          feature_category: data.system_features?.category || 'Unknown Category',
          event_types: data.event_types || ['webhook.test'],
          // Handle both old and new column names
          success_count: data.success_count || data.success_calls || 0,
          failure_count: data.failure_count || data.failed_calls || 0,
          total_calls: data.total_calls || 0,
          avg_response_time: data.avg_response_time || 0,
          last_triggered: data.last_triggered || data.last_tested_at || null,
          created_at: data.created_at || new Date().toISOString(),
          updated_at: data.updated_at || new Date().toISOString()
        };

        console.log('✅ Final webhook result:', result);
        return result;
      } catch (error: any) {
        console.warn('❌ DETAILED CAUGHT ERROR:', {
          message: error.message,
          code: error.code,
          details: error.details,
          hint: error.hint,
          fullError: JSON.stringify(error, null, 2)
        });
        
        // Handle missing table error
        if (error.message?.includes('relation "public.feature_webhooks" does not exist') ||
            error.message?.includes('Bad Request')) {
          throw new Error('Webhook tables are not set up yet. Please contact your administrator to run the database migrations.');
        }
        throw error;
      }
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['feature-webhooks'] });
      toast({
        title: 'Success',
        description: `Webhook "${data.name}" created successfully`
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to create webhook',
        variant: 'destructive'
      });
    }
  });

  // Update webhook mutation
  const updateWebhookMutation = useMutation({
    mutationFn: async (webhook: UpdateWebhookRequest): Promise<WebhookConfig> => {
      if (!user?.id) throw new Error('User not authenticated');

      const { id, ...updateData } = webhook;
      
      const { data, error } = await supabase
        .from('feature_webhooks')
        .update({
          ...updateData,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select(`
          *,
          system_feature_configs!feature_webhooks_feature_id_fkey(
            feature_slug,
            display_name,
            category
          )
        `)
        .single();

      if (error) throw error;

      return {
        ...data,
        feature_name: data.system_feature_configs?.display_name || 'Unknown Feature',
        feature_category: data.system_feature_configs?.category || 'Unknown Category',
        event_types: data.event_types || ['webhook.test'], // Default event type
        // Provide default values using actual column names from your schema
        success_count: data.success_count || data.success_calls || 0,
        failure_count: data.failure_count || data.failed_calls || 0,
        total_calls: data.total_calls || 0,
        avg_response_time: data.avg_response_time || 0,
        last_triggered: data.last_triggered || data.last_tested_at || null
      };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['feature-webhooks'] });
      toast({
        title: 'Success',
        description: `Webhook "${data.name}" updated successfully`
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update webhook',
        variant: 'destructive'
      });
    }
  });

  // Delete webhook mutation
  const deleteWebhookMutation = useMutation({
    mutationFn: async (webhookId: string): Promise<void> => {
      if (!user?.id) throw new Error('User not authenticated');

      const { error } = await supabase
        .from('feature_webhooks')
        .delete()
        .eq('id', webhookId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feature-webhooks'] });
      toast({
        title: 'Success',
        description: 'Webhook deleted successfully'
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete webhook',
        variant: 'destructive'
      });
    }
  });

  // Toggle webhook status mutation
  const toggleWebhookMutation = useMutation({
    mutationFn: async ({ webhookId, isActive }: { webhookId: string; isActive: boolean }): Promise<WebhookConfig> => {
      if (!user?.id) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('feature_webhooks')
        .update({ 
          is_active: isActive,
          updated_at: new Date().toISOString()
        })
        .eq('id', webhookId)
        .select(`
          *,
          system_feature_configs!feature_webhooks_feature_id_fkey(
            feature_slug,
            display_name,
            category
          )
        `)
        .single();

      if (error) throw error;

      return {
        ...data,
        feature_name: data.system_feature_configs?.display_name || 'Unknown Feature',
        feature_category: data.system_feature_configs?.category || 'Unknown Category',
        event_types: data.event_types || ['webhook.test'], // Default event type
        // Provide default values using actual column names from your schema
        success_count: data.success_count || data.success_calls || 0,
        failure_count: data.failure_count || data.failed_calls || 0,
        total_calls: data.total_calls || 0,
        avg_response_time: data.avg_response_time || 0,
        last_triggered: data.last_triggered || data.last_tested_at || null
      };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['feature-webhooks'] });
      toast({
        title: 'Success',
        description: `Webhook ${data.is_active ? 'enabled' : 'disabled'} successfully`
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to toggle webhook status',
        variant: 'destructive'
      });
    }
  });

  // Test webhook mutation - uses Supabase Edge Function for real webhook testing
  const testWebhookMutation = useMutation({
    mutationFn: async (webhookId: string): Promise<any> => {
      if (!user?.id) throw new Error('User not authenticated');

      try {
        // Call the Supabase Edge Function to test the webhook
        const { data, error } = await supabase.functions.invoke('test-webhook', {
          body: {
            webhookId,
            eventType: 'webhook.test'
          }
        });

        if (error) {
          console.error('Edge function error:', error);
          throw new Error(`Webhook test failed: ${error.message}`);
        }

        console.log('✅ Webhook test completed:', data);
        return data;
      } catch (error: any) {
        console.error('❌ Webhook test error:', error);
        
        // If edge function is not available, fall back to simulation with helpful message
        if (error.message?.includes('Function not found') || error.message?.includes('404')) {
          toast({
            title: '⚠️ Edge Function Not Deployed',
            description: 'Using test simulation. Deploy the test-webhook function for real testing.',
            duration: 5000
          });
          
          // Fallback to simulation
          return await simulateWebhookTest(webhookId);
        }
        
        throw error;
      }
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['webhook-logs'] });
      
      if (result.status === 'success') {
        toast({
          title: '✅ Webhook Test Successful',
          description: `Response: ${result.status_code} - ${result.response_time}ms response time`,
          duration: 4000
        });
      } else if (result.status === 'failed') {
        toast({
          title: '❌ Webhook Test Failed',
          description: result.error_message || 'Webhook test failed - check logs for details',
          variant: 'destructive',
          duration: 5000
        });
      } else if (result.status === 'timeout') {
        toast({
          title: '⏱️ Webhook Test Timeout',
          description: result.error_message || 'Webhook request timed out',
          variant: 'destructive',
          duration: 5000
        });
      }
    },
    onError: (error: any) => {
      toast({
        title: 'Test Failed',
        description: error.message || 'Failed to test webhook',
        variant: 'destructive'
      });
    }
  });

  const isSystemCheckLoading = systemCheckQuery.isLoading;
  const isSystemAvailable = systemCheckQuery.data?.available === true;
  const isSystemUnavailable = systemCheckQuery.data?.available === false;
  
  return {
    // Queries
    webhooks: webhooksQuery.data || [],
    isLoading: isSystemCheckLoading || (isSystemAvailable && webhooksQuery.isLoading),
    error: webhooksQuery.error || systemCheckQuery.error,
    refetch: webhooksQuery.refetch,
    useWebhooksByFeature,
    isWebhookSystemUnavailable: isSystemUnavailable,

    // Mutations
    createWebhook: createWebhookMutation.mutateAsync,
    updateWebhook: updateWebhookMutation.mutateAsync,
    deleteWebhook: deleteWebhookMutation.mutateAsync,
    toggleWebhook: toggleWebhookMutation.mutateAsync,
    testWebhook: testWebhookMutation.mutateAsync,

    // Loading states
    isCreating: createWebhookMutation.isPending,
    isUpdating: updateWebhookMutation.isPending,
    isDeleting: deleteWebhookMutation.isPending,
    isToggling: toggleWebhookMutation.isPending,
    isTesting: testWebhookMutation.isPending
  };
}