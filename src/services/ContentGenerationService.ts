// Content Generation Service - N8N Webhook Integration
// Handles content generation from briefs using N8N workflows

import { supabase } from '@/integrations/supabase/client';
import type {
  ContentBrief,
  ContentItem,
  ContentBriefWithDetails,
  CreateContentItemInput
} from '@/types/content-creation';

// N8N webhook URL for content generation
const N8N_CONTENT_GENERATION_WEBHOOK = 'https://versatil.app.n8n.cloud/webhook/415e29af-3942-427c-9d08-ab2a25d66dbb';

// Generation status types
export type GenerationStatus = 'pending' | 'processing' | 'completed' | 'error';

// N8N webhook payload structure
export interface N8NContentGenerationPayload {
  brief_id: string;
  organization_id: string;
  title: string;
  content_type: string;
  requirements?: string;
  tone?: string;
  target_audience?: string;
  keywords?: string[];
  user_id: string;
  callback_url?: string;
}

// N8N expected response structure
export interface N8NContentGenerationResponse {
  success: boolean;
  content_item?: {
    title: string;
    content: string;
    content_type: string;
    metadata?: Record<string, any>;
  };
  execution_id?: string;
  error?: string;
}

export class ContentGenerationService {
  
  /**
   * Trigger content generation from a brief using N8N webhook
   */
  static async triggerContentGeneration(briefId: string): Promise<{
    success: boolean;
    executionId?: string;
    error?: string;
  }> {
    try {
      // Get current user and organization
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) throw new Error('User not authenticated');

      // Get the brief with organization details
      const { data: brief, error: briefError } = await supabase
        .from('content_briefs')
        .select('*')
        .eq('id', briefId)
        .single();

      if (briefError || !brief) {
        throw new Error('Brief not found or access denied');
      }

      // Validate brief status
      if (brief.status !== 'approved') {
        throw new Error('Brief must be approved before content generation');
      }

      // Update brief status to processing
      const { error: updateError } = await supabase
        .from('content_briefs')
        .update({
          generation_status: 'processing',
          generation_started_at: new Date().toISOString(),
          generation_error: null,
          n8n_execution_id: null
        })
        .eq('id', briefId);

      if (updateError) {
        throw new Error(`Failed to update brief status: ${updateError.message}`);
      }

      // Prepare payload for N8N webhook
      const payload: N8NContentGenerationPayload = {
        brief_id: briefId,
        organization_id: brief.organization_id,
        title: brief.title,
        content_type: brief.content_type,
        requirements: brief.requirements,
        tone: brief.tone,
        target_audience: brief.target_audience,
        keywords: brief.keywords,
        user_id: user.id,
        callback_url: `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/content-generation`
      };

      // Call N8N webhook
      const response = await fetch(N8N_CONTENT_GENERATION_WEBHOOK, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`N8N webhook failed: ${response.status} ${response.statusText}`);
      }

      const result: N8NContentGenerationResponse = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'N8N workflow execution failed');
      }

      // Update brief with execution ID if provided
      if (result.execution_id) {
        await supabase
          .from('content_briefs')
          .update({
            n8n_execution_id: result.execution_id
          })
          .eq('id', briefId);
      }

      return {
        success: true,
        executionId: result.execution_id
      };

    } catch (error) {
      console.error('ContentGenerationService.triggerContentGeneration error:', error);
      
      // Update brief status to error
      await supabase
        .from('content_briefs')
        .update({
          generation_status: 'error',
          generation_completed_at: new Date().toISOString(),
          generation_error: error instanceof Error ? error.message : 'Unknown error'
        })
        .eq('id', briefId);

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Handle N8N webhook callback and create content item
   */
  static async handleN8NCallback(payload: {
    brief_id: string;
    success: boolean;
    content_item?: {
      title: string;
      content: string;
      content_type: string;
      metadata?: Record<string, any>;
    };
    execution_id?: string;
    error?: string;
  }): Promise<ContentItem | null> {
    try {
      const { brief_id, success, content_item, execution_id, error } = payload;

      // Get the brief
      const { data: brief, error: briefError } = await supabase
        .from('content_briefs')
        .select('*')
        .eq('id', brief_id)
        .single();

      if (briefError || !brief) {
        console.error('Brief not found for N8N callback:', brief_id);
        return null;
      }

      if (success && content_item) {
        // Create content item from N8N response
        const { data: newItem, error: itemError } = await supabase
          .from('content_items')
          .insert({
            brief_id,
            organization_id: brief.organization_id,
            title: content_item.title,
            content: content_item.content,
            content_type: content_item.content_type,
            status: 'draft',
            is_major_item: true,
            derivatives_count: 0,
            generation_method: 'n8n_workflow',
            generation_metadata: {
              n8n_execution_id: execution_id,
              generated_at: new Date().toISOString(),
              source_brief_id: brief_id,
              ...content_item.metadata
            },
            created_by: brief.created_by
          })
          .select()
          .single();

        if (itemError) {
          throw new Error(`Failed to create content item: ${itemError.message}`);
        }

        // Update brief status to completed
        await supabase
          .from('content_briefs')
          .update({
            generation_status: 'completed',
            generation_completed_at: new Date().toISOString(),
            generation_error: null,
            status: 'completed'
          })
          .eq('id', brief_id);

        return newItem;

      } else {
        // Handle error case
        await supabase
          .from('content_briefs')
          .update({
            generation_status: 'error',
            generation_completed_at: new Date().toISOString(),
            generation_error: error || 'N8N workflow failed without error details'
          })
          .eq('id', brief_id);

        return null;
      }

    } catch (error) {
      console.error('ContentGenerationService.handleN8NCallback error:', error);
      
      // Update brief status to error
      await supabase
        .from('content_briefs')
        .update({
          generation_status: 'error',
          generation_completed_at: new Date().toISOString(),
          generation_error: error instanceof Error ? error.message : 'Callback processing failed'
        })
        .eq('id', payload.brief_id);

      return null;
    }
  }

  /**
   * Get generation status for a brief
   */
  static async getGenerationStatus(briefId: string): Promise<{
    status: GenerationStatus;
    startedAt?: string;
    completedAt?: string;
    error?: string;
    executionId?: string;
  }> {
    const { data: brief, error } = await supabase
      .from('content_briefs')
      .select('generation_status, generation_started_at, generation_completed_at, generation_error, n8n_execution_id')
      .eq('id', briefId)
      .single();

    if (error || !brief) {
      throw new Error('Brief not found or access denied');
    }

    return {
      status: brief.generation_status as GenerationStatus,
      startedAt: brief.generation_started_at,
      completedAt: brief.generation_completed_at,
      error: brief.generation_error,
      executionId: brief.n8n_execution_id
    };
  }

  /**
   * Poll generation status with timeout
   */
  static async pollGenerationStatus(
    briefId: string,
    options: {
      timeoutMs?: number;
      intervalMs?: number;
      onStatusUpdate?: (status: GenerationStatus) => void;
    } = {}
  ): Promise<GenerationStatus> {
    const { timeoutMs = 300000, intervalMs = 5000, onStatusUpdate } = options; // 5 minutes timeout
    const startTime = Date.now();

    return new Promise((resolve, reject) => {
      const poll = async () => {
        try {
          const statusInfo = await this.getGenerationStatus(briefId);
          const status = statusInfo.status;

          if (onStatusUpdate) {
            onStatusUpdate(status);
          }

          if (status === 'completed' || status === 'error') {
            resolve(status);
            return;
          }

          if (Date.now() - startTime > timeoutMs) {
            // Timeout - mark as error
            await supabase
              .from('content_briefs')
              .update({
                generation_status: 'error',
                generation_completed_at: new Date().toISOString(),
                generation_error: 'Content generation timed out'
              })
              .eq('id', briefId);

            reject(new Error('Content generation timed out'));
            return;
          }

          // Continue polling
          setTimeout(poll, intervalMs);

        } catch (error) {
          reject(error);
        }
      };

      poll();
    });
  }

  /**
   * Retry failed generation
   */
  static async retryGeneration(briefId: string): Promise<{
    success: boolean;
    executionId?: string;
    error?: string;
  }> {
    // Reset brief status to pending
    const { error: resetError } = await supabase
      .from('content_briefs')
      .update({
        generation_status: 'pending',
        generation_started_at: null,
        generation_completed_at: null,
        generation_error: null,
        n8n_execution_id: null
      })
      .eq('id', briefId);

    if (resetError) {
      return {
        success: false,
        error: `Failed to reset brief status: ${resetError.message}`
      };
    }

    // Trigger generation again
    return this.triggerContentGeneration(briefId);
  }

  /**
   * Cancel ongoing generation
   */
  static async cancelGeneration(briefId: string): Promise<void> {
    await supabase
      .from('content_briefs')
      .update({
        generation_status: 'pending',
        generation_started_at: null,
        generation_error: 'Generation cancelled by user',
        n8n_execution_id: null
      })
      .eq('id', briefId);
  }

  /**
   * Get content items generated from a brief
   */
  static async getGeneratedContentItems(briefId: string): Promise<ContentItem[]> {
    const { data: items, error } = await supabase
      .from('content_items')
      .select('*')
      .eq('brief_id', briefId)
      .eq('generation_method', 'n8n_workflow')
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch generated content items: ${error.message}`);
    }

    return items || [];
  }

  /**
   * Get generation statistics for dashboard
   */
  static async getGenerationStats(organizationId?: string): Promise<{
    totalGenerations: number;
    completedGenerations: number;
    failedGenerations: number;
    processingGenerations: number;
    averageGenerationTime?: number;
  }> {
    let query = supabase
      .from('content_briefs')
      .select('generation_status, generation_started_at, generation_completed_at');

    if (organizationId) {
      query = query.eq('organization_id', organizationId);
    }

    const { data: briefs, error } = await query;

    if (error) {
      throw new Error(`Failed to fetch generation stats: ${error.message}`);
    }

    const totalGenerations = briefs?.length || 0;
    const completedGenerations = briefs?.filter(b => b.generation_status === 'completed').length || 0;
    const failedGenerations = briefs?.filter(b => b.generation_status === 'error').length || 0;
    const processingGenerations = briefs?.filter(b => b.generation_status === 'processing').length || 0;

    // Calculate average generation time for completed generations
    const completedBriefs = briefs?.filter(b => 
      b.generation_status === 'completed' && 
      b.generation_started_at && 
      b.generation_completed_at
    ) || [];

    let averageGenerationTime: number | undefined;
    if (completedBriefs.length > 0) {
      const totalTime = completedBriefs.reduce((sum, brief) => {
        const started = new Date(brief.generation_started_at).getTime();
        const completed = new Date(brief.generation_completed_at).getTime();
        return sum + (completed - started);
      }, 0);
      averageGenerationTime = totalTime / completedBriefs.length;
    }

    return {
      totalGenerations,
      completedGenerations,
      failedGenerations,
      processingGenerations,
      averageGenerationTime
    };
  }
}