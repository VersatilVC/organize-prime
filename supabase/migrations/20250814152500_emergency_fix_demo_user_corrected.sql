-- Emergency Fix for Demo User - Stop Console Loop and Fix Navigation (Corrected)
-- This directly fixes the demo user setup that's causing the infinite loop

BEGIN;

-- Step 1: Find and fix the demo user profile
DO $$
DECLARE
    demo_user_id uuid;
    demo_org_id uuid;
BEGIN
    -- Find demo user by email
    SELECT au.id INTO demo_user_id
    FROM auth.users au
    WHERE au.email = 'admin@demo.com';
    
    IF demo_user_id IS NOT NULL THEN
        RAISE NOTICE 'Found demo user: %', demo_user_id;
        
        -- Ensure profile exists and is super admin
        INSERT INTO public.profiles (
            id,
            username,
            full_name,
            is_super_admin,
            created_at,
            updated_at
        ) VALUES (
            demo_user_id,
            'demo_admin',
            'Demo Super Admin',
            true,
            NOW(),
            NOW()
        ) ON CONFLICT (id) 
        DO UPDATE SET 
            is_super_admin = true,
            full_name = 'Demo Super Admin',
            username = 'demo_admin',
            updated_at = NOW();
            
        RAISE NOTICE 'Demo user profile fixed as super admin';
        
        -- Get any existing organization or create one
        SELECT id INTO demo_org_id 
        FROM public.organizations 
        LIMIT 1;
        
        -- If no organization exists, create one
        IF demo_org_id IS NULL THEN
            INSERT INTO public.organizations (
                name,
                slug,
                settings,
                created_at,
                updated_at
            ) VALUES (
                'Demo Organization',
                'demo-org',
                '{"allow_external_invites": true}'::jsonb,
                NOW(),
                NOW()
            ) RETURNING id INTO demo_org_id;
            
            RAISE NOTICE 'Created demo organization: %', demo_org_id;
        ELSE
            RAISE NOTICE 'Using existing organization: %', demo_org_id;
        END IF;
        
        -- Create/fix membership (without updated_at column)
        INSERT INTO public.memberships (
            user_id,
            organization_id,
            role,
            status,
            created_at
        ) VALUES (
            demo_user_id,
            demo_org_id,
            'admin',
            'active',
            NOW()
        ) ON CONFLICT (user_id, organization_id) 
        DO UPDATE SET 
            role = 'admin',
            status = 'active';
            
        RAISE NOTICE 'Demo user membership fixed';
        
        -- Enable all features for this organization
        INSERT INTO public.organization_feature_configs (
            organization_id,
            feature_slug,
            is_enabled,
            is_user_accessible,
            org_menu_order,
            created_at,
            updated_at
        ) 
        SELECT 
            demo_org_id,
            feature_slug,
            true,
            true,
            ROW_NUMBER() OVER (ORDER BY feature_slug),
            NOW(),
            NOW()
        FROM public.system_feature_configs
        WHERE is_enabled_globally = true
        ON CONFLICT (organization_id, feature_slug) 
        DO UPDATE SET 
            is_enabled = true,
            is_user_accessible = true,
            updated_at = NOW();
            
        RAISE NOTICE 'All features enabled for demo organization';
        
    ELSE
        RAISE NOTICE 'Demo user not found - need to create user first';
    END IF;
END $$;

COMMIT;