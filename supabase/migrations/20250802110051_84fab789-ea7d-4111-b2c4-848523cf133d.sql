-- Create optimized function to get users with all related data in a single query
CREATE OR REPLACE FUNCTION public.get_users_optimized(
  p_user_id UUID,
  p_organization_id UUID DEFAULT NULL,
  p_role TEXT DEFAULT NULL,
  p_page INTEGER DEFAULT 0,
  p_page_size INTEGER DEFAULT 50,
  p_search TEXT DEFAULT NULL
)
RETURNS TABLE(
  user_id UUID,
  full_name TEXT,
  username TEXT,
  avatar_url TEXT,
  last_login_at TIMESTAMPTZ,
  email TEXT,
  role TEXT,
  status TEXT,
  joined_at TIMESTAMPTZ,
  organization_id UUID,
  organization_name TEXT,
  total_count BIGINT
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_role TEXT;
  is_super_admin BOOLEAN;
  offset_value INTEGER;
BEGIN
  -- Calculate offset
  offset_value := p_page * p_page_size;
  
  -- Get user role and super admin status
  SELECT 
    profiles.is_super_admin
  INTO is_super_admin
  FROM profiles 
  WHERE profiles.id = p_user_id;
  
  -- Check if user is admin of the specified organization
  SELECT m.role INTO user_role
  FROM memberships m
  WHERE m.user_id = p_user_id 
    AND m.organization_id = p_organization_id 
    AND m.status = 'active'
    AND m.role = 'admin';
  
  -- Super admin can see all users
  IF is_super_admin THEN
    RETURN QUERY
    WITH filtered_users AS (
      SELECT 
        p.id,
        p.full_name,
        p.username,
        p.avatar_url,
        p.last_login_at,
        m.role,
        m.status,
        m.joined_at,
        m.organization_id,
        o.name as org_name
      FROM profiles p
      LEFT JOIN memberships m ON p.id = m.user_id AND m.status = 'active'
      LEFT JOIN organizations o ON m.organization_id = o.id
      WHERE 
        (p_search IS NULL OR 
         p.full_name ILIKE '%' || p_search || '%' OR 
         p.username ILIKE '%' || p_search || '%')
      ORDER BY p.full_name, p.username
      LIMIT p_page_size OFFSET offset_value
    ),
    user_emails AS (
      SELECT 
        au.id as user_id,
        au.email
      FROM auth.users au
      WHERE au.id IN (SELECT id FROM filtered_users)
    ),
    total AS (
      SELECT COUNT(*) as count
      FROM profiles p
      WHERE 
        (p_search IS NULL OR 
         p.full_name ILIKE '%' || p_search || '%' OR 
         p.username ILIKE '%' || p_search || '%')
    )
    SELECT 
      fu.id,
      fu.full_name,
      fu.username,
      fu.avatar_url,
      fu.last_login_at,
      ue.email,
      COALESCE(fu.role, 'user'),
      COALESCE(fu.status, 'inactive'),
      fu.joined_at,
      fu.organization_id,
      fu.org_name,
      t.count
    FROM filtered_users fu
    LEFT JOIN user_emails ue ON fu.id = ue.user_id
    CROSS JOIN total t;
    
  -- Organization admin can see users in their organization
  ELSIF user_role = 'admin' AND p_organization_id IS NOT NULL THEN
    RETURN QUERY
    WITH filtered_users AS (
      SELECT 
        p.id,
        p.full_name,
        p.username,
        p.avatar_url,
        p.last_login_at,
        m.role,
        m.status,
        m.joined_at
      FROM profiles p
      INNER JOIN memberships m ON p.id = m.user_id 
      WHERE m.organization_id = p_organization_id 
        AND m.status = 'active'
        AND (p_search IS NULL OR 
             p.full_name ILIKE '%' || p_search || '%' OR 
             p.username ILIKE '%' || p_search || '%')
      ORDER BY p.full_name, p.username
      LIMIT p_page_size OFFSET offset_value
    ),
    total AS (
      SELECT COUNT(*) as count
      FROM profiles p
      INNER JOIN memberships m ON p.id = m.user_id 
      WHERE m.organization_id = p_organization_id 
        AND m.status = 'active'
        AND (p_search IS NULL OR 
             p.full_name ILIKE '%' || p_search || '%' OR 
             p.username ILIKE '%' || p_search || '%')
    )
    SELECT 
      fu.id,
      fu.full_name,
      fu.username,
      fu.avatar_url,
      fu.last_login_at,
      NULL::TEXT, -- Admins don't see emails
      fu.role,
      fu.status,
      fu.joined_at,
      p_organization_id,
      (SELECT name FROM organizations WHERE id = p_organization_id),
      t.count
    FROM filtered_users fu
    CROSS JOIN total t;
    
  ELSE
    -- Return empty result for unauthorized users
    RETURN;
  END IF;
END;
$$;

-- Create function to get user invitations optimized
CREATE OR REPLACE FUNCTION public.get_invitations_optimized(
  p_user_id UUID,
  p_organization_id UUID,
  p_page INTEGER DEFAULT 0,
  p_page_size INTEGER DEFAULT 50
)
RETURNS TABLE(
  invitation_id UUID,
  email TEXT,
  role TEXT,
  token TEXT,
  message TEXT,
  created_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  accepted_at TIMESTAMPTZ,
  invited_by UUID,
  organization_id UUID,
  invited_by_name TEXT,
  total_count BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  offset_value INTEGER;
BEGIN
  -- Calculate offset
  offset_value := p_page * p_page_size;
  
  -- Check if user has access (super admin or org admin)
  IF NOT (is_super_admin() OR is_org_admin(p_organization_id)) THEN
    RETURN;
  END IF;
  
  RETURN QUERY
  WITH filtered_invitations AS (
    SELECT 
      i.id,
      i.email,
      i.role,
      i.token,
      i.message,
      i.created_at,
      i.expires_at,
      i.accepted_at,
      i.invited_by,
      i.organization_id
    FROM invitations i
    WHERE i.organization_id = p_organization_id
    ORDER BY i.created_at DESC
    LIMIT p_page_size OFFSET offset_value
  ),
  inviter_profiles AS (
    SELECT 
      p.id,
      COALESCE(p.full_name, p.username, 'Unknown') as name
    FROM profiles p
    WHERE p.id IN (SELECT invited_by FROM filtered_invitations)
  ),
  total AS (
    SELECT COUNT(*) as count
    FROM invitations i
    WHERE i.organization_id = p_organization_id
  )
  SELECT 
    fi.id,
    fi.email,
    fi.role,
    fi.token,
    fi.message,
    fi.created_at,
    fi.expires_at,
    fi.accepted_at,
    fi.invited_by,
    fi.organization_id,
    ip.name,
    t.count
  FROM filtered_invitations fi
  LEFT JOIN inviter_profiles ip ON fi.invited_by = ip.id
  CROSS JOIN total t;
END;
$$;