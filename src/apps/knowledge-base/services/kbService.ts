import { kbApiClient } from './kbApiClient';
import { supabase } from '@/integrations/supabase/client';

export const kbService = {
  listConfigurations: kbApiClient.listConfigurations,
  async createConfiguration(orgId: string, configData: any) {
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData.user?.id ?? null;
    const { data, error } = await (supabase as any).rpc('manage_kb_configuration', {
      org_id: orgId,
      config_data: configData,
      user_id_param: userId,
      action: 'create',
    });
    if (error) throw error;
    return data as any;
  },
  async updateConfiguration(orgId: string, configData: any) {
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData.user?.id ?? null;
    const { data, error } = await (supabase as any).rpc('manage_kb_configuration', {
      org_id: orgId,
      config_data: configData,
      user_id_param: userId,
      action: 'update',
    });
    if (error) throw error;
    return data as any;
  },
  async deleteConfiguration(orgId: string, configId: string) {
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData.user?.id ?? null;
    const { data, error } = await (supabase as any).rpc('manage_kb_configuration', {
      org_id: orgId,
      config_data: { config_id: configId },
      user_id_param: userId,
      action: 'delete',
    });
    if (error) throw error;
    return data as any;
  },
  async duplicateConfiguration(orgId: string, source: any, overrides: Partial<any> = {}) {
    // Minimal duplicate: create with new name/display_name/table_suffix
    const payload = {
      name: `${source.name}-copy`,
      display_name: `${source.display_name} (Copy)`,
      description: source.description ?? '',
      table_suffix: `${source.table_suffix}_copy_${Math.random().toString(36).slice(2, 6)}`,
      embedding_model: source.embedding_model,
      chunk_size: source.chunk_size,
      chunk_overlap: source.chunk_overlap,
      is_premium: source.is_premium ?? true,
      ...overrides,
    };
    return this.createConfiguration(orgId, payload);
  },
};
