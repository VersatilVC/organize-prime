-- Clean up the knowledge-base navigation config to remove any conflicting items
-- Keep only the manually configured "Manage Knowledgebases" page
UPDATE system_feature_configs 
SET navigation_config = jsonb_build_object(
  'pages', jsonb_build_array(
    jsonb_build_object(
      'id', '1755010842673',
      'icon', 'database',
      'route', '/features/knowledge-base/manage-knowledgebases',
      'title', 'Manage Knowledgebases',
      'component', 'Settings',
      'isDefault', true,
      'menuOrder', 0,
      'description', 'Manage your knowledge base configurations',
      'permissions', array['read', 'write', 'super_admin', 'admin']
    )
  )
)
WHERE slug = 'knowledge-base';