-- Step 1: Disable legacy system feature configs
UPDATE system_feature_configs 
SET is_enabled_globally = false, is_marketplace_visible = false, updated_at = now()
WHERE feature_slug IN ('knowledge-base', 'content-creation', 'market-intel');

-- Step 2: Create missing organization feature config for the test app
-- First get the organization ID from the installation
INSERT INTO organization_feature_configs (organization_id, feature_slug, is_enabled, is_user_accessible, org_menu_order, created_by, created_at, updated_at)
SELECT 
  mai.organization_id,
  mapp.slug,
  true,
  true,
  99,
  mai.installed_by,
  now(),
  now()
FROM marketplace_app_installations mai
JOIN marketplace_apps mapp ON mai.app_id = mapp.id
WHERE mai.status = 'active' 
  AND mapp.slug = 'test-app'
  AND NOT EXISTS (
    SELECT 1 FROM organization_feature_configs ofc 
    WHERE ofc.organization_id = mai.organization_id 
    AND ofc.feature_slug = mapp.slug
  );