-- Migration Orchestrator Database Schema
-- Part of Phase 4: Migration Orchestrator
-- Handles batch processing, job management, and execution workflows

-- Migration Plans table
CREATE TABLE IF NOT EXISTS migration_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  strategy TEXT NOT NULL DEFAULT 'balanced',
  total_elements INTEGER NOT NULL DEFAULT 0,
  total_webhooks INTEGER NOT NULL DEFAULT 0,
  total_decisions INTEGER NOT NULL DEFAULT 0,
  auto_migrate_count INTEGER NOT NULL DEFAULT 0,
  manual_review_count INTEGER NOT NULL DEFAULT 0,
  estimated_duration INTEGER NOT NULL DEFAULT 0,
  risk_level TEXT NOT NULL DEFAULT 'medium',
  execution_plan JSONB NOT NULL DEFAULT '{}',
  decisions JSONB NOT NULL DEFAULT '[]',
  jobs JSONB NOT NULL DEFAULT '[]',
  status TEXT NOT NULL DEFAULT 'draft',
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Migration Batches table
CREATE TABLE IF NOT EXISTS migration_batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  plan_id UUID REFERENCES migration_plans(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  strategy TEXT NOT NULL DEFAULT 'sequential',
  status TEXT NOT NULL DEFAULT 'created',
  total_jobs INTEGER NOT NULL DEFAULT 0,
  completed_jobs INTEGER NOT NULL DEFAULT 0,
  failed_jobs INTEGER NOT NULL DEFAULT 0,
  jobs_in_progress INTEGER NOT NULL DEFAULT 0,
  progress INTEGER NOT NULL DEFAULT 0,
  estimated_duration INTEGER,
  actual_duration INTEGER,
  configuration JSONB NOT NULL DEFAULT '{}',
  execution_log JSONB NOT NULL DEFAULT '[]',
  errors JSONB NOT NULL DEFAULT '[]',
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  paused_at TIMESTAMP WITH TIME ZONE,
  resumed_at TIMESTAMP WITH TIME ZONE,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Migration Jobs table
CREATE TABLE IF NOT EXISTS migration_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id UUID REFERENCES migration_batches(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  element_id TEXT NOT NULL,
  webhook_id TEXT NOT NULL,
  decision_data JSONB NOT NULL DEFAULT '{}',
  priority INTEGER NOT NULL DEFAULT 2,
  dependencies JSONB NOT NULL DEFAULT '[]',
  status TEXT NOT NULL DEFAULT 'queued',
  estimated_duration INTEGER NOT NULL DEFAULT 5000,
  duration INTEGER,
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  result JSONB,
  error_details TEXT,
  validation_checks JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Migration Events table for real-time monitoring
CREATE TABLE IF NOT EXISTS migration_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  batch_id UUID REFERENCES migration_batches(id) ON DELETE CASCADE,
  job_id UUID REFERENCES migration_jobs(id) ON DELETE CASCADE,
  webhook_id TEXT,
  event_data JSONB NOT NULL DEFAULT '{}',
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_migration_plans_org_status ON migration_plans(organization_id, status);
CREATE INDEX IF NOT EXISTS idx_migration_batches_org_status ON migration_batches(organization_id, status);
CREATE INDEX IF NOT EXISTS idx_migration_batches_plan ON migration_batches(plan_id);
CREATE INDEX IF NOT EXISTS idx_migration_jobs_batch ON migration_jobs(batch_id);
CREATE INDEX IF NOT EXISTS idx_migration_jobs_status ON migration_jobs(status);
CREATE INDEX IF NOT EXISTS idx_migration_events_batch ON migration_events(batch_id);
CREATE INDEX IF NOT EXISTS idx_migration_events_timestamp ON migration_events(timestamp DESC);

-- RLS Policies for data isolation
ALTER TABLE migration_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE migration_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE migration_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE migration_events ENABLE ROW LEVEL SECURITY;

-- Migration Plans policies
CREATE POLICY "migration_plans_org_isolation" ON migration_plans
FOR ALL USING (
  organization_id IN (
    SELECT organization_id FROM memberships 
    WHERE user_id = auth.uid() AND status = 'active'
  )
);

-- Migration Batches policies
CREATE POLICY "migration_batches_org_isolation" ON migration_batches
FOR ALL USING (
  organization_id IN (
    SELECT organization_id FROM memberships 
    WHERE user_id = auth.uid() AND status = 'active'
  )
);

-- Migration Jobs policies
CREATE POLICY "migration_jobs_org_isolation" ON migration_jobs
FOR ALL USING (
  organization_id IN (
    SELECT organization_id FROM memberships 
    WHERE user_id = auth.uid() AND status = 'active'
  )
);

-- Migration Events policies
CREATE POLICY "migration_events_org_isolation" ON migration_events
FOR ALL USING (
  organization_id IN (
    SELECT organization_id FROM memberships 
    WHERE user_id = auth.uid() AND status = 'active'
  )
);

-- Helper Functions

-- Function to get batch statistics
CREATE OR REPLACE FUNCTION get_batch_statistics(org_id UUID)
RETURNS TABLE (
  total_batches BIGINT,
  active_batches BIGINT,
  completed_batches BIGINT,
  failed_batches BIGINT,
  total_jobs BIGINT,
  success_rate DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  WITH batch_stats AS (
    SELECT 
      COUNT(*) as total,
      COUNT(*) FILTER (WHERE status IN ('running', 'paused', 'queued')) as active,
      COUNT(*) FILTER (WHERE status = 'completed') as completed,
      COUNT(*) FILTER (WHERE status = 'failed') as failed
    FROM migration_batches 
    WHERE organization_id = org_id
  ),
  job_stats AS (
    SELECT 
      COUNT(*) as total,
      COUNT(*) FILTER (WHERE status = 'completed') as successful
    FROM migration_jobs 
    WHERE organization_id = org_id
  )
  SELECT 
    b.total,
    b.active,
    b.completed,
    b.failed,
    j.total,
    CASE 
      WHEN j.total > 0 THEN ROUND((j.successful::DECIMAL / j.total::DECIMAL) * 100, 2)
      ELSE 0
    END
  FROM batch_stats b, job_stats j;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get active batch progress
CREATE OR REPLACE FUNCTION get_active_batch_progress(batch_id UUID)
RETURNS TABLE (
  batch_name TEXT,
  status TEXT,
  progress INTEGER,
  total_jobs INTEGER,
  completed_jobs INTEGER,
  failed_jobs INTEGER,
  jobs_in_progress INTEGER,
  estimated_time_remaining INTEGER,
  current_phase TEXT
) AS $$
DECLARE
  batch_record RECORD;
  avg_job_duration INTEGER;
  remaining_jobs INTEGER;
BEGIN
  -- Get batch information
  SELECT * INTO batch_record 
  FROM migration_batches 
  WHERE id = batch_id;
  
  IF NOT FOUND THEN
    RETURN;
  END IF;
  
  -- Calculate average job duration for remaining time estimation
  SELECT COALESCE(AVG(duration), 5000) INTO avg_job_duration
  FROM migration_jobs 
  WHERE batch_id = batch_id AND status = 'completed';
  
  remaining_jobs := batch_record.total_jobs - batch_record.completed_jobs;
  
  RETURN QUERY
  SELECT 
    batch_record.name,
    batch_record.status,
    batch_record.progress,
    batch_record.total_jobs,
    batch_record.completed_jobs,
    batch_record.failed_jobs,
    batch_record.jobs_in_progress,
    (remaining_jobs * avg_job_duration)::INTEGER,
    CASE 
      WHEN batch_record.progress < 25 THEN 'Preparation'
      WHEN batch_record.progress < 75 THEN 'Migration'
      WHEN batch_record.progress < 100 THEN 'Validation'
      ELSE 'Completed'
    END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update batch progress
CREATE OR REPLACE FUNCTION update_batch_progress(batch_id UUID)
RETURNS VOID AS $$
DECLARE
  total_jobs INTEGER;
  completed_jobs INTEGER;
  failed_jobs INTEGER;
  progress_percent INTEGER;
BEGIN
  -- Get job counts
  SELECT 
    COUNT(*),
    COUNT(*) FILTER (WHERE status = 'completed'),
    COUNT(*) FILTER (WHERE status = 'failed')
  INTO total_jobs, completed_jobs, failed_jobs
  FROM migration_jobs 
  WHERE batch_id = update_batch_progress.batch_id;
  
  -- Calculate progress percentage
  IF total_jobs > 0 THEN
    progress_percent := ROUND(((completed_jobs + failed_jobs)::DECIMAL / total_jobs::DECIMAL) * 100);
  ELSE
    progress_percent := 0;
  END IF;
  
  -- Update batch record
  UPDATE migration_batches 
  SET 
    completed_jobs = update_batch_progress.completed_jobs,
    failed_jobs = update_batch_progress.failed_jobs,
    progress = progress_percent,
    updated_at = NOW()
  WHERE id = update_batch_progress.batch_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get migration system health
CREATE OR REPLACE FUNCTION get_migration_system_health(org_id UUID)
RETURNS TABLE (
  system_health TEXT,
  active_batches INTEGER,
  total_jobs_today INTEGER,
  success_rate_today DECIMAL,
  avg_job_duration_today INTEGER,
  recent_errors INTEGER
) AS $$
DECLARE
  success_rate DECIMAL;
  error_count INTEGER;
  health_status TEXT;
BEGIN
  -- Calculate today's success rate
  SELECT 
    CASE 
      WHEN COUNT(*) > 0 THEN ROUND((COUNT(*) FILTER (WHERE status = 'completed')::DECIMAL / COUNT(*)::DECIMAL) * 100, 2)
      ELSE 100
    END
  INTO success_rate
  FROM migration_jobs 
  WHERE organization_id = org_id 
    AND created_at >= CURRENT_DATE;
  
  -- Count recent errors
  SELECT COUNT(*) INTO error_count
  FROM migration_jobs 
  WHERE organization_id = org_id 
    AND status = 'failed' 
    AND created_at >= CURRENT_DATE - INTERVAL '1 hour';
  
  -- Determine health status
  IF success_rate >= 90 AND error_count < 5 THEN
    health_status := 'healthy';
  ELSIF success_rate >= 80 OR error_count < 10 THEN
    health_status := 'warning';
  ELSE
    health_status := 'error';
  END IF;
  
  RETURN QUERY
  SELECT 
    health_status,
    (SELECT COUNT(*)::INTEGER FROM migration_batches WHERE organization_id = org_id AND status IN ('running', 'paused')),
    (SELECT COUNT(*)::INTEGER FROM migration_jobs WHERE organization_id = org_id AND created_at >= CURRENT_DATE),
    success_rate,
    (SELECT COALESCE(AVG(duration), 0)::INTEGER FROM migration_jobs WHERE organization_id = org_id AND created_at >= CURRENT_DATE AND status = 'completed'),
    error_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to automatically update batch progress when jobs complete
CREATE OR REPLACE FUNCTION trigger_update_batch_progress()
RETURNS TRIGGER AS $$
BEGIN
  -- Only update on status changes to completed or failed
  IF OLD.status != NEW.status AND NEW.status IN ('completed', 'failed') THEN
    PERFORM update_batch_progress(NEW.batch_id);
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger if it doesn't exist
DROP TRIGGER IF EXISTS migration_job_status_change ON migration_jobs;
CREATE TRIGGER migration_job_status_change
  AFTER UPDATE ON migration_jobs
  FOR EACH ROW
  EXECUTE FUNCTION trigger_update_batch_progress();

-- Function to create a migration event
CREATE OR REPLACE FUNCTION create_migration_event(
  org_id UUID,
  event_type TEXT,
  batch_id UUID DEFAULT NULL,
  job_id UUID DEFAULT NULL,
  webhook_id TEXT DEFAULT NULL,
  event_data JSONB DEFAULT '{}'
)
RETURNS UUID AS $$
DECLARE
  event_id UUID;
BEGIN
  INSERT INTO migration_events (
    organization_id,
    event_type,
    batch_id,
    job_id,
    webhook_id,
    event_data
  ) VALUES (
    org_id,
    event_type,
    batch_id,
    job_id,
    webhook_id,
    event_data
  ) RETURNING id INTO event_id;
  
  RETURN event_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Sample data for testing (optional)
-- INSERT INTO migration_plans (organization_id, name, description, strategy, total_decisions, auto_migrate_count)
-- VALUES ('org-id-here', 'Test Migration Plan', 'Sample plan for testing', 'balanced', 10, 8);

COMMENT ON TABLE migration_plans IS 'Comprehensive migration plans with execution strategies';
COMMENT ON TABLE migration_batches IS 'Migration batch executions with progress tracking';
COMMENT ON TABLE migration_jobs IS 'Individual migration jobs within batches';
COMMENT ON TABLE migration_events IS 'Real-time migration system events for monitoring';

COMMENT ON FUNCTION get_batch_statistics IS 'Get comprehensive batch and job statistics for an organization';
COMMENT ON FUNCTION get_active_batch_progress IS 'Get real-time progress information for a specific batch';
COMMENT ON FUNCTION update_batch_progress IS 'Update batch progress based on job completion status';
COMMENT ON FUNCTION get_migration_system_health IS 'Get overall migration system health metrics';
COMMENT ON FUNCTION create_migration_event IS 'Create a new migration event for real-time monitoring';