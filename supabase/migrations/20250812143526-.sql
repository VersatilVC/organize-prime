-- Update Knowledge Base routes to use consistent /apps/knowledge-base/ pattern
UPDATE system_feature_configs 
SET navigation_config = jsonb_set(
  navigation_config,
  '{pages}',
  jsonb_build_array(
    jsonb_build_object(
      'id', '1755008814816',
      'title', 'Knowledgebase Management',
      'route', '/apps/knowledge-base/knowledgebase-management',
      'description', '',
      'component', 'Settings',
      'permissions', ARRAY['read', 'write', 'super_admin', 'admin'],
      'isDefault', true,
      'menuOrder', 0,
      'icon', 'Settings'
    ),
    jsonb_build_object(
      'id', '1755008836451',
      'title', 'Upload Files',
      'route', '/apps/knowledge-base/upload-files',
      'description', '',
      'component', 'Files',
      'permissions', ARRAY['read', 'admin', 'write', 'super_admin'],
      'isDefault', false,
      'menuOrder', 1,
      'icon', 'Database'
    ),
    jsonb_build_object(
      'id', '1755008852361',
      'title', 'AI Chat',
      'route', '/apps/knowledge-base/ai-chat',
      'description', '',
      'component', 'Chat',
      'permissions', ARRAY['read', 'write', 'super_admin', 'admin'],
      'isDefault', false,
      'menuOrder', 2,
      'icon', 'MessageSquare'
    )
  )
)
WHERE feature_slug = 'knowledge-base';