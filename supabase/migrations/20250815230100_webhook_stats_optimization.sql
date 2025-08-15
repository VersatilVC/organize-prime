-- Optimized Webhook Statistics Function
-- Replaces 22+ separate queries with a single optimized function call

CREATE OR REPLACE FUNCTION get_comprehensive_webhook_stats(
  p_organization_id UUID DEFAULT NULL,
  p_periods INTEGER[] DEFAULT ARRAY[1, 7, 30]
) RETURNS JSON AS $$
DECLARE
  result JSON;
BEGIN
  WITH time_periods AS (
    SELECT unnest(p_periods) as days
  ),
  period_stats AS (
    SELECT 
      tp.days,
      COUNT(wl.id) as total_triggers,
      COUNT(wl.id) FILTER (WHERE wl.status = 'success') as successful,
      COUNT(wl.id) FILTER (WHERE wl.status = 'failed') as failed,
      COUNT(wl.id) FILTER (WHERE wl.status = 'timeout') as timeouts,
      COALESCE(AVG(wl.response_time_ms) FILTER (WHERE wl.status = 'success'), 0) as avg_response_time,
      COUNT(DISTINCT wl.webhook_id) as active_webhooks
    FROM time_periods tp
    LEFT JOIN webhook_logs wl ON wl.triggered_at >= NOW() - (tp.days || ' days')::INTERVAL
      AND (p_organization_id IS NULL OR wl.organization_id = p_organization_id)
    GROUP BY tp.days
  ),
  top_features AS (
    SELECT json_agg(
      json_build_object(
        'feature_slug', fw.feature_slug,
        'webhook_name', fw.name,
        'trigger_count', COUNT(wl.id),
        'success_rate', ROUND(
          (COUNT(wl.id) FILTER (WHERE wl.status = 'success')::FLOAT / 
           NULLIF(COUNT(wl.id), 0) * 100), 2
        )
      ) ORDER BY COUNT(wl.id) DESC
    ) as features
    FROM feature_webhooks fw
    LEFT JOIN webhook_logs wl ON wl.webhook_id = fw.id 
      AND wl.triggered_at >= NOW() - INTERVAL '7 days'
      AND (p_organization_id IS NULL OR wl.organization_id = p_organization_id)
    WHERE (p_organization_id IS NULL OR fw.organization_id = p_organization_id)
    GROUP BY fw.id, fw.feature_slug, fw.name
    HAVING COUNT(wl.id) > 0
    LIMIT 10
  ),
  hourly_trends AS (
    SELECT json_agg(
      json_build_object(
        'hour', EXTRACT(hour FROM wl.triggered_at),
        'triggers', COUNT(wl.id),
        'success_rate', ROUND(
          (COUNT(wl.id) FILTER (WHERE wl.status = 'success')::FLOAT / 
           NULLIF(COUNT(wl.id), 0) * 100), 2
        )
      ) ORDER BY EXTRACT(hour FROM wl.triggered_at)
    ) as trends
    FROM webhook_logs wl
    WHERE wl.triggered_at >= NOW() - INTERVAL '24 hours'
      AND (p_organization_id IS NULL OR wl.organization_id = p_organization_id)
    GROUP BY EXTRACT(hour FROM wl.triggered_at)
  ),
  error_summary AS (
    SELECT json_agg(
      json_build_object(
        'error_type', wl.error_message,
        'count', COUNT(*),
        'last_occurrence', MAX(wl.triggered_at)
      ) ORDER BY COUNT(*) DESC
    ) as errors
    FROM webhook_logs wl
    WHERE wl.status = 'failed' 
      AND wl.triggered_at >= NOW() - INTERVAL '7 days'
      AND (p_organization_id IS NULL OR wl.organization_id = p_organization_id)
      AND wl.error_message IS NOT NULL
    GROUP BY wl.error_message
    LIMIT 5
  )
  SELECT json_build_object(
    'stats_by_period', (
      SELECT json_object_agg(days::text, json_build_object(
        'total_triggers', total_triggers,
        'successful', successful,
        'failed', failed,
        'timeouts', timeouts,
        'avg_response_time', ROUND(avg_response_time::numeric, 2),
        'success_rate', CASE 
          WHEN total_triggers > 0 
          THEN ROUND((successful::FLOAT / total_triggers * 100), 2) 
          ELSE 0 
        END,
        'active_webhooks', active_webhooks
      ))
      FROM period_stats
    ),
    'top_features', COALESCE((SELECT features FROM top_features), '[]'::json),
    'hourly_trends', COALESCE((SELECT trends FROM hourly_trends), '[]'::json),
    'error_summary', COALESCE((SELECT errors FROM error_summary), '[]'::json),
    'last_updated', NOW()
  ) INTO result;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Optimized webhook health function
CREATE OR REPLACE FUNCTION get_webhook_health_summary(
  p_organization_id UUID DEFAULT NULL
) RETURNS JSON AS $$
BEGIN
  RETURN (
    SELECT json_agg(
      json_build_object(
        'webhook_id', fw.id,
        'webhook_name', fw.name,
        'feature_slug', fw.feature_slug,
        'is_active', fw.is_active,
        'last_trigger', wh.last_trigger,
        'total_triggers_24h', wh.triggers_24h,
        'success_rate_24h', wh.success_rate_24h,
        'avg_response_time', wh.avg_response_time,
        'status', CASE 
          WHEN NOT fw.is_active THEN 'disabled'
          WHEN wh.last_trigger IS NULL THEN 'never_triggered'
          WHEN wh.last_trigger < NOW() - INTERVAL '1 hour' THEN 'stale'
          WHEN wh.success_rate_24h < 80 THEN 'unhealthy'
          ELSE 'healthy'
        END
      )
    )
    FROM feature_webhooks fw
    LEFT JOIN (
      SELECT 
        webhook_id,
        MAX(triggered_at) as last_trigger,
        COUNT(*) FILTER (WHERE triggered_at >= NOW() - INTERVAL '24 hours') as triggers_24h,
        ROUND(
          (COUNT(*) FILTER (WHERE status = 'success' AND triggered_at >= NOW() - INTERVAL '24 hours')::FLOAT / 
           NULLIF(COUNT(*) FILTER (WHERE triggered_at >= NOW() - INTERVAL '24 hours'), 0) * 100), 2
        ) as success_rate_24h,
        ROUND(AVG(response_time_ms) FILTER (WHERE status = 'success' AND triggered_at >= NOW() - INTERVAL '24 hours'), 2) as avg_response_time
      FROM webhook_logs
      GROUP BY webhook_id
    ) wh ON fw.id = wh.webhook_id
    WHERE (p_organization_id IS NULL OR fw.organization_id = p_organization_id)
    ORDER BY fw.created_at DESC
  );
END;
$$ LANGUAGE plpgsql;

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_comprehensive_webhook_stats TO authenticated;
GRANT EXECUTE ON FUNCTION get_webhook_health_summary TO authenticated;

-- Add comments
COMMENT ON FUNCTION get_comprehensive_webhook_stats IS 'Optimized function to replace 22+ separate webhook stats queries';
COMMENT ON FUNCTION get_webhook_health_summary IS 'Single query replacement for webhook health N+1 pattern';