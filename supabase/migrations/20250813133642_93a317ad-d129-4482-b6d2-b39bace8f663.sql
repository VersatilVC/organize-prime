-- Fix the check_rate_limit function by resolving the ambiguous column reference
-- Drop the existing problematic function and recreate it properly
DROP FUNCTION IF EXISTS public.check_rate_limit(text, text, integer, integer);

-- Create a corrected version that eliminates the window_start ambiguity
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
  window_start_time TIMESTAMP WITH TIME ZONE;
BEGIN
  -- Calculate window start time
  window_start_time := DATE_TRUNC('minute', NOW()) - 
    INTERVAL '1 minute' * (EXTRACT(MINUTE FROM NOW())::INTEGER % p_window_minutes);
  
  -- Clean old entries (older than 24 hours)
  DELETE FROM rate_limits 
  WHERE window_start < NOW() - INTERVAL '24 hours';
  
  -- Get current count for this window
  SELECT COALESCE(count, 0) INTO current_count
  FROM rate_limits
  WHERE identifier = p_identifier 
  AND action_type = p_action_type
  AND window_start = window_start_time;
  
  -- Check if limit exceeded
  IF current_count >= p_limit THEN
    RETURN FALSE;
  END IF;
  
  -- Increment counter or create new entry
  INSERT INTO rate_limits (identifier, action_type, count, window_start) 
  VALUES (p_identifier, p_action_type, 1, window_start_time)
  ON CONFLICT (identifier, action_type, window_start) 
  DO UPDATE SET count = rate_limits.count + 1;
  
  RETURN TRUE;
END;
$function$;