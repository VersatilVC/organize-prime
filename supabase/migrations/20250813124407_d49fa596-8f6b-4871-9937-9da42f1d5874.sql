-- Create optimized dashboard data aggregation function
CREATE OR REPLACE FUNCTION public.get_dashboard_data_batch(
  p_user_id uuid,
  p_organization_id uuid,
  p_is_super_admin boolean DEFAULT false
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  result JSONB;
  stats_data JSONB;
  recent_activity JSONB;
  notifications_data JSONB;
  quick_stats JSONB;
BEGIN
  -- Get core dashboard stats
  SELECT get_dashboard_stats_optimized(p_organization_id, p_user_id, p_is_super_admin) INTO stats_data;
  
  -- Get recent activity (last 7 days)
  SELECT jsonb_agg(
    jsonb_build_object(
      'id', al.id,
      'action', al.action,
      'resource_type', al.resource_type,
      'created_at', al.created_at,
      'user_name', COALESCE(p.full_name, p.username, 'Unknown User'),
      'details', al.changes
    ) ORDER BY al.created_at DESC
  ) INTO recent_activity
  FROM audit_logs al
  LEFT JOIN profiles p ON al.user_id = p.id
  WHERE (p_is_super_admin OR al.organization_id = p_organization_id)
  AND al.created_at > NOW() - INTERVAL '7 days'
  LIMIT 10;
  
  -- Get unread notifications count and latest
  SELECT jsonb_build_object(
    'unread_count', COUNT(*) FILTER (WHERE read = false),
    'latest', jsonb_agg(
      jsonb_build_object(
        'id', n.id,
        'title', n.title,
        'message', LEFT(n.message, 100),
        'created_at', n.created_at,
        'type', n.type
      ) ORDER BY n.created_at DESC
    ) FILTER (WHERE read = false)
  ) INTO notifications_data
  FROM notifications n
  WHERE n.user_id = p_user_id
  AND (p_is_super_admin OR n.organization_id = p_organization_id)
  LIMIT 5;
  
  -- Get quick performance stats
  SELECT jsonb_build_object(
    'files_uploaded_today', COUNT(*) FILTER (WHERE f.created_at::date = CURRENT_DATE),
    'feedback_pending', COUNT(*) FILTER (WHERE fb.status = 'pending'),
    'active_users_week', COUNT(DISTINCT p.id) FILTER (WHERE p.last_login_at > NOW() - INTERVAL '7 days'),
    'storage_used_mb', ROUND(COALESCE(SUM(f.file_size) / (1024.0 * 1024.0), 0)::numeric, 2)
  ) INTO quick_stats
  FROM files f
  FULL OUTER JOIN feedback fb ON (p_is_super_admin OR fb.organization_id = p_organization_id)
  FULL OUTER JOIN profiles p ON (p_is_super_admin OR EXISTS(
    SELECT 1 FROM memberships m WHERE m.user_id = p.id AND m.organization_id = p_organization_id
  ))
  WHERE (p_is_super_admin OR f.organization_id = p_organization_id);
  
  -- Combine all data
  result := jsonb_build_object(
    'stats', stats_data,
    'recent_activity', COALESCE(recent_activity, '[]'::jsonb),
    'notifications', notifications_data,
    'quick_stats', quick_stats,
    'generated_at', NOW()
  );
  
  RETURN result;
END;
$$;

-- Create optimized user list function with better performance
CREATE OR REPLACE FUNCTION public.get_user_list_optimized(
  p_organization_id uuid,
  p_requesting_user_id uuid,
  p_page integer DEFAULT 0,
  p_page_size integer DEFAULT 50,
  p_search text DEFAULT NULL,
  p_role_filter text DEFAULT NULL,
  p_status_filter text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  result JSONB;
  users_data JSONB;
  total_count INTEGER;
  is_super_admin BOOLEAN;
  is_org_admin BOOLEAN;
  offset_val INTEGER;
BEGIN
  offset_val := p_page * p_page_size;
  
  -- Check permissions
  SELECT profiles.is_super_admin INTO is_super_admin
  FROM profiles WHERE profiles.id = p_requesting_user_id;
  
  SELECT EXISTS(
    SELECT 1 FROM memberships 
    WHERE user_id = p_requesting_user_id 
    AND organization_id = p_organization_id 
    AND role = 'admin' 
    AND status = 'active'
  ) INTO is_org_admin;
  
  IF NOT (is_super_admin OR is_org_admin) THEN
    RETURN jsonb_build_object('error', 'Access denied', 'users', '[]'::jsonb, 'total', 0);
  END IF;
  
  -- Get total count first
  SELECT COUNT(*) INTO total_count
  FROM profiles p
  INNER JOIN memberships m ON p.id = m.user_id
  WHERE m.organization_id = p_organization_id
  AND m.status = 'active'
  AND (p_search IS NULL OR 
       p.full_name ILIKE '%' || p_search || '%' OR 
       p.username ILIKE '%' || p_search || '%')
  AND (p_role_filter IS NULL OR m.role = p_role_filter)
  AND (p_status_filter IS NULL OR m.status = p_status_filter);
  
  -- Get paginated user data with all needed fields
  SELECT jsonb_agg(
    jsonb_build_object(
      'id', p.id,
      'full_name', p.full_name,
      'username', p.username,
      'avatar_url', p.avatar_url,
      'last_login_at', p.last_login_at,
      'role', m.role,
      'status', m.status,
      'joined_at', m.joined_at,
      'organization_id', m.organization_id,
      'department', m.department,
      'position', m.position,
      'last_active', p.last_login_at
    ) ORDER BY p.full_name, p.username
  ) INTO users_data
  FROM profiles p
  INNER JOIN memberships m ON p.id = m.user_id
  WHERE m.organization_id = p_organization_id
  AND m.status = 'active'
  AND (p_search IS NULL OR 
       p.full_name ILIKE '%' || p_search || '%' OR 
       p.username ILIKE '%' || p_search || '%')
  AND (p_role_filter IS NULL OR m.role = p_role_filter)
  AND (p_status_filter IS NULL OR m.status = p_status_filter)
  LIMIT p_page_size OFFSET offset_val;
  
  result := jsonb_build_object(
    'users', COALESCE(users_data, '[]'::jsonb),
    'total', total_count,
    'page', p_page,
    'page_size', p_page_size,
    'has_next', (offset_val + p_page_size) < total_count
  );
  
  RETURN result;
END;
$$;

-- Create optimized feedback list function
CREATE OR REPLACE FUNCTION public.get_feedback_list_optimized(
  p_organization_id uuid,
  p_requesting_user_id uuid,
  p_page integer DEFAULT 0,
  p_page_size integer DEFAULT 50,
  p_status_filter text DEFAULT NULL,
  p_priority_filter text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  result JSONB;
  feedback_data JSONB;
  total_count INTEGER;
  is_super_admin BOOLEAN;
  is_org_admin BOOLEAN;
  offset_val INTEGER;
BEGIN
  offset_val := p_page * p_page_size;
  
  -- Check permissions
  SELECT profiles.is_super_admin INTO is_super_admin
  FROM profiles WHERE profiles.id = p_requesting_user_id;
  
  SELECT EXISTS(
    SELECT 1 FROM memberships 
    WHERE user_id = p_requesting_user_id 
    AND organization_id = p_organization_id 
    AND role = 'admin' 
    AND status = 'active'
  ) INTO is_org_admin;
  
  IF NOT (is_super_admin OR is_org_admin) THEN
    RETURN jsonb_build_object('error', 'Access denied', 'feedback', '[]'::jsonb, 'total', 0);
  END IF;
  
  -- Get total count
  SELECT COUNT(*) INTO total_count
  FROM feedback f
  WHERE (is_super_admin OR f.organization_id = p_organization_id)
  AND (p_status_filter IS NULL OR f.status = p_status_filter)
  AND (p_priority_filter IS NULL OR f.priority = p_priority_filter);
  
  -- Get paginated feedback data
  SELECT jsonb_agg(
    jsonb_build_object(
      'id', f.id,
      'title', f.title,
      'description', LEFT(f.description, 200),
      'status', f.status,
      'priority', f.priority,
      'created_at', f.created_at,
      'updated_at', f.updated_at,
      'user_name', COALESCE(p.full_name, p.username, 'Anonymous'),
      'category', f.category,
      'attachments_count', CASE WHEN f.attachments IS NULL THEN 0 ELSE array_length(f.attachments, 1) END
    ) ORDER BY 
      CASE WHEN f.priority = 'high' THEN 1 
           WHEN f.priority = 'medium' THEN 2 
           ELSE 3 END,
      f.created_at DESC
  ) INTO feedback_data
  FROM feedback f
  LEFT JOIN profiles p ON f.user_id = p.id
  WHERE (is_super_admin OR f.organization_id = p_organization_id)
  AND (p_status_filter IS NULL OR f.status = p_status_filter)
  AND (p_priority_filter IS NULL OR f.priority = p_priority_filter)
  LIMIT p_page_size OFFSET offset_val;
  
  result := jsonb_build_object(
    'feedback', COALESCE(feedback_data, '[]'::jsonb),
    'total', total_count,
    'page', p_page,
    'page_size', p_page_size,
    'has_next', (offset_val + p_page_size) < total_count
  );
  
  RETURN result;
END;
$$;