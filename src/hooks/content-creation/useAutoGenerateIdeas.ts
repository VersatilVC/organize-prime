// Auto Generate Content Ideas Hook - AI-powered idea generation
// Mutation hook for creating content ideas through N8N webhook automation

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { ContentCreationService } from '@/services/ContentCreationService';
import { useN8NIntegration } from '@/apps/shared/hooks/useN8NIntegration';
import { contentCreationKeys } from './queryKeys';
import { useAuth } from '@/auth/AuthProvider';
import { useOrganization } from '@/contexts/OrganizationContext';
import type {
  ContentIdea,
  UseMutationOptions
} from '@/types/content-creation';

export interface AutoGenerateInput {
  contentType: string;
  targetAudience: string;
}

interface AutoGenerateResponse {
  initialIdea: ContentIdea;
  webhookResponse?: any;
}

/**
 * Hook for auto-generating content ideas via N8N webhook
 */
const validateAuthentication = async (user: any, organization: any, maxRetries = 3): Promise<boolean> => {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    console.log(`Auth validation attempt ${attempt}:`, {
      user: !!user,
      org: !!organization?.id,
      userId: user?.id,
      orgId: organization?.id
    });

    if (user && organization?.id) {
      // Double-check by verifying the session
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          console.log('Auth validation successful on attempt', attempt);
          return true;
        }
      } catch (error) {
        console.warn(`Session check failed on attempt ${attempt}:`, error);
      }
    }

    if (attempt < maxRetries) {
      console.log(`Auth not ready, waiting 200ms before retry...`);
      await new Promise(resolve => setTimeout(resolve, 200));
    }
  }

  return false;
};

export const useAutoGenerateIdeas = (
  options: UseMutationOptions<AutoGenerateResponse, Error, AutoGenerateInput> = {}
) => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { currentOrganization } = useOrganization();
  const { executeWebhook } = useN8NIntegration({ appId: 'content-creation' });

  return useMutation({
    mutationFn: async ({ contentType, targetAudience }: AutoGenerateInput): Promise<AutoGenerateResponse> => {
      // Validate authentication with retries
      const isAuthValid = await validateAuthentication(user, currentOrganization);
      
      if (!isAuthValid) {
        throw new Error('Authentication failed - please try refreshing the page and logging in again');
      }

      // Step 1: Create initial content idea in database
      const initialIdea = await ContentCreationService.autoGenerateContentIdeas(
        contentType,
        targetAudience
      );

      // Step 2: Trigger N8N webhook for AI generation
      const webhookPayload = {
        ideaId: initialIdea.id,
        title: initialIdea.title,
        contentType: contentType,
        targetAudience: targetAudience,
        organizationId: currentOrganization.id,
        userId: user.id,
        action: 'auto_generate'
      };

      try {
        // Configure N8N webhook
        const webhookConfig = {
          webhookId: 'auto-generate-ideas',
          url: 'https://versatil.app.n8n.cloud/webhook/bb310d8f-61fa-4334-8efb-d894baaa0d1f',
          method: 'POST' as const,
          retryConfig: {
            maxRetries: 2,
            retryDelay: 2000,
            exponentialBackoff: true
          }
        };

        // Execute webhook
        const webhookResponse = await executeWebhook(webhookConfig, webhookPayload);

        // Step 3: Process webhook response (if successful)
        if (webhookResponse?.success && webhookResponse?.ideas) {
          // The webhook response will be handled by N8N calling back to update the database
          // For now, we just return success
          console.log('Webhook executed successfully:', webhookResponse);
        }

        return {
          initialIdea,
          webhookResponse
        };

      } catch (webhookError) {
        // If webhook fails, we still have the initial idea created
        // Update status to indicate webhook failure
        try {
          await supabase
            .from('content_ideas')
            .update({
              processing_status: 'failed',
              extraction_error: `Webhook execution failed: ${(webhookError as Error).message}`
            })
            .eq('id', initialIdea.id);
        } catch (updateError) {
          console.error('Failed to update idea status after webhook failure:', updateError);
        }

        // Log webhook error but don't fail the entire operation
        console.error('N8N webhook execution failed:', webhookError);
        toast.warning('Content idea created, but AI generation is currently unavailable', {
          description: 'The basic idea has been saved. AI suggestions may be added later.'
        });

        return {
          initialIdea,
          webhookResponse: null
        };
      }
    },
    onMutate: async () => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: contentCreationKeys.ideas() });
    },
    onSuccess: ({ initialIdea, webhookResponse }) => {
      // Invalidate and refetch content ideas queries
      queryClient.invalidateQueries({ queryKey: contentCreationKeys.ideas() });
      
      // Show success message
      if (webhookResponse?.success) {
        toast.success('Auto-generation started!', {
          description: `Created "${initialIdea.title}" and started AI generation. New ideas will appear shortly.`
        });
      } else {
        toast.success('Content idea created', {
          description: `"${initialIdea.title}" has been added. AI suggestions will be processed when available.`
        });
      }
    },
    onError: (error) => {
      console.error('Auto-generate mutation error:', error);
      toast.error('Failed to auto-generate ideas', {
        description: error.message || 'An unexpected error occurred. Please try again.'
      });
      
      // Invalidate queries to ensure UI consistency
      queryClient.invalidateQueries({ queryKey: contentCreationKeys.ideas() });
    },
    ...options
  });
};

/**
 * Hook for processing N8N webhook response (called by webhook endpoint)
 * This would be used by a webhook handler to update ideas with generated content
 */
export const useProcessAutoGenerateResponse = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ ideaId, generatedIdeas }: { ideaId: string; generatedIdeas: any[] }) => {
      // This would process the N8N response and create additional content ideas
      // Implementation depends on the exact response format from N8N
      
      const results = [];
      for (const generatedIdea of generatedIdeas) {
        try {
          const { data, error } = await supabase
            .from('content_ideas')
            .insert({
              title: generatedIdea.title,
              description: generatedIdea.description,
              content_type: generatedIdea.contentType,
              target_audience: generatedIdea.targetAudience,
              keywords: generatedIdea.keywords || [],
              status: 'draft',
              processing_status: 'ai_completed',
              ai_suggestions: generatedIdea.suggestions,
              research_summary: generatedIdea.researchSummary,
              organization_id: generatedIdea.organizationId,
              created_by: generatedIdea.userId
            })
            .select()
            .single();

          if (error) throw error;
          results.push(data);
        } catch (error) {
          console.error('Failed to create generated idea:', error);
        }
      }

      return results;
    },
    onSuccess: () => {
      // Invalidate queries to show new ideas
      queryClient.invalidateQueries({ queryKey: contentCreationKeys.ideas() });
      
      toast.success('AI-generated ideas ready!', {
        description: 'New content ideas have been generated and added to your list.'
      });
    }
  });
};