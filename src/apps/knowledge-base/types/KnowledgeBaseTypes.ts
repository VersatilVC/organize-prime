export interface KBDashboardStats {
  overview: {
    knowledge_bases: number;
    total_files: number;
    processing_files: number;
    failed_files: number;
    conversations: number;
    messages: number;
    premium_kbs?: number;
  };
}

export interface KBFileItem {
  id: string;
  file_name: string;
  original_name: string;
  file_size: number;
  processing_status: 'pending' | 'processing' | 'completed' | 'failed';
  created_at: string;
}

// AI Chat Settings Types
export type AIChatTone = 'professional' | 'friendly' | 'casual' | 'expert';
export type AIChatCommunicationStyle = 'concise' | 'detailed' | 'balanced';

export interface AIChatResponsePreferences {
  cite_sources: boolean;
  ask_clarifying_questions: boolean;
  suggest_related_topics: boolean;
  use_examples: boolean;
}

export interface KBAIChatSettings {
  id: string;
  organization_id: string;
  assistant_name: string;
  tone: AIChatTone;
  communication_style: AIChatCommunicationStyle;
  response_preferences: AIChatResponsePreferences;
  custom_greeting?: string;
  additional_chat_instructions?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface KBAIChatSettingsInput {
  assistant_name: string;
  tone: AIChatTone;
  communication_style: AIChatCommunicationStyle;
  response_preferences: AIChatResponsePreferences;
  custom_greeting?: string;
  additional_chat_instructions?: string;
}

// AI Chat Settings validation schema compatible with Zod
export const AIChatSettingsValidation = {
  assistant_name: {
    required: true,
    minLength: 1,
    maxLength: 50,
    pattern: /^[a-zA-Z0-9\s\-_]+$/,
  },
  tone: {
    required: true,
    enum: ['professional', 'friendly', 'casual', 'expert'] as const,
  },
  communication_style: {
    required: true,
    enum: ['concise', 'detailed', 'balanced'] as const,
  },
  custom_greeting: {
    required: false,
    maxLength: 200,
  },
  additional_chat_instructions: {
    required: false,
    maxLength: 500,
  },
} as const;
