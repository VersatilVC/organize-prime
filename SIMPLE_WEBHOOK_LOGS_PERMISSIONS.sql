-- Simple webhook_logs permissions fix
-- Since user_organizations table doesn't exist, use simpler policies

-- Enable RLS on webhook_logs table
ALTER TABLE webhook_logs ENABLE ROW LEVEL SECURITY;

-- Drop any existing policies
DROP POLICY IF EXISTS "Users can view webhook logs for their organization" ON webhook_logs;
DROP POLICY IF EXISTS "Users can create webhook logs for their organization" ON webhook_logs;
DROP POLICY IF EXISTS "Allow webhook log creation" ON webhook_logs;
DROP POLICY IF EXISTS "Allow webhook log viewing" ON webhook_logs;
DROP POLICY IF EXISTS "Simple webhook log creation" ON webhook_logs;
DROP POLICY IF EXISTS "Simple webhook log viewing" ON webhook_logs;

-- Create simple policies that allow authenticated users
CREATE POLICY "Simple webhook log creation" ON webhook_logs
    FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Simple webhook log viewing" ON webhook_logs
    FOR SELECT USING (auth.uid() IS NOT NULL);

-- Verify the policies were created
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd
FROM pg_policies 
WHERE tablename = 'webhook_logs';