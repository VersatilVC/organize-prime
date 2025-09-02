// Content Creation Service - Phase 2: Data Layer
// CRUD operations for content ideas, briefs, and items

import { supabase } from '@/integrations/supabase/client';
import type {
  ContentIdea,
  ContentBrief,
  ContentItem,
  ContentIdeaWithDetails,
  ContentBriefWithDetails,
  ContentItemWithDetails,
  CreateContentIdeaInput,
  UpdateContentIdeaInput,
  CreateContentBriefInput,
  UpdateContentBriefInput,
  CreateContentItemInput,
  UpdateContentItemInput,
  ContentIdeaFilters,
  ContentBriefFilters,
  ContentItemFilters,
  PaginationParams,
  PaginatedResponse
} from '@/types/content-creation';

export class ContentCreationService {
  
  // ========== CONTENT IDEAS ==========
  
  /**
   * Get content ideas with filtering and pagination
   */
  static async getContentIdeas(
    filters: ContentIdeaFilters = {},
    pagination: PaginationParams = { page: 1, limit: 10 }
  ): Promise<PaginatedResponse<ContentIdeaWithDetails>> {
    try {
      // Get current user and organization
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) throw new Error('User not authenticated');

      // Base query with organization isolation
      let query = supabase
        .from('content_ideas')
        .select(`
          *,
          briefs_count:content_briefs(count)
        `, { count: 'exact' });

      // Apply filters
      if (filters.search) {
        query = query.or(`title.ilike.%${filters.search}%,description.ilike.%${filters.search}%`);
      }
      if (filters.content_type) {
        query = query.eq('content_type', filters.content_type);
      }
      if (filters.status && filters.status !== 'all') {
        query = query.eq('status', filters.status);
      }
      if (filters.target_audience) {
        query = query.ilike('target_audience', `%${filters.target_audience}%`);
      }
      if (filters.created_by) {
        query = query.eq('created_by', filters.created_by);
      }
      if (filters.date_range) {
        query = query
          .gte('created_at', filters.date_range.start.toISOString())
          .lte('created_at', filters.date_range.end.toISOString());
      }

      // Apply pagination and sorting
      const offset = (pagination.page - 1) * pagination.limit;
      query = query
        .order(pagination.sortBy || 'created_at', { 
          ascending: pagination.sortOrder === 'asc' 
        })
        .range(offset, offset + pagination.limit - 1);

      const { data, error, count } = await query;
      if (error) throw new Error(`Failed to fetch content ideas: ${error.message}`);

      // Transform data to include computed fields
      const transformedData: ContentIdeaWithDetails[] = (data || []).map(idea => ({
        ...idea,
        created_by_name: 'User', // We'll fetch this separately later if needed
        briefs_count: idea.briefs_count?.[0]?.count || 0,
        can_create_brief: true // All ideas can create briefs
      }));

      return {
        data: transformedData,
        pagination: {
          page: pagination.page,
          limit: pagination.limit,
          total: count || 0,
          totalPages: Math.ceil((count || 0) / pagination.limit),
          hasNextPage: offset + pagination.limit < (count || 0),
          hasPreviousPage: pagination.page > 1
        }
      };
    } catch (error) {
      console.error('ContentCreationService.getContentIdeas error:', error);
      throw error;
    }
  }

  /**
   * Get a single content idea by ID
   */
  static async getContentIdea(ideaId: string): Promise<ContentIdeaWithDetails | null> {
    const { data, error } = await supabase
      .from('content_ideas')
      .select(`
        *,
        -- profiles will be fetched separately if needed
        briefs_count:content_briefs(count)
      `)
      .eq('id', ideaId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null; // No rows found
      throw new Error(`Failed to fetch content idea: ${error.message}`);
    }

    return {
      ...data,
      created_by_name: 'User', // Will fetch profile separately if needed
      briefs_count: data.briefs_count?.[0]?.count || 0,
      can_create_brief: true
    };
  }

  /**
   * Create a new content idea
   */
  static async createContentIdea(input: CreateContentIdeaInput): Promise<ContentIdea> {
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) throw new Error('User not authenticated');

    // Get current organization
    const { data: membership, error: membershipError } = await supabase
      .from('memberships')
      .select('organization_id')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .limit(1)
      .single();

    if (membershipError || !membership) {
      throw new Error('No active organization membership found');
    }

    const { data, error } = await supabase
      .from('content_ideas')
      .insert({
        ...input,
        organization_id: membership.organization_id,
        created_by: user.id,
        status: 'draft'
      })
      .select()
      .single();

    if (error) throw new Error(`Failed to create content idea: ${error.message}`);
    return data;
  }

  /**
   * Create initial content idea for auto-generation and prepare for N8N webhook
   */
  static async autoGenerateContentIdeas(
    contentType: string,
    targetAudience: string
  ): Promise<ContentIdea> {
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) throw new Error('User not authenticated');

    // Get current organization
    const { data: membership, error: membershipError } = await supabase
      .from('memberships')
      .select('organization_id')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .limit(1)
      .single();

    if (membershipError || !membership) {
      throw new Error('No active organization membership found');
    }

    // Auto-generate descriptive title
    const contentTypeFormatted = contentType.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
    const targetAudienceFormatted = targetAudience.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
    const timestamp = new Date().toLocaleString('en-US', { 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
    
    const autoTitle = `Auto-generated ${contentTypeFormatted} for ${targetAudienceFormatted} - ${timestamp}`;
    
    const { data, error } = await supabase
      .from('content_ideas')
      .insert({
        title: autoTitle,
        description: `AI-generated content ideas for ${contentTypeFormatted} targeting ${targetAudienceFormatted}. This idea was created through automated generation and will be populated with suggestions shortly.`,
        content_type: contentType,
        target_audience: targetAudience,
        keywords: [],
        status: 'draft',
        extraction_status: 'pending',
        processing_status: 'generating ideas',
        organization_id: membership.organization_id,
        created_by: user.id
      })
      .select()
      .single();

    if (error) throw new Error(`Failed to create auto-generated content idea: ${error.message}`);
    return data;
  }

  /**
   * Update a content idea
   */
  static async updateContentIdea(ideaId: string, input: UpdateContentIdeaInput): Promise<ContentIdea> {
    const { data, error } = await supabase
      .from('content_ideas')
      .update(input)
      .eq('id', ideaId)
      .select()
      .single();

    if (error) throw new Error(`Failed to update content idea: ${error.message}`);
    return data;
  }

  /**
   * Update content idea with AI suggestions from N8N workflow
   */
  static async updateContentIdeaWithAISuggestions(
    ideaId: string, 
    payload: {
      ai_suggestions?: any;
      research_summary?: string;
      processing_status?: string;
    }
  ): Promise<ContentIdea> {
    const updateData: any = {
      last_processed_at: new Date().toISOString()
    };

    if (payload.ai_suggestions) {
      updateData.ai_suggestions = payload.ai_suggestions;
    }
    
    if (payload.research_summary) {
      updateData.research_summary = payload.research_summary;
    }
    
    if (payload.processing_status) {
      updateData.processing_status = payload.processing_status;
    }

    const { data, error } = await supabase
      .from('content_ideas')
      .update(updateData)
      .eq('id', ideaId)
      .select()
      .single();

    if (error) throw new Error(`Failed to update content idea with AI suggestions: ${error.message}`);
    return data;
  }

  /**
   * Delete a content idea
   */
  static async deleteContentIdea(ideaId: string): Promise<void> {
    const { error } = await supabase
      .from('content_ideas')
      .delete()
      .eq('id', ideaId);

    if (error) throw new Error(`Failed to delete content idea: ${error.message}`);
  }

  // ========== CONTENT BRIEFS ==========

  /**
   * Get content briefs with filtering and pagination
   */
  static async getContentBriefs(
    filters: ContentBriefFilters = {},
    pagination: PaginationParams = { page: 1, limit: 10 }
  ): Promise<PaginatedResponse<ContentBriefWithDetails>> {
    try {
      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) throw new Error('User not authenticated');

      let query = supabase
        .from('content_briefs')
        .select(`
          *,
          content_ideas:idea_id(title),
          content_items_count:content_items(count)
        `, { count: 'exact' });

      // Apply filters
      if (filters.search) {
        query = query.or(`title.ilike.%${filters.search}%,requirements.ilike.%${filters.search}%`);
      }
      if (filters.content_type) {
        query = query.eq('content_type', filters.content_type);
      }
      if (filters.status && filters.status !== 'all') {
        query = query.eq('status', filters.status);
      }
      if (filters.idea_id) {
        query = query.eq('idea_id', filters.idea_id);
      }
      if (filters.created_by) {
        query = query.eq('created_by', filters.created_by);
      }
      if (filters.date_range) {
        query = query
          .gte('created_at', filters.date_range.start.toISOString())
          .lte('created_at', filters.date_range.end.toISOString());
      }

      // Apply pagination and sorting
      const offset = (pagination.page - 1) * pagination.limit;
      query = query
        .order(pagination.sortBy || 'created_at', { 
          ascending: pagination.sortOrder === 'asc' 
        })
        .range(offset, offset + pagination.limit - 1);

      const { data, error, count } = await query;
      if (error) throw new Error(`Failed to fetch content briefs: ${error.message}`);

      // Transform data
      const transformedData: ContentBriefWithDetails[] = (data || []).map(brief => ({
        ...brief,
        idea_title: brief.content_ideas?.title,
        created_by_name: 'User', // Will fetch profile separately if needed
        content_items_count: brief.content_items_count?.[0]?.count || 0,
        can_generate_content: brief.status === 'approved' && brief.generation_status !== 'processing'
      }));

      return {
        data: transformedData,
        pagination: {
          page: pagination.page,
          limit: pagination.limit,
          total: count || 0,
          totalPages: Math.ceil((count || 0) / pagination.limit),
          hasNextPage: offset + pagination.limit < (count || 0),
          hasPreviousPage: pagination.page > 1
        }
      };
    } catch (error) {
      console.error('ContentCreationService.getContentBriefs error:', error);
      throw error;
    }
  }

  /**
   * Create a new content brief
   */
  static async createContentBrief(input: CreateContentBriefInput): Promise<ContentBrief> {
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) throw new Error('User not authenticated');

    const { data: membership, error: membershipError } = await supabase
      .from('memberships')
      .select('organization_id')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .limit(1)
      .single();

    if (membershipError || !membership) {
      throw new Error('No active organization membership found');
    }

    const { data, error } = await supabase
      .from('content_briefs')
      .insert({
        ...input,
        organization_id: membership.organization_id,
        created_by: user.id,
        status: 'draft'
      })
      .select()
      .single();

    if (error) throw new Error(`Failed to create content brief: ${error.message}`);
    return data;
  }

  /**
   * Update a content brief
   */
  static async updateContentBrief(briefId: string, input: UpdateContentBriefInput): Promise<ContentBrief> {
    const { data, error } = await supabase
      .from('content_briefs')
      .update(input)
      .eq('id', briefId)
      .select()
      .single();

    if (error) throw new Error(`Failed to update content brief: ${error.message}`);
    return data;
  }

  /**
   * Delete a content brief
   */
  static async deleteContentBrief(briefId: string): Promise<void> {
    const { error } = await supabase
      .from('content_briefs')
      .delete()
      .eq('id', briefId);

    if (error) throw new Error(`Failed to delete content brief: ${error.message}`);
  }

  // ========== CONTENT ITEMS ==========

  /**
   * Get content items with filtering and pagination
   */
  static async getContentItems(
    filters: ContentItemFilters = {},
    pagination: PaginationParams = { page: 1, limit: 10 }
  ): Promise<PaginatedResponse<ContentItemWithDetails>> {
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) throw new Error('User not authenticated');

      let query = supabase
        .from('content_items')
        .select(`
          *,
          content_briefs:brief_id(title),
          parent_content_item:parent_item_id(title)
        `, { count: 'exact' });

      // Apply filters
      if (filters.search) {
        query = query.or(`title.ilike.%${filters.search}%,content.ilike.%${filters.search}%`);
      }
      if (filters.content_type) {
        query = query.eq('content_type', filters.content_type);
      }
      if (filters.status && filters.status !== 'all') {
        query = query.eq('status', filters.status);
      }
      if (filters.brief_id) {
        query = query.eq('brief_id', filters.brief_id);
      }
      if (filters.is_major_item !== undefined) {
        query = query.eq('is_major_item', filters.is_major_item);
      }
      if (filters.created_by) {
        query = query.eq('created_by', filters.created_by);
      }
      if (filters.date_range) {
        query = query
          .gte('created_at', filters.date_range.start.toISOString())
          .lte('created_at', filters.date_range.end.toISOString());
      }

      // Apply pagination and sorting
      const offset = (pagination.page - 1) * pagination.limit;
      query = query
        .order(pagination.sortBy || 'created_at', { 
          ascending: pagination.sortOrder === 'asc' 
        })
        .range(offset, offset + pagination.limit - 1);

      const { data, error, count } = await query;
      if (error) throw new Error(`Failed to fetch content items: ${error.message}`);

      // Transform data
      const transformedData: ContentItemWithDetails[] = (data || []).map(item => ({
        ...item,
        brief_title: item.content_briefs?.title,
        created_by_name: 'User', // Will fetch profile separately if needed
        can_create_derivatives: item.is_major_item && item.status === 'approved',
        parent_item_title: item.parent_content_item?.title
      }));

      return {
        data: transformedData,
        pagination: {
          page: pagination.page,
          limit: pagination.limit,
          total: count || 0,
          totalPages: Math.ceil((count || 0) / pagination.limit),
          hasNextPage: offset + pagination.limit < (count || 0),
          hasPreviousPage: pagination.page > 1
        }
      };
    } catch (error) {
      console.error('ContentCreationService.getContentItems error:', error);
      throw error;
    }
  }

  /**
   * Create a new content item
   */
  static async createContentItem(input: CreateContentItemInput): Promise<ContentItem> {
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) throw new Error('User not authenticated');

    const { data: membership, error: membershipError } = await supabase
      .from('memberships')
      .select('organization_id')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .limit(1)
      .single();

    if (membershipError || !membership) {
      throw new Error('No active organization membership found');
    }

    const { data, error } = await supabase
      .from('content_items')
      .insert({
        ...input,
        organization_id: membership.organization_id,
        created_by: user.id,
        status: 'draft',
        is_major_item: input.is_major_item || false,
        derivatives_count: 0
      })
      .select()
      .single();

    if (error) throw new Error(`Failed to create content item: ${error.message}`);
    return data;
  }

  /**
   * Update a content item
   */
  static async updateContentItem(itemId: string, input: UpdateContentItemInput): Promise<ContentItem> {
    const { data, error } = await supabase
      .from('content_items')
      .update(input)
      .eq('id', itemId)
      .select()
      .single();

    if (error) throw new Error(`Failed to update content item: ${error.message}`);
    return data;
  }

  /**
   * Delete a content item
   */
  static async deleteContentItem(itemId: string): Promise<void> {
    const { error } = await supabase
      .from('content_items')
      .delete()
      .eq('id', itemId);

    if (error) throw new Error(`Failed to delete content item: ${error.message}`);
  }

  // ========== WORKFLOW ACTIONS ==========

  /**
   * Create a brief from an idea (workflow action)
   */
  static async createBriefFromIdea(ideaId: string, briefData: Omit<CreateContentBriefInput, 'idea_id'>): Promise<ContentBrief> {
    return this.createContentBrief({
      ...briefData,
      idea_id: ideaId
    });
  }

  /**
   * Generate content from brief using N8N workflow
   */
  static async generateContentFromBrief(briefId: string, options: {
    format?: string;
    tone?: string;
    length?: 'short' | 'medium' | 'long';
  } = {}): Promise<{success: boolean; executionId?: string; error?: string}> {
    const { ContentGenerationService } = await import('./ContentGenerationService');
    return ContentGenerationService.triggerContentGeneration(briefId);
  }

  /**
   * Get generation status for a brief
   */
  static async getBriefGenerationStatus(briefId: string) {
    const { ContentGenerationService } = await import('./ContentGenerationService');
    return ContentGenerationService.getGenerationStatus(briefId);
  }

  /**
   * Get content items generated from a specific brief
   */
  static async getGeneratedContentItems(briefId: string): Promise<ContentItem[]> {
    const { ContentGenerationService } = await import('./ContentGenerationService');
    return ContentGenerationService.getGeneratedContentItems(briefId);
  }

  /**
   * Retry failed content generation
   */
  static async retryContentGeneration(briefId: string) {
    const { ContentGenerationService } = await import('./ContentGenerationService');
    return ContentGenerationService.retryGeneration(briefId);
  }

  /**
   * Cancel ongoing content generation
   */
  static async cancelContentGeneration(briefId: string): Promise<void> {
    const { ContentGenerationService } = await import('./ContentGenerationService');
    return ContentGenerationService.cancelGeneration(briefId);
  }

  /**
   * Create derivatives from major content item (placeholder)
   */
  static async createDerivatives(itemId: string, derivativeTypes: string[]): Promise<ContentItem[]> {
    // Placeholder implementation
    const item = await supabase
      .from('content_items')
      .select('title, content_type, content')
      .eq('id', itemId)
      .single();

    if (!item.data) throw new Error('Content item not found');

    const derivatives: ContentItem[] = [];
    
    for (const derivativeType of derivativeTypes) {
      const derivative = await this.createContentItem({
        title: `${item.data.title} - ${derivativeType}`,
        content: `Derivative content (${derivativeType}) based on: ${item.data.title}`,
        content_type: derivativeType,
        is_major_item: false
      });
      derivatives.push(derivative);
    }

    return derivatives;
  }

  // ========== UTILITY METHODS ==========

  /**
   * Get content type options from content_types table
   */
  static async getContentTypeOptions(): Promise<Array<{value: string, label: string}>> {
    try {
      const { data, error } = await supabase
        .from('content_types')
        .select('name, slug, description')
        .eq('is_active', true)
        .order('name');

      if (error) {
        console.error('Error fetching content types:', error);
        return [];
      }

      return (data || []).map(type => ({ 
        value: type.slug, 
        label: type.name,
        description: type.description 
      }));
    } catch (error) {
      console.error('Error fetching content types:', error);
      return [];
    }
  }

  /**
   * Get target audience options from target_audiences table
   */
  static async getTargetAudienceOptions(): Promise<Array<{value: string, label: string}>> {
    try {
      const { data, error } = await supabase
        .from('target_audiences')
        .select('name, slug, description')
        .eq('is_active', true)
        .order('name');

      if (error) {
        console.error('Error fetching target audiences:', error);
        return [];
      }

      return (data || []).map(audience => ({ 
        value: audience.slug, 
        label: audience.name,
        description: audience.description 
      }));
    } catch (error) {
      console.error('Error fetching target audiences:', error);
      return [];
    }
  }
}