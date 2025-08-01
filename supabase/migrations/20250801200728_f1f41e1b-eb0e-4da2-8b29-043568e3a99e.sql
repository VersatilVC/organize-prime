-- Fix RLS policies for anonymous access to invitation data

-- Allow anonymous users to read organization names for invitation display
CREATE POLICY "Allow public organization name lookup for invitations" 
ON public.organizations 
FOR SELECT 
TO anon 
USING (true);

-- Allow anonymous users to read profile names for invitation display  
CREATE POLICY "Allow public profile name lookup for invitations" 
ON public.profiles 
FOR SELECT 
TO anon 
USING (true);