-- Fix the Knowledge Base navigation configuration
-- Update the "Manage Knowledgebases" route to be more specific
UPDATE system_feature_configs 
SET navigation_config = jsonb_set(
  navigation_config,
  '{pages,0,route}',
  '"/features/knowledge-base/manage-knowledgebases"'
)
WHERE system_feature_id = (
  SELECT id FROM system_features WHERE slug = 'knowledge-base'
)
AND navigation_config->'pages'->0->>'title' = 'Manage Knowledgebases';

-- Also update the href in navigation_config if it exists
UPDATE system_feature_configs 
SET navigation_config = jsonb_set(
  navigation_config,
  '{pages,0,href}',
  '"/features/knowledge-base/manage-knowledgebases"'
)
WHERE system_feature_id = (
  SELECT id FROM system_features WHERE slug = 'knowledge-base'
)
AND navigation_config->'pages'->0->>'title' = 'Manage Knowledgebases'
AND navigation_config->'pages'->0 ? 'href';

-- Set the first page as default if not already set
UPDATE system_feature_configs 
SET navigation_config = jsonb_set(
  navigation_config,
  '{pages,0,isDefault}',
  'true'
)
WHERE system_feature_id = (
  SELECT id FROM system_features WHERE slug = 'knowledge-base'
)
AND navigation_config->'pages'->0->>'title' = 'Manage Knowledgebases';