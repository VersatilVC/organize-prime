import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/auth/AuthProvider';
import { useUserRole } from '@/hooks/useUserRole';
import { useOrganization } from '@/contexts/OrganizationContext';

export interface KnowledgeBaseStats {
  total_kbs: number;
  total_documents: number;
  processing_files: number;
  completed_files: number;
  failed_files: number;
  total_embeddings: number;
}

export interface ContentCreationStats {
  total_content_types: number;
  total_extractions: number;
  pending_extractions: number;
  processing_extractions: number;
  completed_extractions: number;
  failed_extractions: number;
}

export interface FeedbackStats {
  total_feedback: number;
  pending_feedback: number;
  in_progress_feedback: number;
  resolved_feedback: number;
  recent_feedback: number;
}

export interface UserActivityStats {
  total_members: number | null;
  active_members: number | null;
  recent_signups: number | null;
  pending_invitations: number | null;
}

export interface RecentActivity {
  type: string;
  title: string;
  description: string;
  timestamp: string;
  icon: string;
}

export interface FeatureStatistics {
  knowledge_base: KnowledgeBaseStats;
  content_creation: ContentCreationStats;
  feedback: FeedbackStats;
  user_activity: UserActivityStats;
  recent_activity: RecentActivity[];
  generated_at: string;
}

async function fetchFeatureStatistics(
  organizationId: string,
  userId: string,
  role: string
): Promise<FeatureStatistics> {
  // For now, we'll fetch the data using individual queries until we can add the SQL function
  // This will be replaced with the get_feature_statistics function call once it's deployed
  
  const [kbData, contentData, feedbackData, userActivityData, recentActivityData] = await Promise.all([
    // Knowledge Base Stats
    supabase
      .from('kb_configurations')
      .select(`
        id,
        kb_files (
          id,
          extraction_status,
          embedding_count
        )
      `)
      .eq('organization_id', organizationId),
    
    // Content Creation Stats
    supabase
      .from('content_types')
      .select(`
        id,
        extraction_status,
        content_extraction_logs (id)
      `)
      .eq('organization_id', organizationId),
    
    // Feedback Stats
    supabase
      .from('feedback')
      .select('id, status, created_at')
      .eq('organization_id', organizationId),
    
    // User Activity (only for admins/super_admins)
    role === 'admin' || role === 'super_admin' 
      ? supabase
          .from('memberships')
          .select(`
            id,
            created_at,
            profiles (
              id,
              last_login_at
            )
          `)
          .eq('organization_id', organizationId)
          .eq('status', 'active')
      : Promise.resolve({ data: null, error: null }),
    
    // Recent Activity - KB file uploads
    supabase
      .from('kb_files')
      .select(`
        id,
        file_name,
        created_at,
        kb_configurations (
          name
        )
      `)
      .eq('kb_configurations.organization_id', organizationId)
      .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
      .order('created_at', { ascending: false })
      .limit(5)
  ]);

  if (kbData.error) throw kbData.error;
  if (contentData.error) throw contentData.error;
  if (feedbackData.error) throw feedbackData.error;
  if (userActivityData.error) throw userActivityData.error;

  // Process Knowledge Base stats
  const kbConfigs = kbData.data || [];
  const allKbFiles = kbConfigs.flatMap(kb => kb.kb_files || []);
  const kbStats: KnowledgeBaseStats = {
    total_kbs: kbConfigs.length,
    total_documents: allKbFiles.length,
    processing_files: allKbFiles.filter(f => f.extraction_status === 'processing').length,
    completed_files: allKbFiles.filter(f => f.extraction_status === 'completed').length,
    failed_files: allKbFiles.filter(f => f.extraction_status === 'failed').length,
    total_embeddings: allKbFiles.reduce((sum, f) => sum + (f.embedding_count || 0), 0)
  };

  // Process Content Creation stats
  const contentTypes = contentData.data || [];
  const contentStats: ContentCreationStats = {
    total_content_types: contentTypes.length,
    total_extractions: contentTypes.reduce((sum, ct) => sum + (ct.content_extraction_logs?.length || 0), 0),
    pending_extractions: contentTypes.filter(ct => ct.extraction_status === 'pending').length,
    processing_extractions: contentTypes.filter(ct => ct.extraction_status === 'processing').length,
    completed_extractions: contentTypes.filter(ct => ct.extraction_status === 'completed').length,
    failed_extractions: contentTypes.filter(ct => ct.extraction_status === 'error').length
  };

  // Process Feedback stats
  const feedbacks = feedbackData.data || [];
  const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const feedbackStats: FeedbackStats = {
    total_feedback: feedbacks.length,
    pending_feedback: feedbacks.filter(f => f.status === 'pending').length,
    in_progress_feedback: feedbacks.filter(f => f.status === 'in_progress').length,
    resolved_feedback: feedbacks.filter(f => f.status === 'resolved').length,
    recent_feedback: feedbacks.filter(f => new Date(f.created_at) > oneWeekAgo).length
  };

  // Process User Activity stats
  let userStats: UserActivityStats = {
    total_members: null,
    active_members: null,
    recent_signups: null,
    pending_invitations: null
  };

  if (userActivityData.data && (role === 'admin' || role === 'super_admin')) {
    const memberships = userActivityData.data;
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    userStats = {
      total_members: memberships.length,
      active_members: memberships.filter(m => 
        m.profiles?.last_login_at && new Date(m.profiles.last_login_at) > thirtyDaysAgo
      ).length,
      recent_signups: memberships.filter(m => new Date(m.created_at) > sevenDaysAgo).length,
      pending_invitations: 0 // Would need to query invitations table
    };
  }

  // Process Recent Activity
  const recentFiles = recentActivityData.data || [];
  const recentActivity: RecentActivity[] = recentFiles.map(file => ({
    type: 'file_upload',
    title: file.file_name,
    description: `Uploaded to ${file.kb_configurations?.name || 'Knowledge Base'}`,
    timestamp: file.created_at,
    icon: 'FileText'
  }));

  return {
    knowledge_base: kbStats,
    content_creation: contentStats,
    feedback: feedbackStats,
    user_activity: userStats,
    recent_activity: recentActivity,
    generated_at: new Date().toISOString()
  };
}

export function useDashboardFeatureStats() {
  const { user } = useAuth();
  const { role } = useUserRole();
  const { currentOrganization } = useOrganization();

  const query = useQuery({
    queryKey: ['dashboard-feature-stats', currentOrganization?.id, user?.id, role],
    queryFn: () => {
      if (!currentOrganization?.id || !user?.id) {
        throw new Error('Organization ID and User ID are required');
      }
      return fetchFeatureStatistics(currentOrganization.id, user.id, role);
    },
    enabled: !!currentOrganization?.id && !!user?.id && !!role,
    staleTime: 2 * 60 * 1000, // 2 minutes
    refetchInterval: 5 * 60 * 1000, // Refresh every 5 minutes
  });

  const derivedData = useMemo(() => {
    const stats = query.data;
    if (!stats) return null;

    return {
      // Feature summaries for cards
      features: [
        {
          slug: 'knowledge-base',
          name: 'Knowledge Base',
          icon: 'Database',
          color: '#3B82F6',
          stats: {
            primary: stats.knowledge_base.total_documents,
            primaryLabel: 'Documents',
            secondary: stats.knowledge_base.processing_files,
            secondaryLabel: 'Processing'
          },
          status: stats.knowledge_base.processing_files > 0 ? 'processing' : 'active',
          quickAction: stats.knowledge_base.total_kbs > 0 ? '/knowledge-base' : '/knowledge-base/new'
        },
        {
          slug: 'content-creation',
          name: 'Content Creation',
          icon: 'FileText',
          color: '#10B981',
          stats: {
            primary: stats.content_creation.total_content_types,
            primaryLabel: 'Content Types',
            secondary: stats.content_creation.pending_extractions,
            secondaryLabel: 'Pending'
          },
          status: stats.content_creation.processing_extractions > 0 ? 'processing' : 'active',
          quickAction: '/content-creation'
        },
        {
          slug: 'feedback',
          name: 'Feedback',
          icon: 'MessageSquare',
          color: '#8B5CF6',
          stats: {
            primary: stats.feedback.total_feedback,
            primaryLabel: 'Total',
            secondary: stats.feedback.pending_feedback,
            secondaryLabel: 'Pending'
          },
          status: stats.feedback.pending_feedback > 0 ? 'attention' : 'active',
          quickAction: role === 'admin' ? '/admin/feedback' : '/feedback'
        }
      ],

      // Quick actions based on current state
      quickActions: [
        ...(stats.feedback.pending_feedback > 0 ? [{
          label: 'Review Feedback',
          href: role === 'admin' ? '/admin/feedback' : '/feedback',
          icon: 'MessageSquare',
          badge: stats.feedback.pending_feedback,
          priority: 1
        }] : []),
        
        ...(stats.knowledge_base.processing_files > 0 ? [{
          label: 'Check Processing',
          href: '/knowledge-base',
          icon: 'RefreshCw',
          badge: stats.knowledge_base.processing_files,
          priority: 2
        }] : []),
        
        ...(stats.content_creation.pending_extractions > 0 ? [{
          label: 'Process Content',
          href: '/content-creation',
          icon: 'Download',
          badge: stats.content_creation.pending_extractions,
          priority: 2
        }] : []),

        // Always available actions
        {
          label: 'Upload Document',
          href: '/knowledge-base',
          icon: 'Upload',
          priority: 3
        },
        
        {
          label: 'Send Feedback',
          href: '/feedback',
          icon: 'MessageSquare',
          priority: 4
        },

        ...(role === 'admin' ? [{
          label: 'Invite Users',
          href: '/users',
          icon: 'UserPlus',
          priority: 5
        }] : [])
      ].sort((a, b) => a.priority - b.priority).slice(0, 6), // Max 6 actions

      // Recent activity with real data
      recentActivity: stats.recent_activity,

      // Raw stats for other use
      rawStats: stats
    };
  }, [query.data, role]);

  return {
    ...query,
    features: derivedData?.features || [],
    quickActions: derivedData?.quickActions || [],
    recentActivity: derivedData?.recentActivity || [],
    rawStats: derivedData?.rawStats,
    hasProcessingItems: derivedData?.rawStats ? 
      derivedData.rawStats.knowledge_base.processing_files > 0 ||
      derivedData.rawStats.content_creation.processing_extractions > 0 : false,
    hasAttentionItems: derivedData?.rawStats ? 
      derivedData.rawStats.feedback.pending_feedback > 0 : false
  };
}