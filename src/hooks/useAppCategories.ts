import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface AppCategory {
  id: string;
  name: string;
  slug: string;
  description?: string;
  color_hex: string;
  icon_name: string;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  created_by?: string;
}

export interface CreateAppCategoryData {
  name: string;
  slug: string;
  description?: string;
  color_hex: string;
  icon_name: string;
  sort_order?: number;
  is_active?: boolean;
}

export interface UpdateAppCategoryData extends Partial<CreateAppCategoryData> {
  id: string;
}

export function useAppCategories() {
  return useQuery({
    queryKey: ['app-categories'],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('app_categories')
        .select('*')
        .order('sort_order', { ascending: true })
        .order('name', { ascending: true });

      if (error) throw error;
      return data as AppCategory[];
    },
  });
}

export function useCreateAppCategory() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: CreateAppCategoryData) => {
      const { data: result, error } = await (supabase as any)
        .from('app_categories')
        .insert([{
          ...data,
          sort_order: data.sort_order ?? 0,
          is_active: data.is_active ?? true,
        }])
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['app-categories'] });
      toast({
        title: "Category Created",
        description: "The category has been successfully created.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to create category. Please try again.",
        variant: "destructive",
      });
      console.error('Error creating category:', error);
    },
  });
}

export function useUpdateAppCategory() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, ...data }: UpdateAppCategoryData) => {
      const { data: result, error } = await (supabase as any)
        .from('app_categories')
        .update(data)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['app-categories'] });
      toast({
        title: "Category Updated",
        description: "The category has been successfully updated.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to update category. Please try again.",
        variant: "destructive",
      });
      console.error('Error updating category:', error);
    },
  });
}

export function useDeleteAppCategory() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any)
        .from('app_categories')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['app-categories'] });
      toast({
        title: "Category Deleted",
        description: "The category has been successfully deleted.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to delete category. Please try again.",
        variant: "destructive",
      });
      console.error('Error deleting category:', error);
    },
  });
}

export function useSeedAppCategories() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async () => {
      // Check if categories already exist
      const { data: existingCategories } = await (supabase as any)
        .from('app_categories')
        .select('slug');

      const existingSlugs = existingCategories?.map((cat: any) => cat.slug) || [];

      const defaultCategories = [
        {
          name: 'Productivity',
          slug: 'productivity',
          description: 'Tools to enhance team productivity and efficiency',
          color_hex: '#3b82f6',
          icon_name: 'Zap',
          sort_order: 1,
          is_active: true,
        },
        {
          name: 'Analytics',
          slug: 'analytics', 
          description: 'Data analysis and reporting tools',
          color_hex: '#10b981',
          icon_name: 'BarChart3',
          sort_order: 2,
          is_active: true,
        },
        {
          name: 'Automation',
          slug: 'automation',
          description: 'Workflow and process automation tools',
          color_hex: '#f59e0b',
          icon_name: 'Settings',
          sort_order: 3,
          is_active: true,
        },
        {
          name: 'Intelligence',
          slug: 'intelligence',
          description: 'AI-powered insights and market intelligence',
          color_hex: '#8b5cf6',
          icon_name: 'Brain',
          sort_order: 4,
          is_active: true,
        }
      ];

      // Filter out categories that already exist
      const categoriesToInsert = defaultCategories.filter(
        cat => !existingSlugs.includes(cat.slug)
      );

      if (categoriesToInsert.length === 0) {
        return { message: 'All default categories already exist' };
      }

      const { data, error } = await (supabase as any)
        .from('app_categories')
        .insert(categoriesToInsert)
        .select();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['app-categories'] });
      if (data && Array.isArray(data) && data.length > 0) {
        toast({
          title: "Categories Seeded",
          description: `${data.length} default categories have been added.`,
        });
      }
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to seed categories. Please try again.",
        variant: "destructive",
      });
      console.error('Error seeding categories:', error);
    },
  });
}