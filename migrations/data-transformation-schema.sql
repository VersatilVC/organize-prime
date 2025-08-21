-- Data Transformation Pipeline Database Schema
-- Part of Phase 5: Data Transformation Pipeline
-- Handles data transformation jobs, templates, backups, and validation

-- Transformation Jobs table
CREATE TABLE IF NOT EXISTS transformation_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  batch_id UUID,
  template_id TEXT NOT NULL,
  source_data JSONB NOT NULL DEFAULT '[]',
  status TEXT NOT NULL DEFAULT 'pending',
  context_data JSONB NOT NULL DEFAULT '{}',
  progress INTEGER NOT NULL DEFAULT 0,
  estimated_duration INTEGER,
  actual_duration INTEGER,
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Transformation Results table
CREATE TABLE IF NOT EXISTS transformation_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID REFERENCES transformation_jobs(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  status TEXT NOT NULL,
  transformed_data JSONB NOT NULL DEFAULT '[]',
  backup_id UUID,
  metrics JSONB NOT NULL DEFAULT '{}',
  conflicts JSONB NOT NULL DEFAULT '[]',
  validation_results JSONB NOT NULL DEFAULT '[]',
  duration INTEGER,
  error_message TEXT,
  completed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Transformation Templates table
CREATE TABLE IF NOT EXISTS transformation_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  source_format TEXT NOT NULL,
  target_format TEXT NOT NULL DEFAULT 'element-based',
  mapping_rules JSONB NOT NULL DEFAULT '[]',
  validation_rules JSONB NOT NULL DEFAULT '[]',
  preservation_rules JSONB NOT NULL DEFAULT '[]',
  conflict_resolution_strategy TEXT NOT NULL DEFAULT 'merge',
  is_system_template BOOLEAN NOT NULL DEFAULT FALSE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  usage_count INTEGER NOT NULL DEFAULT 0,
  success_rate DECIMAL DEFAULT 0,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Data Backups table
CREATE TABLE IF NOT EXISTS data_backups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  job_id TEXT NOT NULL,
  backup_type TEXT NOT NULL DEFAULT 'pre_transformation',
  data_schema TEXT NOT NULL,
  data_size BIGINT NOT NULL DEFAULT 0,
  record_count INTEGER NOT NULL DEFAULT 0,
  compression_type TEXT NOT NULL DEFAULT 'none',
  encryption_type TEXT NOT NULL DEFAULT 'none',
  storage_location TEXT NOT NULL DEFAULT 'database',
  backup_data JSONB NOT NULL DEFAULT '[]',
  metadata JSONB NOT NULL DEFAULT '{}',
  retention_period INTEGER NOT NULL DEFAULT 90,
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Transformation Rules table (for custom mapping rules)
CREATE TABLE IF NOT EXISTS transformation_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  template_id UUID REFERENCES transformation_templates(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  source_pattern TEXT NOT NULL,
  target_pattern TEXT NOT NULL,
  transformation_type TEXT NOT NULL,
  conditions JSONB NOT NULL DEFAULT '[]',
  priority INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  success_count INTEGER NOT NULL DEFAULT 0,
  failure_count INTEGER NOT NULL DEFAULT 0,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Data Conflicts table (for tracking and resolving conflicts)
CREATE TABLE IF NOT EXISTS data_conflicts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID REFERENCES transformation_jobs(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  conflict_type TEXT NOT NULL,
  source_record JSONB NOT NULL,
  target_record JSONB,
  conflict_details TEXT NOT NULL,
  resolution_strategy TEXT NOT NULL DEFAULT 'manual',
  is_resolved BOOLEAN NOT NULL DEFAULT FALSE,
  resolution JSONB,
  resolved_at TIMESTAMP WITH TIME ZONE,
  resolved_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Validation Errors table
CREATE TABLE IF NOT EXISTS validation_errors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID REFERENCES transformation_jobs(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  validation_type TEXT NOT NULL, -- 'schema', 'integrity', 'format'
  error_level TEXT NOT NULL DEFAULT 'error', -- 'error', 'warning', 'info'
  error_code TEXT,
  error_message TEXT NOT NULL,
  field_name TEXT,
  field_value TEXT,
  record_index INTEGER,
  suggested_fix TEXT,
  is_resolved BOOLEAN NOT NULL DEFAULT FALSE,
  resolved_by UUID REFERENCES auth.users(id),
  resolved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_transformation_jobs_org_status ON transformation_jobs(organization_id, status);
CREATE INDEX IF NOT EXISTS idx_transformation_jobs_created ON transformation_jobs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_transformation_results_job ON transformation_results(job_id);
CREATE INDEX IF NOT EXISTS idx_transformation_templates_org ON transformation_templates(organization_id);
CREATE INDEX IF NOT EXISTS idx_transformation_templates_active ON transformation_templates(is_active, is_system_template);
CREATE INDEX IF NOT EXISTS idx_data_backups_org_job ON data_backups(organization_id, job_id);
CREATE INDEX IF NOT EXISTS idx_data_backups_expires ON data_backups(expires_at);
CREATE INDEX IF NOT EXISTS idx_transformation_rules_template ON transformation_rules(template_id);
CREATE INDEX IF NOT EXISTS idx_data_conflicts_job ON data_conflicts(job_id);
CREATE INDEX IF NOT EXISTS idx_data_conflicts_resolved ON data_conflicts(is_resolved);
CREATE INDEX IF NOT EXISTS idx_validation_errors_job ON validation_errors(job_id);
CREATE INDEX IF NOT EXISTS idx_validation_errors_resolved ON validation_errors(is_resolved);

-- RLS Policies for data isolation
ALTER TABLE transformation_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE transformation_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE transformation_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE data_backups ENABLE ROW LEVEL SECURITY;
ALTER TABLE transformation_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE data_conflicts ENABLE ROW LEVEL SECURITY;
ALTER TABLE validation_errors ENABLE ROW LEVEL SECURITY;

-- Transformation Jobs policies
CREATE POLICY "transformation_jobs_org_isolation" ON transformation_jobs
FOR ALL USING (
  organization_id IN (
    SELECT organization_id FROM memberships 
    WHERE user_id = auth.uid() AND status = 'active'
  )
);

-- Transformation Results policies
CREATE POLICY "transformation_results_org_isolation" ON transformation_results
FOR ALL USING (
  organization_id IN (
    SELECT organization_id FROM memberships 
    WHERE user_id = auth.uid() AND status = 'active'
  )
);

-- Transformation Templates policies
CREATE POLICY "transformation_templates_org_isolation" ON transformation_templates
FOR ALL USING (
  organization_id IN (
    SELECT organization_id FROM memberships 
    WHERE user_id = auth.uid() AND status = 'active'
  )
  OR is_system_template = TRUE
);

-- Data Backups policies
CREATE POLICY "data_backups_org_isolation" ON data_backups
FOR ALL USING (
  organization_id IN (
    SELECT organization_id FROM memberships 
    WHERE user_id = auth.uid() AND status = 'active'
  )
);

-- Transformation Rules policies
CREATE POLICY "transformation_rules_org_isolation" ON transformation_rules
FOR ALL USING (
  organization_id IN (
    SELECT organization_id FROM memberships 
    WHERE user_id = auth.uid() AND status = 'active'
  )
);

-- Data Conflicts policies
CREATE POLICY "data_conflicts_org_isolation" ON data_conflicts
FOR ALL USING (
  organization_id IN (
    SELECT organization_id FROM memberships 
    WHERE user_id = auth.uid() AND status = 'active'
  )
);

-- Validation Errors policies
CREATE POLICY "validation_errors_org_isolation" ON validation_errors
FOR ALL USING (
  organization_id IN (
    SELECT organization_id FROM memberships 
    WHERE user_id = auth.uid() AND status = 'active'
  )
);

-- Helper Functions

-- Function to get transformation statistics
CREATE OR REPLACE FUNCTION get_transformation_statistics(org_id UUID)
RETURNS TABLE (
  total_jobs BIGINT,
  successful_jobs BIGINT,
  failed_jobs BIGINT,
  total_records_transformed BIGINT,
  average_transformation_time INTEGER,
  data_integrity_score DECIMAL,
  backups_created BIGINT
) AS $$
BEGIN
  RETURN QUERY
  WITH job_stats AS (
    SELECT 
      COUNT(*) as total,
      COUNT(*) FILTER (WHERE status = 'completed') as successful,
      COUNT(*) FILTER (WHERE status = 'failed') as failed,
      COALESCE(AVG(actual_duration), 0) as avg_duration
    FROM transformation_jobs 
    WHERE organization_id = org_id
  ),
  result_stats AS (
    SELECT 
      COALESCE(SUM((metrics->>'transformedRecords')::INTEGER), 0) as records_transformed,
      COALESCE(AVG((metrics->>'dataIntegrityScore')::DECIMAL), 0) as integrity_score
    FROM transformation_results 
    WHERE organization_id = org_id AND status = 'completed'
  ),
  backup_stats AS (
    SELECT COUNT(*) as backups
    FROM data_backups 
    WHERE organization_id = org_id
  )
  SELECT 
    j.total,
    j.successful,
    j.failed,
    r.records_transformed,
    j.avg_duration::INTEGER,
    r.integrity_score,
    b.backups
  FROM job_stats j, result_stats r, backup_stats b;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get transformation insights
CREATE OR REPLACE FUNCTION get_transformation_insights(org_id UUID)
RETURNS TABLE (
  efficiency DECIMAL,
  throughput DECIMAL,
  reliability DECIMAL,
  recent_success_rate DECIMAL,
  average_job_size DECIMAL,
  backup_utilization DECIMAL
) AS $$
DECLARE
  total_jobs INTEGER;
  successful_jobs INTEGER;
  total_records INTEGER;
  total_duration INTEGER;
  total_backups INTEGER;
BEGIN
  -- Get basic stats
  SELECT 
    COUNT(*),
    COUNT(*) FILTER (WHERE status = 'completed'),
    COALESCE(SUM((r.metrics->>'transformedRecords')::INTEGER), 0),
    COALESCE(SUM(j.actual_duration), 0),
    COUNT(DISTINCT b.id)
  INTO total_jobs, successful_jobs, total_records, total_duration, total_backups
  FROM transformation_jobs j
  LEFT JOIN transformation_results r ON j.id = r.job_id
  LEFT JOIN data_backups b ON j.id::TEXT = b.job_id
  WHERE j.organization_id = org_id;
  
  -- Calculate metrics
  RETURN QUERY
  SELECT 
    CASE WHEN total_jobs > 0 THEN successful_jobs::DECIMAL / total_jobs::DECIMAL ELSE 0 END,
    CASE WHEN total_duration > 0 THEN total_records::DECIMAL / (total_duration::DECIMAL / 1000) ELSE 0 END,
    CASE WHEN total_jobs > 0 THEN successful_jobs::DECIMAL / total_jobs::DECIMAL ELSE 0 END,
    CASE WHEN total_jobs > 0 THEN successful_jobs::DECIMAL / total_jobs::DECIMAL ELSE 0 END,
    CASE WHEN total_jobs > 0 THEN total_records::DECIMAL / total_jobs::DECIMAL ELSE 0 END,
    CASE WHEN total_jobs > 0 THEN total_backups::DECIMAL / total_jobs::DECIMAL ELSE 0 END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to clean up expired backups
CREATE OR REPLACE FUNCTION cleanup_expired_backups()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  -- Set expiration dates for backups without them
  UPDATE data_backups 
  SET expires_at = created_at + (retention_period || ' days')::INTERVAL
  WHERE expires_at IS NULL;
  
  -- Delete expired backups
  DELETE FROM data_backups
  WHERE expires_at < NOW();
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update template usage statistics
CREATE OR REPLACE FUNCTION update_template_usage_stats(template_id UUID, success BOOLEAN)
RETURNS VOID AS $$
BEGIN
  UPDATE transformation_templates 
  SET 
    usage_count = usage_count + 1,
    success_rate = CASE 
      WHEN usage_count = 0 THEN CASE WHEN success THEN 1.0 ELSE 0.0 END
      ELSE (success_rate * usage_count + CASE WHEN success THEN 1.0 ELSE 0.0 END) / (usage_count + 1)
    END,
    updated_at = NOW()
  WHERE id = template_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to resolve data conflict
CREATE OR REPLACE FUNCTION resolve_data_conflict(
  conflict_id UUID,
  resolution_data JSONB,
  resolved_by_user UUID
)
RETURNS VOID AS $$
BEGIN
  UPDATE data_conflicts 
  SET 
    is_resolved = TRUE,
    resolution = resolution_data,
    resolved_at = NOW(),
    resolved_by = resolved_by_user
  WHERE id = conflict_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to automatically update job status when result is inserted
CREATE OR REPLACE FUNCTION trigger_update_job_status()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE transformation_jobs 
  SET 
    status = NEW.status,
    completed_at = CASE WHEN NEW.status IN ('completed', 'failed') THEN NOW() ELSE completed_at END,
    actual_duration = CASE WHEN NEW.status IN ('completed', 'failed') THEN NEW.duration ELSE actual_duration END,
    updated_at = NOW()
  WHERE id = NEW.job_id;
  
  -- Update template statistics if job completed
  IF NEW.status = 'completed' THEN
    PERFORM update_template_usage_stats(
      (SELECT template_id FROM transformation_jobs WHERE id = NEW.job_id),
      TRUE
    );
  ELSIF NEW.status = 'failed' THEN
    PERFORM update_template_usage_stats(
      (SELECT template_id FROM transformation_jobs WHERE id = NEW.job_id),
      FALSE
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS transformation_result_status_update ON transformation_results;
CREATE TRIGGER transformation_result_status_update
  AFTER INSERT ON transformation_results
  FOR EACH ROW
  EXECUTE FUNCTION trigger_update_job_status();

-- Insert system transformation templates
INSERT INTO transformation_templates (
  id,
  organization_id,
  name,
  description,
  source_format,
  target_format,
  mapping_rules,
  validation_rules,
  preservation_rules,
  conflict_resolution_strategy,
  is_system_template,
  is_active
) VALUES 
(
  'feature-to-element',
  '00000000-0000-0000-0000-000000000000', -- System template
  'Feature-Based to Element-Based',
  'Standard transformation from feature-centric to element-based webhooks',
  'feature-based',
  'element-based',
  '[
    {"sourceField": "feature_slug", "targetField": "feature_slug", "transformation": "direct_copy", "required": true},
    {"sourceField": "webhook_url", "targetField": "endpoint_url", "transformation": "direct_copy", "required": true},
    {"sourceField": "trigger_event", "targetField": "element_events", "transformation": "event_mapping", "required": true}
  ]'::JSONB,
  '["url_format", "element_exists", "event_compatibility"]'::JSONB,
  '["original_metadata", "creation_timestamps", "user_references"]'::JSONB,
  'merge',
  TRUE,
  TRUE
),
(
  'page-to-element',
  '00000000-0000-0000-0000-000000000000', -- System template
  'Page-Based to Element-Based',
  'Transform page-level webhooks to element-specific configurations',
  'page-based',
  'element-based',
  '[
    {"sourceField": "page_path", "targetField": "page_path", "transformation": "direct_copy", "required": true},
    {"sourceField": "page_elements", "targetField": "element_mappings", "transformation": "element_decomposition", "required": true}
  ]'::JSONB,
  '["page_exists", "element_discovery", "mapping_completeness"]'::JSONB,
  '["page_metadata", "element_attributes"]'::JSONB,
  'replace',
  TRUE,
  TRUE
),
(
  'global-to-element',
  '00000000-0000-0000-0000-000000000000', -- System template
  'Global to Element-Based',
  'Transform global/system webhooks to element-based format',
  'global',
  'element-based',
  '[
    {"sourceField": "system_event", "targetField": "element_events", "transformation": "system_event_mapping", "required": true},
    {"sourceField": "global_config", "targetField": "element_configs", "transformation": "config_distribution", "required": false}
  ]'::JSONB,
  '["system_compatibility", "element_support"]'::JSONB,
  '["system_metadata", "global_settings"]'::JSONB,
  'merge',
  TRUE,
  TRUE
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  mapping_rules = EXCLUDED.mapping_rules,
  validation_rules = EXCLUDED.validation_rules,
  preservation_rules = EXCLUDED.preservation_rules,
  updated_at = NOW();

-- Sample data for testing (optional)
-- INSERT INTO transformation_jobs (organization_id, template_id, source_data, status)
-- VALUES ('org-id-here', 'feature-to-element', '[{"id": "test", "feature_slug": "test"}]', 'pending');

COMMENT ON TABLE transformation_jobs IS 'Transformation jobs for converting webhook data';
COMMENT ON TABLE transformation_results IS 'Results and metrics from transformation jobs';
COMMENT ON TABLE transformation_templates IS 'Templates defining transformation rules and mappings';
COMMENT ON TABLE data_backups IS 'Data backups created before transformations';
COMMENT ON TABLE transformation_rules IS 'Custom transformation rules for specific mappings';
COMMENT ON TABLE data_conflicts IS 'Data conflicts found during transformation';
COMMENT ON TABLE validation_errors IS 'Validation errors from schema and integrity checks';

COMMENT ON FUNCTION get_transformation_statistics IS 'Get comprehensive transformation statistics for an organization';
COMMENT ON FUNCTION get_transformation_insights IS 'Get transformation performance insights and metrics';
COMMENT ON FUNCTION cleanup_expired_backups IS 'Clean up expired data backups based on retention policy';
COMMENT ON FUNCTION update_template_usage_stats IS 'Update template usage count and success rate';
COMMENT ON FUNCTION resolve_data_conflict IS 'Mark a data conflict as resolved with resolution data';