-- Validation Framework Database Schema
-- Part of Phase 6: Validation Framework
-- Handles comprehensive testing and validation for webhook migrations

-- Validation Suites table
CREATE TABLE IF NOT EXISTS validation_suites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  suite_type TEXT NOT NULL, -- 'pre_migration', 'post_migration', 'comparison', 'regression'
  test_categories JSONB NOT NULL DEFAULT '[]',
  configuration JSONB NOT NULL DEFAULT '{}',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Validation Tests table
CREATE TABLE IF NOT EXISTS validation_tests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  suite_id UUID REFERENCES validation_suites(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  test_name TEXT NOT NULL,
  test_type TEXT NOT NULL, -- 'endpoint', 'event_simulation', 'load_test', 'integration', 'regression'
  test_scenario JSONB NOT NULL DEFAULT '{}',
  expected_results JSONB NOT NULL DEFAULT '[]',
  validation_rules JSONB NOT NULL DEFAULT '[]',
  is_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  priority TEXT NOT NULL DEFAULT 'medium', -- 'low', 'medium', 'high', 'critical'
  estimated_duration INTEGER NOT NULL DEFAULT 5000,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Validation Runs table
CREATE TABLE IF NOT EXISTS validation_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  suite_id UUID REFERENCES validation_suites(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  run_type TEXT NOT NULL DEFAULT 'manual', -- 'manual', 'scheduled', 'triggered'
  status TEXT NOT NULL DEFAULT 'queued', -- 'queued', 'running', 'completed', 'failed', 'cancelled', 'paused'
  total_tests INTEGER NOT NULL DEFAULT 0,
  passed_tests INTEGER NOT NULL DEFAULT 0,
  failed_tests INTEGER NOT NULL DEFAULT 0,
  skipped_tests INTEGER NOT NULL DEFAULT 0,
  progress INTEGER NOT NULL DEFAULT 0,
  results JSONB NOT NULL DEFAULT '[]',
  summary JSONB NOT NULL DEFAULT '{}',
  configuration JSONB NOT NULL DEFAULT '{}',
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  duration INTEGER,
  triggered_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Webhook Comparisons table
CREATE TABLE IF NOT EXISTS webhook_comparisons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  legacy_webhook_id TEXT NOT NULL,
  element_webhook_id TEXT NOT NULL,
  comparison_type TEXT NOT NULL DEFAULT 'functional', -- 'functional', 'performance', 'data_integrity'
  test_scenarios JSONB NOT NULL DEFAULT '[]',
  results JSONB NOT NULL DEFAULT '[]',
  summary JSONB NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'running', 'completed', 'failed'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Validation Reports table
CREATE TABLE IF NOT EXISTS validation_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  report_type TEXT NOT NULL, -- 'migration_accuracy', 'performance_impact', 'data_integrity', 'compliance'
  title TEXT NOT NULL,
  description TEXT,
  scope JSONB NOT NULL DEFAULT '{}',
  data JSONB NOT NULL DEFAULT '{}',
  metrics JSONB NOT NULL DEFAULT '{}',
  recommendations JSONB NOT NULL DEFAULT '[]',
  generated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  generated_by UUID REFERENCES auth.users(id)
);

-- Test Scenarios table (reusable test scenarios)
CREATE TABLE IF NOT EXISTS test_scenarios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  scenario_type TEXT NOT NULL, -- 'endpoint', 'ui_interaction', 'data_validation', 'performance'
  category TEXT NOT NULL, -- 'functional', 'performance', 'security', 'integration'
  test_data JSONB NOT NULL DEFAULT '{}',
  mock_events JSONB NOT NULL DEFAULT '[]',
  expected_behavior TEXT,
  validation_steps JSONB NOT NULL DEFAULT '[]',
  is_template BOOLEAN NOT NULL DEFAULT FALSE,
  usage_count INTEGER NOT NULL DEFAULT 0,
  success_rate DECIMAL DEFAULT 0,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Validation Issues table
CREATE TABLE IF NOT EXISTS validation_issues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id UUID REFERENCES validation_runs(id) ON DELETE CASCADE,
  test_id UUID REFERENCES validation_tests(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  issue_type TEXT NOT NULL DEFAULT 'error', -- 'error', 'warning', 'info'
  severity TEXT NOT NULL DEFAULT 'medium', -- 'low', 'medium', 'high', 'critical'
  category TEXT NOT NULL, -- 'schema', 'functional', 'performance', 'integration', 'security', 'compliance'
  message TEXT NOT NULL,
  details TEXT,
  suggested_fix TEXT,
  stack_trace TEXT,
  is_resolved BOOLEAN NOT NULL DEFAULT FALSE,
  resolved_by UUID REFERENCES auth.users(id),
  resolved_at TIMESTAMP WITH TIME ZONE,
  resolution_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Test Artifacts table (for storing test outputs, logs, screenshots, etc.)
CREATE TABLE IF NOT EXISTS test_artifacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id UUID REFERENCES validation_runs(id) ON DELETE CASCADE,
  test_id UUID REFERENCES validation_tests(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  artifact_type TEXT NOT NULL, -- 'request', 'response', 'log', 'screenshot', 'performance_trace'
  name TEXT NOT NULL,
  data JSONB,
  file_path TEXT,
  file_size BIGINT,
  mime_type TEXT,
  metadata JSONB NOT NULL DEFAULT '{}',
  retention_days INTEGER NOT NULL DEFAULT 30,
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Performance Benchmarks table
CREATE TABLE IF NOT EXISTS performance_benchmarks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  benchmark_name TEXT NOT NULL,
  webhook_type TEXT NOT NULL, -- 'legacy', 'element'
  webhook_id TEXT NOT NULL,
  test_scenario_id UUID REFERENCES test_scenarios(id),
  response_time_ms INTEGER NOT NULL,
  memory_usage_mb INTEGER,
  cpu_usage_percent DECIMAL,
  throughput_rps INTEGER,
  error_rate DECIMAL,
  concurrent_users INTEGER,
  test_duration_seconds INTEGER,
  environment TEXT NOT NULL DEFAULT 'test', -- 'test', 'staging', 'production'
  tested_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_validation_suites_org_active ON validation_suites(organization_id, is_active);
CREATE INDEX IF NOT EXISTS idx_validation_tests_suite ON validation_tests(suite_id);
CREATE INDEX IF NOT EXISTS idx_validation_tests_enabled ON validation_tests(is_enabled, priority);
CREATE INDEX IF NOT EXISTS idx_validation_runs_suite_status ON validation_runs(suite_id, status);
CREATE INDEX IF NOT EXISTS idx_validation_runs_created ON validation_runs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_webhook_comparisons_org ON webhook_comparisons(organization_id);
CREATE INDEX IF NOT EXISTS idx_webhook_comparisons_status ON webhook_comparisons(status);
CREATE INDEX IF NOT EXISTS idx_validation_reports_org_type ON validation_reports(organization_id, report_type);
CREATE INDEX IF NOT EXISTS idx_test_scenarios_org_type ON test_scenarios(organization_id, scenario_type);
CREATE INDEX IF NOT EXISTS idx_validation_issues_run ON validation_issues(run_id);
CREATE INDEX IF NOT EXISTS idx_validation_issues_severity ON validation_issues(severity, is_resolved);
CREATE INDEX IF NOT EXISTS idx_test_artifacts_run ON test_artifacts(run_id);
CREATE INDEX IF NOT EXISTS idx_test_artifacts_expires ON test_artifacts(expires_at);
CREATE INDEX IF NOT EXISTS idx_performance_benchmarks_webhook ON performance_benchmarks(webhook_id, webhook_type);
CREATE INDEX IF NOT EXISTS idx_performance_benchmarks_tested ON performance_benchmarks(tested_at DESC);

-- RLS Policies for data isolation
ALTER TABLE validation_suites ENABLE ROW LEVEL SECURITY;
ALTER TABLE validation_tests ENABLE ROW LEVEL SECURITY;
ALTER TABLE validation_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_comparisons ENABLE ROW LEVEL SECURITY;
ALTER TABLE validation_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE test_scenarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE validation_issues ENABLE ROW LEVEL SECURITY;
ALTER TABLE test_artifacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE performance_benchmarks ENABLE ROW LEVEL SECURITY;

-- Validation Suites policies
CREATE POLICY "validation_suites_org_isolation" ON validation_suites
FOR ALL USING (
  organization_id IN (
    SELECT organization_id FROM memberships 
    WHERE user_id = auth.uid() AND status = 'active'
  )
);

-- Validation Tests policies
CREATE POLICY "validation_tests_org_isolation" ON validation_tests
FOR ALL USING (
  organization_id IN (
    SELECT organization_id FROM memberships 
    WHERE user_id = auth.uid() AND status = 'active'
  )
);

-- Validation Runs policies
CREATE POLICY "validation_runs_org_isolation" ON validation_runs
FOR ALL USING (
  organization_id IN (
    SELECT organization_id FROM memberships 
    WHERE user_id = auth.uid() AND status = 'active'
  )
);

-- Webhook Comparisons policies
CREATE POLICY "webhook_comparisons_org_isolation" ON webhook_comparisons
FOR ALL USING (
  organization_id IN (
    SELECT organization_id FROM memberships 
    WHERE user_id = auth.uid() AND status = 'active'
  )
);

-- Validation Reports policies
CREATE POLICY "validation_reports_org_isolation" ON validation_reports
FOR ALL USING (
  organization_id IN (
    SELECT organization_id FROM memberships 
    WHERE user_id = auth.uid() AND status = 'active'
  )
);

-- Test Scenarios policies
CREATE POLICY "test_scenarios_org_isolation" ON test_scenarios
FOR ALL USING (
  organization_id IN (
    SELECT organization_id FROM memberships 
    WHERE user_id = auth.uid() AND status = 'active'
  )
  OR is_template = TRUE
);

-- Validation Issues policies
CREATE POLICY "validation_issues_org_isolation" ON validation_issues
FOR ALL USING (
  organization_id IN (
    SELECT organization_id FROM memberships 
    WHERE user_id = auth.uid() AND status = 'active'
  )
);

-- Test Artifacts policies
CREATE POLICY "test_artifacts_org_isolation" ON test_artifacts
FOR ALL USING (
  organization_id IN (
    SELECT organization_id FROM memberships 
    WHERE user_id = auth.uid() AND status = 'active'
  )
);

-- Performance Benchmarks policies
CREATE POLICY "performance_benchmarks_org_isolation" ON performance_benchmarks
FOR ALL USING (
  organization_id IN (
    SELECT organization_id FROM memberships 
    WHERE user_id = auth.uid() AND status = 'active'
  )
);

-- Helper Functions

-- Function to get validation statistics
CREATE OR REPLACE FUNCTION get_validation_statistics(org_id UUID)
RETURNS TABLE (
  total_suites BIGINT,
  total_runs BIGINT,
  average_pass_rate DECIMAL,
  critical_issues BIGINT,
  recent_runs_success_rate DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  WITH suite_stats AS (
    SELECT COUNT(*) as suites
    FROM validation_suites 
    WHERE organization_id = org_id AND is_active = TRUE
  ),
  run_stats AS (
    SELECT 
      COUNT(*) as total,
      COALESCE(AVG(CASE WHEN total_tests > 0 THEN passed_tests::DECIMAL / total_tests::DECIMAL ELSE 0 END), 0) as avg_pass_rate
    FROM validation_runs 
    WHERE organization_id = org_id AND status = 'completed'
  ),
  issue_stats AS (
    SELECT COUNT(*) as critical
    FROM validation_issues 
    WHERE organization_id = org_id AND severity = 'critical' AND is_resolved = FALSE
  ),
  recent_stats AS (
    SELECT 
      COALESCE(AVG(CASE WHEN total_tests > 0 THEN passed_tests::DECIMAL / total_tests::DECIMAL ELSE 0 END), 0) as recent_success_rate
    FROM validation_runs 
    WHERE organization_id = org_id 
      AND status = 'completed' 
      AND created_at >= NOW() - INTERVAL '7 days'
  )
  SELECT 
    s.suites,
    r.total,
    r.avg_pass_rate,
    i.critical,
    rs.recent_success_rate
  FROM suite_stats s, run_stats r, issue_stats i, recent_stats rs;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to calculate test suite health score
CREATE OR REPLACE FUNCTION calculate_suite_health_score(suite_id UUID)
RETURNS DECIMAL AS $$
DECLARE
  total_runs INTEGER;
  successful_runs INTEGER;
  avg_pass_rate DECIMAL;
  critical_issues INTEGER;
  health_score DECIMAL;
BEGIN
  -- Get run statistics for the suite
  SELECT 
    COUNT(*),
    COUNT(*) FILTER (WHERE status = 'completed'),
    COALESCE(AVG(CASE WHEN total_tests > 0 THEN passed_tests::DECIMAL / total_tests::DECIMAL ELSE 0 END), 0)
  INTO total_runs, successful_runs, avg_pass_rate
  FROM validation_runs 
  WHERE suite_id = calculate_suite_health_score.suite_id;
  
  -- Get critical issues
  SELECT COUNT(*) INTO critical_issues
  FROM validation_issues vi
  JOIN validation_runs vr ON vi.run_id = vr.id
  WHERE vr.suite_id = calculate_suite_health_score.suite_id 
    AND vi.severity = 'critical' 
    AND vi.is_resolved = FALSE;
  
  -- Calculate health score (0-1 scale)
  IF total_runs = 0 THEN
    health_score := 0;
  ELSE
    health_score := (
      (successful_runs::DECIMAL / total_runs::DECIMAL) * 0.4 +  -- 40% weight on completion rate
      avg_pass_rate * 0.5 +  -- 50% weight on pass rate
      GREATEST(0, 1 - (critical_issues::DECIMAL / 10)) * 0.1  -- 10% weight on issue count (max 10 issues = 0 score)
    );
  END IF;
  
  RETURN LEAST(1, GREATEST(0, health_score));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get performance comparison
CREATE OR REPLACE FUNCTION get_performance_comparison(
  legacy_webhook_id TEXT,
  element_webhook_id TEXT,
  org_id UUID
)
RETURNS TABLE (
  legacy_avg_response_time INTEGER,
  element_avg_response_time INTEGER,
  performance_improvement DECIMAL,
  legacy_error_rate DECIMAL,
  element_error_rate DECIMAL,
  reliability_improvement DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  WITH legacy_stats AS (
    SELECT 
      AVG(response_time_ms) as avg_response,
      AVG(error_rate) as avg_error_rate
    FROM performance_benchmarks 
    WHERE webhook_id = legacy_webhook_id 
      AND webhook_type = 'legacy'
      AND organization_id = org_id
  ),
  element_stats AS (
    SELECT 
      AVG(response_time_ms) as avg_response,
      AVG(error_rate) as avg_error_rate
    FROM performance_benchmarks 
    WHERE webhook_id = element_webhook_id 
      AND webhook_type = 'element'
      AND organization_id = org_id
  )
  SELECT 
    l.avg_response::INTEGER,
    e.avg_response::INTEGER,
    CASE 
      WHEN l.avg_response > 0 THEN (l.avg_response - e.avg_response) / l.avg_response
      ELSE 0
    END,
    l.avg_error_rate,
    e.avg_error_rate,
    CASE 
      WHEN l.avg_error_rate > 0 THEN (l.avg_error_rate - e.avg_error_rate) / l.avg_error_rate
      ELSE 0
    END
  FROM legacy_stats l, element_stats e;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to auto-resolve minor issues
CREATE OR REPLACE FUNCTION auto_resolve_minor_issues()
RETURNS INTEGER AS $$
DECLARE
  resolved_count INTEGER;
BEGIN
  -- Auto-resolve info-level issues older than 7 days
  UPDATE validation_issues 
  SET 
    is_resolved = TRUE,
    resolved_by = NULL, -- System resolution
    resolved_at = NOW(),
    resolution_notes = 'Auto-resolved: Info-level issue older than 7 days'
  WHERE issue_type = 'info' 
    AND is_resolved = FALSE 
    AND created_at < NOW() - INTERVAL '7 days';
  
  GET DIAGNOSTICS resolved_count = ROW_COUNT;
  
  -- Auto-resolve warning-level issues older than 30 days
  UPDATE validation_issues 
  SET 
    is_resolved = TRUE,
    resolved_by = NULL,
    resolved_at = NOW(),
    resolution_notes = 'Auto-resolved: Warning-level issue older than 30 days'
  WHERE issue_type = 'warning' 
    AND severity = 'low'
    AND is_resolved = FALSE 
    AND created_at < NOW() - INTERVAL '30 days';
  
  GET DIAGNOSTICS resolved_count = resolved_count + ROW_COUNT;
  
  RETURN resolved_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to clean up expired test artifacts
CREATE OR REPLACE FUNCTION cleanup_expired_test_artifacts()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  -- Set expiration dates for artifacts without them
  UPDATE test_artifacts 
  SET expires_at = created_at + (retention_days || ' days')::INTERVAL
  WHERE expires_at IS NULL;
  
  -- Delete expired artifacts
  DELETE FROM test_artifacts
  WHERE expires_at < NOW();
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update test scenario statistics
CREATE OR REPLACE FUNCTION update_scenario_stats(scenario_id UUID, success BOOLEAN)
RETURNS VOID AS $$
BEGIN
  UPDATE test_scenarios 
  SET 
    usage_count = usage_count + 1,
    success_rate = CASE 
      WHEN usage_count = 0 THEN CASE WHEN success THEN 1.0 ELSE 0.0 END
      ELSE (success_rate * usage_count + CASE WHEN success THEN 1.0 ELSE 0.0 END) / (usage_count + 1)
    END,
    updated_at = NOW()
  WHERE id = scenario_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to automatically set artifact expiration
CREATE OR REPLACE FUNCTION set_artifact_expiration()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.expires_at IS NULL THEN
    NEW.expires_at := NEW.created_at + (NEW.retention_days || ' days')::INTERVAL;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS test_artifact_expiration ON test_artifacts;
CREATE TRIGGER test_artifact_expiration
  BEFORE INSERT ON test_artifacts
  FOR EACH ROW
  EXECUTE FUNCTION set_artifact_expiration();

-- Insert template test scenarios
INSERT INTO test_scenarios (
  organization_id,
  name,
  description,
  scenario_type,
  category,
  test_data,
  expected_behavior,
  is_template
) VALUES 
(
  (SELECT id FROM organizations LIMIT 1), -- Use first available org as placeholder
  'Basic Endpoint Test',
  'Test webhook endpoint response and status codes',
  'endpoint',
  'functional',
  '{"method": "POST", "payload": {"test": true}, "timeout": 5000}'::JSONB,
  'Should return 200 status code with valid response',
  TRUE
),
(
  (SELECT id FROM organizations LIMIT 1),
  'Load Test Scenario',
  'Test webhook performance under concurrent load',
  'endpoint',
  'performance', 
  '{"concurrent_users": 10, "duration_seconds": 30, "requests_per_second": 5}'::JSONB,
  'Should maintain response time under 2 seconds with error rate below 1%',
  TRUE
),
(
  (SELECT id FROM organizations LIMIT 1),
  'UI Element Interaction',
  'Simulate user interaction with UI elements',
  'ui_interaction',
  'functional',
  '{"element_selector": "button[data-testid=submit]", "action": "click", "wait_for": ".success-message"}'::JSONB,
  'Should trigger webhook when element is interacted with',
  TRUE
),
(
  (SELECT id FROM organizations LIMIT 1),
  'Data Validation Test',
  'Validate webhook payload data integrity',
  'data_validation',
  'integration',
  '{"schema": {"type": "object", "required": ["id", "timestamp"]}, "sample_data": {}}'::JSONB,
  'Should validate all required fields are present and correctly formatted',
  TRUE
);

COMMENT ON TABLE validation_suites IS 'Validation test suites for comprehensive webhook testing';
COMMENT ON TABLE validation_tests IS 'Individual validation tests within test suites';
COMMENT ON TABLE validation_runs IS 'Execution history and results of validation test runs';
COMMENT ON TABLE webhook_comparisons IS 'Side-by-side comparisons of legacy vs element webhooks';
COMMENT ON TABLE validation_reports IS 'Generated validation reports and analytics';
COMMENT ON TABLE test_scenarios IS 'Reusable test scenarios and templates';
COMMENT ON TABLE validation_issues IS 'Issues and problems found during validation';
COMMENT ON TABLE test_artifacts IS 'Test outputs, logs, and artifacts storage';
COMMENT ON TABLE performance_benchmarks IS 'Performance metrics and benchmarks';

COMMENT ON FUNCTION get_validation_statistics IS 'Get comprehensive validation statistics for an organization';
COMMENT ON FUNCTION calculate_suite_health_score IS 'Calculate health score for a validation test suite';
COMMENT ON FUNCTION get_performance_comparison IS 'Compare performance metrics between legacy and element webhooks';
COMMENT ON FUNCTION auto_resolve_minor_issues IS 'Automatically resolve minor validation issues based on age and severity';
COMMENT ON FUNCTION cleanup_expired_test_artifacts IS 'Clean up expired test artifacts based on retention policy';
COMMENT ON FUNCTION update_scenario_stats IS 'Update usage count and success rate for test scenarios';