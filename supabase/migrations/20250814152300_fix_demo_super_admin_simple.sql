-- Fix Demo Super Admin Navigation Issues (Simple Version)
-- This migration adds the missing columns and configurations needed for the demo super admin to see all navigation links
-- Avoids organization creation to prevent trigger conflicts

BEGIN;

-- Step 1: Add missing columns to system_feature_configs table
ALTER TABLE public.system_feature_configs 
ADD COLUMN IF NOT EXISTS display_name text,
ADD COLUMN IF NOT EXISTS description text,
ADD COLUMN IF NOT EXISTS icon_name text,
ADD COLUMN IF NOT EXISTS color_hex text,
ADD COLUMN IF NOT EXISTS navigation_config jsonb DEFAULT '{}'::jsonb;

-- Step 2: Update existing features with proper metadata
UPDATE public.system_feature_configs 
SET 
  display_name = 'Knowledge Base',
  description = 'AI-powered document search and knowledge management',
  icon_name = 'bookOpen',
  color_hex = '#3b82f6',
  navigation_config = '{
    "pages": [
      {
        "id": "kb-manage",
        "title": "Manage Knowledgebases",
        "route": "/features/knowledge-base/manage-knowledgebases",
        "description": "This page is for managing your knowledgebases, we recommend starting with a general company one and then moving on to industry, competitor and news knowledgebases.",
        "component": "Dashboard",
        "permissions": ["read", "write", "admin", "super_admin"],
        "isDefault": true,
        "menuOrder": 0,
        "icon": "Database"
      },
      {
        "id": "kb-chat",
        "title": "AI Chat",
        "route": "/features/knowledge-base/ai-chat",
        "description": "Chat with your knowledge bases using AI",
        "component": "Chat",
        "permissions": ["read", "write", "admin", "super_admin"],
        "isDefault": false,
        "menuOrder": 1,
        "icon": "MessageSquare"
      }
    ]
  }'::jsonb
WHERE feature_slug = 'knowledge-base';

UPDATE public.system_feature_configs 
SET 
  display_name = 'Content Creation',
  description = 'AI-powered content generation and editing tools',
  icon_name = 'edit',
  color_hex = '#10b981',
  navigation_config = '{
    "pages": [
      {
        "id": "content-dashboard",
        "title": "Content Dashboard",
        "route": "/features/content-creation/dashboard",
        "description": "Manage your content creation projects and workflows",
        "component": "Dashboard",
        "permissions": ["read", "write", "admin", "super_admin"],
        "isDefault": true,
        "menuOrder": 0,
        "icon": "LayoutDashboard"
      },
      {
        "id": "content-generator",
        "title": "Content Generator",
        "route": "/features/content-creation/generator",
        "description": "Generate content using AI",
        "component": "Generator",
        "permissions": ["read", "write", "admin", "super_admin"],
        "isDefault": false,
        "menuOrder": 1,
        "icon": "Wand2"
      }
    ]
  }'::jsonb
WHERE feature_slug = 'content-creation';

UPDATE public.system_feature_configs 
SET 
  display_name = 'Market Intelligence',
  description = 'Market research and competitive intelligence tools',
  icon_name = 'trendingUp',
  color_hex = '#8b5cf6',
  navigation_config = '{
    "pages": [
      {
        "id": "market-dashboard",
        "title": "Market Dashboard",
        "route": "/features/market-intel/dashboard",
        "description": "View market insights and competitive analysis",
        "component": "Dashboard",
        "permissions": ["read", "write", "admin", "super_admin"],
        "isDefault": true,
        "menuOrder": 0,
        "icon": "TrendingUp"
      },
      {
        "id": "market-research",
        "title": "Research Tools",
        "route": "/features/market-intel/research",
        "description": "Research market trends and competitors",
        "component": "Research",
        "permissions": ["read", "write", "admin", "super_admin"],
        "isDefault": false,
        "menuOrder": 1,
        "icon": "Search"
      }
    ]
  }'::jsonb
WHERE feature_slug = 'market-intel';

-- Step 3: Enable features for ALL existing organizations
-- This ensures the demo org (when it exists) will have these features enabled
DO $$
DECLARE
    org_record RECORD;
BEGIN
    -- Enable features for all existing organizations
    FOR org_record IN SELECT id FROM public.organizations LOOP
        -- Enable Knowledge Base feature
        INSERT INTO public.organization_feature_configs (
            organization_id,
            feature_slug,
            is_enabled,
            is_user_accessible,
            org_menu_order,
            created_at,
            updated_at
        ) VALUES (
            org_record.id,
            'knowledge-base',
            true,
            true,
            1,
            NOW(),
            NOW()
        ) ON CONFLICT (organization_id, feature_slug) 
        DO UPDATE SET 
            is_enabled = true,
            is_user_accessible = true,
            updated_at = NOW();

        -- Enable Content Creation feature
        INSERT INTO public.organization_feature_configs (
            organization_id,
            feature_slug,
            is_enabled,
            is_user_accessible,
            org_menu_order,
            created_at,
            updated_at
        ) VALUES (
            org_record.id,
            'content-creation',
            true,
            true,
            2,
            NOW(),
            NOW()
        ) ON CONFLICT (organization_id, feature_slug) 
        DO UPDATE SET 
            is_enabled = true,
            is_user_accessible = true,
            updated_at = NOW();

        -- Enable Market Intelligence feature
        INSERT INTO public.organization_feature_configs (
            organization_id,
            feature_slug,
            is_enabled,
            is_user_accessible,
            org_menu_order,
            created_at,
            updated_at
        ) VALUES (
            org_record.id,
            'market-intel',
            true,
            true,
            3,
            NOW(),
            NOW()
        ) ON CONFLICT (organization_id, feature_slug) 
        DO UPDATE SET 
            is_enabled = true,
            is_user_accessible = true,
            updated_at = NOW();

        RAISE NOTICE 'Features enabled for organization ID: %', org_record.id;
    END LOOP;
END $$;

-- Step 4: Ensure demo super admin user has proper permissions
DO $$
DECLARE
    demo_user_id uuid;
BEGIN
    -- Find demo user
    SELECT au.id INTO demo_user_id
    FROM auth.users au
    WHERE au.email = 'admin@demo.com';

    IF demo_user_id IS NOT NULL THEN
        -- Ensure user profile has super admin privileges
        UPDATE public.profiles 
        SET 
            is_super_admin = true,
            full_name = 'Demo Super Admin',
            username = 'demo_admin',
            updated_at = NOW()
        WHERE id = demo_user_id;

        RAISE NOTICE 'Demo super admin user configured: %', demo_user_id;
    ELSE
        RAISE NOTICE 'Demo user not found - please create it using the app first';
    END IF;
END $$;

COMMIT;