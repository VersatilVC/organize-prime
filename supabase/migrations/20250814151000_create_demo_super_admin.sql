-- Create demo super admin user for testing
-- This creates a user that can be used to log in and test the application

BEGIN;

-- First, let's create the user in auth.users table
-- Note: In a real production environment, users should register normally
-- This is only for testing purposes

DO $$
DECLARE
    demo_user_id uuid;
    demo_org_id uuid;
BEGIN
    -- Generate a UUID for the demo user
    demo_user_id := gen_random_uuid();
    demo_org_id := gen_random_uuid();
    
    -- Insert the demo user into auth.users (this simulates Supabase Auth)
    -- Note: This requires elevated privileges and should only be done in development
    INSERT INTO auth.users (
        instance_id,
        id,
        aud,
        role,
        email,
        encrypted_password,
        email_confirmed_at,
        created_at,
        updated_at,
        confirmation_token,
        email_change,
        email_change_token_new,
        recovery_token
    ) VALUES (
        '00000000-0000-0000-0000-000000000000',
        demo_user_id,
        'authenticated',
        'authenticated',
        'admin@demo.com',
        crypt('Demo123!', gen_salt('bf', 10)), -- Password: Demo123!
        NOW(),
        NOW(),
        NOW(),
        '',
        '',
        '',
        ''
    ) ON CONFLICT (email) DO UPDATE SET
        encrypted_password = crypt('Demo123!', gen_salt('bf', 10)),
        updated_at = NOW()
    RETURNING id INTO demo_user_id;

    -- Get the user ID if it already exists
    IF demo_user_id IS NULL THEN
        SELECT id INTO demo_user_id FROM auth.users WHERE email = 'admin@demo.com';
    END IF;

    -- Create the demo organization
    INSERT INTO public.organizations (
        id,
        name,
        domain,
        settings,
        created_at,
        updated_at
    ) VALUES (
        demo_org_id,
        'Demo Organization',
        'demo.com',
        '{"allow_external_invites": true}',
        NOW(),
        NOW()
    ) ON CONFLICT (domain) DO UPDATE SET
        name = 'Demo Organization',
        settings = '{"allow_external_invites": true}',
        updated_at = NOW()
    RETURNING id INTO demo_org_id;

    -- Get the org ID if it already exists
    IF demo_org_id IS NULL THEN
        SELECT id INTO demo_org_id FROM public.organizations WHERE domain = 'demo.com';
    END IF;

    -- Create the profile for the demo user with super admin privileges
    INSERT INTO public.profiles (
        id,
        username,
        full_name,
        avatar_url,
        website,
        is_super_admin,
        created_at,
        updated_at
    ) VALUES (
        demo_user_id,
        'demo_admin',
        'Demo Super Admin',
        null,
        null,
        true,
        NOW(),
        NOW()
    ) ON CONFLICT (id) DO UPDATE SET
        username = 'demo_admin',
        full_name = 'Demo Super Admin',
        is_super_admin = true,
        updated_at = NOW();

    -- Create membership for the demo user in the demo organization
    INSERT INTO public.memberships (
        id,
        user_id,
        organization_id,
        role,
        status,
        created_at,
        updated_at
    ) VALUES (
        gen_random_uuid(),
        demo_user_id,
        demo_org_id,
        'admin',
        'active',
        NOW(),
        NOW()
    ) ON CONFLICT (user_id, organization_id) DO UPDATE SET
        role = 'admin',
        status = 'active',
        updated_at = NOW();

    RAISE NOTICE 'Demo super admin user created successfully!';
    RAISE NOTICE 'Email: admin@demo.com';
    RAISE NOTICE 'Password: Demo123!';
    RAISE NOTICE 'Organization: Demo Organization';
    
END $$;

COMMIT;