-- Performance Optimization: Critical Database Indexes
-- This migration adds essential indexes to improve query performance across the application

BEGIN;

-- ===== CORE MEMBERSHIP AND ORGANIZATION INDEXES =====

-- Critical: User-Organization membership lookups (most frequent queries)
CREATE INDEX IF NOT EXISTS idx_memberships_user_org_status 
ON public.memberships(user_id, organization_id, status);

-- Organization admin lookups
CREATE INDEX IF NOT EXISTS idx_memberships_org_role_status 
ON public.memberships(organization_id, role, status);

-- User role queries across organizations
CREATE INDEX IF NOT EXISTS idx_memberships_user_role_status 
ON public.memberships(user_id, role, status);

-- Organization active users count
CREATE INDEX IF NOT EXISTS idx_memberships_org_status_created 
ON public.memberships(organization_id, status, created_at DESC);

-- ===== PROFILE AND AUTHENTICATION INDEXES =====

-- Super admin lookups (frequent in RLS policies)
CREATE INDEX IF NOT EXISTS idx_profiles_super_admin_lookup 
ON public.profiles(id, is_super_admin) 
WHERE is_super_admin = true;

-- User profile searches
CREATE INDEX IF NOT EXISTS idx_profiles_search 
ON public.profiles USING gin(
  (full_name || ' ' || COALESCE(username, '')) gin_trgm_ops
);

-- ===== FEEDBACK SYSTEM INDEXES =====

-- Organization feedback filtering (dashboard queries)
CREATE INDEX IF NOT EXISTS idx_feedback_org_status_priority 
ON public.feedback(organization_id, status, priority, created_at DESC);

-- User's feedback history
CREATE INDEX IF NOT EXISTS idx_feedback_user_org_created 
ON public.feedback(user_id, organization_id, created_at DESC);

-- Admin feedback management
CREATE INDEX IF NOT EXISTS idx_feedback_org_type_status 
ON public.feedback(organization_id, type, status, updated_at DESC);

-- Overdue feedback detection
CREATE INDEX IF NOT EXISTS idx_feedback_status_created 
ON public.feedback(status, created_at) 
WHERE status IN ('pending', 'reviewing', 'in_progress');

-- ===== NOTIFICATION SYSTEM INDEXES =====

-- User notifications (most frequent query)
CREATE INDEX IF NOT EXISTS idx_notifications_user_read_created 
ON public.notifications(user_id, read, created_at DESC);

-- Organization notifications
CREATE INDEX IF NOT EXISTS idx_notifications_org_type_created 
ON public.notifications(organization_id, type, created_at DESC);

-- Unread notifications count
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread 
ON public.notifications(user_id, read) 
WHERE read = false;

-- ===== FEATURE MANAGEMENT INDEXES =====

-- Organization feature configs (feature access queries)
CREATE INDEX IF NOT EXISTS idx_org_feature_configs_lookup 
ON public.organization_feature_configs(organization_id, feature_slug, is_enabled, is_user_accessible);

-- Feature ordering
CREATE INDEX IF NOT EXISTS idx_org_feature_configs_menu_order 
ON public.organization_feature_configs(organization_id, org_menu_order, is_enabled);

-- User feature access
CREATE INDEX IF NOT EXISTS idx_user_feature_access_lookup 
ON public.user_feature_access(user_id, organization_id, feature_slug, is_enabled);

-- System feature configs
CREATE INDEX IF NOT EXISTS idx_system_feature_configs_enabled 
ON public.system_feature_configs(feature_slug, is_enabled_globally, is_marketplace_visible);

-- ===== KNOWLEDGE BASE INDEXES =====

-- KB documents by organization and status
CREATE INDEX IF NOT EXISTS idx_kb_docs_org_processing 
ON public.kb_documents(organization_id, processing_status, created_at DESC);

-- KB documents search
CREATE INDEX IF NOT EXISTS idx_kb_docs_search 
ON public.kb_documents USING gin(
  (title || ' ' || COALESCE(category, '') || ' ' || array_to_string(COALESCE(tags, '{}'), ' ')) gin_trgm_ops
);

-- KB files by configuration and status
CREATE INDEX IF NOT EXISTS idx_kb_files_config_status 
ON public.kb_files(kb_config_id, processing_status, created_at DESC);

-- KB files by organization
CREATE INDEX IF NOT EXISTS idx_kb_files_org_processing 
ON public.kb_files(organization_id, processing_status, file_size DESC);

-- KB conversations by user and organization
CREATE INDEX IF NOT EXISTS idx_kb_conversations_user_org 
ON public.kb_conversations(user_id, organization_id, last_message_at DESC);

-- KB messages by conversation
CREATE INDEX IF NOT EXISTS idx_kb_messages_conversation_created 
ON public.kb_messages(conversation_id, created_at);

-- KB analytics by organization and type
CREATE INDEX IF NOT EXISTS idx_kb_analytics_org_event_time 
ON public.kb_analytics(organization_id, event_type, created_at DESC);

-- ===== INVITATION SYSTEM INDEXES =====

-- Organization invitations
CREATE INDEX IF NOT EXISTS idx_invitations_org_status 
ON public.invitations(organization_id, accepted_at, expires_at);

-- Pending invitations by email
CREATE INDEX IF NOT EXISTS idx_invitations_email_pending 
ON public.invitations(email, expires_at) 
WHERE accepted_at IS NULL;

-- Invitation token lookup
CREATE INDEX IF NOT EXISTS idx_invitations_token_valid 
ON public.invitations(token, expires_at) 
WHERE accepted_at IS NULL AND expires_at > NOW();

-- ===== AUDIT AND ANALYTICS INDEXES =====

-- Organization access audit
CREATE INDEX IF NOT EXISTS idx_org_access_audit_user_org_time 
ON public.organization_access_audit(user_id, organization_id, created_at DESC);

-- Security events by organization
CREATE INDEX IF NOT EXISTS idx_org_access_audit_org_action_time 
ON public.organization_access_audit(organization_id, action, created_at DESC);

-- Feature analytics
CREATE INDEX IF NOT EXISTS idx_feature_analytics_org_feature_time 
ON public.feature_analytics(organization_id, feature_slug, created_at DESC);

-- Feature usage patterns
CREATE INDEX IF NOT EXISTS idx_feature_analytics_feature_event_time 
ON public.feature_analytics(feature_slug, event_type, created_at DESC);

-- ===== FILE AND STORAGE INDEXES =====

-- Organization files
CREATE INDEX IF NOT EXISTS idx_files_org_created 
ON public.files(organization_id, created_at DESC);

-- File search
CREATE INDEX IF NOT EXISTS idx_files_search 
ON public.files USING gin(
  (file_name || ' ' || COALESCE(description, '')) gin_trgm_ops
);

-- ===== RATE LIMITING INDEXES =====

-- Rate limit lookups
CREATE INDEX IF NOT EXISTS idx_rate_limits_identifier_action_window 
ON public.rate_limits(identifier, action_type, window_start DESC);

-- Admin rate limits
CREATE INDEX IF NOT EXISTS idx_admin_rate_limits_user_action_window 
ON public.admin_rate_limits(user_id, action_type, window_start DESC);

-- ===== WEBHOOKS AND INTEGRATIONS INDEXES =====

-- Webhooks by organization
CREATE INDEX IF NOT EXISTS idx_webhooks_org_active 
ON public.webhooks(organization_id, is_active, last_triggered_at DESC);

-- Feature webhooks
CREATE INDEX IF NOT EXISTS idx_feature_webhooks_feature_active 
ON public.feature_webhooks(feature_id, is_active, last_tested_at DESC);

-- ===== COMPOSITE INDEXES FOR DASHBOARD QUERIES =====

-- Dashboard stats optimization
CREATE INDEX IF NOT EXISTS idx_dashboard_stats_composite 
ON public.memberships(organization_id, status, role, created_at DESC);

-- Active user counts
CREATE INDEX IF NOT EXISTS idx_active_users_composite 
ON public.profiles(id, last_login_at DESC) 
WHERE last_login_at > NOW() - INTERVAL '30 days';

-- Update table statistics for better query planning
ANALYZE public.memberships;
ANALYZE public.feedback;
ANALYZE public.notifications;
ANALYZE public.organization_feature_configs;
ANALYZE public.kb_documents;
ANALYZE public.kb_files;
ANALYZE public.profiles;
ANALYZE public.organizations;

COMMIT;

-- Add comments for documentation
COMMENT ON INDEX idx_memberships_user_org_status IS 'Critical index for user-organization membership lookups used in RLS policies';
COMMENT ON INDEX idx_feedback_org_status_priority IS 'Optimizes dashboard feedback filtering and sorting';
COMMENT ON INDEX idx_notifications_user_read_created IS 'Optimizes user notification queries and unread counts';
COMMENT ON INDEX idx_kb_docs_org_processing IS 'Optimizes knowledge base document status queries';
COMMENT ON INDEX idx_org_feature_configs_lookup IS 'Optimizes feature access control queries';