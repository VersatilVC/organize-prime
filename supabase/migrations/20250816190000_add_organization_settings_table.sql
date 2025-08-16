-- Create organization_settings table if it doesn't exist
CREATE TABLE IF NOT EXISTS organization_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
  key TEXT NOT NULL,
  settings JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Ensure unique key per organization
  UNIQUE(organization_id, key)
);

-- Enable RLS
ALTER TABLE organization_settings ENABLE ROW LEVEL SECURITY;

-- Add RLS policies
CREATE POLICY "org_settings_isolation" ON organization_settings
FOR ALL USING (
  organization_id IN (
    SELECT organization_id FROM memberships 
    WHERE user_id = auth.uid() AND status = 'active'
  )
  OR is_super_admin(auth.uid())
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_organization_settings_org_key ON organization_settings(organization_id, key);
CREATE INDEX IF NOT EXISTS idx_organization_settings_key ON organization_settings(key);

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_organization_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS organization_settings_updated_at ON organization_settings;
CREATE TRIGGER organization_settings_updated_at
  BEFORE UPDATE ON organization_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_organization_settings_updated_at();