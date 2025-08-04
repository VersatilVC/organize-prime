-- CRITICAL SECURITY FIXES - RLS Policies and Data Protection

-- 1. Enhanced Notifications Security Policies
DROP POLICY IF EXISTS "Users can view their own notifications" ON notifications;
DROP POLICY IF EXISTS "Users can update their own notifications" ON notifications;
DROP POLICY IF EXISTS "Users can delete their own notifications" ON notifications;
DROP POLICY IF EXISTS "System can insert notifications" ON notifications;

CREATE POLICY "notifications_select_policy" ON notifications
  FOR SELECT USING (
    user_id = auth.uid() OR 
    (organization_id IN (
      SELECT organization_id FROM memberships 
      WHERE user_id = auth.uid() AND status = 'active' AND role IN ('admin', 'super_admin')
    ))
  );

CREATE POLICY "notifications_update_policy" ON notifications
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "notifications_insert_policy" ON notifications
  FOR INSERT WITH CHECK (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND is_super_admin = true
    )
  );

CREATE POLICY "notifications_delete_policy" ON notifications
  FOR DELETE USING (user_id = auth.uid());

-- 2. System Settings Security - Super Admin Only
DROP POLICY IF EXISTS "Super admins can manage system settings" ON system_settings;

CREATE POLICY "system_settings_select_policy" ON system_settings
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND is_super_admin = true
    )
  );

CREATE POLICY "system_settings_insert_policy" ON system_settings
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND is_super_admin = true
    )
  );

CREATE POLICY "system_settings_update_policy" ON system_settings
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND is_super_admin = true
    )
  );

CREATE POLICY "system_settings_delete_policy" ON system_settings
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND is_super_admin = true
    )
  );

-- 3. Organization Settings Security - Enhanced Isolation
DROP POLICY IF EXISTS "Organization admins can manage org settings" ON organization_settings;

CREATE POLICY "org_settings_select_policy" ON organization_settings
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM memberships 
      WHERE user_id = auth.uid() AND status = 'active'
    ) OR EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND is_super_admin = true
    )
  );

CREATE POLICY "org_settings_insert_policy" ON organization_settings
  FOR INSERT WITH CHECK (
    (organization_id IN (
      SELECT organization_id FROM memberships 
      WHERE user_id = auth.uid() AND status = 'active' AND role = 'admin'
    )) OR EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND is_super_admin = true
    )
  );

CREATE POLICY "org_settings_update_policy" ON organization_settings
  FOR UPDATE USING (
    (organization_id IN (
      SELECT organization_id FROM memberships 
      WHERE user_id = auth.uid() AND status = 'active' AND role = 'admin'
    )) OR EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND is_super_admin = true
    )
  );

CREATE POLICY "org_settings_delete_policy" ON organization_settings
  FOR DELETE USING (
    (organization_id IN (
      SELECT organization_id FROM memberships 
      WHERE user_id = auth.uid() AND status = 'active' AND role = 'admin'
    )) OR EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND is_super_admin = true
    )
  );

-- 4. Audit Logs Security - Critical for compliance
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "audit_logs_select_policy" ON audit_logs
  FOR SELECT USING (
    user_id = auth.uid() OR
    organization_id IN (
      SELECT organization_id FROM memberships 
      WHERE user_id = auth.uid() AND status = 'active' AND role = 'admin'
    ) OR EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND is_super_admin = true
    )
  );

CREATE POLICY "audit_logs_insert_policy" ON audit_logs
  FOR INSERT WITH CHECK (true); -- System can insert audit logs

-- Users cannot modify audit logs - security compliance
CREATE POLICY "audit_logs_no_update" ON audit_logs
  FOR UPDATE USING (false);

CREATE POLICY "audit_logs_no_delete" ON audit_logs
  FOR DELETE USING (false);

-- 5. Enhanced File Storage Security
DROP POLICY IF EXISTS "Users can manage files in their organizations" ON files;
DROP POLICY IF EXISTS "Users can view files in their organizations" ON files;

CREATE POLICY "files_select_policy" ON files
  FOR SELECT USING (
    -- Users can see files in their organizations
    organization_id IN (
      SELECT organization_id FROM memberships 
      WHERE user_id = auth.uid() AND status = 'active'
    ) OR
    -- Or if file is public
    is_public = true OR
    -- Or if user uploaded the file
    uploaded_by = auth.uid() OR
    -- Super admin can see all files
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND is_super_admin = true
    )
  );

CREATE POLICY "files_insert_policy" ON files
  FOR INSERT WITH CHECK (
    uploaded_by = auth.uid() AND
    (organization_id IN (
      SELECT organization_id FROM memberships 
      WHERE user_id = auth.uid() AND status = 'active'
    ) OR EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND is_super_admin = true
    ))
  );

CREATE POLICY "files_update_policy" ON files
  FOR UPDATE USING (
    uploaded_by = auth.uid() OR
    organization_id IN (
      SELECT organization_id FROM memberships 
      WHERE user_id = auth.uid() AND status = 'active' AND role = 'admin'
    ) OR EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND is_super_admin = true
    )
  );

CREATE POLICY "files_delete_policy" ON files
  FOR DELETE USING (
    uploaded_by = auth.uid() OR
    organization_id IN (
      SELECT organization_id FROM memberships 
      WHERE user_id = auth.uid() AND status = 'active' AND role = 'admin'
    ) OR EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND is_super_admin = true
    )
  );

-- 6. Secure other tables with missing RLS policies
ALTER TABLE dashboard_widgets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "dashboard_widgets_user_policy" ON dashboard_widgets
  FOR ALL USING (
    user_id = auth.uid() OR
    organization_id IN (
      SELECT organization_id FROM memberships 
      WHERE user_id = auth.uid() AND status = 'active' AND role = 'admin'
    ) OR EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND is_super_admin = true
    )
  );

ALTER TABLE search_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "search_history_user_policy" ON search_history
  FOR ALL USING (
    user_id = auth.uid() OR
    organization_id IN (
      SELECT organization_id FROM memberships 
      WHERE user_id = auth.uid() AND status = 'active' AND role = 'admin'
    ) OR EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND is_super_admin = true
    )
  );

ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "subscriptions_org_policy" ON subscriptions
  FOR ALL USING (
    organization_id IN (
      SELECT organization_id FROM memberships 
      WHERE user_id = auth.uid() AND status = 'active' AND role = 'admin'
    ) OR EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND is_super_admin = true
    )
  );

ALTER TABLE help_articles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "help_articles_read_policy" ON help_articles
  FOR SELECT USING (is_published = true OR EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() AND is_super_admin = true
  ));

CREATE POLICY "help_articles_admin_policy" ON help_articles
  FOR ALL USING (EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() AND is_super_admin = true
  ));

ALTER TABLE webhooks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "webhooks_org_policy" ON webhooks
  FOR ALL USING (
    organization_id IN (
      SELECT organization_id FROM memberships 
      WHERE user_id = auth.uid() AND status = 'active' AND role = 'admin'
    ) OR EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND is_super_admin = true
    )
  );

ALTER TABLE workflow_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "workflow_templates_policy" ON workflow_templates
  FOR ALL USING (
    (is_system = true) OR
    organization_id IN (
      SELECT organization_id FROM memberships 
      WHERE user_id = auth.uid() AND status = 'active' AND role = 'admin'
    ) OR EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND is_super_admin = true
    )
  );

ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "api_keys_org_policy" ON api_keys
  FOR ALL USING (
    organization_id IN (
      SELECT organization_id FROM memberships 
      WHERE user_id = auth.uid() AND status = 'active' AND role = 'admin'
    ) OR EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND is_super_admin = true
    )
  );