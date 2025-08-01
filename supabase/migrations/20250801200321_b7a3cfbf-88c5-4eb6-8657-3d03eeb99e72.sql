-- Allow public access to read invitations by token for the invitation acceptance page
CREATE POLICY "Allow public invitation lookup by token" 
ON public.invitations 
FOR SELECT 
TO anon 
USING (true);