-- Fix webhook_logs table permissions (403 Forbidden error)
-- The webhook test is failing because the user can't insert into webhook_logs

-- First, let's check if webhook_logs table exists and has proper RLS policies
-- Enable RLS on webhook_logs table
ALTER TABLE webhook_logs ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to recreate them
DROP POLICY IF EXISTS "Users can view webhook logs for their organization" ON webhook_logs;
DROP POLICY IF EXISTS "Users can create webhook logs for their organization" ON webhook_logs;
DROP POLICY IF EXISTS "Allow webhook log creation" ON webhook_logs;

-- Create a more permissive policy for webhook log creation
-- This allows users to create logs for webhooks they have access to
CREATE POLICY "Allow webhook log creation" ON webhook_logs
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM feature_webhooks fh
            JOIN system_feature_configs sf ON fh.feature_id = sf.id
            JOIN organization_feature_configs of ON sf.feature_slug = of.feature_slug
            JOIN user_organizations uo ON of.organization_id = uo.organization_id
            WHERE fh.id = webhook_logs.webhook_id
            AND uo.user_id = auth.uid()
            AND uo.role IN ('owner', 'admin', 'member')
        )
    );

-- Create policy for viewing webhook logs
CREATE POLICY "Allow webhook log viewing" ON webhook_logs
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM feature_webhooks fh
            JOIN system_feature_configs sf ON fh.feature_id = sf.id
            JOIN organization_feature_configs of ON sf.feature_slug = of.feature_slug
            JOIN user_organizations uo ON of.organization_id = uo.organization_id
            WHERE fh.id = webhook_logs.webhook_id
            AND uo.user_id = auth.uid()
            AND uo.role IN ('owner', 'admin', 'member')
        )
    );

-- Alternative: If the above is too complex, create a simpler policy that allows authenticated users
-- Uncomment these if the above doesn't work:
-- 
-- DROP POLICY IF EXISTS "Allow webhook log creation" ON webhook_logs;
-- DROP POLICY IF EXISTS "Allow webhook log viewing" ON webhook_logs;
-- 
-- CREATE POLICY "Simple webhook log creation" ON webhook_logs
--     FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
-- 
-- CREATE POLICY "Simple webhook log viewing" ON webhook_logs
--     FOR SELECT USING (auth.uid() IS NOT NULL);

-- Check if the policies were created successfully
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual
FROM pg_policies 
WHERE tablename = 'webhook_logs';