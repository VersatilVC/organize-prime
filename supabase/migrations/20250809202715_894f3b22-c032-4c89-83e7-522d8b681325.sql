-- Tighten RLS policies and add secure invitation lookup RPC
BEGIN;

-- Remove overly permissive public invitation lookup
DROP POLICY IF EXISTS "Public invitation lookup by token" ON public.invitations;

-- Organizations: remove public read policies and restrict to members and super admins
DROP POLICY IF EXISTS "Users can view organizations for domain checking" ON public.organizations;
DROP POLICY IF EXISTS "Allow public organization name lookup for invitations" ON public.organizations;

CREATE POLICY "Users can view their organizations or super admins"
ON public.organizations
FOR SELECT
USING (is_super_admin() OR id IN (SELECT get_user_organizations()));

-- Profiles: remove public read and restrict to self, same org members, or super admins
DROP POLICY IF EXISTS "Allow public profile name lookup for invitations" ON public.profiles;
DROP POLICY IF EXISTS "Users can view profiles" ON public.profiles;

CREATE POLICY "Users can view own and org members or super admins"
ON public.profiles
FOR SELECT
USING (
  is_super_admin()
  OR id = auth.uid()
  OR EXISTS (
    SELECT 1
    FROM memberships m1
    JOIN memberships m2 ON m1.organization_id = m2.organization_id
    WHERE m1.user_id = auth.uid()
      AND m1.status = 'active'
      AND m2.user_id = profiles.id
      AND m2.status = 'active'
  )
);

-- Secure invitation lookup returning only necessary fields
CREATE OR REPLACE FUNCTION public.get_invitation_by_token(p_token text)
RETURNS TABLE(
  id uuid,
  organization_id uuid,
  role text,
  invited_by uuid,
  organization_name text,
  invited_by_name text,
  message text,
  expires_at timestamptz,
  is_valid boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    i.id,
    i.organization_id,
    i.role,
    i.invited_by,
    o.name as organization_name,
    COALESCE(p.full_name, p.username, 'Unknown') as invited_by_name,
    sanitize_input(i.message) as message,
    i.expires_at,
    (i.expires_at > now() AND i.accepted_at IS NULL) as is_valid
  FROM invitations i
  JOIN organizations o ON o.id = i.organization_id
  LEFT JOIN profiles p ON p.id = i.invited_by
  WHERE i.token = p_token;
END;
$$;

COMMIT;