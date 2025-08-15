-- Enhanced RLS Security Policies for Multi-Tenant Data Protection
-- This migration strengthens organization-based isolation and adds defense-in-depth security

-- Create security audit log table
CREATE TABLE IF NOT EXISTS organization_access_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE,
  action text NOT NULL,
  resource_type text,
  resource_id text,
  ip_address inet,
  user_agent text,
  success boolean DEFAULT true,
  error_message text,
  created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS on audit table
ALTER TABLE organization_access_audit ENABLE ROW LEVEL SECURITY;

-- Only super admins can view audit logs
CREATE POLICY "audit_access_super_admin_only" ON organization_access_audit
FOR ALL USING (is_super_admin(auth.uid()));

-- Enhance memberships table RLS policy with stricter validation
DROP POLICY IF EXISTS "Memberships are viewable by org members" ON memberships;
CREATE POLICY "strict_memberships_access" ON memberships
FOR ALL USING (
  -- User can access memberships for organizations they belong to
  organization_id IN (
    SELECT organization_id FROM memberships 
    WHERE user_id = auth.uid() 
    AND status = 'active'
  )
  -- OR user is a super admin
  OR is_super_admin(auth.uid())
);

-- Enhance feedback table RLS with organization validation
DROP POLICY IF EXISTS "Users can read feedback from their organization" ON feedback;
CREATE POLICY "strict_feedback_organization_access" ON feedback
FOR ALL USING (
  -- User must be active member of the feedback's organization
  organization_id IN (
    SELECT organization_id FROM memberships 
    WHERE user_id = auth.uid() 
    AND status = 'active'
  )
  -- OR user is a super admin
  OR is_super_admin(auth.uid())
  -- OR user created the feedback (for cross-org feedback scenarios)
  OR created_by = auth.uid()
);

-- Enhance notifications RLS policy
DROP POLICY IF EXISTS "Users can read their own notifications" ON notifications;
CREATE POLICY "strict_notifications_access" ON notifications
FOR ALL USING (
  -- User can only access their own notifications
  user_id = auth.uid()
  -- OR user is a super admin
  OR is_super_admin(auth.uid())
);

-- Enhanced storage policies for organization files
DROP POLICY IF EXISTS "Organization file access" ON storage.objects;
CREATE POLICY "enhanced_organization_file_access" ON storage.objects
FOR ALL USING (
  bucket_id = 'organization-files' AND
  -- Validate path structure
  array_length(string_to_array(name, '/'), 1) >= 3 AND
  -- Extract organization ID from path
  (string_to_array(name, '/'))[2]::uuid IN (
    SELECT organization_id FROM memberships 
    WHERE user_id = auth.uid() 
    AND status = 'active'
  )
  -- OR user is a super admin
  OR is_super_admin(auth.uid())
);

-- Create function to log organization access
CREATE OR REPLACE FUNCTION log_organization_access(
  p_organization_id uuid,
  p_action text,
  p_resource_type text DEFAULT NULL,
  p_resource_id text DEFAULT NULL,
  p_success boolean DEFAULT true,
  p_error_message text DEFAULT NULL
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
  -- Only log if user is authenticated
  IF auth.uid() IS NOT NULL THEN
    INSERT INTO organization_access_audit (
      user_id,
      organization_id,
      action,
      resource_type,
      resource_id,
      success,
      error_message
    ) VALUES (
      auth.uid(),
      p_organization_id,
      p_action,
      p_resource_type,
      p_resource_id,
      p_success,
      p_error_message
    );
  END IF;
END;
$$;

-- Create function to validate organization membership with logging
CREATE OR REPLACE FUNCTION validate_organization_access(
  p_organization_id uuid,
  p_action text DEFAULT 'access'
) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  has_access boolean := false;
BEGIN
  -- Check if user is super admin
  IF is_super_admin(auth.uid()) THEN
    has_access := true;
  ELSE
    -- Check if user is active member of organization
    SELECT EXISTS(
      SELECT 1 FROM memberships 
      WHERE user_id = auth.uid() 
      AND organization_id = p_organization_id 
      AND status = 'active'
    ) INTO has_access;
  END IF;
  
  -- Log the access attempt
  PERFORM log_organization_access(
    p_organization_id,
    p_action,
    'organization',
    p_organization_id::text,
    has_access,
    CASE WHEN NOT has_access THEN 'Access denied: insufficient permissions' ELSE NULL END
  );
  
  RETURN has_access;
END;
$$;

-- Enhanced system feature configs RLS
DROP POLICY IF EXISTS "System feature configs readable by authenticated users" ON system_feature_configs;
CREATE POLICY "strict_system_feature_configs_access" ON system_feature_configs
FOR SELECT USING (
  -- Only globally enabled and marketplace visible features for regular users
  (is_enabled_globally = true AND is_marketplace_visible = true)
  -- OR user is a super admin who can see all configs
  OR is_super_admin(auth.uid())
);

-- Organization feature configs with enhanced validation
DROP POLICY IF EXISTS "Organization feature configs viewable by org members" ON organization_feature_configs;
CREATE POLICY "strict_organization_feature_configs_access" ON organization_feature_configs
FOR ALL USING (
  validate_organization_access(organization_id, 'feature_config_access')
);

-- User feature access with organization validation
CREATE POLICY "strict_user_feature_access" ON user_feature_access
FOR ALL USING (
  -- User can access their own feature settings within their organizations
  (user_id = auth.uid() AND validate_organization_access(organization_id, 'user_feature_access'))
  -- OR user is admin of the organization
  OR (
    organization_id IN (
      SELECT organization_id FROM memberships 
      WHERE user_id = auth.uid() 
      AND status = 'active' 
      AND role IN ('admin', 'super_admin')
    )
  )
  -- OR user is a super admin
  OR is_super_admin(auth.uid())
);

-- Create index for better performance on audit queries
CREATE INDEX IF NOT EXISTS idx_organization_access_audit_user_org 
ON organization_access_audit(user_id, organization_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_organization_access_audit_action 
ON organization_access_audit(action, created_at DESC);

-- Create function to clean old audit logs (retention policy)
CREATE OR REPLACE FUNCTION cleanup_old_audit_logs()
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
  -- Delete audit logs older than 1 year
  DELETE FROM organization_access_audit 
  WHERE created_at < NOW() - INTERVAL '1 year';
END;
$$;

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON organization_access_audit TO authenticated;
GRANT EXECUTE ON FUNCTION log_organization_access TO authenticated;
GRANT EXECUTE ON FUNCTION validate_organization_access TO authenticated;
GRANT EXECUTE ON FUNCTION cleanup_old_audit_logs TO authenticated;

-- Add comments for documentation
COMMENT ON TABLE organization_access_audit IS 'Audit trail for organization-level access and operations';
COMMENT ON FUNCTION validate_organization_access IS 'Validates user access to organization with audit logging';
COMMENT ON FUNCTION log_organization_access IS 'Logs organization access attempts for security monitoring';
COMMENT ON FUNCTION cleanup_old_audit_logs IS 'Removes audit logs older than retention period';