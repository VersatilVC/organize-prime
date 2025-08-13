-- Fix rate limiting security issue by replacing the overly restrictive policy
-- Drop the existing policy that blocks all access
DROP POLICY IF EXISTS "rate_limits_system_only" ON public.rate_limits;

-- Create a proper policy that allows system functions to manage rate limits
-- Only SECURITY DEFINER functions can access rate_limits table
CREATE POLICY "rate_limits_system_access" ON public.rate_limits
FOR ALL
USING (
  -- Allow access only from SECURITY DEFINER functions
  -- This is indicated by the function being called with elevated privileges
  current_setting('role', true) = 'service_role' 
  OR current_setting('request.jwt.claims', true)::jsonb->>'role' = 'service_role'
  OR current_user = 'service_role'
);

-- Ensure the check_rate_limit function has proper access
-- Update the existing function to ensure it works with the new policy
CREATE OR REPLACE FUNCTION public.check_rate_limit(
  p_identifier text, 
  p_action_type text, 
  p_limit integer DEFAULT 10, 
  p_window_minutes integer DEFAULT 60
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  current_count INTEGER;
  window_start TIMESTAMP WITH TIME ZONE;
BEGIN
  -- Calculate window start time
  window_start := DATE_TRUNC('minute', NOW()) - 
    INTERVAL '1 minute' * (EXTRACT(MINUTE FROM NOW())::INTEGER % p_window_minutes);
  
  -- Clean old entries (older than 24 hours)
  DELETE FROM rate_limits 
  WHERE window_start < NOW() - INTERVAL '24 hours';
  
  -- Get current count for this window
  SELECT COALESCE(count, 0) INTO current_count
  FROM rate_limits
  WHERE identifier = p_identifier 
  AND action_type = p_action_type
  AND rate_limits.window_start = check_rate_limit.window_start;
  
  -- Check if limit exceeded
  IF current_count >= p_limit THEN
    RETURN FALSE;
  END IF;
  
  -- Increment counter or create new entry
  INSERT INTO rate_limits (identifier, action_type, count, window_start) 
  VALUES (p_identifier, p_action_type, 1, window_start)
  ON CONFLICT (identifier, action_type, window_start) 
  DO UPDATE SET count = rate_limits.count + 1;
  
  RETURN TRUE;
END;
$function$;