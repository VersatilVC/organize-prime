import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useEnhancedAuth } from '@/contexts/EnhancedAuthContext';
import { useOrganizationData } from '@/contexts/OrganizationContext';

export interface AppReview {
  id: string;
  app_id: string;
  organization_id: string;
  user_id: string;
  rating: number;
  review_title: string | null;
  review_text: string | null;
  pros: string[] | null;
  cons: string[] | null;
  is_verified: boolean;
  is_featured: boolean;
  helpful_count: number;
  created_at: string;
  updated_at: string;
}

export const useAppReviews = (appId: string) => {
  return useQuery({
    queryKey: ['app-reviews', appId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('marketplace_app_reviews')
        .select('*')
        .eq('app_id', appId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as AppReview[];
    },
    enabled: !!appId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

export const useUserAppReview = (appId: string) => {
  const { user } = useEnhancedAuth();
  const { currentOrganization } = useOrganizationData();

  return useQuery({
    queryKey: ['user-app-review', appId, currentOrganization?.id],
    queryFn: async () => {
      if (!user?.id || !currentOrganization?.id) return null;

      const { data, error } = await supabase
        .from('marketplace_app_reviews')
        .select('*')
        .eq('app_id', appId)
        .eq('organization_id', currentOrganization.id)
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw error; // maybeSingle(): no error for no rows
      return data as AppReview | null;
    },
    enabled: !!appId && !!user?.id && !!currentOrganization?.id,
  });
};

export const useCreateAppReview = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user } = useEnhancedAuth();
  const { currentOrganization } = useOrganizationData();

  return useMutation({
    mutationFn: async ({
      appId,
      rating,
      reviewTitle,
      reviewText,
      pros,
      cons,
    }: {
      appId: string;
      rating: number;
      reviewTitle?: string;
      reviewText?: string;
      pros?: string[];
      cons?: string[];
    }) => {
      if (!user?.id || !currentOrganization?.id) {
        throw new Error('User or organization not found');
      }

      const { data, error } = await supabase
        .from('marketplace_app_reviews')
        .insert({
          app_id: appId,
          organization_id: currentOrganization.id,
          user_id: user.id,
          rating,
          review_title: reviewTitle || null,
          review_text: reviewText || null,
          pros: pros || null,
          cons: cons || null,
        })
        .select()
        .maybeSingle();

      if (error) throw error;
      if (!data) throw new Error('No data returned after creating review');
      return data;
    },
    onSuccess: (_, { appId }) => {
      queryClient.invalidateQueries({ queryKey: ['app-reviews', appId] });
      queryClient.invalidateQueries({ queryKey: ['user-app-review', appId] });
      queryClient.invalidateQueries({ queryKey: ['marketplace-apps'] }); // Refresh for updated ratings
      
      toast({
        title: 'Review Submitted',
        description: 'Thank you for your feedback!',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Failed to Submit Review',
        description: error.message || 'Please try again.',
        variant: 'destructive',
      });
    },
  });
};

export const useUpdateAppReview = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({
      reviewId,
      rating,
      reviewTitle,
      reviewText,
      pros,
      cons,
    }: {
      reviewId: string;
      rating?: number;
      reviewTitle?: string;
      reviewText?: string;
      pros?: string[];
      cons?: string[];
    }) => {
      const updateData: any = {};
      if (rating !== undefined) updateData.rating = rating;
      if (reviewTitle !== undefined) updateData.review_title = reviewTitle;
      if (reviewText !== undefined) updateData.review_text = reviewText;
      if (pros !== undefined) updateData.pros = pros;
      if (cons !== undefined) updateData.cons = cons;

      const { data, error } = await supabase
        .from('marketplace_app_reviews')
        .update(updateData)
        .eq('id', reviewId)
        .select()
        .maybeSingle();

      if (error) throw error;
      if (!data) throw new Error('No data returned after updating review');
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['app-reviews', data.app_id] });
      queryClient.invalidateQueries({ queryKey: ['user-app-review', data.app_id] });
      queryClient.invalidateQueries({ queryKey: ['marketplace-apps'] });
      
      toast({
        title: 'Review Updated',
        description: 'Your review has been updated successfully.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Failed to Update Review',
        description: error.message || 'Please try again.',
        variant: 'destructive',
      });
    },
  });
};