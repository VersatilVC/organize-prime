import { createSettingsSchema, createNavigationItem } from '@/apps/shared';

export const kbConfig = {
  metadata: {
    id: 'knowledge-base',
    name: 'Knowledge Base',
    slug: 'knowledge-base',
    version: '1.0.0',
    icon: 'BookOpen',
  },
  // Navigation removed - now managed via database
  n8n: {
    webhooks: [
      { id: 'kb-process-file', path: '/webhook/kb-process-file' },
      { id: 'kb-ai-chat', path: '/webhook/kb-ai-chat' },
    ],
  },
  defaults: createSettingsSchema([
    {
      id: 'models',
      title: 'Models & Tokens',
      fields: [
        { key: 'embedding_model', label: 'Embedding Model', type: 'text', default: 'text-embedding-ada-002' },
        { key: 'max_tokens', label: 'Max Tokens', type: 'number', default: 2000 },
      ],
    },
    {
      id: 'chunking',
      title: 'Chunking',
      fields: [
        { key: 'chunk_size', label: 'Chunk Size', type: 'number', default: 1000 },
        { key: 'chunk_overlap', label: 'Chunk Overlap', type: 'number', default: 200 },
      ],
    },
  ]),
  permissions: {
    can_upload: ['admin'],
    can_chat: ['user', 'admin', 'super_admin'],
    can_create_kb: ['admin'],
    can_manage_files: ['admin'],
    can_view_analytics: ['admin'],
  },
  recommendedTypes: [
    { key: 'documents', label: 'Documents', tier: 'free' },
    { key: 'industry', label: 'Industry', tier: 'premium' },
    { key: 'competitors', label: 'Competitors', tier: 'premium' },
    { key: 'news', label: 'News', tier: 'premium' },
  ],
} as const;
