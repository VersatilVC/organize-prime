-- Enhanced Webhook Management System for OrganizePrime
-- This migration creates comprehensive webhook infrastructure with full N8N integration support

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create feature_webhooks table for webhook configurations
CREATE TABLE IF NOT EXISTS feature_webhooks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    url TEXT NOT NULL,
    description TEXT,
    feature_id UUID NOT NULL REFERENCES system_features(id) ON DELETE CASCADE,
    event_types JSONB DEFAULT '[]'::jsonb,
    is_active BOOLEAN DEFAULT true,
    secret_key TEXT,
    timeout_seconds INTEGER DEFAULT 30 CHECK (timeout_seconds >= 5 AND timeout_seconds <= 300),
    retry_attempts INTEGER DEFAULT 3 CHECK (retry_attempts >= 0 AND retry_attempts <= 10),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    success_count INTEGER DEFAULT 0,
    failure_count INTEGER DEFAULT 0,
    avg_response_time INTEGER DEFAULT 0,
    last_triggered TIMESTAMP WITH TIME ZONE,
    
    -- Constraints
    CONSTRAINT valid_url CHECK (url ~* '^https?://'),
    CONSTRAINT valid_name CHECK (length(trim(name)) > 0)
);

-- Create webhook_logs table for activity tracking
CREATE TABLE IF NOT EXISTS webhook_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    webhook_id UUID NOT NULL REFERENCES feature_webhooks(id) ON DELETE CASCADE,
    event_type VARCHAR(100) NOT NULL,
    status VARCHAR(20) NOT NULL CHECK (status IN ('success', 'failed', 'timeout', 'pending')),
    status_code INTEGER,
    response_time_ms INTEGER DEFAULT 0,
    error_message TEXT,
    payload_size INTEGER DEFAULT 0,
    triggered_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    retry_count INTEGER DEFAULT 0,
    is_test BOOLEAN DEFAULT false,
    organization_id UUID REFERENCES organizations(id),
    user_id UUID REFERENCES auth.users(id),
    request_headers JSONB,
    response_headers JSONB,
    request_body JSONB,
    response_body JSONB
);

-- Create webhook_events table for event definitions
CREATE TABLE IF NOT EXISTS webhook_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_type VARCHAR(100) NOT NULL UNIQUE,
    description TEXT NOT NULL,
    payload_schema JSONB,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create webhook_rate_limits table for rate limiting
CREATE TABLE IF NOT EXISTS webhook_rate_limits (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    webhook_id UUID NOT NULL REFERENCES feature_webhooks(id) ON DELETE CASCADE,
    requests_per_minute INTEGER DEFAULT 60,
    requests_per_hour INTEGER DEFAULT 1000,
    requests_per_day INTEGER DEFAULT 10000,
    current_minute_count INTEGER DEFAULT 0,
    current_hour_count INTEGER DEFAULT 0,
    current_day_count INTEGER DEFAULT 0,
    minute_window TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    hour_window TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    day_window TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_rate_limited BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for optimal performance
CREATE INDEX IF NOT EXISTS idx_feature_webhooks_feature_id ON feature_webhooks(feature_id);
CREATE INDEX IF NOT EXISTS idx_feature_webhooks_is_active ON feature_webhooks(is_active);
CREATE INDEX IF NOT EXISTS idx_feature_webhooks_created_by ON feature_webhooks(created_by);
CREATE INDEX IF NOT EXISTS idx_feature_webhooks_last_triggered ON feature_webhooks(last_triggered);

CREATE INDEX IF NOT EXISTS idx_webhook_logs_webhook_id ON webhook_logs(webhook_id);
CREATE INDEX IF NOT EXISTS idx_webhook_logs_triggered_at ON webhook_logs(triggered_at DESC);
CREATE INDEX IF NOT EXISTS idx_webhook_logs_status ON webhook_logs(status);
CREATE INDEX IF NOT EXISTS idx_webhook_logs_event_type ON webhook_logs(event_type);
CREATE INDEX IF NOT EXISTS idx_webhook_logs_organization_id ON webhook_logs(organization_id);
CREATE INDEX IF NOT EXISTS idx_webhook_logs_is_test ON webhook_logs(is_test);

-- Composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_webhook_logs_webhook_status_time ON webhook_logs(webhook_id, status, triggered_at DESC);
CREATE INDEX IF NOT EXISTS idx_webhook_logs_org_time ON webhook_logs(organization_id, triggered_at DESC);
CREATE INDEX IF NOT EXISTS idx_feature_webhooks_feature_active ON feature_webhooks(feature_id, is_active);

CREATE INDEX IF NOT EXISTS idx_webhook_rate_limits_webhook_id ON webhook_rate_limits(webhook_id);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply updated_at triggers
CREATE TRIGGER update_feature_webhooks_updated_at 
    BEFORE UPDATE ON feature_webhooks 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_webhook_events_updated_at 
    BEFORE UPDATE ON webhook_events 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_webhook_rate_limits_updated_at 
    BEFORE UPDATE ON webhook_rate_limits 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create function to update webhook statistics
CREATE OR REPLACE FUNCTION update_webhook_stats()
RETURNS TRIGGER AS $$
BEGIN
    -- Update success/failure counts and average response time
    UPDATE feature_webhooks 
    SET 
        success_count = (
            SELECT COUNT(*) 
            FROM webhook_logs 
            WHERE webhook_id = NEW.webhook_id AND status = 'success'
        ),
        failure_count = (
            SELECT COUNT(*) 
            FROM webhook_logs 
            WHERE webhook_id = NEW.webhook_id AND status IN ('failed', 'timeout')
        ),
        avg_response_time = (
            SELECT COALESCE(AVG(response_time_ms), 0)::INTEGER
            FROM webhook_logs 
            WHERE webhook_id = NEW.webhook_id AND status = 'success'
        ),
        last_triggered = NEW.triggered_at
    WHERE id = NEW.webhook_id;
    
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply webhook stats trigger
CREATE TRIGGER update_webhook_stats_trigger
    AFTER INSERT ON webhook_logs
    FOR EACH ROW EXECUTE FUNCTION update_webhook_stats();

-- Create function to clean old webhook logs (retention policy)
CREATE OR REPLACE FUNCTION cleanup_old_webhook_logs()
RETURNS void AS $$
BEGIN
    -- Keep logs for 90 days, but always keep at least 1000 most recent logs per webhook
    WITH logs_to_keep AS (
        SELECT id 
        FROM (
            SELECT 
                id,
                ROW_NUMBER() OVER (PARTITION BY webhook_id ORDER BY triggered_at DESC) as rn
            FROM webhook_logs 
            WHERE triggered_at > NOW() - INTERVAL '90 days'
               OR ROW_NUMBER() OVER (PARTITION BY webhook_id ORDER BY triggered_at DESC) <= 1000
        ) ranked 
        WHERE rn <= 1000
    )
    DELETE FROM webhook_logs 
    WHERE id NOT IN (SELECT id FROM logs_to_keep)
    AND triggered_at < NOW() - INTERVAL '90 days';
END;
$$ language 'plpgsql';

-- Create function for rate limit checking
CREATE OR REPLACE FUNCTION check_webhook_rate_limit(webhook_id_param UUID)
RETURNS BOOLEAN AS $$
DECLARE
    rate_limit_record RECORD;
    current_time TIMESTAMP WITH TIME ZONE := NOW();
BEGIN
    -- Get or create rate limit record
    SELECT * INTO rate_limit_record 
    FROM webhook_rate_limits 
    WHERE webhook_id = webhook_id_param;
    
    IF NOT FOUND THEN
        -- Create default rate limit record
        INSERT INTO webhook_rate_limits (webhook_id)
        VALUES (webhook_id_param);
        RETURN true; -- Allow first request
    END IF;
    
    -- Check if we need to reset counters
    IF rate_limit_record.minute_window < current_time - INTERVAL '1 minute' THEN
        UPDATE webhook_rate_limits 
        SET 
            current_minute_count = 0,
            minute_window = current_time
        WHERE webhook_id = webhook_id_param;
        rate_limit_record.current_minute_count := 0;
    END IF;
    
    IF rate_limit_record.hour_window < current_time - INTERVAL '1 hour' THEN
        UPDATE webhook_rate_limits 
        SET 
            current_hour_count = 0,
            hour_window = current_time
        WHERE webhook_id = webhook_id_param;
        rate_limit_record.current_hour_count := 0;
    END IF;
    
    IF rate_limit_record.day_window < current_time - INTERVAL '1 day' THEN
        UPDATE webhook_rate_limits 
        SET 
            current_day_count = 0,
            day_window = current_time
        WHERE webhook_id = webhook_id_param;
        rate_limit_record.current_day_count := 0;
    END IF;
    
    -- Check limits
    IF rate_limit_record.current_minute_count >= rate_limit_record.requests_per_minute OR
       rate_limit_record.current_hour_count >= rate_limit_record.requests_per_hour OR
       rate_limit_record.current_day_count >= rate_limit_record.requests_per_day THEN
        
        -- Update rate limited flag
        UPDATE webhook_rate_limits 
        SET is_rate_limited = true 
        WHERE webhook_id = webhook_id_param;
        
        RETURN false;
    END IF;
    
    -- Increment counters
    UPDATE webhook_rate_limits 
    SET 
        current_minute_count = current_minute_count + 1,
        current_hour_count = current_hour_count + 1,
        current_day_count = current_day_count + 1,
        is_rate_limited = false
    WHERE webhook_id = webhook_id_param;
    
    RETURN true;
END;
$$ language 'plpgsql';

-- Insert default webhook events
INSERT INTO webhook_events (event_type, description, payload_schema) VALUES
('user.created', 'Triggered when a new user is created', '{"type": "object", "properties": {"user_id": {"type": "string"}, "email": {"type": "string"}, "organization_id": {"type": "string"}}}'),
('user.updated', 'Triggered when a user profile is updated', '{"type": "object", "properties": {"user_id": {"type": "string"}, "changes": {"type": "object"}, "organization_id": {"type": "string"}}}'),
('user.deleted', 'Triggered when a user is deleted', '{"type": "object", "properties": {"user_id": {"type": "string"}, "organization_id": {"type": "string"}}}'),
('organization.created', 'Triggered when a new organization is created', '{"type": "object", "properties": {"organization_id": {"type": "string"}, "name": {"type": "string"}, "created_by": {"type": "string"}}}'),
('organization.updated', 'Triggered when an organization is updated', '{"type": "object", "properties": {"organization_id": {"type": "string"}, "changes": {"type": "object"}}}'),
('project.created', 'Triggered when a new project is created', '{"type": "object", "properties": {"project_id": {"type": "string"}, "name": {"type": "string"}, "organization_id": {"type": "string"}}}'),
('project.updated', 'Triggered when a project is updated', '{"type": "object", "properties": {"project_id": {"type": "string"}, "changes": {"type": "object"}, "organization_id": {"type": "string"}}}'),
('project.deleted', 'Triggered when a project is deleted', '{"type": "object", "properties": {"project_id": {"type": "string"}, "organization_id": {"type": "string"}}}'),
('task.created', 'Triggered when a new task is created', '{"type": "object", "properties": {"task_id": {"type": "string"}, "title": {"type": "string"}, "project_id": {"type": "string"}, "organization_id": {"type": "string"}}}'),
('task.updated', 'Triggered when a task is updated', '{"type": "object", "properties": {"task_id": {"type": "string"}, "changes": {"type": "object"}, "organization_id": {"type": "string"}}}'),
('task.completed', 'Triggered when a task is marked as completed', '{"type": "object", "properties": {"task_id": {"type": "string"}, "completed_by": {"type": "string"}, "organization_id": {"type": "string"}}}'),
('task.deleted', 'Triggered when a task is deleted', '{"type": "object", "properties": {"task_id": {"type": "string"}, "organization_id": {"type": "string"}}}'),
('feature.enabled', 'Triggered when a feature is enabled for an organization', '{"type": "object", "properties": {"feature_id": {"type": "string"}, "organization_id": {"type": "string"}, "enabled_by": {"type": "string"}}}'),
('feature.disabled', 'Triggered when a feature is disabled for an organization', '{"type": "object", "properties": {"feature_id": {"type": "string"}, "organization_id": {"type": "string"}, "disabled_by": {"type": "string"}}}'),
('webhook.test', 'Test event for webhook validation', '{"type": "object", "properties": {"webhook_id": {"type": "string"}, "test": {"type": "boolean"}, "timestamp": {"type": "string"}}}'),
('custom.event', 'Custom user-defined event', '{"type": "object", "properties": {"event_data": {"type": "object"}, "organization_id": {"type": "string"}}}')
ON CONFLICT (event_type) DO NOTHING;

-- Enable Row Level Security
ALTER TABLE feature_webhooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_rate_limits ENABLE ROW LEVEL SECURITY;

-- RLS Policies for feature_webhooks
CREATE POLICY "Super admins can manage all webhooks" ON feature_webhooks
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.user_id = auth.uid() 
            AND profiles.is_super_admin = true
        )
    );

CREATE POLICY "Organization admins can manage webhooks for their org features" ON feature_webhooks
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM organization_features OF
            JOIN user_roles UR ON UR.organization_id = OF.organization_id
            WHERE OF.feature_id = feature_webhooks.feature_id
            AND UR.user_id = auth.uid()
            AND UR.role IN ('owner', 'admin')
        )
    );

-- RLS Policies for webhook_logs
CREATE POLICY "Super admins can view all webhook logs" ON webhook_logs
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.user_id = auth.uid() 
            AND profiles.is_super_admin = true
        )
    );

CREATE POLICY "Organization members can view logs for their org webhooks" ON webhook_logs
    FOR SELECT USING (
        organization_id IN (
            SELECT organization_id FROM user_roles 
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "System can insert webhook logs" ON webhook_logs
    FOR INSERT WITH CHECK (true);

-- RLS Policies for webhook_events
CREATE POLICY "Everyone can read webhook events" ON webhook_events
    FOR SELECT USING (is_active = true);

CREATE POLICY "Super admins can manage webhook events" ON webhook_events
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.user_id = auth.uid() 
            AND profiles.is_super_admin = true
        )
    );

-- RLS Policies for webhook_rate_limits
CREATE POLICY "Super admins can manage all rate limits" ON webhook_rate_limits
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.user_id = auth.uid() 
            AND profiles.is_super_admin = true
        )
    );

CREATE POLICY "System can read/update rate limits" ON webhook_rate_limits
    FOR SELECT USING (true);

CREATE POLICY "System can update rate limits" ON webhook_rate_limits
    FOR UPDATE USING (true);

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT ON webhook_events TO anon, authenticated;
GRANT ALL ON feature_webhooks, webhook_logs, webhook_rate_limits TO authenticated;
GRANT SELECT ON feature_webhooks, webhook_logs TO anon;

-- Create a view for webhook analytics
CREATE OR REPLACE VIEW webhook_analytics AS
SELECT 
    fw.id as webhook_id,
    fw.name as webhook_name,
    fw.feature_id,
    f.name as feature_name,
    f.category as feature_category,
    fw.is_active,
    fw.success_count,
    fw.failure_count,
    fw.avg_response_time,
    fw.last_triggered,
    COALESCE(fw.success_count + fw.failure_count, 0) as total_requests,
    CASE 
        WHEN (fw.success_count + fw.failure_count) > 0 
        THEN ROUND((fw.success_count::FLOAT / (fw.success_count + fw.failure_count)) * 100, 2)
        ELSE NULL 
    END as success_rate_percentage,
    COUNT(wl_24h.id) as triggers_last_24h,
    COUNT(CASE WHEN wl_24h.status = 'success' THEN 1 END) as success_last_24h,
    COUNT(CASE WHEN wl_24h.status IN ('failed', 'timeout') THEN 1 END) as failures_last_24h
FROM feature_webhooks fw
LEFT JOIN system_features f ON fw.feature_id = f.id
LEFT JOIN webhook_logs wl_24h ON fw.id = wl_24h.webhook_id 
    AND wl_24h.triggered_at > NOW() - INTERVAL '24 hours'
GROUP BY fw.id, fw.name, fw.feature_id, f.name, f.category, fw.is_active, 
         fw.success_count, fw.failure_count, fw.avg_response_time, fw.last_triggered;

-- Grant access to the analytics view
GRANT SELECT ON webhook_analytics TO authenticated;

-- Create cleanup job (to be run periodically)
-- This would typically be handled by a cron job or scheduled function
COMMENT ON FUNCTION cleanup_old_webhook_logs() IS 'Run this function periodically to clean up old webhook logs. Recommended: daily via cron or pg_cron extension';

-- Add helpful comments
COMMENT ON TABLE feature_webhooks IS 'Webhook configurations for N8N integration with OrganizePrime features';
COMMENT ON TABLE webhook_logs IS 'Activity logs for all webhook triggers and their outcomes';
COMMENT ON TABLE webhook_events IS 'Definitions of available webhook event types and their schemas';
COMMENT ON TABLE webhook_rate_limits IS 'Rate limiting configurations and current usage counters for webhooks';

COMMENT ON COLUMN feature_webhooks.secret_key IS 'Secret key for webhook signature validation (HMAC)';
COMMENT ON COLUMN feature_webhooks.event_types IS 'Array of event types this webhook should respond to';
COMMENT ON COLUMN webhook_logs.payload_size IS 'Size of the webhook payload in bytes';
COMMENT ON COLUMN webhook_logs.is_test IS 'Flag indicating whether this was a test webhook trigger';