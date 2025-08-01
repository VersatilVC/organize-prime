-- Fix memberships RLS policy to allow invitation acceptance
-- Drop existing policy that might be too restrictive
DROP POLICY IF EXISTS "Allow membership creation" ON public.memberships;
DROP POLICY IF EXISTS "Allow membership updates" ON public.memberships;

-- Create more permissive policies for invitation acceptance
CREATE POLICY "Allow membership creation for invitations" 
ON public.memberships 
FOR INSERT 
TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Allow membership updates for invitations" 
ON public.memberships 
FOR UPDATE 
TO authenticated
USING (user_id = auth.uid() OR is_super_admin() OR is_org_admin(organization_id));

CREATE POLICY "Allow membership select for invitations" 
ON public.memberships 
FOR SELECT 
TO authenticated
USING (user_id = auth.uid() OR is_super_admin() OR is_org_admin(organization_id));