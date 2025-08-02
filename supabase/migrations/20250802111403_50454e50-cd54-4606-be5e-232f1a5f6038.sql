-- 4. Atomic user profile and role update function (fixed syntax)
CREATE OR REPLACE FUNCTION public.update_user_profile_and_role(
  p_user_id UUID,
  p_full_name TEXT DEFAULT NULL,
  p_username TEXT DEFAULT NULL,
  p_new_role TEXT DEFAULT NULL,
  p_organization_id UUID DEFAULT NULL,
  p_requesting_user_id UUID DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  is_super_admin BOOLEAN;
  is_org_admin BOOLEAN;
  updated_user JSON;
  rows_affected INTEGER;
BEGIN
  -- Use provided requesting user or current auth user
  p_requesting_user_id := COALESCE(p_requesting_user_id, auth.uid());
  
  -- Check permissions
  SELECT profiles.is_super_admin INTO is_super_admin
  FROM profiles 
  WHERE profiles.id = p_requesting_user_id;
  
  IF p_organization_id IS NOT NULL THEN
    SELECT EXISTS(
      SELECT 1 FROM memberships 
      WHERE user_id = p_requesting_user_id 
        AND organization_id = p_organization_id 
        AND role = 'admin' 
        AND status = 'active'
    ) INTO is_org_admin;
  END IF;
  
  -- Ensure user has permission
  IF NOT (is_super_admin OR is_org_admin OR p_requesting_user_id = p_user_id) THEN
    RETURN '{"error": "Access denied"}'::JSON;
  END IF;
  
  -- Start transaction block
  BEGIN
    -- Update profile if data provided
    IF p_full_name IS NOT NULL OR p_username IS NOT NULL THEN
      UPDATE profiles 
      SET 
        full_name = COALESCE(p_full_name, full_name),
        username = COALESCE(p_username, username),
        updated_at = NOW()
      WHERE id = p_user_id;
    END IF;
    
    -- Update membership role if provided and user has permission
    rows_affected := 0;
    IF p_new_role IS NOT NULL AND p_organization_id IS NOT NULL AND (is_super_admin OR is_org_admin) THEN
      UPDATE memberships 
      SET role = p_new_role
      WHERE user_id = p_user_id 
        AND organization_id = p_organization_id 
        AND status = 'active';
      
      GET DIAGNOSTICS rows_affected = ROW_COUNT;
    END IF;
    
    -- Return updated user data
    SELECT json_build_object(
      'user_id', p.id,
      'full_name', p.full_name,
      'username', p.username,
      'avatar_url', p.avatar_url,
      'last_login_at', p.last_login_at,
      'role', COALESCE(m.role, 'user'),
      'status', COALESCE(m.status, 'inactive'),
      'joined_at', m.joined_at,
      'organization_id', m.organization_id,
      'updated', TRUE,
      'membership_updated', rows_affected > 0
    ) INTO updated_user
    FROM profiles p
    LEFT JOIN memberships m ON p.id = m.user_id 
      AND m.organization_id = p_organization_id 
      AND m.status = 'active'
    WHERE p.id = p_user_id;
    
    RETURN updated_user;
    
  EXCEPTION WHEN OTHERS THEN
    -- Rollback handled automatically
    RETURN json_build_object('error', 'Update failed: ' || SQLERRM);
  END;
END;
$$;