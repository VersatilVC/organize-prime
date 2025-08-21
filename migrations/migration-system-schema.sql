-- Migration System Database Schema
-- Creates tables and functions for webhook migration analysis and tracking

-- Migration analysis table for webhook inventory
CREATE TABLE webhook_migration_analysis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  legacy_webhook_id UUID, -- Will reference feature_webhooks when that table exists
  feature_slug TEXT NOT NULL,
  page_path TEXT,
  webhook_type TEXT NOT NULL,
  endpoint_url TEXT NOT NULL,
  http_method TEXT NOT NULL DEFAULT 'POST',
  payload_template JSONB DEFAULT '{}',
  headers JSONB DEFAULT '{}',
  
  -- Analysis metrics
  complexity_score INTEGER NOT NULL DEFAULT 1 CHECK (complexity_score >= 1 AND complexity_score <= 10),
  usage_frequency INTEGER DEFAULT 0,
  success_rate DECIMAL(5,2) DEFAULT 100.00,
  last_executed_at TIMESTAMP WITH TIME ZONE,
  
  -- Migration readiness assessment
  element_mapping_confidence DECIMAL(3,2) DEFAULT 0.00 CHECK (element_mapping_confidence >= 0.00 AND element_mapping_confidence <= 1.00),
  migration_category TEXT NOT NULL DEFAULT 'pending' CHECK (migration_category IN ('automatic', 'assisted', 'manual', 'skip', 'pending')),
  migration_priority INTEGER DEFAULT 5 CHECK (migration_priority >= 1 AND migration_priority <= 10),
  
  -- Analysis metadata
  analysis_data JSONB DEFAULT '{}',
  risk_factors TEXT[],
  recommendations TEXT[],
  analyzed_at TIMESTAMP WITH TIME ZONE,
  analyzed_by UUID REFERENCES auth.users(id),
  
  -- Standard audit fields
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Ensure organization isolation
  CONSTRAINT webhook_migration_analysis_org_isolation 
    CHECK (organization_id IS NOT NULL)
);

-- Migration status tracking for actual migration process
CREATE TABLE webhook_migration_status (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  analysis_id UUID REFERENCES webhook_migration_analysis(id) ON DELETE CASCADE,
  legacy_webhook_id UUID, -- Reference to original webhook
  new_webhook_id UUID REFERENCES element_webhooks(id) ON DELETE SET NULL,
  
  -- Migration execution details
  migration_type TEXT NOT NULL CHECK (migration_type IN ('automatic', 'assisted', 'manual')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'failed', 'rolled_back')),
  batch_id UUID, -- For grouping related migrations
  
  -- Confidence and validation
  confidence_score DECIMAL(3,2) NOT NULL DEFAULT 0.00,
  validation_status TEXT DEFAULT 'pending' CHECK (validation_status IN ('pending', 'passed', 'failed', 'skipped')),
  validation_results JSONB DEFAULT '{}',
  
  -- Migration data and metadata
  migration_data JSONB DEFAULT '{}',
  transformation_rules JSONB DEFAULT '{}',
  error_details JSONB,
  rollback_data JSONB,
  
  -- Execution tracking
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  migrated_by UUID REFERENCES auth.users(id),
  validated_by UUID REFERENCES auth.users(id),
  rolled_back_by UUID REFERENCES auth.users(id),
  rolled_back_at TIMESTAMP WITH TIME ZONE,
  
  -- Standard audit fields
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Ensure organization isolation
  CONSTRAINT webhook_migration_status_org_isolation 
    CHECK (organization_id IS NOT NULL)
);

-- Element discovery registry for mapping webhooks to UI elements
CREATE TABLE element_discovery_registry (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  feature_slug TEXT NOT NULL,
  page_path TEXT NOT NULL,
  element_id TEXT NOT NULL,
  element_type TEXT NOT NULL, -- 'button', 'link', 'form', 'input', etc.
  
  -- Element metadata
  selector TEXT, -- CSS selector for the element
  display_name TEXT,
  description TEXT,
  element_attributes JSONB DEFAULT '{}',
  
  -- Discovery and mapping data
  discovered_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  discovery_method TEXT DEFAULT 'manual' CHECK (discovery_method IN ('manual', 'automated', 'pattern-match')),
  discovery_confidence DECIMAL(3,2) DEFAULT 1.00,
  
  -- Webhook mapping potential
  current_webhook_associations TEXT[], -- Array of webhook IDs currently associated
  potential_webhooks UUID[], -- Array of analysis IDs that might map to this element
  mapping_confidence DECIMAL(3,2) DEFAULT 0.00,
  
  -- Element status and validation
  is_active BOOLEAN DEFAULT TRUE,
  is_interactive BOOLEAN DEFAULT TRUE,
  validation_status TEXT DEFAULT 'pending' CHECK (validation_status IN ('pending', 'validated', 'failed')),
  validation_data JSONB DEFAULT '{}',
  
  -- Standard audit fields
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Constraints
  UNIQUE(organization_id, feature_slug, page_path, element_id),
  CONSTRAINT element_discovery_registry_org_isolation 
    CHECK (organization_id IS NOT NULL)
);

-- Migration rules for automated decision making
CREATE TABLE migration_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  rule_name TEXT NOT NULL,
  rule_description TEXT,
  rule_type TEXT NOT NULL CHECK (rule_type IN ('mapping', 'validation', 'transformation', 'exclusion')),
  
  -- Rule definition
  conditions JSONB NOT NULL DEFAULT '{}',
  actions JSONB NOT NULL DEFAULT '{}',
  priority INTEGER DEFAULT 5 CHECK (priority >= 1 AND priority <= 10),
  
  -- Rule effectiveness
  confidence_threshold DECIMAL(3,2) DEFAULT 0.80,
  success_rate DECIMAL(5,2) DEFAULT 0.00,
  usage_count INTEGER DEFAULT 0,
  
  -- Rule status
  is_active BOOLEAN DEFAULT TRUE,
  is_system_rule BOOLEAN DEFAULT FALSE, -- System vs. user-defined rules
  
  -- Standard audit fields
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Constraints
  UNIQUE(organization_id, rule_name),
  CONSTRAINT migration_rules_org_isolation 
    CHECK (organization_id IS NOT NULL)
);

-- Migration batches for grouping related migrations
CREATE TABLE migration_batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  batch_name TEXT NOT NULL,
  batch_description TEXT,
  batch_type TEXT DEFAULT 'manual' CHECK (batch_type IN ('manual', 'automatic', 'scheduled')),
  
  -- Batch configuration
  batch_config JSONB DEFAULT '{}',
  processing_strategy TEXT DEFAULT 'sequential' CHECK (processing_strategy IN ('sequential', 'parallel', 'mixed')),
  max_parallel_jobs INTEGER DEFAULT 5,
  
  -- Batch status and metrics
  status TEXT NOT NULL DEFAULT 'created' CHECK (status IN ('created', 'queued', 'running', 'paused', 'completed', 'failed', 'cancelled')),
  total_webhooks INTEGER DEFAULT 0,
  processed_webhooks INTEGER DEFAULT 0,
  successful_migrations INTEGER DEFAULT 0,
  failed_migrations INTEGER DEFAULT 0,
  
  -- Execution tracking
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  estimated_completion_at TIMESTAMP WITH TIME ZONE,
  
  -- Error handling and rollback
  error_summary JSONB DEFAULT '{}',
  rollback_available BOOLEAN DEFAULT FALSE,
  rollback_data JSONB,
  
  -- Standard audit fields
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT migration_batches_org_isolation 
    CHECK (organization_id IS NOT NULL)
);

-- Indexes for performance optimization
CREATE INDEX idx_webhook_migration_analysis_org_feature 
  ON webhook_migration_analysis(organization_id, feature_slug);
CREATE INDEX idx_webhook_migration_analysis_category 
  ON webhook_migration_analysis(organization_id, migration_category);
CREATE INDEX idx_webhook_migration_analysis_confidence 
  ON webhook_migration_analysis(organization_id, element_mapping_confidence DESC);

CREATE INDEX idx_webhook_migration_status_org_status 
  ON webhook_migration_status(organization_id, status);
CREATE INDEX idx_webhook_migration_status_batch 
  ON webhook_migration_status(organization_id, batch_id);
CREATE INDEX idx_webhook_migration_status_analysis 
  ON webhook_migration_status(analysis_id);

CREATE INDEX idx_element_discovery_registry_org_feature_page 
  ON element_discovery_registry(organization_id, feature_slug, page_path);
CREATE INDEX idx_element_discovery_registry_element_type 
  ON element_discovery_registry(organization_id, element_type);
CREATE INDEX idx_element_discovery_registry_mapping_confidence 
  ON element_discovery_registry(organization_id, mapping_confidence DESC);

CREATE INDEX idx_migration_rules_org_type_active 
  ON migration_rules(organization_id, rule_type, is_active);
CREATE INDEX idx_migration_rules_priority 
  ON migration_rules(organization_id, priority DESC);

CREATE INDEX idx_migration_batches_org_status 
  ON migration_batches(organization_id, status);
CREATE INDEX idx_migration_batches_created_at 
  ON migration_batches(organization_id, created_at DESC);

-- Row Level Security (RLS) policies for organization isolation
ALTER TABLE webhook_migration_analysis ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_migration_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE element_discovery_registry ENABLE ROW LEVEL SECURITY;
ALTER TABLE migration_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE migration_batches ENABLE ROW LEVEL SECURITY;

-- RLS policies for organization isolation
CREATE POLICY "org_isolation" ON webhook_migration_analysis
FOR ALL USING (
  organization_id IN (
    SELECT organization_id FROM memberships 
    WHERE user_id = auth.uid() AND status = 'active'
  )
  OR is_super_admin(auth.uid())
);

CREATE POLICY "org_isolation" ON webhook_migration_status
FOR ALL USING (
  organization_id IN (
    SELECT organization_id FROM memberships 
    WHERE user_id = auth.uid() AND status = 'active'
  )
  OR is_super_admin(auth.uid())
);

CREATE POLICY "org_isolation" ON element_discovery_registry
FOR ALL USING (
  organization_id IN (
    SELECT organization_id FROM memberships 
    WHERE user_id = auth.uid() AND status = 'active'
  )
  OR is_super_admin(auth.uid())
);

CREATE POLICY "org_isolation" ON migration_rules
FOR ALL USING (
  organization_id IN (
    SELECT organization_id FROM memberships 
    WHERE user_id = auth.uid() AND status = 'active'
  )
  OR is_super_admin(auth.uid())
);

CREATE POLICY "org_isolation" ON migration_batches
FOR ALL USING (
  organization_id IN (
    SELECT organization_id FROM memberships 
    WHERE user_id = auth.uid() AND status = 'active'
  )
  OR is_super_admin(auth.uid())
);

-- Helper functions for migration system

-- Function to calculate migration complexity score
CREATE OR REPLACE FUNCTION calculate_migration_complexity(
  webhook_data JSONB,
  usage_stats JSONB DEFAULT '{}'
) RETURNS INTEGER AS $$
DECLARE
  complexity_score INTEGER := 1;
BEGIN
  -- Base complexity from webhook configuration
  IF jsonb_array_length(webhook_data->'headers') > 3 THEN
    complexity_score := complexity_score + 2;
  END IF;
  
  IF jsonb_typeof(webhook_data->'payload_template') = 'object' 
     AND jsonb_array_length(jsonb_object_keys(webhook_data->'payload_template')) > 5 THEN
    complexity_score := complexity_score + 2;
  END IF;
  
  -- Add complexity based on usage patterns
  IF (usage_stats->>'usage_frequency')::INTEGER > 100 THEN
    complexity_score := complexity_score + 1;
  END IF;
  
  IF (usage_stats->>'success_rate')::DECIMAL < 95.00 THEN
    complexity_score := complexity_score + 2;
  END IF;
  
  -- Cap at maximum complexity
  RETURN LEAST(complexity_score, 10);
END;
$$ LANGUAGE plpgsql;

-- Function to auto-categorize migration type based on confidence and complexity
CREATE OR REPLACE FUNCTION determine_migration_category(
  confidence_score DECIMAL,
  complexity_score INTEGER
) RETURNS TEXT AS $$
BEGIN
  -- High confidence and low complexity = automatic
  IF confidence_score >= 0.90 AND complexity_score <= 3 THEN
    RETURN 'automatic';
  END IF;
  
  -- Medium confidence or medium complexity = assisted
  IF confidence_score >= 0.70 AND complexity_score <= 7 THEN
    RETURN 'assisted';
  END IF;
  
  -- Low confidence or high complexity = manual
  IF confidence_score < 0.70 OR complexity_score > 7 THEN
    RETURN 'manual';
  END IF;
  
  -- Default fallback
  RETURN 'manual';
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update migration category when analysis changes
CREATE OR REPLACE FUNCTION auto_update_migration_category()
RETURNS TRIGGER AS $$
BEGIN
  NEW.migration_category := determine_migration_category(
    NEW.element_mapping_confidence,
    NEW.complexity_score
  );
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_auto_update_migration_category
  BEFORE INSERT OR UPDATE ON webhook_migration_analysis
  FOR EACH ROW
  EXECUTE FUNCTION auto_update_migration_category();

-- Function to get migration readiness summary
CREATE OR REPLACE FUNCTION get_migration_readiness_summary(org_id UUID)
RETURNS TABLE(
  total_webhooks BIGINT,
  automatic_ready BIGINT,
  assisted_ready BIGINT,
  manual_required BIGINT,
  pending_analysis BIGINT,
  avg_confidence DECIMAL,
  readiness_percentage DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  WITH stats AS (
    SELECT 
      COUNT(*) as total,
      COUNT(CASE WHEN migration_category = 'automatic' THEN 1 END) as automatic,
      COUNT(CASE WHEN migration_category = 'assisted' THEN 1 END) as assisted,
      COUNT(CASE WHEN migration_category = 'manual' THEN 1 END) as manual,
      COUNT(CASE WHEN migration_category = 'pending' THEN 1 END) as pending,
      AVG(element_mapping_confidence) as avg_conf
    FROM webhook_migration_analysis
    WHERE organization_id = org_id
  )
  SELECT 
    s.total,
    s.automatic,
    s.assisted,
    s.manual,
    s.pending,
    s.avg_conf,
    CASE 
      WHEN s.total = 0 THEN 0.0
      ELSE ROUND((s.automatic + s.assisted)::DECIMAL * 100.0 / s.total, 2)
    END as readiness_pct
  FROM stats s;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant necessary permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON webhook_migration_analysis TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON webhook_migration_status TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON element_discovery_registry TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON migration_rules TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON migration_batches TO authenticated;

GRANT EXECUTE ON FUNCTION calculate_migration_complexity TO authenticated;
GRANT EXECUTE ON FUNCTION determine_migration_category TO authenticated;
GRANT EXECUTE ON FUNCTION get_migration_readiness_summary TO authenticated;

-- Insert default system migration rules
INSERT INTO migration_rules (organization_id, rule_name, rule_description, rule_type, conditions, actions, is_system_rule, created_by) VALUES
-- This will be populated by the migration service initialization
-- Placeholder for now - actual rules will be inserted programmatically
((SELECT id FROM organizations LIMIT 1), 'system_placeholder', 'Placeholder rule', 'mapping', '{}', '{}', true, (SELECT id FROM auth.users LIMIT 1))
ON CONFLICT DO NOTHING;

-- Create migration analysis summary view
CREATE VIEW migration_analysis_summary AS
SELECT 
  wma.organization_id,
  wma.feature_slug,
  COUNT(*) as total_webhooks,
  COUNT(CASE WHEN wma.migration_category = 'automatic' THEN 1 END) as automatic_webhooks,
  COUNT(CASE WHEN wma.migration_category = 'assisted' THEN 1 END) as assisted_webhooks,
  COUNT(CASE WHEN wma.migration_category = 'manual' THEN 1 END) as manual_webhooks,
  COUNT(CASE WHEN wma.migration_category = 'pending' THEN 1 END) as pending_webhooks,
  AVG(wma.element_mapping_confidence) as avg_confidence,
  AVG(wma.complexity_score) as avg_complexity,
  MAX(wma.analyzed_at) as last_analyzed_at
FROM webhook_migration_analysis wma
GROUP BY wma.organization_id, wma.feature_slug;

GRANT SELECT ON migration_analysis_summary TO authenticated;

COMMENT ON TABLE webhook_migration_analysis IS 'Comprehensive analysis of existing webhooks for migration planning';
COMMENT ON TABLE webhook_migration_status IS 'Tracking table for actual webhook migration execution';
COMMENT ON TABLE element_discovery_registry IS 'Registry of discovered UI elements for webhook mapping';
COMMENT ON TABLE migration_rules IS 'Rules engine for automated migration decision making';
COMMENT ON TABLE migration_batches IS 'Batch processing groups for webhook migrations';