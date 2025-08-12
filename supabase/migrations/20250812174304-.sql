-- Insert a default KB configuration for the current organization
INSERT INTO public.kb_configurations (
  organization_id,
  name,
  display_name,
  description,
  is_default,
  embedding_model,
  chunk_size,
  chunk_overlap
) VALUES (
  '8aa2da2b-d344-4ff2-beca-d8d34c8d5262',
  'company-documents',
  'Company Documents',
  'Default knowledge base for Verss AI documents and resources.',
  true,
  'text-embedding-ada-002',
  1000,
  200
) ON CONFLICT (organization_id, name) DO NOTHING;