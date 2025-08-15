import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useOrganization } from '@/contexts/OrganizationContext';
import { useAuth } from '@/auth/AuthProvider';
import type { ContentProject, CreateProjectForm, UpdateProjectForm } from '../types/contentCreationTypes';

export const useContentProjects = () => {
  const { currentOrganization } = useOrganization();

  return useQuery({
    queryKey: ['content_projects', currentOrganization?.id],
    queryFn: async () => {
      if (!currentOrganization?.id) {
        throw new Error('No organization selected');
      }

      // Mock data since content_projects table doesn't exist yet
      const mockProjects: ContentProject[] = [
        {
          id: '1',
          organization_id: currentOrganization.id,
          title: 'Marketing Campaign Q1',
          description: 'Social media content for Q1 marketing push',
          content_type: 'social',
          target_audience: 'Young professionals',
          tone: 'friendly',
          keywords: ['marketing', 'social media', 'engagement'],
          status: 'in_progress',
          due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          created_by: '1',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      ];

      return mockProjects;
    },
    enabled: !!currentOrganization?.id,
  });
};

export const useContentProject = (projectId: string) => {
  const { currentOrganization } = useOrganization();

  return useQuery({
    queryKey: ['content_project', projectId],
    queryFn: async () => {
      if (!projectId) {
        throw new Error('Project ID is required');
      }

      // Mock implementation
      return null as ContentProject | null;
    },
    enabled: !!projectId && !!currentOrganization?.id,
  });
};

export const useCreateContentProject = () => {
  const queryClient = useQueryClient();
  const { currentOrganization } = useOrganization();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (projectData: CreateProjectForm) => {
      if (!currentOrganization?.id || !user?.id) {
        throw new Error('User must be logged in with an organization');
      }

      // Mock implementation - would create actual project
      const mockProject: ContentProject = {
        id: crypto.randomUUID(),
        organization_id: currentOrganization.id,
        title: projectData.title,
        description: projectData.description || null,
        content_type: projectData.content_type,
        target_audience: projectData.target_audience || null,
        tone: projectData.tone || 'professional',
        keywords: projectData.keywords || null,
        status: 'draft',
        due_date: projectData.due_date?.toISOString() || null,
        created_by: user.id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      return mockProject;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['content_projects'] });
      toast.success('Project created successfully');
    },
    onError: (error) => {
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
      toast.error(`Failed to create project: ${errorMessage}`);
    }
  });
};

export const useUpdateContentProject = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<ContentProject> }) => {
      // Mock implementation
      const mockProject: ContentProject = {
        id,
        organization_id: '',
        title: 'Updated Project',
        content_type: 'blog',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        ...updates
      };

      return mockProject;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['content_projects'] });
      queryClient.invalidateQueries({ queryKey: ['content_project', data.id] });
      toast.success('Project updated successfully');
    },
    onError: (error) => {
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
      toast.error(`Failed to update project: ${errorMessage}`);
    }
  });
};

export const useDeleteContentProject = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (projectId: string) => {
      // Mock implementation
      return projectId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['content_projects'] });
      toast.success('Project deleted successfully');
    },
    onError: (error) => {
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
      toast.error(`Failed to delete project: ${errorMessage}`);
    }
  });
};

// Project statistics
export const useProjectStats = () => {
  const { currentOrganization } = useOrganization();

  return useQuery({
    queryKey: ['content_project_stats', currentOrganization?.id],
    queryFn: async () => {
      if (!currentOrganization?.id) {
        throw new Error('No organization selected');
      }

      // Mock stats
      const stats = {
        total: 1,
        draft: 0,
        in_progress: 1,
        review: 0,
        completed: 0
      };

      return stats;
    },
    enabled: !!currentOrganization?.id,
  });
};