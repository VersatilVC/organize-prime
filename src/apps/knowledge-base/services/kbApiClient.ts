import { supabase } from '@/integrations/supabase/client';

export const kbApiClient = {
  async listConfigurations(orgId: string) {
    const { data, error } = await supabase
      .from('kb_configurations')
      .select('*')
      .eq('organization_id', orgId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data;
  },
};
