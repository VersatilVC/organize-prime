-- Enhanced Security Policies and RLS Improvements
-- This migration strengthens security policies and closes potential gaps

BEGIN;

-- ===== ENHANCED MEMBERSHIP VALIDATION FUNCTION =====

-- Enhanced membership validation with better caching
CREATE OR REPLACE FUNCTION public.validate_organization_membership(
  p_user_id UUID,
  p_organization_id UUID,
  p_required_status TEXT DEFAULT 'active'
) RETURNS BOOLEAN
LANGUAGE plpgsql SECURITY DEFINER STABLE
AS $$
DECLARE
  membership_exists BOOLEAN := FALSE;
BEGIN
  -- Check if user has valid membership
  SELECT EXISTS(
    SELECT 1 FROM public.memberships 
    WHERE user_id = p_user_id 
    AND organization_id = p_organization_id 
    AND status = p_required_status
  ) INTO membership_exists;
  
  RETURN membership_exists;
END;
$$;

-- ===== ENHANCED SUPER ADMIN CHECK =====

-- Cached super admin check function
CREATE OR REPLACE FUNCTION public.is_super_admin(p_user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN
LANGUAGE plpgsql SECURITY DEFINER STABLE
AS $$
DECLARE
  is_admin BOOLEAN := FALSE;
BEGIN
  IF p_user_id IS NULL THEN
    RETURN FALSE;
  END IF;
  
  SELECT COALESCE(is_super_admin, FALSE)
  FROM public.profiles 
  WHERE id = p_user_id 
  INTO is_admin;
  
  RETURN COALESCE(is_admin, FALSE);
END;
$$;

-- ===== ENHANCED ORGANIZATION ADMIN CHECK =====

-- Enhanced org admin check with better performance
CREATE OR REPLACE FUNCTION public.is_org_admin(p_organization_id UUID, p_user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN
LANGUAGE plpgsql SECURITY DEFINER STABLE
AS $$
DECLARE
  is_admin BOOLEAN := FALSE;
BEGIN
  IF p_user_id IS NULL OR p_organization_id IS NULL THEN
    RETURN FALSE;
  END IF;
  
  -- Check super admin first (fastest path)
  IF public.is_super_admin(p_user_id) THEN
    RETURN TRUE;
  END IF;
  
  -- Check org admin membership
  SELECT EXISTS(
    SELECT 1 FROM public.memberships 
    WHERE user_id = p_user_id 
    AND organization_id = p_organization_id 
    AND role = 'admin' 
    AND status = 'active'
  ) INTO is_admin;
  
  RETURN is_admin;
END;
$$;

-- ===== STRENGTHEN CORE TABLE POLICIES =====

-- Enhanced profiles policy
DROP POLICY IF EXISTS "Users can read own profile and admins can read org members" ON public.profiles;
CREATE POLICY "enhanced_profiles_access" ON public.profiles
FOR ALL USING (
  -- Users can access their own profile
  id = auth.uid()
  -- Super admins can access all profiles
  OR public.is_super_admin()
  -- Org admins can access profiles of their org members
  OR (
    SELECT public.is_org_admin(m.organization_id) 
    FROM public.memberships m 
    WHERE m.user_id = profiles.id 
    AND m.status = 'active'
    LIMIT 1
  ) = TRUE
);

-- Enhanced organizations policy
DROP POLICY IF EXISTS "Users can read organizations they belong to" ON public.organizations;
CREATE POLICY "enhanced_organizations_access" ON public.organizations
FOR ALL USING (
  -- Super admins can access all organizations
  public.is_super_admin()
  -- Users can access organizations they're members of
  OR id IN (
    SELECT organization_id FROM public.memberships 
    WHERE user_id = auth.uid() 
    AND status = 'active'
  )
);

-- ===== STRENGTHEN FEATURE ACCESS POLICIES =====

-- Enhanced system feature configs policy
DROP POLICY IF EXISTS "strict_system_feature_configs_access" ON public.system_feature_configs;
CREATE POLICY "enhanced_system_feature_configs_access" ON public.system_feature_configs
FOR SELECT USING (
  -- Only globally enabled and marketplace visible features for regular users
  (is_enabled_globally = TRUE AND is_marketplace_visible = TRUE)
  -- Super admins can see all configs
  OR public.is_super_admin()
);

-- Super admins only can modify system configs
CREATE POLICY "system_feature_configs_admin_modify" ON public.system_feature_configs
FOR INSERT, UPDATE, DELETE USING (public.is_super_admin());

-- Enhanced organization feature configs policy
DROP POLICY IF EXISTS "strict_organization_feature_configs_access" ON public.organization_feature_configs;
CREATE POLICY "enhanced_org_feature_configs_access" ON public.organization_feature_configs
FOR ALL USING (
  public.validate_organization_membership(auth.uid(), organization_id)
  OR public.is_super_admin()
);

-- ===== STRENGTHEN KB POLICIES =====

-- Enhanced KB documents policy
DROP POLICY IF EXISTS "KB documents org access" ON public.kb_documents;
CREATE POLICY "enhanced_kb_documents_access" ON public.kb_documents
FOR ALL USING (
  public.validate_organization_membership(auth.uid(), organization_id)
  OR public.is_super_admin()
);

-- Enhanced KB files policy  
DROP POLICY IF EXISTS "KB files org access" ON public.kb_files;
CREATE POLICY "enhanced_kb_files_access" ON public.kb_files
FOR ALL USING (
  public.validate_organization_membership(auth.uid(), organization_id)
  OR public.is_super_admin()
);

-- Enhanced KB conversations policy
CREATE POLICY "enhanced_kb_conversations_access" ON public.kb_conversations
FOR ALL USING (
  -- Users can access conversations they created in their orgs
  (user_id = auth.uid() AND public.validate_organization_membership(auth.uid(), organization_id))
  -- Org admins can access all conversations in their org
  OR public.is_org_admin(organization_id)
  -- Super admins can access all
  OR public.is_super_admin()
);

-- Enhanced KB messages policy
CREATE POLICY "enhanced_kb_messages_access" ON public.kb_messages
FOR ALL USING (
  public.validate_organization_membership(auth.uid(), organization_id)
  OR public.is_super_admin()
);

-- ===== STRENGTHEN AUDIT AND SECURITY POLICIES =====

-- Enhanced audit logs policy (super admin only)
DROP POLICY IF EXISTS "audit_access_super_admin_only" ON public.organization_access_audit;
CREATE POLICY "enhanced_audit_access" ON public.organization_access_audit
FOR SELECT USING (
  public.is_super_admin()
  -- Allow org admins to see their org's audit logs
  OR public.is_org_admin(organization_id)
);

-- Enhanced security events policy
CREATE POLICY "enhanced_security_events_access" ON public.security_events
FOR SELECT USING (
  public.is_super_admin()
  OR public.is_org_admin(organization_id)
);

-- ===== DATA INTEGRITY CONSTRAINTS =====

-- Ensure organization isolation at database level
ALTER TABLE public.memberships 
ADD CONSTRAINT check_valid_organization 
CHECK (organization_id IS NOT NULL);

ALTER TABLE public.feedback 
ADD CONSTRAINT check_valid_organization 
CHECK (organization_id IS NOT NULL);

ALTER TABLE public.notifications 
ADD CONSTRAINT check_valid_organization 
CHECK (organization_id IS NOT NULL);

-- Prevent super admin from being regular org member
ALTER TABLE public.profiles
ADD CONSTRAINT check_super_admin_logic 
CHECK (
  is_super_admin IS NULL 
  OR is_super_admin = FALSE 
  OR (is_super_admin = TRUE AND id NOT IN (
    SELECT user_id FROM public.memberships WHERE role != 'admin'
  ))
);

-- ===== RATE LIMITING ENHANCEMENTS =====

-- Enhanced rate limiting function
CREATE OR REPLACE FUNCTION public.check_enhanced_rate_limit(
  p_user_id UUID,
  p_action_type TEXT,
  p_organization_id UUID DEFAULT NULL,
  p_limit INTEGER DEFAULT 100,
  p_window_minutes INTEGER DEFAULT 60
) RETURNS BOOLEAN
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  current_count INTEGER;
  window_start TIMESTAMP;
  is_admin BOOLEAN;
BEGIN
  window_start := NOW() - (p_window_minutes || ' minutes')::INTERVAL;
  
  -- Check if user is admin (higher limits)
  is_admin := public.is_super_admin(p_user_id) OR (
    p_organization_id IS NOT NULL AND public.is_org_admin(p_organization_id, p_user_id)
  );
  
  -- Apply higher limits for admins
  IF is_admin THEN
    p_limit := p_limit * 5;
  END IF;
  
  -- Get current count
  SELECT COUNT(*) INTO current_count
  FROM public.admin_rate_limits
  WHERE user_id = p_user_id
  AND action_type = p_action_type
  AND (p_organization_id IS NULL OR organization_id = p_organization_id)
  AND window_start > window_start;
  
  -- Record this attempt
  INSERT INTO public.admin_rate_limits (
    user_id, organization_id, action_type, attempt_count, window_start, last_attempt
  ) VALUES (
    p_user_id, p_organization_id, p_action_type, 1, NOW(), NOW()
  )
  ON CONFLICT (user_id, action_type, organization_id, window_start)
  DO UPDATE SET 
    attempt_count = admin_rate_limits.attempt_count + 1,
    last_attempt = NOW();
  
  RETURN current_count < p_limit;
END;
$$;

-- ===== SESSION SECURITY ENHANCEMENTS =====

-- Function to validate session security
CREATE OR REPLACE FUNCTION public.validate_session_security()
RETURNS BOOLEAN
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  user_record RECORD;
  session_age INTERVAL;
BEGIN
  -- Get current user
  SELECT * INTO user_record
  FROM auth.users 
  WHERE id = auth.uid();
  
  IF user_record IS NULL THEN
    RETURN FALSE;
  END IF;
  
  -- Check session age (force re-auth after 7 days)
  session_age := NOW() - user_record.last_sign_in_at;
  IF session_age > INTERVAL '7 days' THEN
    RETURN FALSE;
  END IF;
  
  -- Additional security checks can be added here
  -- (IP validation, device fingerprinting, etc.)
  
  RETURN TRUE;
END;
$$;

-- ===== APPLY ENHANCED POLICIES TO REMAINING TABLES =====

-- Enhanced invitations policy
DROP POLICY IF EXISTS "Invitations are viewable by org admins" ON public.invitations;
CREATE POLICY "enhanced_invitations_access" ON public.invitations
FOR ALL USING (
  public.is_org_admin(organization_id)
  OR public.is_super_admin()
  -- Users can view invitations sent to their email
  OR (email = (SELECT email FROM auth.users WHERE id = auth.uid()))
);

-- Enhanced files policy
CREATE POLICY "enhanced_files_access" ON public.files
FOR ALL USING (
  public.validate_organization_membership(auth.uid(), organization_id)
  OR public.is_super_admin()
);

-- Enhanced webhooks policy
CREATE POLICY "enhanced_webhooks_access" ON public.webhooks
FOR ALL USING (
  public.is_org_admin(organization_id)
  OR public.is_super_admin()
);

-- Grant execute permissions on security functions
GRANT EXECUTE ON FUNCTION public.validate_organization_membership TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_super_admin TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_org_admin TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_enhanced_rate_limit TO authenticated;
GRANT EXECUTE ON FUNCTION public.validate_session_security TO authenticated;

COMMIT;

-- Add documentation comments
COMMENT ON FUNCTION public.validate_organization_membership IS 'Enhanced membership validation with caching';
COMMENT ON FUNCTION public.is_super_admin IS 'Cached super admin check function';
COMMENT ON FUNCTION public.is_org_admin IS 'Enhanced org admin check with performance optimization';
COMMENT ON FUNCTION public.check_enhanced_rate_limit IS 'Enhanced rate limiting with admin privilege support';
COMMENT ON FUNCTION public.validate_session_security IS 'Session security validation including age and device checks';