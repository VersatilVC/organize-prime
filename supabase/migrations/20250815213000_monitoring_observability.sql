-- Monitoring and Observability Infrastructure
-- This migration adds comprehensive monitoring, logging, and observability features

BEGIN;

-- ===== PERFORMANCE MONITORING TABLES =====

-- Query performance monitoring
CREATE TABLE IF NOT EXISTS public.query_performance_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id),
  user_id UUID REFERENCES auth.users(id),
  query_type TEXT NOT NULL,
  query_name TEXT,
  execution_time_ms INTEGER NOT NULL,
  row_count INTEGER,
  cache_hit BOOLEAN DEFAULT FALSE,
  error_message TEXT,
  request_id TEXT,
  user_agent TEXT,
  ip_address INET,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Application metrics
CREATE TABLE IF NOT EXISTS public.application_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id),
  metric_name TEXT NOT NULL,
  metric_value DECIMAL NOT NULL,
  metric_unit TEXT,
  metric_type TEXT NOT NULL, -- 'counter', 'gauge', 'histogram'
  tags JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Error tracking
CREATE TABLE IF NOT EXISTS public.error_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id),
  user_id UUID REFERENCES auth.users(id),
  error_type TEXT NOT NULL,
  error_message TEXT NOT NULL,
  error_stack TEXT,
  request_path TEXT,
  request_method TEXT,
  user_agent TEXT,
  ip_address INET,
  context_data JSONB DEFAULT '{}',
  severity TEXT DEFAULT 'error', -- 'info', 'warn', 'error', 'critical'
  resolved BOOLEAN DEFAULT FALSE,
  resolved_at TIMESTAMP,
  resolved_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- System health checks
CREATE TABLE IF NOT EXISTS public.health_checks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  check_name TEXT NOT NULL,
  check_type TEXT NOT NULL, -- 'database', 'storage', 'external_api', 'function'
  status TEXT NOT NULL, -- 'healthy', 'degraded', 'unhealthy'
  response_time_ms INTEGER,
  details JSONB DEFAULT '{}',
  checked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ===== ENABLE RLS ON MONITORING TABLES =====

ALTER TABLE public.query_performance_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.application_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.error_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.health_checks ENABLE ROW LEVEL SECURITY;

-- ===== RLS POLICIES FOR MONITORING =====

-- Query performance logs (admins only)
CREATE POLICY "query_performance_admin_access" ON public.query_performance_logs
FOR ALL USING (
  public.is_super_admin()
  OR public.is_org_admin(organization_id)
);

-- Application metrics (admins only)
CREATE POLICY "application_metrics_admin_access" ON public.application_metrics
FOR ALL USING (
  public.is_super_admin()
  OR public.is_org_admin(organization_id)
);

-- Error logs (admins only)
CREATE POLICY "error_logs_admin_access" ON public.error_logs
FOR ALL USING (
  public.is_super_admin()
  OR public.is_org_admin(organization_id)
);

-- Health checks (super admins only)
CREATE POLICY "health_checks_super_admin_only" ON public.health_checks
FOR ALL USING (public.is_super_admin());

-- ===== MONITORING FUNCTIONS =====

-- Log query performance
CREATE OR REPLACE FUNCTION public.log_query_performance(
  p_organization_id UUID,
  p_user_id UUID,
  p_query_type TEXT,
  p_query_name TEXT,
  p_execution_time_ms INTEGER,
  p_row_count INTEGER DEFAULT NULL,
  p_cache_hit BOOLEAN DEFAULT FALSE,
  p_error_message TEXT DEFAULT NULL
) RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.query_performance_logs (
    organization_id, user_id, query_type, query_name, 
    execution_time_ms, row_count, cache_hit, error_message
  ) VALUES (
    p_organization_id, p_user_id, p_query_type, p_query_name,
    p_execution_time_ms, p_row_count, p_cache_hit, p_error_message
  );
END;
$$;

-- Log application metrics
CREATE OR REPLACE FUNCTION public.log_metric(
  p_organization_id UUID,
  p_metric_name TEXT,
  p_metric_value DECIMAL,
  p_metric_unit TEXT DEFAULT NULL,
  p_metric_type TEXT DEFAULT 'gauge',
  p_tags JSONB DEFAULT '{}'
) RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.application_metrics (
    organization_id, metric_name, metric_value, 
    metric_unit, metric_type, tags
  ) VALUES (
    p_organization_id, p_metric_name, p_metric_value,
    p_metric_unit, p_metric_type, p_tags
  );
END;
$$;

-- Log errors
CREATE OR REPLACE FUNCTION public.log_error(
  p_organization_id UUID,
  p_user_id UUID,
  p_error_type TEXT,
  p_error_message TEXT,
  p_error_stack TEXT DEFAULT NULL,
  p_request_path TEXT DEFAULT NULL,
  p_request_method TEXT DEFAULT NULL,
  p_context_data JSONB DEFAULT '{}',
  p_severity TEXT DEFAULT 'error'
) RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.error_logs (
    organization_id, user_id, error_type, error_message,
    error_stack, request_path, request_method, 
    context_data, severity
  ) VALUES (
    p_organization_id, p_user_id, p_error_type, p_error_message,
    p_error_stack, p_request_path, p_request_method,
    p_context_data, p_severity
  );
END;
$$;

-- Health check function
CREATE OR REPLACE FUNCTION public.perform_health_check(
  p_check_name TEXT,
  p_check_type TEXT
) RETURNS JSON
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  start_time TIMESTAMP;
  end_time TIMESTAMP;
  response_time INTEGER;
  status TEXT := 'healthy';
  details JSONB := '{}';
  result JSON;
BEGIN
  start_time := clock_timestamp();
  
  -- Perform different checks based on type
  CASE p_check_type
    WHEN 'database' THEN
      -- Test database connectivity and performance
      PERFORM COUNT(*) FROM public.organizations LIMIT 1;
      details := jsonb_build_object('test', 'database_connection', 'tables_accessible', true);
      
    WHEN 'storage' THEN
      -- Test storage accessibility (placeholder)
      details := jsonb_build_object('test', 'storage_access', 'accessible', true);
      
    WHEN 'auth' THEN
      -- Test auth functionality
      PERFORM COUNT(*) FROM auth.users LIMIT 1;
      details := jsonb_build_object('test', 'auth_system', 'accessible', true);
      
    ELSE
      -- Default health check
      details := jsonb_build_object('test', 'basic_health', 'status', 'unknown');
  END CASE;
  
  end_time := clock_timestamp();
  response_time := EXTRACT(EPOCH FROM (end_time - start_time)) * 1000;
  
  -- Determine status based on response time
  IF response_time > 5000 THEN
    status := 'unhealthy';
  ELSIF response_time > 2000 THEN
    status := 'degraded';
  END IF;
  
  -- Log the health check
  INSERT INTO public.health_checks (
    check_name, check_type, status, response_time_ms, details
  ) VALUES (
    p_check_name, p_check_type, status, response_time, details
  );
  
  result := json_build_object(
    'check_name', p_check_name,
    'check_type', p_check_type,
    'status', status,
    'response_time_ms', response_time,
    'details', details,
    'timestamp', NOW()
  );
  
  RETURN result;
END;
$$;

-- ===== ALERTING AND MONITORING FUNCTIONS =====

-- Get system health overview
CREATE OR REPLACE FUNCTION public.get_system_health_overview()
RETURNS JSON
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  result JSON;
  db_health JSON;
  error_rate DECIMAL;
  avg_response_time DECIMAL;
  active_users INTEGER;
BEGIN
  -- Only super admins can access
  IF NOT public.is_super_admin() THEN
    RETURN json_build_object('error', 'Access denied');
  END IF;
  
  -- Get latest health check results
  SELECT json_build_object(
    'database', COALESCE(
      (SELECT json_build_object('status', status, 'response_time', response_time_ms, 'last_check', checked_at)
       FROM public.health_checks 
       WHERE check_type = 'database' 
       ORDER BY checked_at DESC LIMIT 1),
      '{"status": "unknown"}'
    ),
    'storage', COALESCE(
      (SELECT json_build_object('status', status, 'response_time', response_time_ms, 'last_check', checked_at)
       FROM public.health_checks 
       WHERE check_type = 'storage' 
       ORDER BY checked_at DESC LIMIT 1),
      '{"status": "unknown"}'
    )
  ) INTO db_health;
  
  -- Calculate error rate (last hour)
  SELECT 
    ROUND(
      (COUNT(*) FILTER (WHERE severity IN ('error', 'critical'))::DECIMAL / 
       GREATEST(COUNT(*), 1)) * 100, 2
    )
  INTO error_rate
  FROM public.error_logs
  WHERE created_at > NOW() - INTERVAL '1 hour';
  
  -- Calculate average response time (last hour)
  SELECT ROUND(AVG(execution_time_ms), 2)
  INTO avg_response_time
  FROM public.query_performance_logs
  WHERE created_at > NOW() - INTERVAL '1 hour';
  
  -- Count active users (last 24 hours)
  SELECT COUNT(DISTINCT user_id)
  INTO active_users
  FROM public.query_performance_logs
  WHERE created_at > NOW() - INTERVAL '24 hours';
  
  result := json_build_object(
    'overall_status', 'healthy', -- Simplified for now
    'services', db_health,
    'metrics', json_build_object(
      'error_rate_percent', COALESCE(error_rate, 0),
      'avg_response_time_ms', COALESCE(avg_response_time, 0),
      'active_users_24h', COALESCE(active_users, 0)
    ),
    'last_updated', NOW()
  );
  
  RETURN result;
END;
$$;

-- Get performance insights
CREATE OR REPLACE FUNCTION public.get_performance_insights(
  p_organization_id UUID DEFAULT NULL,
  p_hours INTEGER DEFAULT 24
) RETURNS JSON
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  result JSON;
  can_access BOOLEAN;
BEGIN
  -- Check access
  can_access := public.is_super_admin() OR (
    p_organization_id IS NOT NULL AND public.is_org_admin(p_organization_id)
  );
  
  IF NOT can_access THEN
    RETURN json_build_object('error', 'Access denied');
  END IF;
  
  WITH performance_stats AS (
    SELECT 
      query_type,
      COUNT(*) as query_count,
      ROUND(AVG(execution_time_ms), 2) as avg_time,
      ROUND(PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY execution_time_ms), 2) as p95_time,
      MAX(execution_time_ms) as max_time,
      COUNT(*) FILTER (WHERE cache_hit = true) as cache_hits,
      COUNT(*) FILTER (WHERE error_message IS NOT NULL) as errors
    FROM public.query_performance_logs
    WHERE created_at > NOW() - (p_hours || ' hours')::INTERVAL
    AND (p_organization_id IS NULL OR organization_id = p_organization_id)
    GROUP BY query_type
    ORDER BY query_count DESC
  )
  SELECT json_build_object(
    'time_range_hours', p_hours,
    'query_performance', json_agg(
      json_build_object(
        'query_type', query_type,
        'query_count', query_count,
        'avg_time_ms', avg_time,
        'p95_time_ms', p95_time,
        'max_time_ms', max_time,
        'cache_hit_rate', ROUND((cache_hits::DECIMAL / query_count) * 100, 2),
        'error_rate', ROUND((errors::DECIMAL / query_count) * 100, 2)
      )
    ),
    'generated_at', NOW()
  ) INTO result
  FROM performance_stats;
  
  RETURN COALESCE(result, json_build_object('query_performance', '[]'::json));
END;
$$;

-- ===== INDEXES FOR MONITORING TABLES =====

-- Performance logs indexes
CREATE INDEX idx_query_performance_org_time ON public.query_performance_logs(organization_id, created_at DESC);
CREATE INDEX idx_query_performance_type_time ON public.query_performance_logs(query_type, created_at DESC);
CREATE INDEX idx_query_performance_slow_queries ON public.query_performance_logs(execution_time_ms DESC, created_at DESC);

-- Metrics indexes
CREATE INDEX idx_application_metrics_org_name_time ON public.application_metrics(organization_id, metric_name, created_at DESC);
CREATE INDEX idx_application_metrics_type_time ON public.application_metrics(metric_type, created_at DESC);

-- Error logs indexes
CREATE INDEX idx_error_logs_org_severity_time ON public.error_logs(organization_id, severity, created_at DESC);
CREATE INDEX idx_error_logs_type_time ON public.error_logs(error_type, created_at DESC);
CREATE INDEX idx_error_logs_unresolved ON public.error_logs(resolved, created_at DESC) WHERE resolved = false;

-- Health checks indexes
CREATE INDEX idx_health_checks_type_time ON public.health_checks(check_type, checked_at DESC);
CREATE INDEX idx_health_checks_status_time ON public.health_checks(status, checked_at DESC);

-- ===== AUTOMATED CLEANUP =====

-- Function to clean up old monitoring data
CREATE OR REPLACE FUNCTION public.cleanup_monitoring_data()
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
  -- Clean up old performance logs (keep 30 days)
  DELETE FROM public.query_performance_logs 
  WHERE created_at < NOW() - INTERVAL '30 days';
  
  -- Clean up old metrics (keep 90 days)
  DELETE FROM public.application_metrics 
  WHERE created_at < NOW() - INTERVAL '90 days';
  
  -- Clean up resolved error logs (keep 30 days)
  DELETE FROM public.error_logs 
  WHERE resolved = true AND resolved_at < NOW() - INTERVAL '30 days';
  
  -- Clean up old health checks (keep 7 days)
  DELETE FROM public.health_checks 
  WHERE checked_at < NOW() - INTERVAL '7 days';
  
  -- Log the cleanup
  PERFORM public.log_metric(
    NULL, 'monitoring_cleanup_completed', 1, 'count', 'counter',
    json_build_object('cleanup_time', NOW())
  );
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.log_query_performance TO authenticated;
GRANT EXECUTE ON FUNCTION public.log_metric TO authenticated;
GRANT EXECUTE ON FUNCTION public.log_error TO authenticated;
GRANT EXECUTE ON FUNCTION public.perform_health_check TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_system_health_overview TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_performance_insights TO authenticated;
GRANT EXECUTE ON FUNCTION public.cleanup_monitoring_data TO authenticated;

COMMIT;

-- Add documentation
COMMENT ON TABLE public.query_performance_logs IS 'Tracks query performance and execution metrics';
COMMENT ON TABLE public.application_metrics IS 'Stores custom application metrics and KPIs';
COMMENT ON TABLE public.error_logs IS 'Centralized error tracking and monitoring';
COMMENT ON TABLE public.health_checks IS 'System health check results and status monitoring';
COMMENT ON FUNCTION public.get_system_health_overview IS 'Provides comprehensive system health overview for monitoring dashboards';
COMMENT ON FUNCTION public.get_performance_insights IS 'Analyzes query performance patterns and provides optimization insights';