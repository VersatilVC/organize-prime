-- Add Knowledge Base AI Chat functionality
-- Chat conversations with AI
CREATE TABLE kb_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id),
  kb_config_id UUID REFERENCES kb_configurations(id) ON DELETE CASCADE,
  title TEXT,
  
  -- Configuration
  model TEXT DEFAULT 'gpt-4',
  temperature DECIMAL(3,2) DEFAULT 0.7,
  max_tokens INTEGER DEFAULT 2000,
  
  -- Metadata
  message_count INTEGER DEFAULT 0,
  total_tokens_used INTEGER DEFAULT 0,
  last_message_at TIMESTAMP WITH TIME ZONE,
  summary TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Individual chat messages
CREATE TABLE kb_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES kb_conversations(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  
  -- Message Content
  message_type TEXT NOT NULL, -- 'user', 'assistant'
  content TEXT NOT NULL,
  
  -- AI Response Metadata
  sources JSONB DEFAULT '[]', -- Referenced documents and chunks
  confidence_score DECIMAL(3,2),
  response_time_ms INTEGER,
  model_used TEXT,
  tokens_used INTEGER DEFAULT 0,
  context_length INTEGER DEFAULT 0,
  temperature_used DECIMAL(3,2),
  source_count INTEGER DEFAULT 0,
  
  -- Message metadata
  metadata JSONB DEFAULT '{}',
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Analytics for Knowledge Base usage
CREATE TABLE kb_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  kb_config_id UUID REFERENCES kb_configurations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id),
  conversation_id UUID REFERENCES kb_conversations(id) ON DELETE CASCADE,
  
  -- Event tracking
  event_type TEXT NOT NULL, -- 'file_upload', 'chat_message', 'search_query', 'document_view'
  event_category TEXT, -- 'engagement', 'performance', 'usage'
  event_data JSONB DEFAULT '{}',
  
  -- Performance metrics
  processing_time_ms INTEGER,
  tokens_consumed INTEGER DEFAULT 0,
  vector_search_time_ms INTEGER,
  
  -- Session tracking
  session_id TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE kb_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE kb_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE kb_analytics ENABLE ROW LEVEL SECURITY;

-- RLS Policies for kb_conversations
CREATE POLICY "Users can create conversations" ON kb_conversations
  FOR INSERT WITH CHECK (
    user_id = auth.uid() AND 
    organization_id IN (
      SELECT organization_id FROM memberships 
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );

CREATE POLICY "Users can view their own conversations" ON kb_conversations
  FOR SELECT USING (
    user_id = auth.uid() OR 
    organization_id IN (
      SELECT organization_id FROM memberships 
      WHERE user_id = auth.uid() AND role = ANY(ARRAY['admin', 'super_admin']) AND status = 'active'
    )
  );

-- RLS Policies for kb_messages
CREATE POLICY "Users can add messages to their conversations" ON kb_messages
  FOR INSERT WITH CHECK (
    conversation_id IN (
      SELECT id FROM kb_conversations WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can view messages in their conversations" ON kb_messages
  FOR SELECT USING (
    conversation_id IN (
      SELECT id FROM kb_conversations WHERE user_id = auth.uid()
    ) OR 
    organization_id IN (
      SELECT organization_id FROM memberships 
      WHERE user_id = auth.uid() AND role = ANY(ARRAY['admin', 'super_admin']) AND status = 'active'
    )
  );

-- RLS Policies for kb_analytics
CREATE POLICY "Admins can view KB analytics" ON kb_analytics
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM memberships 
      WHERE user_id = auth.uid() AND role = ANY(ARRAY['admin', 'super_admin']) AND status = 'active'
    )
  );

-- Indexes for performance
CREATE INDEX idx_kb_conversations_user ON kb_conversations(user_id, created_at DESC);
CREATE INDEX idx_kb_conversations_org ON kb_conversations(organization_id, created_at DESC);
CREATE INDEX idx_kb_messages_conversation ON kb_messages(conversation_id, created_at);
CREATE INDEX idx_kb_messages_type ON kb_messages(message_type, created_at);
CREATE INDEX idx_kb_analytics_org ON kb_analytics(organization_id, event_type, created_at);
CREATE INDEX idx_kb_analytics_user ON kb_analytics(user_id, created_at DESC);