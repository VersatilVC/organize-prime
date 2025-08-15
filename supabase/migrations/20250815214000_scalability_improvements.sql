-- Scalability Improvements and Optimization Features
-- This migration adds features to support high-scale operations and better performance

BEGIN;

-- ===== BATCH OPERATION SUPPORT =====

-- Batch operation logs
CREATE TABLE IF NOT EXISTS public.batch_operations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id),
  user_id UUID REFERENCES auth.users(id),
  operation_type TEXT NOT NULL, -- 'bulk_insert', 'bulk_update', 'bulk_delete'
  table_name TEXT NOT NULL,
  total_items INTEGER NOT NULL,
  processed_items INTEGER DEFAULT 0,
  successful_items INTEGER DEFAULT 0,
  failed_items INTEGER DEFAULT 0,
  status TEXT DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'failed'
  started_at TIMESTAMP,
  completed_at TIMESTAMP,
  error_message TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.batch_operations ENABLE ROW LEVEL SECURITY;

-- RLS Policy
CREATE POLICY "batch_operations_org_access" ON public.batch_operations
FOR ALL USING (
  public.validate_organization_membership(auth.uid(), organization_id)
  OR public.is_super_admin()
);

-- ===== CONNECTION POOLING OPTIMIZATION =====

-- Connection pool statistics
CREATE TABLE IF NOT EXISTS public.connection_pool_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pool_name TEXT NOT NULL,
  active_connections INTEGER NOT NULL,
  idle_connections INTEGER NOT NULL,
  total_connections INTEGER NOT NULL,
  max_connections INTEGER NOT NULL,
  connection_requests INTEGER DEFAULT 0,
  connection_timeouts INTEGER DEFAULT 0,
  average_checkout_time_ms INTEGER,
  recorded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ===== CACHING OPTIMIZATION =====

-- Query cache tracking
CREATE TABLE IF NOT EXISTS public.query_cache_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cache_key TEXT NOT NULL,
  query_type TEXT NOT NULL,
  hit_count INTEGER DEFAULT 0,
  miss_count INTEGER DEFAULT 0,
  last_hit_at TIMESTAMP,
  last_miss_at TIMESTAMP,
  cache_size_bytes INTEGER,
  ttl_seconds INTEGER,
  organization_id UUID REFERENCES organizations(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.query_cache_stats ENABLE ROW LEVEL SECURITY;

-- RLS Policy
CREATE POLICY "cache_stats_org_access" ON public.query_cache_stats
FOR ALL USING (
  organization_id IS NULL OR
  public.validate_organization_membership(auth.uid(), organization_id) OR
  public.is_super_admin()
);

-- ===== BACKGROUND JOB SYSTEM =====

-- Background jobs queue
CREATE TABLE IF NOT EXISTS public.background_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id),
  job_type TEXT NOT NULL,
  job_name TEXT NOT NULL,
  payload JSONB NOT NULL,
  priority INTEGER DEFAULT 0, -- Higher number = higher priority
  status TEXT DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'failed', 'retrying'
  attempts INTEGER DEFAULT 0,
  max_attempts INTEGER DEFAULT 3,
  scheduled_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  started_at TIMESTAMP,
  completed_at TIMESTAMP,
  error_message TEXT,
  result JSONB,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.background_jobs ENABLE ROW LEVEL SECURITY;

-- RLS Policy
CREATE POLICY "background_jobs_access" ON public.background_jobs
FOR ALL USING (
  public.is_super_admin() OR
  public.is_org_admin(organization_id) OR
  (created_by = auth.uid() AND public.validate_organization_membership(auth.uid(), organization_id))
);

-- ===== SCALABLE BATCH FUNCTIONS =====

-- Optimized bulk user insert/update
CREATE OR REPLACE FUNCTION public.bulk_upsert_users(
  p_organization_id UUID,
  p_requesting_user_id UUID,
  p_users JSONB
) RETURNS JSON
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  result JSON;
  batch_id UUID;
  total_users INTEGER;
  processed_count INTEGER := 0;
  success_count INTEGER := 0;
  error_count INTEGER := 0;
  user_record JSONB;
  user_id UUID;
  membership_id UUID;
BEGIN
  -- Validate access
  IF NOT (public.is_super_admin(p_requesting_user_id) OR public.is_org_admin(p_organization_id, p_requesting_user_id)) THEN
    RETURN json_build_object('error', 'Access denied');
  END IF;
  
  -- Create batch operation record
  INSERT INTO public.batch_operations (
    organization_id, user_id, operation_type, table_name, total_items, status, started_at
  ) VALUES (
    p_organization_id, p_requesting_user_id, 'bulk_upsert', 'users', 
    jsonb_array_length(p_users), 'processing', NOW()
  ) RETURNING id INTO batch_id;
  
  total_users := jsonb_array_length(p_users);
  
  -- Process each user
  FOR i IN 0..total_users-1 LOOP
    BEGIN
      user_record := p_users->i;
      processed_count := processed_count + 1;
      
      -- Upsert into auth.users (if needed - typically handled by auth system)
      -- This is a simplified version - in practice, user creation should go through auth system
      
      -- Create or update membership
      INSERT INTO public.memberships (
        user_id, organization_id, role, status, department, position, invited_by
      ) VALUES (
        (user_record->>'user_id')::UUID,
        p_organization_id,
        COALESCE(user_record->>'role', 'user'),
        COALESCE(user_record->>'status', 'active'),
        user_record->>'department',
        user_record->>'position',
        p_requesting_user_id
      )
      ON CONFLICT (user_id, organization_id) 
      DO UPDATE SET
        role = EXCLUDED.role,
        status = EXCLUDED.status,
        department = EXCLUDED.department,
        position = EXCLUDED.position,
        updated_at = NOW();
      
      success_count := success_count + 1;
      
    EXCEPTION WHEN OTHERS THEN
      error_count := error_count + 1;
      -- Log individual error but continue processing
    END;
  END LOOP;
  
  -- Update batch operation
  UPDATE public.batch_operations SET
    processed_items = processed_count,
    successful_items = success_count,
    failed_items = error_count,
    status = CASE WHEN error_count = 0 THEN 'completed' ELSE 'completed_with_errors' END,
    completed_at = NOW()
  WHERE id = batch_id;
  
  result := json_build_object(
    'batch_id', batch_id,
    'total_processed', processed_count,
    'successful', success_count,
    'failed', error_count,
    'status', 'completed'
  );
  
  RETURN result;
END;
$$;

-- ===== OPTIMIZED BULK OPERATIONS =====

-- Bulk feedback status update
CREATE OR REPLACE FUNCTION public.bulk_update_feedback_status(
  p_organization_id UUID,
  p_requesting_user_id UUID,
  p_feedback_ids UUID[],
  p_new_status TEXT,
  p_admin_response TEXT DEFAULT NULL
) RETURNS JSON
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  result JSON;
  updated_count INTEGER;
BEGIN
  -- Validate access
  IF NOT (public.is_super_admin(p_requesting_user_id) OR public.is_org_admin(p_organization_id, p_requesting_user_id)) THEN
    RETURN json_build_object('error', 'Access denied');
  END IF;
  
  -- Perform bulk update
  UPDATE public.feedback SET
    status = p_new_status,
    admin_response = COALESCE(p_admin_response, admin_response),
    responded_by = CASE WHEN p_admin_response IS NOT NULL THEN p_requesting_user_id ELSE responded_by END,
    responded_at = CASE WHEN p_admin_response IS NOT NULL THEN NOW() ELSE responded_at END,
    updated_at = NOW()
  WHERE id = ANY(p_feedback_ids)
  AND organization_id = p_organization_id;
  
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  
  -- Create notifications for affected users
  INSERT INTO public.notifications (
    user_id, organization_id, type, category, title, message, data
  )
  SELECT 
    f.user_id,
    f.organization_id,
    'feedback_update',
    'feedback',
    'Feedback Status Updated',
    'Your feedback "' || f.subject || '" has been updated to: ' || p_new_status,
    json_build_object('feedback_id', f.id, 'new_status', p_new_status)
  FROM public.feedback f
  WHERE f.id = ANY(p_feedback_ids)
  AND f.organization_id = p_organization_id;
  
  result := json_build_object(
    'updated_count', updated_count,
    'new_status', p_new_status,
    'notifications_sent', updated_count
  );
  
  RETURN result;
END;
$$;

-- ===== ADVANCED CACHING FUNCTIONS =====

-- Cache hit/miss tracking
CREATE OR REPLACE FUNCTION public.track_cache_usage(
  p_cache_key TEXT,
  p_query_type TEXT,
  p_is_hit BOOLEAN,
  p_organization_id UUID DEFAULT NULL,
  p_cache_size_bytes INTEGER DEFAULT NULL,
  p_ttl_seconds INTEGER DEFAULT NULL
) RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.query_cache_stats (
    cache_key, query_type, organization_id, cache_size_bytes, ttl_seconds,
    hit_count, miss_count, last_hit_at, last_miss_at
  ) VALUES (
    p_cache_key, p_query_type, p_organization_id, p_cache_size_bytes, p_ttl_seconds,
    CASE WHEN p_is_hit THEN 1 ELSE 0 END,
    CASE WHEN p_is_hit THEN 0 ELSE 1 END,
    CASE WHEN p_is_hit THEN NOW() ELSE NULL END,
    CASE WHEN p_is_hit THEN NULL ELSE NOW() END
  )
  ON CONFLICT (cache_key) DO UPDATE SET
    hit_count = query_cache_stats.hit_count + CASE WHEN p_is_hit THEN 1 ELSE 0 END,
    miss_count = query_cache_stats.miss_count + CASE WHEN p_is_hit THEN 0 ELSE 1 END,
    last_hit_at = CASE WHEN p_is_hit THEN NOW() ELSE query_cache_stats.last_hit_at END,
    last_miss_at = CASE WHEN p_is_hit THEN query_cache_stats.last_miss_at ELSE NOW() END,
    updated_at = NOW();
END;
$$;

-- ===== BACKGROUND JOB PROCESSING =====

-- Get next job to process
CREATE OR REPLACE FUNCTION public.get_next_background_job()
RETURNS JSON
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  job_record RECORD;
  result JSON;
BEGIN
  -- Get the highest priority pending job
  SELECT * INTO job_record
  FROM public.background_jobs
  WHERE status = 'pending'
  AND scheduled_at <= NOW()
  AND attempts < max_attempts
  ORDER BY priority DESC, created_at ASC
  LIMIT 1
  FOR UPDATE SKIP LOCKED;
  
  IF job_record IS NULL THEN
    RETURN json_build_object('job', null);
  END IF;
  
  -- Mark job as processing
  UPDATE public.background_jobs
  SET status = 'processing', started_at = NOW(), attempts = attempts + 1
  WHERE id = job_record.id;
  
  result := json_build_object(
    'job', json_build_object(
      'id', job_record.id,
      'job_type', job_record.job_type,
      'job_name', job_record.job_name,
      'payload', job_record.payload,
      'organization_id', job_record.organization_id,
      'attempts', job_record.attempts + 1
    )
  );
  
  RETURN result;
END;
$$;

-- Complete background job
CREATE OR REPLACE FUNCTION public.complete_background_job(
  p_job_id UUID,
  p_status TEXT, -- 'completed' or 'failed'
  p_result JSONB DEFAULT NULL,
  p_error_message TEXT DEFAULT NULL
) RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.background_jobs
  SET 
    status = p_status,
    completed_at = NOW(),
    result = p_result,
    error_message = p_error_message,
    updated_at = NOW()
  WHERE id = p_job_id;
END;
$$;

-- ===== REAL-TIME OPTIMIZATION =====

-- Optimized notification broadcast
CREATE OR REPLACE FUNCTION public.broadcast_organization_notification(
  p_organization_id UUID,
  p_notification_type TEXT,
  p_title TEXT,
  p_message TEXT,
  p_data JSONB DEFAULT '{}',
  p_user_filter TEXT DEFAULT NULL -- 'admins', 'users', or NULL for all
) RETURNS INTEGER
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  notification_count INTEGER := 0;
  target_users UUID[];
BEGIN
  -- Get target users based on filter
  IF p_user_filter = 'admins' THEN
    SELECT array_agg(user_id) INTO target_users
    FROM public.memberships
    WHERE organization_id = p_organization_id
    AND role = 'admin'
    AND status = 'active';
  ELSIF p_user_filter = 'users' THEN
    SELECT array_agg(user_id) INTO target_users
    FROM public.memberships
    WHERE organization_id = p_organization_id
    AND role = 'user'
    AND status = 'active';
  ELSE
    SELECT array_agg(user_id) INTO target_users
    FROM public.memberships
    WHERE organization_id = p_organization_id
    AND status = 'active';
  END IF;
  
  -- Bulk insert notifications
  INSERT INTO public.notifications (
    user_id, organization_id, type, title, message, data
  )
  SELECT 
    unnest(target_users),
    p_organization_id,
    p_notification_type,
    p_title,
    p_message,
    p_data;
  
  GET DIAGNOSTICS notification_count = ROW_COUNT;
  
  RETURN notification_count;
END;
$$;

-- ===== PERFORMANCE OPTIMIZATION INDEXES =====

-- Batch operations indexes
CREATE INDEX idx_batch_operations_org_status_created ON public.batch_operations(organization_id, status, created_at DESC);
CREATE INDEX idx_batch_operations_user_status ON public.batch_operations(user_id, status, created_at DESC);

-- Background jobs indexes
CREATE INDEX idx_background_jobs_queue_processing ON public.background_jobs(status, priority DESC, created_at ASC) WHERE status = 'pending';
CREATE INDEX idx_background_jobs_org_status ON public.background_jobs(organization_id, status, created_at DESC);
CREATE INDEX idx_background_jobs_scheduled ON public.background_jobs(scheduled_at) WHERE status = 'pending';

-- Cache stats indexes
CREATE INDEX idx_query_cache_stats_key_type ON public.query_cache_stats(cache_key, query_type);
CREATE INDEX idx_query_cache_stats_org_type ON public.query_cache_stats(organization_id, query_type) WHERE organization_id IS NOT NULL;

-- ===== MATERIALIZED VIEWS FOR ANALYTICS =====

-- Organization statistics materialized view
CREATE MATERIALIZED VIEW IF NOT EXISTS public.organization_stats_mv AS
SELECT 
  o.id as organization_id,
  o.name as organization_name,
  COUNT(DISTINCT m.user_id) FILTER (WHERE m.status = 'active') as active_users,
  COUNT(DISTINCT m.user_id) FILTER (WHERE m.role = 'admin' AND m.status = 'active') as admin_count,
  COUNT(DISTINCT f.id) as total_feedback,
  COUNT(DISTINCT f.id) FILTER (WHERE f.status = 'pending') as pending_feedback,
  COUNT(DISTINCT kd.id) as kb_documents,
  COUNT(DISTINCT kc.id) as kb_conversations,
  MAX(m.created_at) as last_user_joined,
  NOW() as last_updated
FROM public.organizations o
LEFT JOIN public.memberships m ON o.id = m.organization_id
LEFT JOIN public.feedback f ON o.id = f.organization_id
LEFT JOIN public.kb_documents kd ON o.id = kd.organization_id
LEFT JOIN public.kb_conversations kc ON o.id = kc.organization_id
GROUP BY o.id, o.name;

-- Create unique index for concurrent refresh
CREATE UNIQUE INDEX idx_organization_stats_mv_org_id ON public.organization_stats_mv(organization_id);

-- Function to refresh materialized views
CREATE OR REPLACE FUNCTION public.refresh_analytics_views()
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.organization_stats_mv;
  
  -- Log the refresh
  PERFORM public.log_metric(
    NULL, 'materialized_view_refresh', 1, 'count', 'counter',
    json_build_object('view_name', 'organization_stats_mv', 'refreshed_at', NOW())
  );
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.bulk_upsert_users TO authenticated;
GRANT EXECUTE ON FUNCTION public.bulk_update_feedback_status TO authenticated;
GRANT EXECUTE ON FUNCTION public.track_cache_usage TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_next_background_job TO authenticated;
GRANT EXECUTE ON FUNCTION public.complete_background_job TO authenticated;
GRANT EXECUTE ON FUNCTION public.broadcast_organization_notification TO authenticated;
GRANT EXECUTE ON FUNCTION public.refresh_analytics_views TO authenticated;

-- Grant select on materialized view
GRANT SELECT ON public.organization_stats_mv TO authenticated;

COMMIT;

-- Add documentation
COMMENT ON TABLE public.batch_operations IS 'Tracks large-scale batch operations for monitoring and recovery';
COMMENT ON TABLE public.background_jobs IS 'Queue system for background job processing';
COMMENT ON TABLE public.query_cache_stats IS 'Tracks query cache performance and usage patterns';
COMMENT ON MATERIALIZED VIEW public.organization_stats_mv IS 'Pre-computed organization statistics for fast dashboard loading';
COMMENT ON FUNCTION public.bulk_upsert_users IS 'Optimized bulk user operations with proper error handling';
COMMENT ON FUNCTION public.broadcast_organization_notification IS 'Efficient notification broadcasting to organization members';