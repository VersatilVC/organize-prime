-- Stop Infinite Loops - Optimize Query Performance
-- This fixes the unstable navigation by ensuring proper data relationships

BEGIN;

-- Step 1: Clean up any duplicate or invalid data that might cause loops
DELETE FROM public.organization_feature_configs 
WHERE organization_id NOT IN (SELECT id FROM public.organizations);

DELETE FROM public.memberships 
WHERE organization_id NOT IN (SELECT id FROM public.organizations);

DELETE FROM public.memberships 
WHERE user_id NOT IN (SELECT id FROM auth.users);

-- Step 2: Ensure demo user has exactly one membership (no duplicates)
DO $$
DECLARE
    demo_user_id uuid;
    demo_org_id uuid;
    membership_count integer;
BEGIN
    -- Find demo user
    SELECT au.id INTO demo_user_id
    FROM auth.users au
    WHERE au.email = 'admin@demo.com';
    
    IF demo_user_id IS NOT NULL THEN
        -- Count memberships for demo user
        SELECT COUNT(*) INTO membership_count
        FROM public.memberships
        WHERE user_id = demo_user_id;
        
        -- If multiple memberships, clean them up
        IF membership_count > 1 THEN
            -- Delete all memberships for demo user
            DELETE FROM public.memberships WHERE user_id = demo_user_id;
            
            RAISE NOTICE 'Cleaned up % duplicate memberships', membership_count;
        END IF;
        
        -- Get the first organization
        SELECT id INTO demo_org_id FROM public.organizations LIMIT 1;
        
        IF demo_org_id IS NOT NULL THEN
            -- Create single clean membership
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
            ) ON CONFLICT (user_id, organization_id) DO NOTHING;
            
            RAISE NOTICE 'Demo user has clean single membership';
        END IF;
    END IF;
END $$;

-- Step 3: Ensure feature configs are clean and consistent
DO $$
DECLARE
    org_record RECORD;
BEGIN
    FOR org_record IN SELECT id FROM public.organizations LOOP
        -- Remove duplicate feature configs
        DELETE FROM public.organization_feature_configs ofc1
        WHERE EXISTS (
            SELECT 1 FROM public.organization_feature_configs ofc2
            WHERE ofc1.organization_id = ofc2.organization_id
            AND ofc1.feature_slug = ofc2.feature_slug
            AND ofc1.id > ofc2.id
        );
        
        RAISE NOTICE 'Cleaned feature configs for org: %', org_record.id;
    END LOOP;
END $$;

-- Step 4: Add indexes to improve query performance and reduce loops
CREATE INDEX IF NOT EXISTS idx_memberships_user_org 
ON public.memberships(user_id, organization_id);

CREATE INDEX IF NOT EXISTS idx_org_feature_configs_lookup 
ON public.organization_feature_configs(organization_id, feature_slug, is_enabled, is_user_accessible);

CREATE INDEX IF NOT EXISTS idx_profiles_super_admin 
ON public.profiles(id, is_super_admin);

-- Step 5: Update statistics to help query planner
ANALYZE public.memberships;
ANALYZE public.organization_feature_configs;
ANALYZE public.system_feature_configs;
ANALYZE public.profiles;

COMMIT;