-- Drop the existing anonymous policy and recreate it with higher precedence
DROP POLICY IF EXISTS "Allow public invitation lookup by token" ON public.invitations;

-- Create a policy that allows anyone (authenticated or not) to read invitations by token
CREATE POLICY "Public invitation lookup by token" 
ON public.invitations 
FOR SELECT 
TO public, anon
USING (token IS NOT NULL);