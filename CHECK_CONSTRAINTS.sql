-- Run this in Supabase SQL Editor to check constraints on feature_webhooks table

-- Check all constraints on feature_webhooks table
SELECT 
    conname AS constraint_name,
    contype AS constraint_type,
    pg_get_constraintdef(c.oid) AS constraint_definition
FROM pg_constraint c
JOIN pg_class t ON c.conrelid = t.oid
JOIN pg_namespace n ON t.relnamespace = n.oid
WHERE t.relname = 'feature_webhooks'
AND n.nspname = 'public';

-- Check unique indexes on feature_webhooks table  
SELECT 
    i.relname AS index_name,
    a.attname AS column_name,
    ix.indisunique AS is_unique
FROM pg_class t
JOIN pg_index ix ON t.oid = ix.indrelid
JOIN pg_class i ON i.oid = ix.indexrelid
JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum = ANY(ix.indkey)
WHERE t.relname = 'feature_webhooks'
AND ix.indisunique = true;

-- Check if there are any existing webhooks that might conflict
SELECT 
    id,
    name,
    feature_id,
    url,
    endpoint_url,
    created_at
FROM feature_webhooks
ORDER BY created_at DESC
LIMIT 10;