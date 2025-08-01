-- Allow authenticated users to update invitations they're accepting
CREATE POLICY "Allow invitation acceptance updates" 
ON public.invitations 
FOR UPDATE 
TO authenticated
USING (true)
WITH CHECK (accepted_at IS NOT NULL);