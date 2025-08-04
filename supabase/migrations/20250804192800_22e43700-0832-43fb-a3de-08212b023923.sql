-- Performance indexes for common queries
CREATE INDEX IF NOT EXISTS idx_notifications_user_read 
ON notifications(user_id, read, created_at DESC) 
WHERE read = false;

CREATE INDEX IF NOT EXISTS idx_notifications_organization 
ON notifications(organization_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_feedback_organization_status 
ON feedback(organization_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_feedback_user_created 
ON feedback(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_memberships_organization_status 
ON memberships(organization_id, status) 
WHERE status = 'active';

CREATE INDEX IF NOT EXISTS idx_profiles_super_admin 
ON profiles(is_super_admin) 
WHERE is_super_admin = true;

CREATE INDEX IF NOT EXISTS idx_system_settings_key_category 
ON system_settings(key, category);

-- Optimized dashboard stats RPC function
CREATE OR REPLACE FUNCTION get_dashboard_stats_optimized(
  p_organization_id UUID,
  p_user_id UUID,
  p_is_super_admin BOOLEAN DEFAULT FALSE
)
RETURNS JSON AS $$
DECLARE
  result JSON;
  total_users INTEGER;
  active_users INTEGER;
  pending_invitations INTEGER;
  total_feedback INTEGER;
BEGIN
  -- Get user counts efficiently
  IF p_is_super_admin THEN
    SELECT COUNT(*) INTO total_users FROM profiles;
    SELECT COUNT(*) INTO active_users 
    FROM profiles 
    WHERE last_login_at > NOW() - INTERVAL '30 days';
  ELSE
    SELECT COUNT(*) INTO total_users 
    FROM memberships m
    WHERE m.organization_id = p_organization_id AND m.status = 'active';
    
    SELECT COUNT(*) INTO active_users
    FROM memberships m
    JOIN profiles p ON m.user_id = p.id
    WHERE m.organization_id = p_organization_id 
    AND m.status = 'active'
    AND p.last_login_at > NOW() - INTERVAL '30 days';
  END IF;

  -- Get pending invitations
  SELECT COUNT(*) INTO pending_invitations
  FROM invitations
  WHERE organization_id = p_organization_id
  AND accepted_at IS NULL
  AND expires_at > NOW();

  -- Get feedback count
  SELECT COUNT(*) INTO total_feedback
  FROM feedback
  WHERE (p_is_super_admin OR organization_id = p_organization_id)
  AND status IN ('pending', 'in_progress');

  -- Build result
  result := json_build_object(
    'totalUsers', total_users,
    'activeUsers', active_users,
    'pendingInvitations', pending_invitations,
    'totalFeedback', total_feedback
  );

  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;