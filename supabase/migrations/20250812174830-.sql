-- Enable the Knowledge Base feature for the organization
INSERT INTO organization_features (
  organization_id,
  feature_id,
  is_enabled,
  enabled_at,
  setup_status
) 
SELECT 
  '8aa2da2b-d344-4ff2-beca-d8d34c8d5262',
  id,
  true,
  now(),
  'completed'
FROM system_features 
WHERE slug = 'knowledge-base'
ON CONFLICT (organization_id, feature_id) 
DO UPDATE SET 
  is_enabled = true,
  enabled_at = now(),
  setup_status = 'completed';