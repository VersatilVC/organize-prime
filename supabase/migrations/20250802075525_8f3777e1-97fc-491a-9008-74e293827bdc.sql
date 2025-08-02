-- Update storage policy to allow organization admins to upload company logos
DROP POLICY "Users can upload to their organization folder" ON storage.objects;

CREATE POLICY "Users can upload to their organization folder" ON storage.objects
FOR INSERT 
WITH CHECK (
  bucket_id = 'avatars' AND 
  (
    -- Allow super admins to upload anywhere
    is_super_admin() OR
    -- For regular avatars: user can upload to their own folder within their org
    (extract_org_id_from_path(name) = get_user_current_organization(auth.uid()) AND 
     (storage.foldername(name))[2] = (auth.uid())::text) OR
    -- For company logos: org admins can upload to logos folder
    (name ~ '^logos/' AND 
     is_org_admin_for_org(auth.uid(), extract_org_id_from_path(name)))
  )
);