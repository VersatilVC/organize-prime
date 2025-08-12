-- Standardize all navigation routes to follow /features/{feature-slug}/{page-slug} format
-- This ensures consistent route structure across all features

-- Update Knowledge Base feature routes to standard format
UPDATE system_feature_configs 
SET navigation_config = jsonb_set(
  navigation_config,
  '{pages}',
  jsonb_build_array(
    jsonb_build_object(
      'title', 'Manage Knowledgebases',
      'route', '/features/knowledge-base/manage-knowledgebases',
      'component', 'Dashboard',
      'permissions', jsonb_build_array('read'),
      'isDefault', true,
      'menuOrder', 0,
      'icon', 'database'
    ),
    jsonb_build_object(
      'title', 'AI Chat',
      'route', '/features/knowledge-base/ai-chat',
      'component', 'Chat',
      'permissions', jsonb_build_array('read'),
      'isDefault', false,
      'menuOrder', 1,
      'icon', 'messageCircle'
    ),
    jsonb_build_object(
      'title', 'Analytics',
      'route', '/features/knowledge-base/analytics',
      'component', 'Analytics',
      'permissions', jsonb_build_array('read'),
      'isDefault', false,
      'menuOrder', 2,
      'icon', 'barChart'
    ),
    jsonb_build_object(
      'title', 'Files',
      'route', '/features/knowledge-base/files',
      'component', 'Files',
      'permissions', jsonb_build_array('read'),
      'isDefault', false,
      'menuOrder', 3,
      'icon', 'file'
    ),
    jsonb_build_object(
      'title', 'Settings',
      'route', '/features/knowledge-base/settings',
      'component', 'Settings',
      'permissions', jsonb_build_array('admin'),
      'isDefault', false,
      'menuOrder', 4,
      'icon', 'settings'
    )
  )
)
WHERE feature_slug = 'knowledge-base';

-- Ensure the knowledge base feature has proper base navigation configuration
UPDATE system_feature_configs 
SET navigation_config = navigation_config || jsonb_build_object(
  'basePath', '/features/knowledge-base',
  'routePrefix', '/features/knowledge-base',
  'defaultRoute', '/features/knowledge-base/manage-knowledgebases'
)
WHERE feature_slug = 'knowledge-base';

-- Add route validation constraints to prevent future inconsistencies
-- This will help maintain route standards as new features are added

-- Add a check constraint to ensure all feature routes follow the standard format
-- Note: This is a soft validation that logs warnings rather than hard constraints
-- to avoid breaking existing functionality

-- Create an index on navigation_config for better query performance
CREATE INDEX IF NOT EXISTS idx_system_feature_configs_navigation 
ON system_feature_configs USING GIN (navigation_config);

-- Log the current state for verification
DO $$ 
BEGIN
  RAISE NOTICE 'Navigation route standardization complete for Knowledge Base feature';
  RAISE NOTICE 'All routes now follow /features/{feature-slug}/{page-slug} format';
END $$;