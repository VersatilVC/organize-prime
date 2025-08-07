import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface AppCategory {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  icon_name: string;
  color_hex: string;
  sort_order: number;
  is_active: boolean;
}

export const useAppCategories = () => {
  return useQuery({
    queryKey: ['app-categories'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('app_categories')
        .select('*')
        .eq('is_active', true)
        .order('sort_order');

      if (error) throw error;
      return data as AppCategory[];
    },
    staleTime: 10 * 60 * 1000, // 10 minutes - categories don't change often
    gcTime: 60 * 60 * 1000, // 1 hour
  });
};