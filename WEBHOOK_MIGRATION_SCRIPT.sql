-- =========================================
-- WEBHOOK SCHEMA UPDATE MIGRATION
-- =========================================
-- Copy and paste this entire script into your Supabase SQL Editor
-- This will update your feature_webhooks table to match the expected schema

-- Step 1: Add missing columns to feature_webhooks table
DO $$ 
BEGIN
  -- Add url column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'feature_webhooks' AND column_name = 'url') THEN
    ALTER TABLE feature_webhooks ADD COLUMN url TEXT;
    RAISE NOTICE 'Added url column';
  ELSE
    RAISE NOTICE 'url column already exists';
  END IF;

  -- Add description column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'feature_webhooks' AND column_name = 'description') THEN
    ALTER TABLE feature_webhooks ADD COLUMN description TEXT;
    RAISE NOTICE 'Added description column';
  ELSE
    RAISE NOTICE 'description column already exists';
  END IF;

  -- Add event_types column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'feature_webhooks' AND column_name = 'event_types') THEN
    ALTER TABLE feature_webhooks ADD COLUMN event_types TEXT[] DEFAULT ARRAY['webhook.test'];
    RAISE NOTICE 'Added event_types column';
  ELSE
    RAISE NOTICE 'event_types column already exists';
  END IF;

  -- Add is_active column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'feature_webhooks' AND column_name = 'is_active') THEN
    ALTER TABLE feature_webhooks ADD COLUMN is_active BOOLEAN DEFAULT true;
    RAISE NOTICE 'Added is_active column';
  ELSE
    RAISE NOTICE 'is_active column already exists';
  END IF;

  -- Add secret_key column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'feature_webhooks' AND column_name = 'secret_key') THEN
    ALTER TABLE feature_webhooks ADD COLUMN secret_key TEXT;
    RAISE NOTICE 'Added secret_key column';
  ELSE
    RAISE NOTICE 'secret_key column already exists';
  END IF;

  -- Add timeout_seconds column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'feature_webhooks' AND column_name = 'timeout_seconds') THEN
    ALTER TABLE feature_webhooks ADD COLUMN timeout_seconds INTEGER DEFAULT 30;
    RAISE NOTICE 'Added timeout_seconds column';
  ELSE
    RAISE NOTICE 'timeout_seconds column already exists';
  END IF;

  -- Add retry_attempts column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'feature_webhooks' AND column_name = 'retry_attempts') THEN
    ALTER TABLE feature_webhooks ADD COLUMN retry_attempts INTEGER DEFAULT 3;
    RAISE NOTICE 'Added retry_attempts column';
  ELSE
    RAISE NOTICE 'retry_attempts column already exists';
  END IF;

  -- Add created_by column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'feature_webhooks' AND column_name = 'created_by') THEN
    ALTER TABLE feature_webhooks ADD COLUMN created_by UUID;
    RAISE NOTICE 'Added created_by column';
  ELSE
    RAISE NOTICE 'created_by column already exists';
  END IF;

  -- Add last_triggered column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'feature_webhooks' AND column_name = 'last_triggered') THEN
    ALTER TABLE feature_webhooks ADD COLUMN last_triggered TIMESTAMP WITH TIME ZONE;
    RAISE NOTICE 'Added last_triggered column';
  ELSE
    RAISE NOTICE 'last_triggered column already exists';
  END IF;

  -- Add success_count column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'feature_webhooks' AND column_name = 'success_count') THEN
    ALTER TABLE feature_webhooks ADD COLUMN success_count INTEGER DEFAULT 0;
    RAISE NOTICE 'Added success_count column';
  ELSE
    RAISE NOTICE 'success_count column already exists';
  END IF;

  -- Add failure_count column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'feature_webhooks' AND column_name = 'failure_count') THEN
    ALTER TABLE feature_webhooks ADD COLUMN failure_count INTEGER DEFAULT 0;
    RAISE NOTICE 'Added failure_count column';
  ELSE
    RAISE NOTICE 'failure_count column already exists';
  END IF;

  -- Add avg_response_time column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'feature_webhooks' AND column_name = 'avg_response_time') THEN
    ALTER TABLE feature_webhooks ADD COLUMN avg_response_time INTEGER DEFAULT 0;
    RAISE NOTICE 'Added avg_response_time column';
  ELSE
    RAISE NOTICE 'avg_response_time column already exists';
  END IF;
END $$;

-- Step 2: Copy data from endpoint_url to url column if needed
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns 
             WHERE table_name = 'feature_webhooks' AND column_name = 'endpoint_url') THEN
    -- Copy endpoint_url to url where url is null
    UPDATE feature_webhooks 
    SET url = endpoint_url 
    WHERE url IS NULL AND endpoint_url IS NOT NULL;
    RAISE NOTICE 'Copied data from endpoint_url to url column';
  ELSE
    RAISE NOTICE 'endpoint_url column does not exist, skipping data copy';
  END IF;
END $$;

-- Step 3: Make url NOT NULL (but only if it has data)
DO $$
BEGIN
  -- Check if all rows have url populated
  IF NOT EXISTS (SELECT 1 FROM feature_webhooks WHERE url IS NULL) THEN
    ALTER TABLE feature_webhooks ALTER COLUMN url SET NOT NULL;
    RAISE NOTICE 'Set url column to NOT NULL';
  ELSE
    RAISE NOTICE 'WARNING: Some rows have NULL url, cannot set NOT NULL constraint';
  END IF;
END $$;

-- Step 4: Create webhook_logs table if it doesn't exist
CREATE TABLE IF NOT EXISTS webhook_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    webhook_id UUID NOT NULL,
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

-- Step 5: Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_feature_webhooks_feature_id ON feature_webhooks(feature_id);
CREATE INDEX IF NOT EXISTS idx_feature_webhooks_is_active ON feature_webhooks(is_active);
CREATE INDEX IF NOT EXISTS idx_feature_webhooks_created_at ON feature_webhooks(created_at);
CREATE INDEX IF NOT EXISTS idx_feature_webhooks_last_triggered ON feature_webhooks(last_triggered);

CREATE INDEX IF NOT EXISTS idx_webhook_logs_webhook_id ON webhook_logs(webhook_id);
CREATE INDEX IF NOT EXISTS idx_webhook_logs_triggered_at ON webhook_logs(triggered_at);
CREATE INDEX IF NOT EXISTS idx_webhook_logs_status ON webhook_logs(status);
CREATE INDEX IF NOT EXISTS idx_webhook_logs_is_test ON webhook_logs(is_test);

-- Step 6: Add foreign key constraint for webhook_logs
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints 
                 WHERE table_name = 'webhook_logs' AND constraint_name = 'webhook_logs_webhook_id_fkey') THEN
    ALTER TABLE webhook_logs ADD CONSTRAINT webhook_logs_webhook_id_fkey 
    FOREIGN KEY (webhook_id) REFERENCES feature_webhooks(id) ON DELETE CASCADE;
    RAISE NOTICE 'Added foreign key constraint for webhook_logs';
  ELSE
    RAISE NOTICE 'Foreign key constraint for webhook_logs already exists';
  END IF;
END $$;

-- Step 7: Enable RLS on both tables
ALTER TABLE feature_webhooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_logs ENABLE ROW LEVEL SECURITY;

-- Final verification query - run this to see the updated schema
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'feature_webhooks'
ORDER BY ordinal_position;