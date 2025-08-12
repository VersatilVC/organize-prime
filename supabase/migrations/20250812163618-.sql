-- Create kb_configurations table for knowledge base management
CREATE TABLE public.kb_configurations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL,
  name TEXT NOT NULL,
  display_name TEXT NOT NULL,
  description TEXT,
  embedding_model TEXT NOT NULL DEFAULT 'text-embedding-ada-002',
  chunk_size INTEGER NOT NULL DEFAULT 1000,
  chunk_overlap INTEGER NOT NULL DEFAULT 200,
  file_count INTEGER NOT NULL DEFAULT 0,
  total_vectors INTEGER NOT NULL DEFAULT 0,
  is_default BOOLEAN NOT NULL DEFAULT false,
  is_premium BOOLEAN NOT NULL DEFAULT false,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID,
  updated_by UUID
);

-- Enable RLS
ALTER TABLE public.kb_configurations ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view KB configs in their organizations"
  ON public.kb_configurations
  FOR SELECT
  USING (organization_id IN (
    SELECT organization_id FROM memberships 
    WHERE user_id = auth.uid() AND status = 'active'
  ));

CREATE POLICY "Admins can manage KB configs in their organizations"
  ON public.kb_configurations
  FOR ALL
  USING (organization_id IN (
    SELECT organization_id FROM memberships 
    WHERE user_id = auth.uid() AND role = ANY(ARRAY['admin', 'super_admin']) AND status = 'active'
  ));

-- Create analytics table
CREATE TABLE public.kb_analytics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL,
  kb_config_id UUID,
  user_id UUID,
  event_type TEXT NOT NULL,
  tokens_consumed INTEGER DEFAULT 0,
  processing_time_ms INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS for analytics
ALTER TABLE public.kb_analytics ENABLE ROW LEVEL SECURITY;

-- Analytics RLS policies
CREATE POLICY "Users can view analytics in their organizations"
  ON public.kb_analytics
  FOR SELECT
  USING (organization_id IN (
    SELECT organization_id FROM memberships 
    WHERE user_id = auth.uid() AND status = 'active'
  ));

CREATE POLICY "System can insert analytics"
  ON public.kb_analytics
  FOR INSERT
  WITH CHECK (true);

-- Create helper functions for KB permissions
CREATE OR REPLACE FUNCTION public.get_kb_permissions(org_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  user_role TEXT;
  result JSONB;
BEGIN
  -- Get user role in organization
  SELECT role INTO user_role
  FROM memberships
  WHERE user_id = auth.uid() 
    AND organization_id = org_id 
    AND status = 'active';
  
  -- Return permissions based on role
  result := jsonb_build_object(
    'can_upload', user_role IS NOT NULL,
    'can_chat', user_role IS NOT NULL,
    'can_create_kb', user_role IN ('admin', 'super_admin'),
    'can_manage_files', user_role IN ('admin', 'super_admin'),
    'can_view_analytics', user_role IN ('admin', 'super_admin')
  );
  
  RETURN result;
END;
$function$;

-- Create function to check if user is KB admin
CREATE OR REPLACE FUNCTION public.is_kb_admin(org_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM memberships 
    WHERE user_id = auth.uid() 
      AND organization_id = org_id 
      AND role IN ('admin', 'super_admin')
      AND status = 'active'
  );
$function$;

-- Function to initialize default KB for organizations
CREATE OR REPLACE FUNCTION public.initialize_default_kb(org_id UUID, org_name TEXT)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  kb_id UUID;
BEGIN
  INSERT INTO kb_configurations (
    organization_id,
    name,
    display_name,
    description,
    is_default,
    embedding_model,
    chunk_size,
    chunk_overlap,
    created_by
  ) VALUES (
    org_id,
    'company-documents',
    'Company Documents',
    'Default knowledge base for ' || org_name || ' documents and resources.',
    true,
    'text-embedding-ada-002',
    1000,
    200,
    auth.uid()
  ) RETURNING id INTO kb_id;
  
  RETURN kb_id;
END;
$function$;