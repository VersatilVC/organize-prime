-- Fix existing notifications with wrong action_url and debug first login issue
UPDATE notifications 
SET action_url = '/' 
WHERE action_url = '/dashboard' 
AND type = 'welcome_first_login';

-- Check and fix any profiles that might have incorrect first_login_completed status
-- This query will help us understand why the welcome message is appearing