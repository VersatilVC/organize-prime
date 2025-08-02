-- 1. Enhanced get_dashboard_stats function  
CREATE OR REPLACE FUNCTION public.get_dashboard_stats(
  p_user_id UUID,
  p_organization_id UUID DEFAULT NULL,
  p_role TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  is_super_admin BOOLEAN;
  stats JSON;
BEGIN
  -- Check if user is super admin
  SELECT profiles.is_super_admin INTO is_super_admin
  FROM profiles 
  WHERE profiles.id = p_user_id;
  
  IF is_super_admin THEN
    -- Super Admin sees system-wide stats
    SELECT json_build_object(
      'organizations_count', (SELECT COUNT(*) FROM organizations),
      'users_count', (SELECT COUNT(*) FROM profiles),
      'notifications_count', (SELECT COUNT(*) FROM notifications WHERE user_id = p_user_id AND read = false),
      'files_count', (SELECT COUNT(*) FROM files),
      'feedback_count', (SELECT COUNT(*) FROM feedback WHERE status = 'pending')
    ) INTO stats;
    
  ELSIF p_role = 'admin' AND p_organization_id IS NOT NULL THEN
    -- Organization Admin sees organization-specific stats
    SELECT json_build_object(
      'organizations_count', 1,
      'users_count', (
        SELECT COUNT(*) 
        FROM memberships 
        WHERE organization_id = p_organization_id AND status = 'active'
      ),
      'notifications_count', (
        SELECT COUNT(*) 
        FROM notifications 
        WHERE user_id = p_user_id AND read = false
      ),
      'files_count', (
        SELECT COUNT(*) 
        FROM files 
        WHERE organization_id = p_organization_id
      ),
      'feedback_count', (
        SELECT COUNT(*) 
        FROM feedback 
        WHERE organization_id = p_organization_id AND status = 'pending'
      )
    ) INTO stats;
    
  ELSE
    -- Regular user sees personal stats
    SELECT json_build_object(
      'organizations_count', (
        SELECT COUNT(*) 
        FROM memberships 
        WHERE user_id = p_user_id AND status = 'active'
      ),
      'users_count', 0,
      'notifications_count', (
        SELECT COUNT(*) 
        FROM notifications 
        WHERE user_id = p_user_id AND read = false
      ),
      'files_count', (
        SELECT COUNT(*) 
        FROM files 
        WHERE uploaded_by = p_user_id
      ),
      'feedback_count', (
        SELECT COUNT(*) 
        FROM feedback 
        WHERE user_id = p_user_id
      )
    ) INTO stats;
  END IF;
  
  RETURN stats;
END;
$$;

-- 2. Enhanced get_organization_users function
CREATE OR REPLACE FUNCTION public.get_organization_users(
  p_organization_id UUID,
  p_requesting_user_id UUID,
  p_include_emails BOOLEAN DEFAULT FALSE
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  is_super_admin BOOLEAN;
  is_org_admin BOOLEAN;
  users_data JSON;
BEGIN
  -- Check permissions
  SELECT profiles.is_super_admin INTO is_super_admin
  FROM profiles 
  WHERE profiles.id = p_requesting_user_id;
  
  SELECT EXISTS(
    SELECT 1 FROM memberships 
    WHERE user_id = p_requesting_user_id 
      AND organization_id = p_organization_id 
      AND role = 'admin' 
      AND status = 'active'
  ) INTO is_org_admin;
  
  -- Ensure user has permission to view organization users
  IF NOT (is_super_admin OR is_org_admin) THEN
    RETURN '{"error": "Access denied"}'::JSON;
  END IF;
  
  -- Build users data with conditional email inclusion
  IF p_include_emails AND is_super_admin THEN
    SELECT json_agg(
      json_build_object(
        'user_id', p.id,
        'full_name', p.full_name,
        'username', p.username,
        'avatar_url', p.avatar_url,
        'last_login_at', p.last_login_at,
        'email', au.email,
        'role', m.role,
        'status', m.status,
        'joined_at', m.joined_at,
        'organization_name', o.name
      )
    ) INTO users_data
    FROM profiles p
    INNER JOIN memberships m ON p.id = m.user_id
    INNER JOIN organizations o ON m.organization_id = o.id
    LEFT JOIN auth.users au ON p.id = au.id
    WHERE m.organization_id = p_organization_id 
      AND m.status = 'active'
    ORDER BY p.full_name, p.username;
  ELSE
    SELECT json_agg(
      json_build_object(
        'user_id', p.id,
        'full_name', p.full_name,
        'username', p.username,
        'avatar_url', p.avatar_url,
        'last_login_at', p.last_login_at,
        'role', m.role,
        'status', m.status,
        'joined_at', m.joined_at,
        'organization_name', o.name
      )
    ) INTO users_data
    FROM profiles p
    INNER JOIN memberships m ON p.id = m.user_id
    INNER JOIN organizations o ON m.organization_id = o.id
    WHERE m.organization_id = p_organization_id 
      AND m.status = 'active'
    ORDER BY p.full_name, p.username;
  END IF;
  
  RETURN COALESCE(users_data, '[]'::JSON);
END;
$$;

-- 3. System stats function for super admins
CREATE OR REPLACE FUNCTION public.get_system_stats()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  requesting_user_id UUID;
  is_super_admin BOOLEAN;
  stats JSON;
BEGIN
  -- Get current user
  requesting_user_id := auth.uid();
  
  -- Check if user is super admin
  SELECT profiles.is_super_admin INTO is_super_admin
  FROM profiles 
  WHERE profiles.id = requesting_user_id;
  
  IF NOT is_super_admin THEN
    RETURN '{"error": "Access denied - Super admin required"}'::JSON;
  END IF;
  
  SELECT json_build_object(
    'total_organizations', (SELECT COUNT(*) FROM organizations),
    'total_users', (SELECT COUNT(*) FROM profiles),
    'active_users_30_days', (
      SELECT COUNT(*) 
      FROM profiles 
      WHERE last_login_at > NOW() - INTERVAL '30 days'
    ),
    'pending_invitations', (
      SELECT COUNT(*) 
      FROM invitations 
      WHERE accepted_at IS NULL AND expires_at > NOW()
    ),
    'total_feedback', (SELECT COUNT(*) FROM feedback),
    'pending_feedback', (
      SELECT COUNT(*) 
      FROM feedback 
      WHERE status = 'pending'
    ),
    'total_files', (SELECT COUNT(*) FROM files),
    'total_memberships', (
      SELECT COUNT(*) 
      FROM memberships 
      WHERE status = 'active'
    ),
    'organizations_by_plan', (
      SELECT json_object_agg(subscription_plan, count)
      FROM (
        SELECT subscription_plan, COUNT(*) as count
        FROM organizations
        GROUP BY subscription_plan
      ) t
    )
  ) INTO stats;
  
  RETURN stats;
END;
$$;