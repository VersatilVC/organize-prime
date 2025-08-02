-- Create helper function to get user's current organization
CREATE OR REPLACE FUNCTION public.get_user_current_organization(user_id uuid)
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT organization_id 
  FROM memberships 
  WHERE user_id = $1 
    AND status = 'active' 
  LIMIT 1;
$$;

-- Create helper function to check if user has access to organization
CREATE OR REPLACE FUNCTION public.user_has_org_access(user_id uuid, org_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM memberships 
    WHERE user_id = $1 
      AND organization_id = $2 
      AND status = 'active'
  );
$$;

-- Create helper function to check if user is org admin for specific org
CREATE OR REPLACE FUNCTION public.is_org_admin_for_org(user_id uuid, org_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM memberships 
    WHERE user_id = $1 
      AND organization_id = $2 
      AND role = 'admin' 
      AND status = 'active'
  );
$$;

-- Create helper function to extract organization ID from storage path
CREATE OR REPLACE FUNCTION public.extract_org_id_from_path(file_path text)
RETURNS uuid
LANGUAGE sql
IMMUTABLE
STABLE
SET search_path = public
AS $$
  SELECT CASE 
    WHEN file_path ~ '^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}/' 
    THEN (regexp_split_to_array(file_path, '/'))[1]::uuid
    ELSE NULL
  END;
$$;

-- Drop existing storage policies
DROP POLICY IF EXISTS "Avatar images are publicly accessible" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload their own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own avatar" ON storage.objects;

-- Create new organization-scoped storage policies

-- SELECT Policy: Users can view files if they belong to same organization OR are super admin
CREATE POLICY "Organization members can view files"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'avatars' AND (
    is_super_admin() OR
    public.user_has_org_access(auth.uid(), public.extract_org_id_from_path(name))
  )
);

-- INSERT Policy: Users can upload files to their organization's folder only
CREATE POLICY "Users can upload to their organization folder"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'avatars' AND (
    public.extract_org_id_from_path(name) = public.get_user_current_organization(auth.uid()) AND
    (storage.foldername(name))[2] = auth.uid()::text
  )
);

-- UPDATE Policy: Users can update their own files in their organization
CREATE POLICY "Users can update their own organization files"
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'avatars' AND (
    is_super_admin() OR
    (
      public.user_has_org_access(auth.uid(), public.extract_org_id_from_path(name)) AND
      (storage.foldername(name))[2] = auth.uid()::text
    ) OR
    public.is_org_admin_for_org(auth.uid(), public.extract_org_id_from_path(name))
  )
);

-- DELETE Policy: Users can delete their own files, org admins can delete org files
CREATE POLICY "Users can delete their organization files"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'avatars' AND (
    is_super_admin() OR
    (
      public.user_has_org_access(auth.uid(), public.extract_org_id_from_path(name)) AND
      (storage.foldername(name))[2] = auth.uid()::text
    ) OR
    public.is_org_admin_for_org(auth.uid(), public.extract_org_id_from_path(name))
  )
);