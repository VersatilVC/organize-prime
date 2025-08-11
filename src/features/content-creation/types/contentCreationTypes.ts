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