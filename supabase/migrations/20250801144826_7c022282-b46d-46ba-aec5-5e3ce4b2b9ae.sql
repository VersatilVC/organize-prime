-- Fix the get_user_emails_for_super_admin function to handle varchar type
DROP FUNCTION IF EXISTS public.get_user_emails_for_super_admin(uuid[]);

CREATE OR REPLACE FUNCTION public.get_user_emails_for_super_admin(user_ids uuid[])
RETURNS TABLE(user_id uuid, email text)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Only allow super admins to call this function
  IF NOT is_super_admin() THEN
    RAISE EXCEPTION 'Access denied. Only super admins can access user emails.';
  END IF;

  RETURN QUERY
  SELECT 
    au.id as user_id,
    au.email::text as email
  FROM auth.users au
  WHERE au.id = ANY(user_ids);
END;
$$;