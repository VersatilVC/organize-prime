-- Add RLS policies to allow super admins and org admins to update user profiles

-- Allow super admins to update any profile
CREATE POLICY "Super admins can update any profile" 
ON public.profiles 
FOR UPDATE 
USING (is_super_admin());

-- Allow organization admins to update profiles of users in their organization
CREATE POLICY "Org admins can update profiles in their organization" 
ON public.profiles 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM memberships m1, memberships m2
    WHERE m1.user_id = auth.uid() 
    AND m1.role = 'admin' 
    AND m1.status = 'active'
    AND m2.user_id = profiles.id 
    AND m2.organization_id = m1.organization_id 
    AND m2.status = 'active'
  )
);