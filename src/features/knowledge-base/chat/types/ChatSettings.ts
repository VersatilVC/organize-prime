export interface ChatSettings {
  assistant: {
    name: string;
    tone: 'professional' | 'friendly' | 'casual' | 'technical' | 'creative';
    goal: string;
  };
  behavior: {
    defaultModel: 'gpt-4' | 'gpt-3.5-turbo' | 'claude-3';
    responseStyle: 'concise' | 'detailed' | 'conversational' | 'technical';
    includeSources: boolean;
    contextMemory: number;
  };
  knowledgeBases: {
    defaultKBs: string[];
    searchScope: 'current' | 'all' | 'ask';
  };
  userPreferences: {
    autoScroll: boolean;
    soundNotifications: boolean;
    showTimestamps: boolean;
  };
}

export const DEFAULT_CHAT_SETTINGS: ChatSettings = {
  assistant: {
    name: 'Knowledge Assistant',
    tone: 'professional',
    goal: 'I help you find relevant information from your organization\'s knowledge bases and provide accurate, helpful responses.'
  },
  behavior: {
    defaultModel: 'gpt-4',
    responseStyle: 'detailed',
    includeSources: true,
    contextMemory: 10
  },
  knowledgeBases: {
    defaultKBs: [],
    searchScope: 'ask'
  },
  userPreferences: {
    autoScroll: true,
    soundNotifications: true,
    showTimestamps: true
  }
};

export const ASSISTANT_TONES = [
  { value: 'professional', label: 'Professional' },
  { value: 'friendly', label: 'Friendly' },
  { value: 'casual', label: 'Casual' },
  { value: 'technical', label: 'Technical' },
  { value: 'creative', label: 'Creative' }
] as const;

export const AI_MODELS = [
  { value: 'gpt-4', label: 'GPT-4' },
  { value: 'gpt-3.5-turbo', label: 'GPT-3.5 Turbo' },
  { value: 'claude-3', label: 'Claude-3' }
] as const;

export const RESPONSE_STYLES = [
  { value: 'concise', label: 'Concise' },
  { value: 'detailed', label: 'Detailed' },
  { value: 'conversational', label: 'Conversational' },
  { value: 'technical', label: 'Technical' }
] as const;

export const SEARCH_SCOPES = [
  { value: 'current', label: 'Current conversation KBs only' },
  { value: 'all', label: 'All available KBs' },
  { value: 'ask', label: 'Ask each time' }
] as const;