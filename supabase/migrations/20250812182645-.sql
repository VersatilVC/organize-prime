-- Restore AI Chat page to knowledge-base feature navigation
UPDATE system_feature_configs 
SET navigation_config = jsonb_build_object(
  'pages', jsonb_build_array(
    jsonb_build_object(
      'title', 'Manage Knowledgebases',
      'route', '/features/knowledge-base',
      'icon', 'Database',
      'permissions', jsonb_build_array('admin', 'super_admin'),
      'isDefault', true,
      'menuOrder', 1
    ),
    jsonb_build_object(
      'title', 'AI Chat',
      'route', '/features/knowledge-base/ai-chat',
      'icon', 'MessageSquare',
      'permissions', jsonb_build_array('user', 'admin', 'super_admin'),
      'isDefault', false,
      'menuOrder', 2
    )
  )
)
WHERE feature_slug = 'knowledge-base';