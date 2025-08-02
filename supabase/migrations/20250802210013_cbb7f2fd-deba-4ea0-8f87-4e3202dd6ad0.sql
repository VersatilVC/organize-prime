-- Fix the action_url in the welcome notification trigger
CREATE OR REPLACE FUNCTION public.handle_first_login()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
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
    
    -- Send welcome notification with correct action_url
    PERFORM create_templated_notification(
      'welcome_first_login',
      NEW.id,
      (SELECT organization_id FROM memberships WHERE user_id = NEW.id AND status = 'active' LIMIT 1),
      jsonb_build_object(
        'user_name', NEW.full_name,
        'organization_name', COALESCE(org_name, 'your organization'),
        'app_name', app_name
      ),
      '/' -- Fix: Use root route instead of /dashboard
    );
  END IF;
  
  RETURN NEW;
END;
$function$;