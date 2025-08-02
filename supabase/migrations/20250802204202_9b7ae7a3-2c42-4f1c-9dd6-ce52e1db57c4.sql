-- Create notification template functions
CREATE OR REPLACE FUNCTION get_notification_template(template_type TEXT)
RETURNS JSONB AS $$
DECLARE
  template_data JSONB;
BEGIN
  SELECT value INTO template_data 
  FROM system_settings 
  WHERE key = 'notification_template_' || template_type 
  AND (value->>'active')::boolean = true;
  
  RETURN template_data;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION render_notification_template(
  template_type TEXT,
  variables JSONB DEFAULT '{}'::jsonb
)
RETURNS TABLE(title TEXT, message TEXT) AS $$
DECLARE
  template JSONB;
  rendered_title TEXT;
  rendered_message TEXT;
  var_key TEXT;
  var_value TEXT;
BEGIN
  -- Get template
  template := get_notification_template(template_type);
  
  IF template IS NULL THEN
    RAISE EXCEPTION 'Template not found: %', template_type;
  END IF;
  
  -- Start with template content
  rendered_title := template->>'title';
  rendered_message := template->>'message';
  
  -- Replace variables
  FOR var_key, var_value IN SELECT * FROM jsonb_each_text(variables)
  LOOP
    rendered_title := REPLACE(rendered_title, '{{' || var_key || '}}', var_value);
    rendered_message := REPLACE(rendered_message, '{{' || var_key || '}}', var_value);
  END LOOP;
  
  RETURN QUERY SELECT rendered_title, rendered_message;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create templated notification function
CREATE OR REPLACE FUNCTION create_templated_notification(
  p_template_type TEXT,
  p_user_id UUID,
  p_organization_id UUID,
  p_variables JSONB DEFAULT '{}'::jsonb,
  p_action_url TEXT DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
  notification_id UUID;
  rendered_title TEXT;
  rendered_message TEXT;
BEGIN
  -- Render template
  SELECT title, message INTO rendered_title, rendered_message
  FROM render_notification_template(p_template_type, p_variables);
  
  -- Create notification
  INSERT INTO notifications (
    user_id, organization_id, type, title, message, action_url, data
  ) VALUES (
    p_user_id, p_organization_id, p_template_type, 
    rendered_title, rendered_message, p_action_url, p_variables
  ) RETURNING id INTO notification_id;
  
  RETURN notification_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add first_login_completed to profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS first_login_completed BOOLEAN DEFAULT FALSE;

-- Create trigger for first login welcome
CREATE OR REPLACE FUNCTION handle_first_login() RETURNS TRIGGER AS $$
DECLARE
  org_name TEXT;
  app_name TEXT;
BEGIN
  -- Only trigger on first login
  IF OLD.first_login_completed = FALSE AND NEW.first_login_completed = TRUE THEN
    -- Get organization name
    SELECT name INTO org_name 
    FROM organizations o
    JOIN memberships m ON m.organization_id = o.id
    WHERE m.user_id = NEW.id AND m.status = 'active'
    LIMIT 1;
    
    -- Get app name from settings
    SELECT value->>'value' INTO app_name
    FROM system_settings 
    WHERE key = 'app_name';
    
    IF app_name IS NULL THEN app_name := 'The Ultimate B2B App'; END IF;
    
    -- Send welcome notification
    PERFORM create_templated_notification(
      'welcome_first_login',
      NEW.id,
      (SELECT organization_id FROM memberships WHERE user_id = NEW.id AND status = 'active' LIMIT 1),
      jsonb_build_object(
        'user_name', NEW.full_name,
        'organization_name', COALESCE(org_name, 'your organization'),
        'app_name', app_name
      ),
      '/dashboard'
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_first_login_welcome ON profiles;
CREATE TRIGGER trigger_first_login_welcome
  AFTER UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION handle_first_login();