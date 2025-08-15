-- Phase 2 Performance Optimization: Critical Database Indexes
-- This migration adds missing indexes identified in the performance analysis

-- Webhook System Performance Indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_webhook_logs_triggered_status_response 
ON webhook_logs(triggered_at DESC, status, response_time_ms);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_webhook_logs_event_type_time 
ON webhook_logs(event_type, triggered_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_webhook_logs_webhook_status_time 
ON webhook_logs(webhook_id, status, triggered_at DESC);

-- Notification System Performance Indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_notifications_user_category_read_time 
ON notifications(user_id, category, read, created_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_notifications_user_type_read 
ON notifications(user_id, type, read) 
WHERE type LIKE 'welcome%';

-- Analytics and Reporting Indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_profiles_last_login_active 
ON profiles(last_login_at DESC) 
WHERE last_login_at > NOW() - INTERVAL '30 days';

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_feature_analytics_time_feature_event 
ON feature_analytics(created_at DESC, feature_slug, event_type);

-- Organization-scoped query optimizations
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_memberships_org_status_role 
ON memberships(organization_id, status, role) 
WHERE status = 'active';

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_feedback_org_status_created 
ON feedback(organization_id, status, created_at DESC);

-- KB System optimization
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_kb_files_org_status_created 
ON kb_files(organization_id, processing_status, created_at DESC);

-- Comment indexes for maintenance
COMMENT ON INDEX idx_webhook_logs_triggered_status_response IS 'Optimizes webhook dashboard stats queries';
COMMENT ON INDEX idx_notifications_user_category_read_time IS 'Optimizes dashboard notification loading';
COMMENT ON INDEX idx_profiles_last_login_active IS 'Optimizes active user statistics';