-- Create table for system-level feature configurations (super admin controls)
CREATE TABLE public.system_feature_configs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  feature_slug text NOT NULL UNIQUE,
  is_enabled_globally boolean DEFAULT true,
  is_marketplace_visible boolean DEFAULT true,
  system_menu_order integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  created_by uuid REFERENCES auth.users(id),
  updated_by uuid REFERENCES auth.users(id)
);

-- Create table for organization-level feature overrides (org admin controls)
CREATE TABLE public.organization_feature_configs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  feature_slug text NOT NULL,
  is_enabled boolean DEFAULT true,
  is_user_accessible boolean DEFAULT true,
  org_menu_order integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  created_by uuid REFERENCES auth.users(id),
  updated_by uuid REFERENCES auth.users(id),
  UNIQUE(organization_id, feature_slug)
);

-- Create table for user-level feature access (within organizations)
CREATE TABLE public.user_feature_access (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  feature_slug text NOT NULL,
  is_enabled boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  created_by uuid REFERENCES auth.users(id),
  UNIQUE(user_id, organization_id, feature_slug)
);

-- Enable RLS on all tables
ALTER TABLE public.system_feature_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_feature_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_feature_access ENABLE ROW LEVEL SECURITY;

-- RLS policies for system_feature_configs (super admin only)
CREATE POLICY "Super admins can manage system feature configs"
ON public.system_feature_configs
FOR ALL
USING (is_super_admin());

-- RLS policies for organization_feature_configs (org admins and super admins)
CREATE POLICY "Org admins can manage their organization feature configs"
ON public.organization_feature_configs
FOR ALL
USING (is_super_admin() OR is_org_admin(organization_id));

CREATE POLICY "Users can view their organization feature configs"
ON public.organization_feature_configs
FOR SELECT
USING (organization_id IN (SELECT get_user_organizations()));

-- RLS policies for user_feature_access (org admins and super admins can manage, users can view their own)
CREATE POLICY "Org admins can manage user feature access in their org"
ON public.user_feature_access
FOR ALL
USING (is_super_admin() OR is_org_admin(organization_id));

CREATE POLICY "Users can view their own feature access"
ON public.user_feature_access
FOR SELECT
USING (user_id = auth.uid());

-- Create triggers for updated_at timestamps
CREATE TRIGGER update_system_feature_configs_updated_at
  BEFORE UPDATE ON public.system_feature_configs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_organization_feature_configs_updated_at
  BEFORE UPDATE ON public.organization_feature_configs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to get effective feature access for a user
CREATE OR REPLACE FUNCTION public.get_user_effective_features(
  p_user_id uuid,
  p_organization_id uuid
) RETURNS TABLE(
  feature_slug text,
  is_enabled boolean,
  menu_order integer,
  source text
) LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN QUERY
  WITH system_features AS (
    SELECT 
      sfc.feature_slug,
      sfc.is_enabled_globally AND sfc.is_marketplace_visible as is_enabled,
      sfc.system_menu_order as menu_order,
      'system' as source
    FROM system_feature_configs sfc
    WHERE sfc.is_enabled_globally = true
  ),
  org_features AS (
    SELECT 
      ofc.feature_slug,
      ofc.is_enabled AND ofc.is_user_accessible as is_enabled,
      ofc.org_menu_order as menu_order,
      'organization' as source
    FROM organization_feature_configs ofc
    WHERE ofc.organization_id = p_organization_id
  ),
  user_features AS (
    SELECT 
      ufa.feature_slug,
      ufa.is_enabled,
      0 as menu_order,
      'user' as source
    FROM user_feature_access ufa
    WHERE ufa.user_id = p_user_id 
    AND ufa.organization_id = p_organization_id
  )
  SELECT 
    COALESCE(uf.feature_slug, of.feature_slug, sf.feature_slug) as feature_slug,
    COALESCE(uf.is_enabled, of.is_enabled, sf.is_enabled, false) as is_enabled,
    COALESCE(of.menu_order, sf.menu_order, 0) as menu_order,
    CASE 
      WHEN uf.feature_slug IS NOT NULL THEN 'user'
      WHEN of.feature_slug IS NOT NULL THEN 'organization'
      ELSE 'system'
    END as source
  FROM system_features sf
  FULL OUTER JOIN org_features of ON sf.feature_slug = of.feature_slug
  FULL OUTER JOIN user_features uf ON COALESCE(of.feature_slug, sf.feature_slug) = uf.feature_slug
  WHERE COALESCE(uf.is_enabled, of.is_enabled, sf.is_enabled, false) = true
  ORDER BY COALESCE(of.menu_order, sf.menu_order, 0);
END;
$$;

-- Insert default feature configurations for existing features
INSERT INTO public.system_feature_configs (feature_slug, is_enabled_globally, is_marketplace_visible, system_menu_order)
VALUES 
  ('knowledge-base', true, true, 1),
  ('content-creation', true, true, 2),
  ('market-intel', true, true, 3)
ON CONFLICT (feature_slug) DO NOTHING;