-- Add RLS policy to allow super admins to delete organizations
CREATE POLICY "Super admins can delete organizations" 
ON organizations 
FOR DELETE 
USING (is_super_admin());