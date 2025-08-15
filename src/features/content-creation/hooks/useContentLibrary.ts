import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useOrganization } from '@/contexts/OrganizationContext';
import { useAuth } from '@/auth/AuthProvider';
import type { ContentItem, CreateContentItemForm, UpdateContentItemForm } from '../types/contentCreationTypes';

export const useContentLibrary = (projectId?: string) => {
  const { currentOrganization } = useOrganization();

  return useQuery({
    queryKey: ['content_items', currentOrganization?.id, projectId],
    queryFn: async () => {
      if (!currentOrganization?.id) {
        throw new Error('No organization selected');
      }

      // Using raw SQL or existing tables since content_items doesn't exist yet
      // This is a placeholder - in real implementation, this would query the actual content_items table
      const mockData: ContentItem[] = [];

      return mockData;
    },
    enabled: !!currentOrganization?.id,
  });
};

export const useContentItem = (itemId: string) => {
  const { currentOrganization } = useOrganization();

  return useQuery({
    queryKey: ['content_item', itemId],
    queryFn: async () => {
      if (!itemId) {
        throw new Error('Content item ID is required');
      }

      // Placeholder implementation
      return null as ContentItem | null;
    },
    enabled: !!itemId && !!currentOrganization?.id,
  });
};

export const useCreateContentItem = () => {
  const queryClient = useQueryClient();
  const { currentOrganization } = useOrganization();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (itemData: CreateContentItemForm) => {
      if (!currentOrganization?.id || !user?.id) {
        throw new Error('User must be logged in with an organization');
      }

      // Placeholder implementation - would create actual content item
      const mockItem: ContentItem = {
        id: crypto.randomUUID(),
        project_id: itemData.project_id,
        organization_id: currentOrganization.id,
        title: itemData.title,
        content: itemData.content,
        content_format: itemData.content_format || 'markdown',
        status: itemData.status || 'draft',
        version: 1,
        created_by: user.id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      return mockItem;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['content_items'] });
      queryClient.invalidateQueries({ queryKey: ['content_items', currentOrganization?.id, data.project_id] });
      toast.success('Content item created successfully');
    },
    onError: (error) => {
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
      toast.error(`Failed to create content item: ${errorMessage}`);
    }
  });
};

export const useUpdateContentItem = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<ContentItem> }) => {
      // Placeholder implementation
      const mockItem: ContentItem = {
        id,
        project_id: '',
        organization_id: '',
        title: 'Updated Item',
        content: 'Updated content',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        ...updates
      };

      return mockItem;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['content_items'] });
      queryClient.invalidateQueries({ queryKey: ['content_item', data.id] });
      toast.success('Content item updated successfully');
    },
    onError: (error) => {
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
      toast.error(`Failed to update content item: ${errorMessage}`);
    }
  });
};

export const useDeleteContentItem = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (itemId: string) => {
      // Placeholder implementation
      return itemId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['content_items'] });
      toast.success('Content item deleted successfully');
    },
    onError: (error) => {
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
      toast.error(`Failed to delete content item: ${errorMessage}`);
    }
  });
};

// Content statistics
export const useContentStats = () => {
  const { currentOrganization } = useOrganization();

  return useQuery({
    queryKey: ['content_stats', currentOrganization?.id],
    queryFn: async () => {
      if (!currentOrganization?.id) {
        throw new Error('No organization selected');
      }

      // Placeholder implementation
      const stats = {
        total: 0,
        draft: 0,
        review: 0,
        approved: 0,
        published: 0,
        by_format: {
          markdown: 0,
          html: 0,
          plain: 0
        }
      };

      return stats;
    },
    enabled: !!currentOrganization?.id,
  });
};