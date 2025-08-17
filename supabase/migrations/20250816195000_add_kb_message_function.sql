-- Add missing add_kb_message function for chat functionality
-- This function is used by ChatMessageService to add messages to conversations

CREATE OR REPLACE FUNCTION add_kb_message(
  conv_id UUID,
  msg_type TEXT,
  msg_content TEXT,
  msg_sources JSONB DEFAULT '[]'::JSONB,
  msg_metadata JSONB DEFAULT '{}'::JSONB,
  status TEXT DEFAULT 'completed'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  new_message_id UUID;
  org_id UUID;
  user_id UUID;
BEGIN
  -- Get organization ID and user ID from conversation
  SELECT organization_id INTO org_id
  FROM kb_conversations
  WHERE id = conv_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Conversation not found: %', conv_id;
  END IF;
  
  -- Get current user ID
  SELECT auth.uid() INTO user_id;
  
  IF user_id IS NULL THEN
    RAISE EXCEPTION 'User not authenticated';
  END IF;
  
  -- Verify user has access to this organization
  IF NOT EXISTS (
    SELECT 1 FROM memberships 
    WHERE user_id = auth.uid() 
    AND organization_id = org_id 
    AND status = 'active'
  ) AND NOT is_super_admin(auth.uid()) THEN
    RAISE EXCEPTION 'User does not have access to this organization';
  END IF;
  
  -- Insert the message
  INSERT INTO kb_messages (
    conversation_id,
    organization_id,
    message_type,
    content,
    sources,
    metadata,
    processing_status,
    created_at,
    updated_at
  ) VALUES (
    conv_id,
    org_id,
    msg_type,
    msg_content,
    msg_sources,
    msg_metadata,
    status,
    NOW(),
    NOW()
  ) RETURNING id INTO new_message_id;
  
  -- Update conversation's last_message_at and message_count
  UPDATE kb_conversations 
  SET 
    last_message_at = NOW(),
    message_count = message_count + 1,
    updated_at = NOW()
  WHERE id = conv_id;
  
  RETURN new_message_id;
END;
$$;

-- Grant execution permissions
GRANT EXECUTE ON FUNCTION add_kb_message TO authenticated;

-- Add comment
COMMENT ON FUNCTION add_kb_message IS 'Add a new message to a knowledge base conversation with proper security checks';