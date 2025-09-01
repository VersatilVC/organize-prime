import { kbApiClient } from './kbApiClient';
import { supabase } from '@/integrations/supabase/client';

/**
 * Knowledge Base Configuration Data Interface
 */
interface KBConfigData {
  config_id?: string;
  name: string;
  display_name: string;
  description?: string;
  table_suffix?: string;
  embedding_model: string;
  chunk_size: number;
  chunk_overlap: number;
  is_premium?: boolean;
  is_default?: boolean;
  status?: string;
}

/**
 * Knowledge Base Configuration Response
 */
interface KBConfigResponse {
  success: boolean;
  data?: KBConfigData;
  error?: string;
}

/**
 * RPC Parameters for KB Configuration Management
 */
interface KBConfigRPCParams {
  org_id: string;
  config_data: Partial<KBConfigData>;
  user_id_param: string | null;
  action: 'create' | 'update' | 'delete';
}

/**
 * Knowledge Base Service
 * Provides typed methods for managing KB configurations
 */
export const kbService = {
  listConfigurations: kbApiClient.listConfigurations,
  
  /**
   * Create a new KB configuration
   */
  async createConfiguration(orgId: string, configData: KBConfigData): Promise<KBConfigResponse> {
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData.user?.id ?? null;
    
    const { data, error } = await supabase.rpc('manage_kb_configuration', {
      org_id: orgId,
      config_data: configData,
      user_id_param: userId,
      action: 'create',
    } as KBConfigRPCParams);
    
    if (error) throw error;
    return data as KBConfigResponse;
  },
  
  /**
   * Update an existing KB configuration
   */
  async updateConfiguration(orgId: string, configData: Partial<KBConfigData>): Promise<KBConfigResponse> {
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData.user?.id ?? null;
    
    const { data, error } = await supabase.rpc('manage_kb_configuration', {
      org_id: orgId,
      config_data: configData,
      user_id_param: userId,
      action: 'update',
    } as KBConfigRPCParams);
    
    if (error) throw error;
    return data as KBConfigResponse;
  },
  
  /**
   * Delete a KB configuration
   */
  async deleteConfiguration(orgId: string, configId: string): Promise<KBConfigResponse> {
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData.user?.id ?? null;
    
    const { data, error } = await supabase.rpc('manage_kb_configuration', {
      org_id: orgId,
      config_data: { config_id: configId },
      user_id_param: userId,
      action: 'delete',
    } as KBConfigRPCParams);
    
    if (error) throw error;
    return data as KBConfigResponse;
  },
  
  /**
   * Duplicate an existing KB configuration
   */
  async duplicateConfiguration(
    orgId: string, 
    source: KBConfigData, 
    overrides: Partial<KBConfigData> = {}
  ): Promise<KBConfigResponse> {
    // Create duplicate configuration with new name and table suffix
    const payload: KBConfigData = {
      name: `${source.name}-copy`,
      display_name: `${source.display_name} (Copy)`,
      description: source.description ?? '',
      table_suffix: `${source.table_suffix || 'kb'}_copy_${Math.random().toString(36).slice(2, 6)}`,
      embedding_model: source.embedding_model,
      chunk_size: source.chunk_size,
      chunk_overlap: source.chunk_overlap,
      is_premium: source.is_premium ?? true,
      ...overrides,
    };
    
    return this.createConfiguration(orgId, payload);
  },
};
