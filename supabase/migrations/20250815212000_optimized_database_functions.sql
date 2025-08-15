-- Optimized Database Functions for Complex Queries
-- This migration creates optimized database functions to reduce client-side query complexity

BEGIN;

-- ===== DASHBOARD OPTIMIZATION FUNCTIONS =====

-- Optimized dashboard data function with single query
CREATE OR REPLACE FUNCTION public.get_dashboard_data_optimized(
  p_user_id UUID,
  p_organization_id UUID,
  p_is_super_admin BOOLEAN DEFAULT FALSE
) RETURNS JSON
LANGUAGE plpgsql SECURITY DEFINER STABLE
AS $$
DECLARE
  result JSON;
  user_count INTEGER;
  feedback_stats JSON;
  notification_stats JSON;
  kb_stats JSON;
BEGIN
  -- Validate access
  IF NOT (p_is_super_admin OR public.validate_organization_membership(p_user_id, p_organization_id)) THEN
    RETURN json_build_object('error', 'Access denied');
  END IF;
  
  -- Get user counts
  SELECT COUNT(*) INTO user_count
  FROM public.memberships 
  WHERE organization_id = p_organization_id 
  AND status = 'active';
  
  -- Get feedback statistics
  SELECT json_build_object(
    'total', COUNT(*),
    'pending', COUNT(*) FILTER (WHERE status = 'pending'),
    'resolved', COUNT(*) FILTER (WHERE status = 'resolved'),
    'avg_response_time', EXTRACT(EPOCH FROM AVG(
      CASE WHEN responded_at IS NOT NULL 
      THEN responded_at - created_at 
      ELSE NULL END
    )) / 3600
  ) INTO feedback_stats
  FROM public.feedback 
  WHERE organization_id = p_organization_id;
  
  -- Get notification statistics
  SELECT json_build_object(
    'total', COUNT(*),
    'unread', COUNT(*) FILTER (WHERE read = FALSE),
    'recent', COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '7 days')
  ) INTO notification_stats
  FROM public.notifications 
  WHERE organization_id = p_organization_id;
  
  -- Get KB statistics
  SELECT json_build_object(
    'documents', COUNT(DISTINCT kd.id),
    'files', COUNT(DISTINCT kf.id),
    'conversations', COUNT(DISTINCT kc.id),
    'processing', COUNT(*) FILTER (WHERE kd.processing_status = 'processing' OR kf.processing_status = 'processing')
  ) INTO kb_stats
  FROM public.kb_documents kd
  FULL OUTER JOIN public.kb_files kf ON kd.organization_id = kf.organization_id
  FULL OUTER JOIN public.kb_conversations kc ON kd.organization_id = kc.organization_id
  WHERE COALESCE(kd.organization_id, kf.organization_id, kc.organization_id) = p_organization_id;
  
  -- Build final result
  result := json_build_object(
    'users', json_build_object('total', user_count),
    'feedback', feedback_stats,
    'notifications', notification_stats,
    'knowledge_base', kb_stats,
    'last_updated', NOW()
  );
  
  RETURN result;
END;
$$;

-- ===== USER MANAGEMENT OPTIMIZATION =====

-- Optimized user list with pagination and filtering
CREATE OR REPLACE FUNCTION public.get_organization_users_optimized(
  p_organization_id UUID,
  p_requesting_user_id UUID,
  p_page INTEGER DEFAULT 1,
  p_page_size INTEGER DEFAULT 20,
  p_search TEXT DEFAULT NULL,
  p_role_filter TEXT DEFAULT NULL,
  p_status_filter TEXT DEFAULT 'active'
) RETURNS JSON
LANGUAGE plpgsql SECURITY DEFINER STABLE
AS $$
DECLARE
  result JSON;
  total_count INTEGER;
  offset_val INTEGER;
BEGIN
  -- Validate access (must be admin or super admin)
  IF NOT (public.is_super_admin(p_requesting_user_id) OR public.is_org_admin(p_organization_id, p_requesting_user_id)) THEN
    RETURN json_build_object('error', 'Access denied');
  END IF;
  
  offset_val := (p_page - 1) * p_page_size;
  
  -- Get total count with filters
  SELECT COUNT(*) INTO total_count
  FROM public.memberships m
  JOIN public.profiles p ON p.id = m.user_id
  WHERE m.organization_id = p_organization_id
  AND (p_status_filter IS NULL OR m.status = p_status_filter)
  AND (p_role_filter IS NULL OR m.role = p_role_filter)
  AND (p_search IS NULL OR (
    p.full_name ILIKE '%' || p_search || '%' OR
    p.username ILIKE '%' || p_search || '%'
  ));
  
  -- Get paginated results
  WITH user_data AS (
    SELECT 
      p.id,
      p.full_name,
      p.username,
      p.avatar_url,
      p.last_login_at,
      m.role,
      m.status,
      m.department,
      m.position,
      m.created_at as joined_at,
      ROW_NUMBER() OVER (ORDER BY p.full_name, p.username) as row_num
    FROM public.memberships m
    JOIN public.profiles p ON p.id = m.user_id
    WHERE m.organization_id = p_organization_id
    AND (p_status_filter IS NULL OR m.status = p_status_filter)
    AND (p_role_filter IS NULL OR m.role = p_role_filter)
    AND (p_search IS NULL OR (
      p.full_name ILIKE '%' || p_search || '%' OR
      p.username ILIKE '%' || p_search || '%'
    ))
    LIMIT p_page_size OFFSET offset_val
  )
  SELECT json_build_object(
    'users', json_agg(
      json_build_object(
        'id', id,
        'full_name', full_name,
        'username', username,
        'avatar_url', avatar_url,
        'last_login_at', last_login_at,
        'role', role,
        'status', status,
        'department', department,
        'position', position,
        'joined_at', joined_at
      )
    ),
    'total_count', total_count,
    'page', p_page,
    'page_size', p_page_size,
    'has_next', (offset_val + p_page_size) < total_count
  ) INTO result
  FROM user_data;
  
  RETURN COALESCE(result, json_build_object('users', '[]'::json, 'total_count', 0));
END;
$$;

-- ===== FEEDBACK OPTIMIZATION =====

-- Optimized feedback list with advanced filtering
CREATE OR REPLACE FUNCTION public.get_feedback_list_optimized(
  p_organization_id UUID,
  p_requesting_user_id UUID,
  p_page INTEGER DEFAULT 1,
  p_page_size INTEGER DEFAULT 20,
  p_status_filter TEXT DEFAULT NULL,
  p_priority_filter TEXT DEFAULT NULL,
  p_type_filter TEXT DEFAULT NULL
) RETURNS JSON
LANGUAGE plpgsql SECURITY DEFINER STABLE
AS $$
DECLARE
  result JSON;
  total_count INTEGER;
  offset_val INTEGER;
  can_access_all BOOLEAN;
BEGIN
  -- Check access level
  can_access_all := public.is_super_admin(p_requesting_user_id) OR public.is_org_admin(p_organization_id, p_requesting_user_id);
  
  -- Validate basic access
  IF NOT (can_access_all OR public.validate_organization_membership(p_requesting_user_id, p_organization_id)) THEN
    RETURN json_build_object('error', 'Access denied');
  END IF;
  
  offset_val := (p_page - 1) * p_page_size;
  
  -- Get total count
  SELECT COUNT(*) INTO total_count
  FROM public.feedback f
  WHERE f.organization_id = p_organization_id
  AND (can_access_all OR f.user_id = p_requesting_user_id)
  AND (p_status_filter IS NULL OR f.status = p_status_filter)
  AND (p_priority_filter IS NULL OR f.priority = p_priority_filter)
  AND (p_type_filter IS NULL OR f.type = p_type_filter);
  
  -- Get paginated results with user details
  WITH feedback_data AS (
    SELECT 
      f.id,
      f.subject,
      f.description,
      f.type,
      f.category,
      f.priority,
      f.status,
      f.created_at,
      f.updated_at,
      f.responded_at,
      p.full_name as user_name,
      p.username,
      EXTRACT(EPOCH FROM (NOW() - f.created_at)) / 86400 as days_old,
      CASE WHEN f.responded_at IS NULL AND f.created_at < NOW() - INTERVAL '3 days' 
           THEN TRUE ELSE FALSE END as is_overdue
    FROM public.feedback f
    JOIN public.profiles p ON p.id = f.user_id
    WHERE f.organization_id = p_organization_id
    AND (can_access_all OR f.user_id = p_requesting_user_id)
    AND (p_status_filter IS NULL OR f.status = p_status_filter)
    AND (p_priority_filter IS NULL OR f.priority = p_priority_filter)
    AND (p_type_filter IS NULL OR f.type = p_type_filter)
    ORDER BY f.created_at DESC
    LIMIT p_page_size OFFSET offset_val
  )
  SELECT json_build_object(
    'feedback', json_agg(
      json_build_object(
        'id', id,
        'subject', subject,
        'description', description,
        'type', type,
        'category', category,
        'priority', priority,
        'status', status,
        'created_at', created_at,
        'updated_at', updated_at,
        'responded_at', responded_at,
        'user_name', user_name,
        'username', username,
        'days_old', ROUND(days_old::numeric, 1),
        'is_overdue', is_overdue
      )
    ),
    'total_count', total_count,
    'page', p_page,
    'page_size', p_page_size,
    'has_next', (offset_val + p_page_size) < total_count
  ) INTO result
  FROM feedback_data;
  
  RETURN COALESCE(result, json_build_object('feedback', '[]'::json, 'total_count', 0));
END;
$$;

-- ===== KNOWLEDGE BASE OPTIMIZATION =====

-- Optimized KB search function
CREATE OR REPLACE FUNCTION public.search_kb_content_optimized(
  p_organization_id UUID,
  p_user_id UUID,
  p_search_query TEXT,
  p_kb_config_id UUID DEFAULT NULL,
  p_limit INTEGER DEFAULT 20
) RETURNS JSON
LANGUAGE plpgsql SECURITY DEFINER STABLE
AS $$
DECLARE
  result JSON;
BEGIN
  -- Validate access
  IF NOT public.validate_organization_membership(p_user_id, p_organization_id) THEN
    RETURN json_build_object('error', 'Access denied');
  END IF;
  
  -- Search documents with relevance scoring
  WITH search_results AS (
    SELECT 
      d.id,
      d.title,
      d.content,
      d.category,
      d.tags,
      d.file_type,
      d.created_at,
      -- Simple relevance scoring
      CASE 
        WHEN d.title ILIKE '%' || p_search_query || '%' THEN 3
        WHEN d.category ILIKE '%' || p_search_query || '%' THEN 2
        WHEN d.content ILIKE '%' || p_search_query || '%' THEN 1
        ELSE 0
      END as relevance_score,
      -- Highlight matches in content
      LEFT(d.content, 200) as content_preview
    FROM public.kb_documents d
    WHERE d.organization_id = p_organization_id
    AND d.processing_status = 'completed'
    AND (p_kb_config_id IS NULL OR EXISTS (
      SELECT 1 FROM public.kb_files f 
      WHERE f.organization_id = d.organization_id 
      AND f.kb_config_id = p_kb_config_id
    ))
    AND (
      d.title ILIKE '%' || p_search_query || '%' OR
      d.content ILIKE '%' || p_search_query || '%' OR
      d.category ILIKE '%' || p_search_query || '%' OR
      array_to_string(d.tags, ' ') ILIKE '%' || p_search_query || '%'
    )
    ORDER BY relevance_score DESC, d.created_at DESC
    LIMIT p_limit
  )
  SELECT json_build_object(
    'results', json_agg(
      json_build_object(
        'id', id,
        'title', title,
        'category', category,
        'tags', tags,
        'file_type', file_type,
        'content_preview', content_preview,
        'relevance_score', relevance_score,
        'created_at', created_at
      )
    ),
    'query', p_search_query,
    'total_results', COUNT(*),
    'search_time', EXTRACT(EPOCH FROM NOW()) * 1000
  ) INTO result
  FROM search_results;
  
  -- Log search for analytics
  INSERT INTO public.kb_searches (organization_id, user_id, query, results_count)
  VALUES (p_organization_id, p_user_id, p_search_query, (result->>'total_results')::integer);
  
  RETURN COALESCE(result, json_build_object('results', '[]'::json, 'total_results', 0));
END;
$$;

-- ===== NOTIFICATION OPTIMIZATION =====

-- Optimized notification function
CREATE OR REPLACE FUNCTION public.get_user_notifications_optimized(
  p_user_id UUID,
  p_organization_id UUID DEFAULT NULL,
  p_limit INTEGER DEFAULT 50,
  p_unread_only BOOLEAN DEFAULT FALSE
) RETURNS JSON
LANGUAGE plpgsql SECURITY DEFINER STABLE
AS $$
DECLARE
  result JSON;
  unread_count INTEGER;
BEGIN
  -- Get unread count
  SELECT COUNT(*) INTO unread_count
  FROM public.notifications
  WHERE user_id = p_user_id
  AND read = FALSE
  AND (p_organization_id IS NULL OR organization_id = p_organization_id);
  
  -- Get notifications with optimized query
  WITH notification_data AS (
    SELECT 
      id,
      title,
      message,
      type,
      category,
      data,
      action_url,
      read,
      created_at,
      -- Calculate relative time
      CASE 
        WHEN created_at > NOW() - INTERVAL '1 hour' THEN EXTRACT(EPOCH FROM (NOW() - created_at))::text || ' minutes ago'
        WHEN created_at > NOW() - INTERVAL '24 hours' THEN EXTRACT(EPOCH FROM (NOW() - created_at))/3600::text || ' hours ago'
        ELSE TO_CHAR(created_at, 'Mon DD, YYYY')
      END as relative_time
    FROM public.notifications
    WHERE user_id = p_user_id
    AND (p_organization_id IS NULL OR organization_id = p_organization_id)
    AND (p_unread_only = FALSE OR read = FALSE)
    ORDER BY created_at DESC
    LIMIT p_limit
  )
  SELECT json_build_object(
    'notifications', json_agg(
      json_build_object(
        'id', id,
        'title', title,
        'message', message,
        'type', type,
        'category', category,
        'data', data,
        'action_url', action_url,
        'read', read,
        'created_at', created_at,
        'relative_time', relative_time
      )
    ),
    'unread_count', unread_count,
    'total_shown', COUNT(*)
  ) INTO result
  FROM notification_data;
  
  RETURN COALESCE(result, json_build_object('notifications', '[]'::json, 'unread_count', 0));
END;
$$;

-- ===== ANALYTICS OPTIMIZATION =====

-- Optimized feature analytics function
CREATE OR REPLACE FUNCTION public.get_feature_analytics_optimized(
  p_organization_id UUID,
  p_requesting_user_id UUID,
  p_feature_slug TEXT DEFAULT NULL,
  p_days INTEGER DEFAULT 30
) RETURNS JSON
LANGUAGE plpgsql SECURITY DEFINER STABLE
AS $$
DECLARE
  result JSON;
  can_access BOOLEAN;
BEGIN
  -- Validate access (admins only)
  can_access := public.is_super_admin(p_requesting_user_id) OR public.is_org_admin(p_organization_id, p_requesting_user_id);
  
  IF NOT can_access THEN
    RETURN json_build_object('error', 'Access denied');
  END IF;
  
  -- Get analytics data
  WITH daily_stats AS (
    SELECT 
      DATE(created_at) as date,
      feature_slug,
      event_type,
      COUNT(*) as event_count,
      COUNT(DISTINCT user_id) as unique_users
    FROM public.feature_analytics
    WHERE organization_id = p_organization_id
    AND created_at > NOW() - (p_days || ' days')::INTERVAL
    AND (p_feature_slug IS NULL OR feature_slug = p_feature_slug)
    GROUP BY DATE(created_at), feature_slug, event_type
    ORDER BY date DESC
  )
  SELECT json_build_object(
    'daily_stats', json_agg(
      json_build_object(
        'date', date,
        'feature_slug', feature_slug,
        'event_type', event_type,
        'event_count', event_count,
        'unique_users', unique_users
      )
    ),
    'period_days', p_days,
    'generated_at', NOW()
  ) INTO result
  FROM daily_stats;
  
  RETURN COALESCE(result, json_build_object('daily_stats', '[]'::json, 'period_days', p_days));
END;
$$;

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION public.get_dashboard_data_optimized TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_organization_users_optimized TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_feedback_list_optimized TO authenticated;
GRANT EXECUTE ON FUNCTION public.search_kb_content_optimized TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_notifications_optimized TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_feature_analytics_optimized TO authenticated;

COMMIT;

-- Add function documentation
COMMENT ON FUNCTION public.get_dashboard_data_optimized IS 'Optimized single-query dashboard data retrieval';
COMMENT ON FUNCTION public.get_organization_users_optimized IS 'Optimized user list with pagination and filtering';
COMMENT ON FUNCTION public.get_feedback_list_optimized IS 'Optimized feedback list with advanced filtering and user details';
COMMENT ON FUNCTION public.search_kb_content_optimized IS 'Optimized knowledge base search with relevance scoring';
COMMENT ON FUNCTION public.get_user_notifications_optimized IS 'Optimized notification retrieval with relative time calculation';
COMMENT ON FUNCTION public.get_feature_analytics_optimized IS 'Optimized feature analytics with daily aggregation';