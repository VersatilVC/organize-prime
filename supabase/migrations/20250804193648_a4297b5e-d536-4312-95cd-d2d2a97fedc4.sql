-- ADDITIONAL SECURITY ENHANCEMENTS - Part 2

-- 1. Add encryption extension if not exists
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 2. Input validation functions
CREATE OR REPLACE FUNCTION validate_email(email_text TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN email_text ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$';
END;
$$ LANGUAGE plpgsql IMMUTABLE SECURITY DEFINER;

-- 3. API Key Security Enhancement
CREATE OR REPLACE FUNCTION hash_api_key(key_text TEXT)
RETURNS TEXT AS $$
BEGIN
  RETURN crypt(key_text, gen_salt('bf', 12));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION verify_api_key(key_text TEXT, hash_text TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN crypt(key_text, hash_text) = hash_text;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Rate Limiting Protection
CREATE TABLE IF NOT EXISTS rate_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  identifier TEXT NOT NULL, -- Can be user_id, IP, etc.
  action_type TEXT NOT NULL,
  count INTEGER DEFAULT 1,
  window_start TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(identifier, action_type, window_start)
);

ALTER TABLE rate_limits ENABLE ROW LEVEL SECURITY;

-- Only system can manage rate limits
CREATE POLICY "rate_limits_system_only" ON rate_limits
  FOR ALL USING (false);

CREATE OR REPLACE FUNCTION check_rate_limit(
  p_identifier TEXT,
  p_action_type TEXT,
  p_limit INTEGER DEFAULT 10,
  p_window_minutes INTEGER DEFAULT 60
)
RETURNS BOOLEAN AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Security Audit Function
CREATE OR REPLACE FUNCTION log_security_event(
  p_user_id UUID,
  p_organization_id UUID,
  p_action TEXT,
  p_resource_type TEXT,
  p_resource_id TEXT,
  p_ip_address INET DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL,
  p_details JSONB DEFAULT '{}'::jsonb
)
RETURNS UUID AS $$
DECLARE
  audit_id UUID;
BEGIN
  INSERT INTO audit_logs (
    user_id, 
    organization_id, 
    action, 
    resource_type, 
    resource_id,
    ip_address,
    user_agent,
    changes
  ) VALUES (
    p_user_id,
    p_organization_id,
    p_action,
    p_resource_type,
    p_resource_id,
    p_ip_address,
    p_user_agent,
    p_details
  ) RETURNING id INTO audit_id;
  
  RETURN audit_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Password strength validation
CREATE OR REPLACE FUNCTION validate_password_strength(password_text TEXT)
RETURNS JSONB AS $$
DECLARE
  result JSONB;
  score INTEGER := 0;
  feedback TEXT[] := ARRAY[]::TEXT[];
BEGIN
  -- Check length
  IF LENGTH(password_text) >= 8 THEN
    score := score + 1;
  ELSE
    feedback := feedback || 'Password must be at least 8 characters long';
  END IF;
  
  -- Check for uppercase
  IF password_text ~ '[A-Z]' THEN
    score := score + 1;
  ELSE
    feedback := feedback || 'Password must contain at least one uppercase letter';
  END IF;
  
  -- Check for lowercase
  IF password_text ~ '[a-z]' THEN
    score := score + 1;
  ELSE
    feedback := feedback || 'Password must contain at least one lowercase letter';
  END IF;
  
  -- Check for numbers
  IF password_text ~ '[0-9]' THEN
    score := score + 1;
  ELSE
    feedback := feedback || 'Password must contain at least one number';
  END IF;
  
  -- Check for special characters
  IF password_text ~ '[^A-Za-z0-9]' THEN
    score := score + 1;
  ELSE
    feedback := feedback || 'Password must contain at least one special character';
  END IF;
  
  -- Check for common patterns
  IF password_text ~* '(password|123456|qwerty|admin)' THEN
    feedback := feedback || 'Password contains common patterns';
    score := score - 1;
  END IF;
  
  result := jsonb_build_object(
    'score', GREATEST(score, 0),
    'max_score', 5,
    'is_strong', score >= 4,
    'feedback', feedback
  );
  
  RETURN result;
END;
$$ LANGUAGE plpgsql IMMUTABLE SECURITY DEFINER;

-- 7. Session security enhancements
CREATE OR REPLACE FUNCTION validate_session_security()
RETURNS BOOLEAN AS $$
DECLARE
  user_id UUID;
  last_activity TIMESTAMP WITH TIME ZONE;
  session_timeout INTEGER := 3600; -- 1 hour default
BEGIN
  user_id := auth.uid();
  
  IF user_id IS NULL THEN
    RETURN FALSE;
  END IF;
  
  -- Get last activity
  SELECT last_login_at INTO last_activity
  FROM profiles 
  WHERE id = user_id;
  
  -- Check session timeout
  IF last_activity IS NOT NULL AND 
     last_activity < NOW() - INTERVAL '1 second' * session_timeout THEN
    RETURN FALSE;
  END IF;
  
  -- Update last activity
  UPDATE profiles 
  SET last_login_at = NOW()
  WHERE id = user_id;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. Data sanitization function
CREATE OR REPLACE FUNCTION sanitize_input(input_text TEXT)
RETURNS TEXT AS $$
BEGIN
  IF input_text IS NULL THEN
    RETURN NULL;
  END IF;
  
  -- Remove potential XSS and SQL injection patterns
  input_text := REGEXP_REPLACE(input_text, '<[^>]*>', '', 'g'); -- Remove HTML tags
  input_text := REGEXP_REPLACE(input_text, '[''";\\]', '', 'g'); -- Remove dangerous chars
  input_text := TRIM(input_text);
  
  -- Limit length
  IF LENGTH(input_text) > 1000 THEN
    input_text := LEFT(input_text, 1000);
  END IF;
  
  RETURN input_text;
END;
$$ LANGUAGE plpgsql IMMUTABLE SECURITY DEFINER;