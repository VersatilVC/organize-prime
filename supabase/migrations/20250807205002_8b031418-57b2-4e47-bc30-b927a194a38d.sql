-- Performance indexes and constraints for common access patterns
-- Safe to run multiple times using IF NOT EXISTS or guarded DO blocks

BEGIN;

-- Profiles: active users lookup
CREATE INDEX IF NOT EXISTS idx_profiles_last_login_at ON public.profiles (last_login_at DESC);

-- Memberships: access and admin checks
CREATE INDEX IF NOT EXISTS idx_memberships_org_status_role ON public.memberships (organization_id, status, role);
CREATE INDEX IF NOT EXISTS idx_memberships_user_status ON public.memberships (user_id, status);
CREATE INDEX IF NOT EXISTS idx_memberships_user_org_status_role ON public.memberships (user_id, organization_id, status, role);

-- Invitations: pending & expiry filtering
CREATE INDEX IF NOT EXISTS idx_invitations_org_accepted_expires ON public.invitations (organization_id, accepted_at, expires_at DESC);

-- Feedback: org/status dashboards
CREATE INDEX IF NOT EXISTS idx_feedback_org_status ON public.feedback (organization_id, status);

-- Files: org/user scoping
CREATE INDEX IF NOT EXISTS idx_files_org ON public.files (organization_id);
CREATE INDEX IF NOT EXISTS idx_files_uploaded_by ON public.files (uploaded_by);

-- Notifications: unread counts and org/user visibility
CREATE INDEX IF NOT EXISTS idx_notifications_user_read ON public.notifications (user_id, read);
CREATE INDEX IF NOT EXISTS idx_notifications_org_user ON public.notifications (organization_id, user_id);

-- Marketplace installations & reviews
CREATE INDEX IF NOT EXISTS idx_app_installations_org_status ON public.marketplace_app_installations (organization_id, status);
CREATE INDEX IF NOT EXISTS idx_app_reviews_app ON public.marketplace_app_reviews (app_id);

-- Feature configs for menu building and access checks
CREATE INDEX IF NOT EXISTS idx_system_feature_configs_enabled_true 
  ON public.system_feature_configs (is_enabled_globally) 
  WHERE is_enabled_globally = true;
CREATE INDEX IF NOT EXISTS idx_org_feature_configs_org_enabled 
  ON public.organization_feature_configs (organization_id, is_enabled);
CREATE INDEX IF NOT EXISTS idx_user_feature_access_user_org 
  ON public.user_feature_access (user_id, organization_id);

-- Marketplace apps public listing policy helpers
CREATE INDEX IF NOT EXISTS idx_marketplace_apps_active_approval 
  ON public.marketplace_apps (is_active, approved_at, requires_approval);

-- Rate limits: ensure ON CONFLICT works efficiently (guard for idempotency)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE schemaname = 'public' 
      AND indexname = 'idx_rate_limits_unique'
  ) THEN
    CREATE UNIQUE INDEX idx_rate_limits_unique 
      ON public.rate_limits (identifier, action_type, window_start);
  END IF;
END $$;

COMMIT;