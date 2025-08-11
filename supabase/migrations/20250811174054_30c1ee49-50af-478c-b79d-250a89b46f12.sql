-- Knowledge Base Documents
CREATE TABLE kb_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  file_path TEXT, -- Supabase storage path if uploaded file
  file_type TEXT, -- 'text', 'pdf', 'docx', etc.
  
  -- Categorization
  category TEXT DEFAULT 'general',
  tags TEXT[],
  
  -- Processing
  processing_status TEXT DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'error'
  embedding_status TEXT DEFAULT 'pending',
  
  -- Metadata
  file_size BIGINT,
  word_count INTEGER,
  
  -- Management
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Search history
CREATE TABLE kb_searches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id),
  query TEXT NOT NULL,
  results_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS and create policies for organization scoping
ALTER TABLE kb_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE kb_searches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "KB documents org access" ON kb_documents
  FOR ALL USING (
    organization_id IN (
      SELECT organization_id FROM memberships 
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );

CREATE POLICY "KB searches org access" ON kb_searches
  FOR ALL USING (
    organization_id IN (
      SELECT organization_id FROM memberships 
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );

-- Add indexes for better performance
CREATE INDEX kb_documents_org_id_idx ON kb_documents(organization_id);
CREATE INDEX kb_documents_created_at_idx ON kb_documents(created_at DESC);
CREATE INDEX kb_searches_org_id_idx ON kb_searches(organization_id);
CREATE INDEX kb_searches_user_id_idx ON kb_searches(user_id);