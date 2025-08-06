-- Fix RLS policies for app_categories table
-- Allow super admins to manage app categories

-- First ensure app_categories has RLS enabled
ALTER TABLE app_categories ENABLE ROW LEVEL SECURITY;

-- Allow super admins to view all app categories
CREATE POLICY "Super admins can view all app categories" ON app_categories
    FOR SELECT
    USING (is_super_admin());

-- Allow super admins to insert app categories  
CREATE POLICY "Super admins can insert app categories" ON app_categories
    FOR INSERT
    WITH CHECK (is_super_admin());

-- Allow super admins to update app categories
CREATE POLICY "Super admins can update app categories" ON app_categories
    FOR UPDATE
    USING (is_super_admin());

-- Allow super admins to delete app categories
CREATE POLICY "Super admins can delete app categories" ON app_categories
    FOR DELETE
    USING (is_super_admin());

-- Allow authenticated users to view active app categories (for marketplace)
CREATE POLICY "Authenticated users can view active app categories" ON app_categories
    FOR SELECT
    USING (auth.role() = 'authenticated' AND is_active = true);