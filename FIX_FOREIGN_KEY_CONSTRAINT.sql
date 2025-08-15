-- Fix foreign key constraint - point to the correct table
-- The feature data is coming from 'system_feature_configs' but the FK points to 'system_features'

-- Step 1: Drop the existing foreign key constraint that points to wrong table
ALTER TABLE feature_webhooks DROP CONSTRAINT IF EXISTS feature_webhooks_feature_id_fkey;

-- Step 2: Create new foreign key constraint pointing to the correct table
ALTER TABLE feature_webhooks ADD CONSTRAINT feature_webhooks_feature_id_fkey 
FOREIGN KEY (feature_id) REFERENCES system_feature_configs(id) ON DELETE CASCADE;

-- Step 3: Verify the constraint was created correctly
SELECT 
    conname AS constraint_name,
    pg_get_constraintdef(c.oid) AS constraint_definition
FROM pg_constraint c
JOIN pg_class t ON c.conrelid = t.oid
WHERE t.relname = 'feature_webhooks'
AND conname = 'feature_webhooks_feature_id_fkey';