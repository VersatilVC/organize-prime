import { supabase } from '@/integrations/supabase/client';
import type { AISuggestion, ContentIdeaWithDetails } from '@/types/content-creation';

export interface BriefGenerationContext {
  idea: {
    id: string;
    title: string;
    description?: string;
    keywords?: string[];
    target_audience?: string;
    content_type: string;
  };
  suggestion: AISuggestion;
  organizationId: string;
  userId: string;
}

export interface BriefGenerationStatus {
  id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  startedAt?: string;
  completedAt?: string;
  error?: string;
  content?: string;
  n8nExecutionId?: string;
}

/**
 * Service for managing content brief generation via N8N webhook
 * Handles the complete lifecycle from trigger to completion
 */
export class ContentBriefGenerationService {
  private static readonly WEBHOOK_URL = 'https://versatil.app.n8n.cloud/webhook/a4347384-b260-492f-b48b-1988b0e86ab2';
  private static readonly TIMEOUT_MS = 90000; // 90 seconds

  /**
   * Trigger content brief generation for a specific AI suggestion
   */
  static async triggerBriefGeneration(
    context: BriefGenerationContext
  ): Promise<{ success: boolean; briefId?: string; error?: string }> {
    try {
      console.log('🚀 Triggering brief generation for suggestion:', context.suggestion.title);

      // Create the brief record with pending status
      const { data: brief, error: briefError } = await supabase
        .from('content_briefs')
        .insert({
          idea_id: context.idea.id,
          organization_id: context.organizationId,
          title: context.suggestion.title,
          content_type: context.idea.content_type,
          target_audience: context.suggestion.target_audience || context.idea.target_audience,
          keywords: context.suggestion.keywords || context.idea.keywords,
          status: 'draft',
          created_by: context.userId,
          
          // Brief generation fields
          suggestion_id: crypto.randomUUID(), // Generate unique ID for this suggestion
          generation_status: 'pending',
          generation_started_at: new Date().toISOString(),
        })
        .select('id, suggestion_id')
        .single();

      if (briefError) {
        console.error('❌ Failed to create brief record:', briefError);
        throw new Error(`Failed to create brief record: ${briefError.message}`);
      }

      const briefId = brief.id;
      const suggestionId = brief.suggestion_id;

      // Prepare webhook payload
      const payload = {
        action: 'generate_brief',
        brief_id: briefId,
        suggestion_id: suggestionId,
        organization_id: context.organizationId,
        user_id: context.userId,
        idea: {
          id: context.idea.id,
          title: context.idea.title,
          description: context.idea.description,
          keywords: context.idea.keywords,
          target_audience: context.idea.target_audience,
          content_type: context.idea.content_type
        },
        suggestion: {
          title: context.suggestion.title,
          description: context.suggestion.description,
          reasoning: context.suggestion.reasoning,
          confidence: context.suggestion.confidence,
          keywords: context.suggestion.keywords,
          target_audience: context.suggestion.target_audience
        },
        // Callback URL for N8N to update status (if needed)
        callback_url: `${window.location.origin}/api/webhook/brief-generation`,
        timestamp: new Date().toISOString()
      };

      console.log('📤 Sending webhook payload:', {
        action: payload.action,
        brief_id: briefId,
        suggestion_title: payload.suggestion.title
      });

      // Update status to processing before webhook call
      await supabase
        .from('content_briefs')
        .update({
          generation_status: 'processing',
        })
        .eq('id', briefId);

      // Make the webhook call
      const response = await fetch(this.WEBHOOK_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'OrganizePrime/1.0',
        },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(this.TIMEOUT_MS)
      });

      if (!response.ok) {
        throw new Error(`Webhook call failed: ${response.status} ${response.statusText}`);
      }

      const responseData = await response.json();
      console.log('✅ Webhook response:', responseData);

      // Store the execution ID if provided
      if (responseData.execution_id) {
        await supabase
          .from('content_briefs')
          .update({ n8n_execution_id: responseData.execution_id })
          .eq('id', briefId);
      }

      // If N8N returns immediate results, store them
      if (responseData.brief_content) {
        await this.handleWebhookResponse(briefId, responseData.brief_content, responseData.execution_id);
      }
      // If N8N indicates async processing, that's expected and successful
      else if (responseData.status === 'processing' || responseData.status === 'started') {
        console.log('⏳ Brief generation will continue asynchronously');
        // Brief status is already set to 'processing' above, so we're good
      }
      // If we get an unexpected response format, log it but don't fail
      else {
        console.log('ℹ️ Webhook accepted request, brief generation will continue asynchronously');
      }

      return {
        success: true,
        briefId
      };

    } catch (error) {
      console.error('❌ Brief generation failed:', error);
      
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      
      return {
        success: false,
        error: errorMessage
      };
    }
  }

  /**
   * Handle webhook response with generated brief content
   */
  static async handleWebhookResponse(
    briefId: string, 
    content: string, 
    executionId?: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      console.log('📝 Storing generated brief content for:', briefId);

      const { error } = await supabase
        .from('content_briefs')
        .update({
          brief_content: content,
          generation_status: 'completed',
          generation_completed_at: new Date().toISOString(),
          n8n_execution_id: executionId,
          generation_error: null // Clear any previous errors
        })
        .eq('id', briefId);

      if (error) {
        console.error('❌ Failed to update brief with content:', error);
        throw new Error(`Failed to update brief: ${error.message}`);
      }

      console.log('✅ Brief generation completed successfully:', briefId);
      return { success: true };

    } catch (error) {
      console.error('❌ Error handling webhook response:', error);
      
      // Mark as failed
      await supabase
        .from('content_briefs')
        .update({
          generation_status: 'failed',
          generation_error: error instanceof Error ? error.message : 'Failed to process webhook response',
          generation_completed_at: new Date().toISOString()
        })
        .eq('id', briefId);

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Check generation status for a specific brief
   */
  static async checkGenerationStatus(briefId: string): Promise<BriefGenerationStatus | null> {
    try {
      const { data: brief, error } = await supabase
        .from('content_briefs')
        .select(`
          id,
          generation_status,
          generation_started_at,
          generation_completed_at,
          generation_error,
          brief_content,
          n8n_execution_id
        `)
        .eq('id', briefId)
        .single();

      if (error || !brief) {
        console.warn('⚠️ Brief not found or error:', error);
        return null;
      }

      return {
        id: brief.id,
        status: brief.generation_status as any,
        startedAt: brief.generation_started_at,
        completedAt: brief.generation_completed_at,
        error: brief.generation_error,
        content: brief.brief_content,
        n8nExecutionId: brief.n8n_execution_id
      };

    } catch (error) {
      console.error('❌ Error checking generation status:', error);
      return null;
    }
  }

  /**
   * Retry failed brief generation
   */
  static async retryFailedGeneration(briefId: string): Promise<{ success: boolean; error?: string }> {
    try {
      console.log('🔄 Retrying brief generation for:', briefId);

      // Get the original brief data
      const { data: brief, error } = await supabase
        .from('content_briefs')
        .select(`
          id,
          idea_id,
          suggestion_id,
          organization_id,
          created_by,
          content_ideas!inner(
            id,
            title,
            description,
            keywords,
            target_audience,
            content_type,
            ai_suggestions
          )
        `)
        .eq('id', briefId)
        .single();

      if (error || !brief) {
        throw new Error(`Brief not found: ${error?.message || 'Unknown error'}`);
      }

      // Find the matching suggestion from ai_suggestions
      const idea = brief.content_ideas;
      const aiSuggestions = idea.ai_suggestions as any;
      
      if (!aiSuggestions?.suggestions) {
        throw new Error('No AI suggestions found for this brief');
      }

      // For retry, we'll use the first suggestion as placeholder
      // In a full implementation, we'd store the original suggestion data
      const suggestion = aiSuggestions.suggestions[0];

      // Reset the brief status
      await supabase
        .from('content_briefs')
        .update({
          generation_status: 'pending',
          generation_started_at: new Date().toISOString(),
          generation_completed_at: null,
          generation_error: null,
          brief_content: null
        })
        .eq('id', briefId);

      // Trigger generation again
      const context: BriefGenerationContext = {
        idea: {
          id: idea.id,
          title: idea.title,
          description: idea.description,
          keywords: idea.keywords,
          target_audience: idea.target_audience,
          content_type: idea.content_type
        },
        suggestion,
        organizationId: brief.organization_id,
        userId: brief.created_by
      };

      // Since we already have the brief record, we'll call the webhook directly
      return await this.triggerWebhookForExistingBrief(briefId, context);

    } catch (error) {
      console.error('❌ Retry failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Retry failed'
      };
    }
  }

  /**
   * Trigger webhook for an existing brief (used in retry)
   */
  private static async triggerWebhookForExistingBrief(
    briefId: string,
    context: BriefGenerationContext
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // Update status to processing
      await supabase
        .from('content_briefs')
        .update({ generation_status: 'processing' })
        .eq('id', briefId);

      // Prepare webhook payload
      const payload = {
        action: 'generate_brief',
        brief_id: briefId,
        organization_id: context.organizationId,
        user_id: context.userId,
        idea: context.idea,
        suggestion: context.suggestion,
        callback_url: `${window.location.origin}/api/webhook/brief-generation`,
        timestamp: new Date().toISOString(),
        retry: true
      };

      // Make the webhook call
      const response = await fetch(this.WEBHOOK_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'OrganizePrime/1.0',
        },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(this.TIMEOUT_MS)
      });

      if (!response.ok) {
        throw new Error(`Webhook call failed: ${response.status} ${response.statusText}`);
      }

      const responseData = await response.json();
      
      // If N8N returns immediate results, store them
      if (responseData.brief_content) {
        await this.handleWebhookResponse(briefId, responseData.brief_content, responseData.execution_id);
      }

      return { success: true };

    } catch (error) {
      console.error('❌ Webhook trigger failed:', error);
      
      // Mark as failed
      await supabase
        .from('content_briefs')
        .update({
          generation_status: 'failed',
          generation_error: error instanceof Error ? error.message : 'Webhook call failed',
          generation_completed_at: new Date().toISOString()
        })
        .eq('id', briefId);

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Webhook call failed'
      };
    }
  }

  /**
   * Get all briefs for a specific AI suggestion (to handle multiple generations)
   */
  static async getBriefsForSuggestion(
    organizationId: string,
    ideaId: string,
    suggestionTitle: string
  ): Promise<BriefGenerationStatus[]> {
    try {
      const { data: briefs, error } = await supabase
        .from('content_briefs')
        .select(`
          id,
          title,
          generation_status,
          generation_started_at,
          generation_completed_at,
          generation_error,
          brief_content,
          n8n_execution_id
        `)
        .eq('organization_id', organizationId)
        .eq('idea_id', ideaId)
        .eq('title', suggestionTitle) // Match by title since suggestions don't have stable IDs
        .order('created_at', { ascending: false });

      if (error) {
        console.error('❌ Error fetching briefs for suggestion:', error);
        return [];
      }

      return briefs.map(brief => ({
        id: brief.id,
        status: brief.generation_status as any,
        startedAt: brief.generation_started_at,
        completedAt: brief.generation_completed_at,
        error: brief.generation_error,
        content: brief.brief_content,
        n8nExecutionId: brief.n8n_execution_id
      }));

    } catch (error) {
      console.error('❌ Error fetching briefs for suggestion:', error);
      return [];
    }
  }

  /**
   * Clean up old failed/pending generations (maintenance function)
   */
  static async cleanupOldGenerations(olderThanHours: number = 24): Promise<void> {
    try {
      const cutoffTime = new Date(Date.now() - (olderThanHours * 60 * 60 * 1000));
      
      const { error } = await supabase
        .from('content_briefs')
        .update({
          generation_status: 'failed',
          generation_error: 'Timed out - generation took too long',
          generation_completed_at: new Date().toISOString()
        })
        .in('generation_status', ['pending', 'processing'])
        .lt('generation_started_at', cutoffTime.toISOString());

      if (error) {
        console.error('❌ Error cleaning up old generations:', error);
      } else {
        console.log('✅ Cleaned up old brief generations');
      }

    } catch (error) {
      console.error('❌ Error in cleanup process:', error);
    }
  }
}