-- Fix infinite recursion in memberships table RLS policies
-- Drop the problematic policy and create a simpler one

DROP POLICY IF EXISTS "Users can view memberships in their organizations" ON memberships;

-- Create a simpler policy that doesn't cause recursion
CREATE POLICY "Users can view memberships in their organizations" 
ON memberships 
FOR SELECT 
TO authenticated
USING (
  -- Super admins can see all memberships
  is_super_admin() 
  OR 
  -- Organization admins can see memberships in their organizations
  is_org_admin(organization_id)
  OR
  -- Users can see their own membership records
  user_id = auth.uid()
);