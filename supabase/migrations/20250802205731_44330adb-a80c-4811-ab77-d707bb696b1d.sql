-- Insert default notification templates
INSERT INTO system_settings (key, value, category, description) VALUES 
(
  'notification_template_welcome_first_login',
  '{
    "name": "Welcome First Login",
    "type": "welcome_first_login",
    "title": "Welcome to {{app_name}}!",
    "message": "Hello {{user_name}},\n\nWelcome to {{app_name}}! We are excited to have you join {{organization_name}}.\n\nYour account is now set up and ready to use. If you have any questions, please do not hesitate to reach out to our support team.\n\nBest regards,\nThe {{app_name}} Team",
    "active": true,
    "variables": ["{{user_name}}", "{{organization_name}}", "{{app_name}}"]
  }'::jsonb,
  'notifications',
  'Welcome notification for first-time users'
),
(
  'notification_template_user_invitation_accepted',
  '{
    "name": "User Invitation Accepted",
    "type": "user_invitation_accepted",
    "title": "New team member joined!",
    "message": "Great news! {{new_user_name}} has accepted their invitation and joined {{organization_name}}.\n\nThey were invited by {{inviter_name}} and are now part of your team.\n\nWelcome them to the organization!",
    "active": true,
    "variables": ["{{new_user_name}}", "{{organization_name}}", "{{inviter_name}}"]
  }'::jsonb,
  'notifications',
  'Notification sent to admins when a user accepts an invitation'
)
ON CONFLICT (key) DO UPDATE SET
  value = EXCLUDED.value,
  updated_at = NOW();