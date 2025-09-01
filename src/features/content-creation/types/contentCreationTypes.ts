export interface ContentProject {
  id: string;
  organization_id: string;
  title: string;
  description?: string | null;
  content_type: string;
  target_audience?: string | null;
  tone?: string;
  keywords?: string[] | null;
  status?: string;
  due_date?: string | null;
  created_by?: string | null;
  assigned_to?: string | null;
  created_at: string;
  updated_at: string;
}

export interface ContentItem {
  id: string;
  project_id: string;
  organization_id: string;
  title: string;
  content: string;
  content_format?: string;
  generation_prompt?: string | null;
  generation_model?: string | null;
  status?: string;
  version?: number;
  created_by?: string | null;
  reviewed_by?: string | null;
  created_at: string;
  updated_at: string;
}

// Form types - more flexible for user input
export interface CreateProjectForm {
  title: string;
  description?: string;
  content_type: string;
  target_audience?: string;
  tone?: string;
  keywords?: string[];
  due_date?: Date | null;
  assigned_to?: string;
}

export interface UpdateProjectForm extends Partial<CreateProjectForm> {
  id: string;
}

export interface CreateContentItemForm {
  project_id: string;
  title: string;
  content: string;
  content_format?: string;
  generation_prompt?: string;
  generation_model?: string;
  status?: string;
}

export interface UpdateContentItemForm extends Partial<CreateContentItemForm> {
  id: string;
}

// Generation types
export interface GenerationRequest {
  prompt: string;
  content_type: string;
  tone?: string;
  target_audience?: string;
  keywords?: string[];
  model?: string;
  max_tokens?: number;
  temperature?: number;
}

export interface GenerationResponse {
  content: string;
  model_used: string;
  tokens_used: number;
  generation_time_ms: number;
}

// Component prop types
export interface ProjectCardProps {
  project: ContentProject;
  onEdit?: (project: ContentProject) => void;
  onDelete?: (id: string) => void;
  onView?: (project: ContentProject) => void;
  className?: string;
}

export interface ContentCardProps {
  content: ContentItem;
  onEdit?: (content: ContentItem) => void;
  onDelete?: (id: string) => void;
  onView?: (content: ContentItem) => void;
  className?: string;
}

export interface ContentEditorProps {
  content: string;
  onChange: (content: string) => void;
  placeholder?: string;
  readOnly?: boolean;
  className?: string;
}

export interface GenerationInterfaceProps {
  onGenerate: (request: GenerationRequest) => void;
  isGenerating?: boolean;
  generatedContent?: string;
  onContentAccept?: (content: string) => void;
  className?: string;
}

// Type guards for runtime validation
export const isValidContentProject = (obj: any): obj is ContentProject => {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    typeof obj.id === 'string' &&
    typeof obj.title === 'string' &&
    typeof obj.content_type === 'string' &&
    typeof obj.organization_id === 'string'
  );
};

export const isValidContentItem = (obj: any): obj is ContentItem => {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    typeof obj.id === 'string' &&
    typeof obj.title === 'string' &&
    typeof obj.content === 'string' &&
    typeof obj.project_id === 'string' &&
    typeof obj.organization_id === 'string'
  );
};

// Content type options
export const CONTENT_TYPES = [
  { value: 'blog', label: 'Blog Post' },
  { value: 'social', label: 'Social Media' },
  { value: 'email', label: 'Email' },
  { value: 'marketing', label: 'Marketing Copy' },
  { value: 'technical', label: 'Technical Documentation' },
  { value: 'creative', label: 'Creative Writing' }
] as const;

export const CONTENT_TONES = [
  { value: 'professional', label: 'Professional' },
  { value: 'casual', label: 'Casual' },
  { value: 'friendly', label: 'Friendly' },
  { value: 'formal', label: 'Formal' },
  { value: 'humorous', label: 'Humorous' },
  { value: 'persuasive', label: 'Persuasive' }
] as const;

export const PROJECT_STATUSES = [
  { value: 'draft', label: 'Draft' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'review', label: 'Under Review' },
  { value: 'completed', label: 'Completed' }
] as const;

export const CONTENT_STATUSES = [
  { value: 'draft', label: 'Draft' },
  { value: 'review', label: 'Under Review' },
  { value: 'approved', label: 'Approved' },
  { value: 'published', label: 'Published' }
] as const;

// Content Creation Settings Types
export interface ContentType {
  id: string;
  organization_id: string;
  name: string;
  slug: string;
  description?: string | null;
  type_category: 'major' | 'derivative' | 'both';
  target_word_count?: number | null;
  word_count_range: Record<string, any>;
  examples: Array<{ type: 'file' | 'url'; value: string; description?: string }>;
  style_guidelines?: string | null;
  tone_preferences: string[];
  prompt_template_id?: string | null;
  custom_instructions?: string | null;
  required_sections: string[];
  content_structure?: string | null;
  usage_count: number;
  last_used_at?: string | null;
  is_active: boolean;
  is_default: boolean;
  created_by?: string | null;
  updated_by?: string | null;
  created_at: string;
  updated_at: string;
}

export interface TargetAudience {
  id: string;
  organization_id: string;
  name: string;
  slug: string;
  description?: string | null;
  company_types: string[];
  industries: string[];
  company_sizes: string[];
  job_titles: string[];
  job_levels: string[];
  departments: string[];
  demographics: Record<string, any>;
  interests: string[];
  pain_points: string[];
  goals: string[];
  preferred_content_formats: string[];
  communication_style?: string | null;
  content_consumption_habits: Record<string, any>;
  ai_segments: Record<string, any>;
  segment_analysis?: string | null;
  usage_count: number;
  last_used_at?: string | null;
  is_active: boolean;
  created_by?: string | null;
  updated_by?: string | null;
  created_at: string;
  updated_at: string;
}

// Form types for content creation settings
export interface CreateContentTypeForm {
  name: string;
  description?: string;
  type_category: 'major' | 'derivative' | 'both';
  target_word_count?: number;
  examples?: Array<{ type: 'file' | 'url'; value: string; description?: string }>;
  style_guidelines?: string;
  custom_instructions?: string;
  required_sections?: string[];
  content_structure?: string;
  is_active?: boolean;
  is_default?: boolean;
}

export interface UpdateContentTypeForm extends Partial<CreateContentTypeForm> {
  id: string;
}

export interface CreateTargetAudienceForm {
  name: string;
  description?: string;
  company_types?: string[];
  industries?: string[];
  company_sizes?: string[];
  job_titles?: string[];
  job_levels?: string[];
  departments?: string[];
  demographics?: Record<string, any>;
  interests?: string[];
  pain_points?: string[];
  goals?: string[];
  preferred_content_formats?: string[];
  communication_style?: string;
  content_consumption_habits?: Record<string, any>;
  ai_segments?: Record<string, any>;
  segment_analysis?: string;
  is_active?: boolean;
}

export interface UpdateTargetAudienceForm extends Partial<CreateTargetAudienceForm> {
  id: string;
}

// Constants for the settings forms
export const CONTENT_TYPE_CATEGORIES = [
  { value: 'major', label: 'Major Content Type' },
  { value: 'derivative', label: 'Derivative Content Type' },
  { value: 'both', label: 'Both Major & Derivative' }
] as const;

export const COMPANY_SIZES = [
  { value: '1-10', label: '1-10 employees' },
  { value: '11-50', label: '11-50 employees' },
  { value: '51-200', label: '51-200 employees' },
  { value: '201-1000', label: '201-1000 employees' },
  { value: '1000+', label: '1000+ employees' }
] as const;

export const JOB_LEVELS = [
  { value: 'entry', label: 'Entry Level' },
  { value: 'mid', label: 'Mid Level' },
  { value: 'senior', label: 'Senior Level' },
  { value: 'executive', label: 'Executive Level' }
] as const;

export const COMMUNICATION_STYLES = [
  { value: 'direct', label: 'Direct & Concise' },
  { value: 'detailed', label: 'Detailed & Comprehensive' },
  { value: 'conversational', label: 'Conversational' },
  { value: 'formal', label: 'Formal & Professional' },
  { value: 'technical', label: 'Technical & Precise' },
  { value: 'storytelling', label: 'Story-driven' }
] as const;

export const COMMON_INDUSTRIES = [
  'Technology', 'Healthcare', 'Finance', 'Education', 'Manufacturing',
  'Retail', 'Real Estate', 'Consulting', 'Legal', 'Marketing',
  'Non-profit', 'Government', 'Energy', 'Transportation', 'Media'
] as const;

export const COMMON_DEPARTMENTS = [
  'Marketing', 'Sales', 'HR', 'Finance', 'Operations', 'IT',
  'Customer Service', 'Product', 'Engineering', 'Design',
  'Legal', 'Executive', 'Business Development'
] as const;

export const CONTENT_FORMATS = [
  'Blog Posts', 'Social Media', 'Email Campaigns', 'White Papers',
  'Case Studies', 'Infographics', 'Videos', 'Podcasts', 'Webinars',
  'Newsletters', 'Press Releases', 'Product Descriptions'
] as const;