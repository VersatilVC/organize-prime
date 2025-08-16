import { supabase } from '@/integrations/supabase/client';

export interface KnowledgeBase {
  id: string;
  organization_id: string;
  name: string;
  display_name: string;
  description?: string;
  embedding_model: string;
  chunk_size: number;
  chunk_overlap: number;
  is_default: boolean;
  is_premium: boolean;
  status: string;
  file_count: number;
  total_vectors: number;
  vector_table_name?: string;
  vector_function_name?: string;
  vector_table_id?: string;
  created_at: string;
  updated_at: string;
  created_by?: string;
  updated_by?: string;
}

export interface CreateKnowledgeBaseData {
  name: string;
  display_name: string;
  description?: string;
  type?: 'Company' | 'Industry' | 'Competitor' | 'Product' | 'General';
  embedding_model?: string;
  chunk_size?: number;
  chunk_overlap?: number;
  is_premium?: boolean;
}

export interface UpdateKnowledgeBaseData {
  display_name?: string;
  description?: string;
  embedding_model?: string;
  chunk_size?: number;
  chunk_overlap?: number;
  is_premium?: boolean;
}

export const knowledgeBaseApi = {
  // Get all knowledge bases for an organization
  async getKnowledgeBases(orgId: string): Promise<KnowledgeBase[]> {
    const { data, error } = await supabase
      .from('kb_configurations')
      .select('*')
      .eq('organization_id', orgId)
      .eq('status', 'active')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  // Create a new knowledge base
  async createKnowledgeBase(orgId: string, kbData: CreateKnowledgeBaseData): Promise<KnowledgeBase> {
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData.user?.id;

    // Get organization slug for table naming
    const { data: orgData, error: orgError } = await supabase
      .from('organizations')
      .select('slug')
      .eq('id', orgId)
      .single();

    if (orgError) throw orgError;
    const orgSlug = orgData.slug;

    // Generate a unique name if not provided
    const name = kbData.name || `kb_${Date.now()}`;
    
    const insertData = {
      organization_id: orgId,
      name: name,
      display_name: kbData.display_name,
      description: kbData.description || null,
      embedding_model: kbData.embedding_model || 'text-embedding-ada-002',
      chunk_size: kbData.chunk_size || 1000,
      chunk_overlap: kbData.chunk_overlap || 200,
      is_premium: kbData.is_premium || false,
      created_by: userId,
      updated_by: userId,
    };

    const { data, error } = await supabase
      .from('kb_configurations')
      .insert(insertData)
      .select()
      .single();

    if (error) throw error;

    // Create the vector table for this knowledge base
    try {
      const { data: vectorTableResult, error: vectorError } = await supabase
        .rpc('create_kb_vector_table', {
          p_kb_id: data.id,
          p_organization_slug: orgSlug,
          p_kb_name: name,
          p_embedding_dimensions: 1536 // OpenAI embedding dimensions
        });

      if (vectorError) {
        // If vector table creation fails, clean up the KB record
        await supabase
          .from('kb_configurations')
          .delete()
          .eq('id', data.id);
        throw new Error(`Failed to create vector table: ${vectorError.message}`);
      }

      // Fetch the updated KB record with vector table metadata
      const { data: updatedKB, error: fetchError } = await supabase
        .from('kb_configurations')
        .select('*')
        .eq('id', data.id)
        .single();

      if (fetchError) throw fetchError;
      return updatedKB;

    } catch (vectorTableError) {
      // Clean up on vector table creation failure
      await supabase
        .from('kb_configurations')
        .delete()
        .eq('id', data.id);
      throw vectorTableError;
    }
  },

  // Update an existing knowledge base
  async updateKnowledgeBase(id: string, kbData: UpdateKnowledgeBaseData): Promise<KnowledgeBase> {
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData.user?.id;

    const updateData = {
      ...kbData,
      updated_by: userId,
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from('kb_configurations')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Delete a knowledge base with vector table cleanup
  async deleteKnowledgeBase(id: string): Promise<void> {
    const { data, error } = await supabase
      .rpc('delete_knowledge_base_with_cleanup', {
        kb_id: id
      });

    if (error) throw error;
    
    if (data && !data.success) {
      throw new Error(data.error || 'Failed to delete knowledge base');
    }
  },

  // Get knowledge base by ID
  async getKnowledgeBase(id: string): Promise<KnowledgeBase | null> {
    const { data, error } = await supabase
      .from('kb_configurations')
      .select('*')
      .eq('id', id)
      .eq('status', 'active')
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null; // Not found
      throw error;
    }
    return data;
  },
};