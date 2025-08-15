-- Update feature_webhooks table to match expected schema
-- This migration will add missing columns and standardize the table structure

-- First, let's see what exists by trying to add columns that might be missing
-- We'll use IF NOT EXISTS to avoid errors if columns already exist

-- Add missing columns if they don't exist
DO $$ 
BEGIN
  -- Add url column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'feature_webhooks' AND column_name = 'url') THEN
    ALTER TABLE feature_webhooks ADD COLUMN url TEXT;
  END IF;

  -- Add description column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'feature_webhooks' AND column_name = 'description') THEN
    ALTER TABLE feature_webhooks ADD COLUMN description TEXT;
  END IF;

  -- Add event_types column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'feature_webhooks' AND column_name = 'event_types') THEN
    ALTER TABLE feature_webhooks ADD COLUMN event_types TEXT[] DEFAULT ARRAY['webhook.test'];
  END IF;

  -- Add is_active column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'feature_webhooks' AND column_name = 'is_active') THEN
    ALTER TABLE feature_webhooks ADD COLUMN is_active BOOLEAN DEFAULT true;
  END IF;

  -- Add secret_key column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'feature_webhooks' AND column_name = 'secret_key') THEN
    ALTER TABLE feature_webhooks ADD COLUMN secret_key TEXT;
  END IF;

  -- Add timeout_seconds column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'feature_webhooks' AND column_name = 'timeout_seconds') THEN
    ALTER TABLE feature_webhooks ADD COLUMN timeout_seconds INTEGER DEFAULT 30;
  END IF;

  -- Add retry_attempts column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'feature_webhooks' AND column_name = 'retry_attempts') THEN
    ALTER TABLE feature_webhooks ADD COLUMN retry_attempts INTEGER DEFAULT 3;
  END IF;

  -- Add created_by column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'feature_webhooks' AND column_name = 'created_by') THEN
    ALTER TABLE feature_webhooks ADD COLUMN created_by UUID;
  END IF;

  -- Add last_triggered column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'feature_webhooks' AND column_name = 'last_triggered') THEN
    ALTER TABLE feature_webhooks ADD COLUMN last_triggered TIMESTAMP WITH TIME ZONE;
  END IF;

  -- Add success_count column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'feature_webhooks' AND column_name = 'success_count') THEN
    ALTER TABLE feature_webhooks ADD COLUMN success_count INTEGER DEFAULT 0;
  END IF;

  -- Add failure_count column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'feature_webhooks' AND column_name = 'failure_count') THEN
    ALTER TABLE feature_webhooks ADD COLUMN failure_count INTEGER DEFAULT 0;
  END IF;

  -- Add avg_response_time column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'feature_webhooks' AND column_name = 'avg_response_time') THEN
    ALTER TABLE feature_webhooks ADD COLUMN avg_response_time INTEGER DEFAULT 0;
  END IF;
END $$;

-- Now copy data from endpoint_url to url column if endpoint_url exists and url is empty
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns 
             WHERE table_name = 'feature_webhooks' AND column_name = 'endpoint_url') THEN
    -- Copy endpoint_url to url where url is null
    UPDATE feature_webhooks 
    SET url = endpoint_url 
    WHERE url IS NULL AND endpoint_url IS NOT NULL;
  END IF;
END $$;

-- Make url NOT NULL now that we've populated it
ALTER TABLE feature_webhooks ALTER COLUMN url SET NOT NULL;

-- Add constraints and indexes for better performance
DO $$
BEGIN
  -- Add check constraint for timeout_seconds
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints 
                 WHERE table_name = 'feature_webhooks' AND constraint_name = 'feature_webhooks_timeout_check') THEN
    ALTER TABLE feature_webhooks ADD CONSTRAINT feature_webhooks_timeout_check 
    CHECK (timeout_seconds >= 5 AND timeout_seconds <= 300);
  END IF;

  -- Add check constraint for retry_attempts
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints 
                 WHERE table_name = 'feature_webhooks' AND constraint_name = 'feature_webhooks_retry_check') THEN
    ALTER TABLE feature_webhooks ADD CONSTRAINT feature_webhooks_retry_check 
    CHECK (retry_attempts >= 0 AND retry_attempts <= 10);
  END IF;

  -- Add check constraint for success_count
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints 
                 WHERE table_name = 'feature_webhooks' AND constraint_name = 'feature_webhooks_success_count_check') THEN
    ALTER TABLE feature_webhooks ADD CONSTRAINT feature_webhooks_success_count_check 
    CHECK (success_count >= 0);
  END IF;

  -- Add check constraint for failure_count
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints 
                 WHERE table_name = 'feature_webhooks' AND constraint_name = 'feature_webhooks_failure_count_check') THEN
    ALTER TABLE feature_webhooks ADD CONSTRAINT feature_webhooks_failure_count_check 
    CHECK (failure_count >= 0);
  END IF;

  -- Add check constraint for avg_response_time
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints 
                 WHERE table_name = 'feature_webhooks' AND constraint_name = 'feature_webhooks_avg_response_time_check') THEN
    ALTER TABLE feature_webhooks ADD CONSTRAINT feature_webhooks_avg_response_time_check 
    CHECK (avg_response_time >= 0);
  END IF;
END $$;

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_feature_webhooks_feature_id ON feature_webhooks(feature_id);
CREATE INDEX IF NOT EXISTS idx_feature_webhooks_is_active ON feature_webhooks(is_active);
CREATE INDEX IF NOT EXISTS idx_feature_webhooks_created_at ON feature_webhooks(created_at);
CREATE INDEX IF NOT EXISTS idx_feature_webhooks_last_triggered ON feature_webhooks(last_triggered);

-- Create or replace the foreign key constraint to system_features
DO $$
BEGIN
  -- Drop existing foreign key constraint if it exists (might be pointing to wrong table)
  IF EXISTS (SELECT 1 FROM information_schema.table_constraints 
             WHERE table_name = 'feature_webhooks' AND constraint_name = 'feature_webhooks_feature_id_fkey') THEN
    ALTER TABLE feature_webhooks DROP CONSTRAINT feature_webhooks_feature_id_fkey;
  END IF;

  -- Create new foreign key constraint pointing to system_features
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'system_features') THEN
    ALTER TABLE feature_webhooks ADD CONSTRAINT feature_webhooks_feature_id_fkey 
    FOREIGN KEY (feature_id) REFERENCES system_features(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Add foreign key constraint for created_by if auth.users table exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'users' AND table_schema = 'auth') THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints 
                   WHERE table_name = 'feature_webhooks' AND constraint_name = 'feature_webhooks_created_by_fkey') THEN
      ALTER TABLE feature_webhooks ADD CONSTRAINT feature_webhooks_created_by_fkey 
      FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;
    END IF;
  END IF;
END $$;

-- Update RLS policies for the feature_webhooks table
ALTER TABLE feature_webhooks ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Users can view webhooks for their organization features" ON feature_webhooks;
DROP POLICY IF EXISTS "Users can create webhooks for their organization features" ON feature_webhooks;
DROP POLICY IF EXISTS "Users can update webhooks for their organization features" ON feature_webhooks;
DROP POLICY IF EXISTS "Users can delete webhooks for their organization features" ON feature_webhooks;

-- Create comprehensive RLS policies
CREATE POLICY "Users can view webhooks for their organization features" ON feature_webhooks
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM system_features sf
            JOIN organization_features of ON sf.id = of.feature_id
            JOIN user_organizations uo ON of.organization_id = uo.organization_id
            WHERE sf.id = feature_webhooks.feature_id
            AND uo.user_id = auth.uid()
            AND uo.role IN ('owner', 'admin', 'member')
        )
    );

CREATE POLICY "Users can create webhooks for their organization features" ON feature_webhooks
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM system_features sf
            JOIN organization_features of ON sf.id = of.feature_id
            JOIN user_organizations uo ON of.organization_id = uo.organization_id
            WHERE sf.id = feature_webhooks.feature_id
            AND uo.user_id = auth.uid()
            AND uo.role IN ('owner', 'admin')
        )
    );

CREATE POLICY "Users can update webhooks for their organization features" ON feature_webhooks
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM system_features sf
            JOIN organization_features of ON sf.id = of.feature_id
            JOIN user_organizations uo ON of.organization_id = uo.organization_id
            WHERE sf.id = feature_webhooks.feature_id
            AND uo.user_id = auth.uid()
            AND uo.role IN ('owner', 'admin')
        )
    );

CREATE POLICY "Users can delete webhooks for their organization features" ON feature_webhooks
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM system_features sf
            JOIN organization_features of ON sf.id = of.feature_id
            JOIN user_organizations uo ON of.organization_id = uo.organization_id
            WHERE sf.id = feature_webhooks.feature_id
            AND uo.user_id = auth.uid()
            AND uo.role IN ('owner', 'admin')
        )
    );

-- Create webhook_logs table if it doesn't exist
CREATE TABLE IF NOT EXISTS webhook_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    webhook_id UUID NOT NULL REFERENCES feature_webhooks(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('success', 'failed', 'timeout')),
    status_code INTEGER,
    response_time_ms INTEGER DEFAULT 0,
    error_message TEXT,
    payload_size INTEGER DEFAULT 0,
    retry_count INTEGER DEFAULT 0,
    is_test BOOLEAN DEFAULT false,
    request_headers JSONB,
    response_headers JSONB,
    request_body JSONB,
    response_body JSONB,
    triggered_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create indexes for webhook_logs
CREATE INDEX IF NOT EXISTS idx_webhook_logs_webhook_id ON webhook_logs(webhook_id);
CREATE INDEX IF NOT EXISTS idx_webhook_logs_triggered_at ON webhook_logs(triggered_at);
CREATE INDEX IF NOT EXISTS idx_webhook_logs_status ON webhook_logs(status);
CREATE INDEX IF NOT EXISTS idx_webhook_logs_is_test ON webhook_logs(is_test);

-- Enable RLS on webhook_logs
ALTER TABLE webhook_logs ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for webhook_logs
DROP POLICY IF EXISTS "Users can view webhook logs for their organization" ON webhook_logs;
DROP POLICY IF EXISTS "Users can create webhook logs for their organization" ON webhook_logs;

CREATE POLICY "Users can view webhook logs for their organization" ON webhook_logs
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM feature_webhooks fh
            JOIN system_features sf ON fh.feature_id = sf.id
            JOIN organization_features of ON sf.id = of.feature_id
            JOIN user_organizations uo ON of.organization_id = uo.organization_id
            WHERE fh.id = webhook_logs.webhook_id
            AND uo.user_id = auth.uid()
            AND uo.role IN ('owner', 'admin', 'member')
        )
    );

CREATE POLICY "Users can create webhook logs for their organization" ON webhook_logs
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM feature_webhooks fh
            JOIN system_features sf ON fh.feature_id = sf.id
            JOIN organization_features of ON sf.id = of.feature_id
            JOIN user_organizations uo ON of.organization_id = uo.organization_id
            WHERE fh.id = webhook_logs.webhook_id
            AND uo.user_id = auth.uid()
            AND uo.role IN ('owner', 'admin', 'member')
        )
    );

-- Add comment to document the schema
COMMENT ON TABLE feature_webhooks IS 'Webhook configurations for system features, enabling N8N automation integration';
COMMENT ON COLUMN feature_webhooks.url IS 'HTTP/HTTPS endpoint URL for the webhook';
COMMENT ON COLUMN feature_webhooks.event_types IS 'Array of event types that trigger this webhook';
COMMENT ON COLUMN feature_webhooks.secret_key IS 'Secret key for HMAC signature validation';
COMMENT ON COLUMN feature_webhooks.timeout_seconds IS 'Request timeout in seconds (5-300)';
COMMENT ON COLUMN feature_webhooks.retry_attempts IS 'Number of retry attempts on failure (0-10)';
COMMENT ON COLUMN feature_webhooks.success_count IS 'Total number of successful webhook calls';
COMMENT ON COLUMN feature_webhooks.failure_count IS 'Total number of failed webhook calls';
COMMENT ON COLUMN feature_webhooks.avg_response_time IS 'Average response time in milliseconds';

COMMENT ON TABLE webhook_logs IS 'Detailed logs of webhook execution attempts and results';