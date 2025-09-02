// Content Creation Feature - TypeScript Types & Interfaces
// Phase 1: Foundation - Database types and form schemas

import { z } from 'zod';

// Database table types
export interface ContentIdea {
  id: string;
  organization_id: string;
  title: string;
  description?: string;
  target_audience?: string;
  content_type: string;
  keywords?: string[];
  status: 'draft' | 'approved' | 'rejected' | 'archived';
  created_by: string;
  created_at: string;
  updated_at: string;
  // Extraction fields
  source_files?: SourceFile[];
  extraction_status?: 'none' | 'pending' | 'processing' | 'completed' | 'failed';
  extraction_error?: string;
  extracted_content?: string;
  extraction_metadata?: Record<string, any>;
  // AI Processing fields
  processing_status?: 'draft' | 'extracting' | 'generating ideas' | 'ready' | 'brief created' | 'failed' | 'processing_ai' | 'ai_completed';
  ai_suggestions?: AISuggestions;
  processing_error?: string;
  last_processed_at?: string;
  // Research summary from N8N workflow
  research_summary?: string;
}

export interface ContentBrief {
  id: string;
  idea_id?: string;
  organization_id: string;
  title: string;
  content_type: string;
  requirements?: string;
  tone?: string;
  target_audience?: string;
  keywords?: string[];
  status: 'draft' | 'approved' | 'in_progress' | 'completed' | 'archived';
  created_by: string;
  created_at: string;
  updated_at: string;
  // Generation tracking fields
  generation_status?: 'pending' | 'processing' | 'completed' | 'error';
  generation_started_at?: string;
  generation_completed_at?: string;
  generation_error?: string;
  n8n_execution_id?: string;
}

export interface ContentItem {
  id: string;
  brief_id?: string;
  organization_id: string;
  title: string;
  content?: string;
  content_type: string;
  status: 'draft' | 'review' | 'approved' | 'published' | 'archived';
  is_major_item: boolean;
  derivatives_count: number;
  created_by: string;
  created_at: string;
  updated_at: string;
  // Generation tracking fields
  generation_method?: 'manual' | 'ai_generated' | 'n8n_workflow';
  generation_metadata?: Record<string, any>;
  parent_item_id?: string;
}

// Enhanced types with relationships and computed fields
export interface ContentIdeaWithDetails extends ContentIdea {
  created_by_name?: string;
  briefs_count: number;
  can_create_brief: boolean;
}

export interface ContentBriefWithDetails extends ContentBrief {
  idea_title?: string;
  created_by_name?: string;
  content_items_count: number;
  can_generate_content: boolean;
}

export interface ContentItemWithDetails extends ContentItem {
  brief_title?: string;
  created_by_name?: string;
  can_create_derivatives: boolean;
  derivatives?: ContentItem[];
  parent_item_title?: string;
}

// Form input types (for create/update operations)
export interface CreateContentIdeaInput {
  title: string;
  description?: string;
  target_audience?: string;
  content_type: string;
  keywords?: string[];
}

export interface UpdateContentIdeaInput extends Partial<CreateContentIdeaInput> {
  status?: ContentIdea['status'];
}

export interface CreateContentBriefInput {
  idea_id?: string;
  title: string;
  content_type: string;
  requirements?: string;
  tone?: string;
  target_audience?: string;
  keywords?: string[];
}

export interface UpdateContentBriefInput extends Partial<CreateContentBriefInput> {
  status?: ContentBrief['status'];
}

export interface CreateContentItemInput {
  brief_id?: string;
  title: string;
  content?: string;
  content_type: string;
  is_major_item?: boolean;
}

export interface UpdateContentItemInput extends Partial<CreateContentItemInput> {
  status?: ContentItem['status'];
}

// Query filters for data fetching
export interface ContentIdeaFilters {
  search?: string;
  content_type?: string;
  status?: ContentIdea['status'] | 'all';
  target_audience?: string;
  created_by?: string;
  date_range?: {
    start: Date;
    end: Date;
  };
}

export interface ContentBriefFilters {
  search?: string;
  content_type?: string;
  status?: ContentBrief['status'] | 'all';
  idea_id?: string;
  created_by?: string;
  date_range?: {
    start: Date;
    end: Date;
  };
}

export interface ContentItemFilters {
  search?: string;
  content_type?: string;
  status?: ContentItem['status'] | 'all';
  brief_id?: string;
  is_major_item?: boolean;
  created_by?: string;
  date_range?: {
    start: Date;
    end: Date;
  };
}

// Hook result types
export interface ContentIdeasQueryResult {
  ideas: ContentIdeaWithDetails[];
  totalCount: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export interface ContentBriefsQueryResult {
  briefs: ContentBriefWithDetails[];
  totalCount: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export interface ContentItemsQueryResult {
  items: ContentItemWithDetails[];
  totalCount: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

// DataTable column definitions
export interface ContentIdeaTableColumn {
  title: string;
  content_type: string;
  target_audience: string;
  status: string;
  created_at: string;
  actions: string;
}

export interface ContentBriefTableColumn {
  title: string;
  content_type: string;
  status: string;
  created_at: string;
  actions: string;
}

export interface ContentItemTableColumn {
  title: string;
  content_type: string;
  status: string;
  is_major_item: boolean;
  derivatives_count: number;
  created_at: string;
  actions: string;
}

// Action types for table actions
export type ContentIdeaAction = 'view' | 'edit' | 'delete' | 'create_brief' | 'duplicate';
export type ContentBriefAction = 'view' | 'edit' | 'delete' | 'generate_content' | 'duplicate';
export type ContentItemAction = 'view' | 'edit' | 'delete' | 'create_derivatives' | 'publish' | 'archive';

// Content generation action payloads (for future AI integration)
export interface GenerateIdeasPayload {
  topic?: string;
  industry?: string;
  target_audience?: string;
  content_types?: string[];
  count?: number;
}

export interface GenerateContentPayload {
  brief_id: string;
  format?: string;
  tone?: string;
  length?: 'short' | 'medium' | 'long';
  include_seo?: boolean;
}

export interface CreateDerivativesPayload {
  item_id: string;
  derivative_types: string[];
  target_platforms?: string[];
}

// Form validation schemas using Zod
export const ContentIdeaSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200, 'Title too long'),
  description: z.string().max(500, 'Description too long').optional(),
  target_audience: z.string().max(100, 'Target audience too long').optional(),
  content_type: z.string().min(1, 'Content type is required'),
  keywords: z.array(z.string()).optional(),
});

export const ContentBriefSchema = z.object({
  idea_id: z.string().uuid().optional(),
  title: z.string().min(1, 'Title is required').max(200, 'Title too long'),
  content_type: z.string().min(1, 'Content type is required'),
  requirements: z.string().max(1000, 'Requirements too long').optional(),
  brief_content: z.string().optional(), // AI-generated or manually edited brief content
  tone: z.string().max(100, 'Tone too long').optional(),
  target_audience: z.string().max(100, 'Target audience too long').optional(),
  keywords: z.array(z.string()).optional(),
});

export const ContentItemSchema = z.object({
  brief_id: z.string().uuid().optional(),
  title: z.string().min(1, 'Title is required').max(200, 'Title too long'),
  content: z.string().optional(),
  content_type: z.string().min(1, 'Content type is required'),
  is_major_item: z.boolean().optional(),
});

// Export validation types
export type ContentIdeaFormData = z.infer<typeof ContentIdeaSchema>;
export type ContentBriefFormData = z.infer<typeof ContentBriefSchema>;
export type ContentItemFormData = z.infer<typeof ContentItemSchema>;

// Constants for dropdown options
export const CONTENT_TYPES = [
  { value: 'blog_post', label: 'Blog Post' },
  { value: 'social_media', label: 'Social Media' },
  { value: 'email_newsletter', label: 'Email Newsletter' },
  { value: 'video_script', label: 'Video Script' },
  { value: 'podcast_outline', label: 'Podcast Outline' },
  { value: 'white_paper', label: 'White Paper' },
  { value: 'case_study', label: 'Case Study' },
  { value: 'press_release', label: 'Press Release' },
  { value: 'product_description', label: 'Product Description' },
  { value: 'landing_page', label: 'Landing Page' },
] as const;

export const CONTENT_TONES = [
  { value: 'professional', label: 'Professional' },
  { value: 'casual', label: 'Casual' },
  { value: 'friendly', label: 'Friendly' },
  { value: 'authoritative', label: 'Authoritative' },
  { value: 'conversational', label: 'Conversational' },
  { value: 'humorous', label: 'Humorous' },
  { value: 'informative', label: 'Informative' },
  { value: 'persuasive', label: 'Persuasive' },
] as const;

export const CONTENT_STATUSES = {
  IDEAS: [
    { value: 'draft', label: 'Draft', color: 'gray' },
    { value: 'approved', label: 'Approved', color: 'green' },
    { value: 'rejected', label: 'Rejected', color: 'red' },
    { value: 'archived', label: 'Archived', color: 'yellow' },
  ],
  BRIEFS: [
    { value: 'draft', label: 'Draft', color: 'gray' },
    { value: 'approved', label: 'Approved', color: 'blue' },
    { value: 'in_progress', label: 'In Progress', color: 'orange' },
    { value: 'completed', label: 'Completed', color: 'green' },
    { value: 'archived', label: 'Archived', color: 'yellow' },
  ],
  ITEMS: [
    { value: 'draft', label: 'Draft', color: 'gray' },
    { value: 'review', label: 'Review', color: 'orange' },
    { value: 'approved', label: 'Approved', color: 'blue' },
    { value: 'published', label: 'Published', color: 'green' },
    { value: 'archived', label: 'Archived', color: 'yellow' },
  ],
} as const;

// Utility types
export type ContentType = typeof CONTENT_TYPES[number]['value'];
export type ContentTone = typeof CONTENT_TONES[number]['value'];
export type ContentIdeaStatus = typeof CONTENT_STATUSES.IDEAS[number]['value'];
export type ContentBriefStatus = typeof CONTENT_STATUSES.BRIEFS[number]['value'];
export type ContentItemStatus = typeof CONTENT_STATUSES.ITEMS[number]['value'];

// Error types
export interface ContentCreationError {
  code: string;
  message: string;
  field?: string;
}

// API response types
export interface ContentCreationResponse<T = unknown> {
  data?: T;
  error?: ContentCreationError;
  success: boolean;
}

export interface ContentGenerationResponse {
  generated_content: string;
  metadata?: {
    word_count: number;
    reading_time: number;
    seo_score?: number;
    suggestions?: string[];
  };
}

// Content Extraction types
export interface SourceFile {
  type: 'file' | 'url';
  name: string;
  value: string; // Base64 for files, URL for URLs
  description?: string;
  size?: number;
  mimeType?: string;
  status?: 'pending' | 'processing' | 'completed' | 'failed';
  error?: string;
}

export interface ContentIdeaExtraction {
  id: string;
  organization_id: string;
  content_idea_id: string;
  file_name: string;
  file_type: string;
  extraction_method: 'convertapi' | 'web_scraping';
  status: 'started' | 'processing' | 'completed' | 'failed';
  markdown_content?: string;
  extraction_metadata?: Record<string, any>;
  processing_time_ms?: number;
  error_message?: string;
  created_at: string;
  updated_at: string;
}

export interface AISuggestion {
  title: string;
  description: string;
  reasoning: string;
  confidence: number;
  keywords?: string[];
  target_audience?: string;
}

export interface AISuggestions {
  suggestions: AISuggestion[];
  processing_metadata?: {
    processing_time: number;
    model_used?: string;
    confidence_threshold?: number;
  };
  generated_at: string;
}

// Content Idea Extraction Service types
export interface UploadFileRequest {
  files: File[];
  urls: string[];
  ideaId: string;
}

export interface ExtractionStatusResponse {
  extraction_status: ContentIdea['extraction_status'];
  processing_status: ContentIdea['processing_status'];
  source_files: SourceFile[];
  extractions: ContentIdeaExtraction[];
  ai_suggestions?: AISuggestions;
  errors: string[];
}

// N8N Webhook types
export interface ContentIdeaWebhookPayload {
  ideaId: string;
  title: string;
  description?: string;
  extractedContent?: string;
  targetAudience?: string;
  contentType: string;
  keywords: string[];
  organizationId: string;
  userId: string;
}

export interface N8NWebhookResponse {
  success: boolean;
  suggestions?: AISuggestion[];
  error?: string;
  processing_time?: number;
}

// Content Generation types
export type GenerationStatus = 'pending' | 'processing' | 'completed' | 'error';
export type GenerationMethod = 'manual' | 'ai_generated' | 'n8n_workflow';

export interface ContentGenerationRequest {
  brief_id: string;
  organization_id: string;
  title: string;
  content_type: string;
  requirements?: string;
  tone?: string;
  target_audience?: string;
  keywords?: string[];
  user_id: string;
}

export interface ContentGenerationResponse {
  success: boolean;
  content_item?: {
    title: string;
    content: string;
    content_type: string;
    metadata?: Record<string, any>;
  };
  execution_id?: string;
  error?: string;
}

export interface GenerationStatusInfo {
  status: GenerationStatus;
  startedAt?: string;
  completedAt?: string;
  error?: string;
  executionId?: string;
}

// Pagination types
export interface PaginationParams {
  page: number;
  limit: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
}

// Export all types for easy importing
export type {
  ContentIdea,
  ContentBrief,
  ContentItem,
  ContentIdeaWithDetails,
  ContentBriefWithDetails,
  ContentItemWithDetails,
  CreateContentIdeaInput,
  UpdateContentIdeaInput,
  CreateContentBriefInput,
  UpdateContentBriefInput,
  CreateContentItemInput,
  UpdateContentItemInput,
  ContentIdeaFilters,
  ContentBriefFilters,
  ContentItemFilters,
  ContentIdeasQueryResult,
  ContentBriefsQueryResult,
  ContentItemsQueryResult,
  // Extraction types
  SourceFile,
  ContentIdeaExtraction,
  AISuggestion,
  AISuggestions,
  UploadFileRequest,
  ExtractionStatusResponse,
  ContentIdeaWebhookPayload,
  N8NWebhookResponse,
};