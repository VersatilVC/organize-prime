-- Update the navigation_config in system_features to match the one in system_feature_configs for knowledge-base
UPDATE system_features 
SET navigation_config = (
  SELECT navigation_config 
  FROM system_feature_configs 
  WHERE feature_slug = 'knowledge-base'
)
WHERE slug = 'knowledge-base';