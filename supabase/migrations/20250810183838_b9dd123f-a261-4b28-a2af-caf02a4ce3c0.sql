-- Security hardening migration: invitation acceptance + search_path fixes
BEGIN;

-- 1) Remove permissive invitation UPDATE policy (handled by new RPC)
DROP POLICY IF EXISTS "Allow invitation acceptance updates" ON public.invitations;

-- 2) Secure invitation acceptance RPC
CREATE OR REPLACE FUNCTION public.accept_invitation(p_token text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  inv RECORD;
  uid uuid;
  mem RECORD;
  result json;
BEGIN
  uid := auth.uid();
  IF uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT id, organization_id, role, invited_by, expires_at, accepted_at
  INTO inv
  FROM invitations
  WHERE token = p_token
  LIMIT 1;

  IF inv.id IS NULL THEN
    RAISE EXCEPTION 'Invalid invitation token';
  END IF;

  IF inv.accepted_at IS NOT NULL THEN
    RAISE EXCEPTION 'Invitation already accepted';
  END IF;

  IF inv.expires_at <= now() THEN
    RAISE EXCEPTION 'Invitation expired';
  END IF;

  -- Create or reactivate membership
  SELECT id, status INTO mem
  FROM memberships
  WHERE user_id = uid AND organization_id = inv.organization_id
  LIMIT 1;

  IF mem.id IS NULL THEN
    INSERT INTO memberships (user_id, organization_id, role, status, invited_by, invited_at, joined_at)
    VALUES (uid, inv.organization_id, inv.role, 'active', inv.invited_by, now(), now());
  ELSE
    UPDATE memberships
    SET status = 'active',
        joined_at = COALESCE(joined_at, now())
    WHERE id = mem.id;
  END IF;

  -- Mark invitation as accepted
  UPDATE invitations
  SET accepted_at = now()
  WHERE id = inv.id AND accepted_at IS NULL;

  -- Audit log
  PERFORM log_security_event(uid, inv.organization_id, 'invitation_accepted', 'invitation', inv.id::text, NULL, NULL, jsonb_build_object('role', inv.role));

  result := json_build_object(
    'success', true,
    'organization_id', inv.organization_id,
    'role', inv.role
  );
  RETURN result;
END;
$$;

-- 3) Harden SECURITY DEFINER functions against search_path hijacking
ALTER FUNCTION public.check_rate_limit(text, text, integer, integer) SET search_path = public;
ALTER FUNCTION public.log_security_event(uuid, uuid, text, text, text, inet, text, jsonb) SET search_path = public;
ALTER FUNCTION public.validate_session_security() SET search_path = public;
ALTER FUNCTION public.get_notification_template(text) SET search_path = public;
ALTER FUNCTION public.render_notification_template(text, jsonb) SET search_path = public;
ALTER FUNCTION public.create_templated_notification(text, uuid, uuid, jsonb, text) SET search_path = public;
ALTER FUNCTION public.handle_first_login() SET search_path = public;
ALTER FUNCTION public.update_marketplace_app_stats() SET search_path = public;
ALTER FUNCTION public.track_feedback_status_change() SET search_path = public;
ALTER FUNCTION public.get_dashboard_stats_optimized(uuid, uuid, boolean) SET search_path = public;
ALTER FUNCTION public.hash_api_key(text) SET search_path = public;
ALTER FUNCTION public.verify_api_key(text, text) SET search_path = public;
ALTER FUNCTION public.validate_password_strength(text) SET search_path = public;
ALTER FUNCTION public.validate_email(text) SET search_path = public;
ALTER FUNCTION public.get_user_emails_for_super_admin(uuid[]) SET search_path = public, auth;

COMMIT;