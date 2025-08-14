-- CRITICAL SECURITY FIX: Add search_path protection to all security-definer functions
-- This prevents privilege escalation attacks through schema injection

-- Fix is_super_admin function
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() AND is_super_admin = true
  );
$$;

-- Fix is_org_admin function
CREATE OR REPLACE FUNCTION public.is_org_admin(org_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM memberships 
    WHERE user_id = auth.uid() 
      AND organization_id = org_id 
      AND role = 'admin' 
      AND status = 'active'
  );
$$;

-- Fix get_user_organizations function
CREATE OR REPLACE FUNCTION public.get_user_organizations()
RETURNS SETOF uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT organization_id 
  FROM memberships 
  WHERE user_id = auth.uid() 
    AND status = 'active';
$$;

-- Fix auto_create_default_kb_for_org trigger function
CREATE OR REPLACE FUNCTION public.auto_create_default_kb_for_org()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Only create if KB app is enabled and organization doesn't already have a default KB
  IF (
    EXISTS (
      SELECT 1 FROM marketplace_settings 
      WHERE key = 'kb_enabled' AND value::boolean = true
    )
    AND NOT EXISTS (
      SELECT 1 FROM kb_configurations 
      WHERE organization_id = NEW.id AND is_default = true
    )
  ) THEN
    -- Create default KB configuration
    PERFORM initialize_default_kb(NEW.id, NEW.name);
  END IF;
  
  RETURN NEW;
END;
$$;

-- Fix check_rate_limit function
CREATE OR REPLACE FUNCTION public.check_rate_limit(user_id_param uuid, action_type_param text, limit_per_hour integer DEFAULT 100)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  current_count INTEGER;
BEGIN
  -- Count actions in the last hour
  SELECT COUNT(*) INTO current_count
  FROM audit_logs
  WHERE user_id = user_id_param
    AND action = action_type_param
    AND created_at > NOW() - INTERVAL '1 hour';
  
  -- Return true if under limit, false if over
  RETURN current_count < limit_per_hour;
END;
$$;

-- Fix cleanup_security_data function
CREATE OR REPLACE FUNCTION public.cleanup_security_data()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Only allow super admins to cleanup security data
  IF NOT EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() AND is_super_admin = true
  ) THEN
    RAISE EXCEPTION 'Access denied - Super admin required';
  END IF;
  
  -- Clean up old audit logs (older than 1 year)
  DELETE FROM audit_logs 
  WHERE created_at < NOW() - INTERVAL '1 year';
  
  -- Clean up expired invitations
  DELETE FROM invitations 
  WHERE expires_at < NOW();
  
  -- Clean up old rate limit entries
  DELETE FROM admin_rate_limits 
  WHERE created_at < NOW() - INTERVAL '1 day';
END;
$$;

-- Fix create_organization_vector_table function
CREATE OR REPLACE FUNCTION public.create_organization_vector_table(org_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  table_name TEXT;
BEGIN
  -- Generate table name
  table_name := 'org_vectors_' || replace(org_id::text, '-', '_');
  
  -- Create the vector table (placeholder for future vector implementation)
  -- This would create organization-specific vector tables for AI/ML features
  
  RETURN table_name;
END;
$$;

-- Fix get_security_dashboard_stats function
CREATE OR REPLACE FUNCTION public.get_security_dashboard_stats()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  result JSONB;
BEGIN
  -- Only allow super admins to view security stats
  IF NOT EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() AND is_super_admin = true
  ) THEN
    RETURN jsonb_build_object('error', 'Access denied');
  END IF;
  
  SELECT jsonb_build_object(
    'failed_login_attempts', (
      SELECT COUNT(*) FROM audit_logs 
      WHERE action = 'login_failed' 
      AND created_at > NOW() - INTERVAL '24 hours'
    ),
    'active_sessions', (
      SELECT COUNT(*) FROM profiles 
      WHERE last_login_at > NOW() - INTERVAL '1 hour'
    ),
    'recent_security_events', (
      SELECT COUNT(*) FROM audit_logs 
      WHERE action LIKE '%security%' 
      AND created_at > NOW() - INTERVAL '24 hours'
    )
  ) INTO result;
  
  RETURN result;
END;
$$;

-- Fix log_feature_access_trigger function
CREATE OR REPLACE FUNCTION public.log_feature_access_trigger()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Log feature access for analytics
  INSERT INTO feature_access_logs (
    user_id, organization_id, feature_slug, access_type, access_granted
  ) VALUES (
    NEW.user_id, NEW.organization_id, NEW.feature_slug, 'view', true
  );
  
  RETURN NEW;
END;
$$;

-- Fix update_kb_file_counts function
CREATE OR REPLACE FUNCTION public.update_kb_file_counts()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE kb_configurations 
    SET file_count = file_count + 1,
        total_vectors = total_vectors + COALESCE(NEW.vector_count, 0)
    WHERE id = NEW.kb_config_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE kb_configurations 
    SET file_count = file_count - 1,
        total_vectors = total_vectors - COALESCE(OLD.vector_count, 0)
    WHERE id = OLD.kb_config_id;
    RETURN OLD;
  ELSIF TG_OP = 'UPDATE' THEN
    UPDATE kb_configurations 
    SET total_vectors = total_vectors - COALESCE(OLD.vector_count, 0) + COALESCE(NEW.vector_count, 0)
    WHERE id = NEW.kb_config_id;
    RETURN NEW;
  END IF;
  RETURN NULL;
END;
$$;

-- Fix get_user_emails_for_super_admin function (review auth schema access)
CREATE OR REPLACE FUNCTION public.get_user_emails_for_super_admin()
RETURNS TABLE(user_id uuid, email text, full_name text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public', 'auth'
AS $$
BEGIN
  -- Only allow super admins to access user emails
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND is_super_admin = true
  ) THEN
    RAISE EXCEPTION 'Access denied - Super admin required';
  END IF;
  
  RETURN QUERY
  SELECT 
    p.id,
    au.email::text,
    p.full_name
  FROM public.profiles p
  JOIN auth.users au ON p.id = au.id
  ORDER BY p.full_name;
END;
$$;

-- Note: delete_feedback_with_files function already has proper search_path with storage schema access
-- This is intentional for file deletion functionality