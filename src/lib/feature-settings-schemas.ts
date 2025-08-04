import { FeatureSettingsSchema } from '@/types/feature-settings';

export const knowledgeBaseSettings: FeatureSettingsSchema = {
  ai_configuration: {
    title: "AI Configuration",
    description: "Configure AI models and behavior for document processing",
    requiresRole: 'admin',
    settings: {
      ai_provider: {
        type: 'select',
        label: 'AI Provider',
        description: 'Choose your preferred AI service provider',
        options: [
          { value: 'openai', label: 'OpenAI GPT-4' },
          { value: 'anthropic', label: 'Anthropic Claude' },
          { value: 'local', label: 'Local Model' }
        ],
        required: true,
        default: 'openai'
      },
      max_tokens: {
        type: 'number',
        label: 'Max Response Tokens',
        description: 'Maximum number of tokens for AI responses',
        default: 4000,
        validation: { min: 100, max: 8000 },
        dependsOn: 'ai_provider'
      },
      temperature: {
        type: 'number',
        label: 'AI Temperature',
        description: 'Controls randomness in AI responses (0.0 to 1.0)',
        default: 0.3,
        validation: { min: 0, max: 1 }
      },
      api_key: {
        type: 'text',
        label: 'API Key',
        description: 'Your AI provider API key',
        sensitive: true,
        placeholder: 'Enter your API key...',
        required: true
      }
    }
  },
  access_control: {
    title: "Access Control",
    description: "Manage document visibility and user permissions",
    settings: {
      default_visibility: {
        type: 'select',
        label: 'Default Document Visibility',
        description: 'Default access level for new documents',
        options: [
          { value: 'private', label: 'Private (Creator Only)' },
          { value: 'team', label: 'Team (Department)' },
          { value: 'organization', label: 'Organization (All Users)' }
        ],
        default: 'team'
      },
      allow_public_sharing: {
        type: 'boolean',
        label: 'Allow Public Sharing',
        description: 'Enable users to create publicly accessible document links',
        default: false
      },
      require_approval: {
        type: 'boolean',
        label: 'Require Document Approval',
        description: 'New documents must be approved before becoming visible',
        default: false
      }
    }
  },
  search_configuration: {
    title: "Search Configuration",
    description: "Configure search behavior and indexing",
    settings: {
      enable_ai_search: {
        type: 'boolean',
        label: 'Enable AI-Powered Search',
        description: 'Use AI to enhance search results and provide conversational queries',
        default: true
      },
      search_history_retention: {
        type: 'number',
        label: 'Search History Retention (days)',
        description: 'How long to keep user search history',
        default: 90,
        validation: { min: 1, max: 365 }
      },
      index_refresh_interval: {
        type: 'select',
        label: 'Index Refresh Interval',
        description: 'How often to update the search index',
        options: [
          { value: 'realtime', label: 'Real-time' },
          { value: 'hourly', label: 'Every Hour' },
          { value: 'daily', label: 'Daily' },
          { value: 'weekly', label: 'Weekly' }
        ],
        default: 'hourly'
      }
    }
  }
};

export const contentCreationSettings: FeatureSettingsSchema = {
  brand_configuration: {
    title: "Brand Configuration",
    description: "Set up your brand voice and style guidelines",
    settings: {
      brand_voice: {
        type: 'select',
        label: 'Brand Voice',
        options: [
          { value: 'professional', label: 'Professional' },
          { value: 'friendly', label: 'Friendly' },
          { value: 'casual', label: 'Casual' },
          { value: 'authoritative', label: 'Authoritative' },
          { value: 'custom', label: 'Custom' }
        ],
        default: 'professional'
      },
      custom_voice_description: {
        type: 'textarea',
        label: 'Custom Voice Description',
        description: 'Describe your brand voice in detail',
        dependsOn: 'brand_voice',
        placeholder: 'Describe your unique brand personality...'
      },
      brand_guidelines: {
        type: 'file',
        label: 'Brand Guidelines Document',
        description: 'Upload your brand style guide (PDF, DOC, or TXT)',
        validation: {
          fileTypes: ['pdf', 'doc', 'docx', 'txt'],
          maxFileSize: 10485760 // 10MB
        }
      }
    }
  },
  content_preferences: {
    title: "Content Preferences",
    description: "Configure default content generation settings",
    settings: {
      default_content_length: {
        type: 'select',
        label: 'Default Content Length',
        options: [
          { value: 'short', label: 'Short (100-300 words)' },
          { value: 'medium', label: 'Medium (300-800 words)' },
          { value: 'long', label: 'Long (800+ words)' }
        ],
        default: 'medium'
      },
      include_seo_optimization: {
        type: 'boolean',
        label: 'Include SEO Optimization',
        description: 'Automatically optimize content for search engines',
        default: true
      },
      plagiarism_check: {
        type: 'boolean',
        label: 'Enable Plagiarism Check',
        description: 'Check generated content against existing sources',
        default: true
      },
      auto_save_drafts: {
        type: 'boolean',
        label: 'Auto-save Drafts',
        description: 'Automatically save content drafts every 30 seconds',
        default: true
      }
    }
  },
  ai_configuration: {
    title: "AI Configuration",
    description: "Configure AI models for content generation",
    requiresRole: 'admin',
    settings: {
      content_model: {
        type: 'select',
        label: 'Content Generation Model',
        description: 'Choose the AI model for content creation',
        options: [
          { value: 'gpt-4', label: 'GPT-4 (High Quality)' },
          { value: 'gpt-3.5-turbo', label: 'GPT-3.5 Turbo (Fast)' },
          { value: 'claude-3', label: 'Claude 3 (Creative)' }
        ],
        default: 'gpt-4'
      },
      creativity_level: {
        type: 'number',
        label: 'Creativity Level',
        description: 'Controls how creative the AI is (0.0 to 1.0)',
        default: 0.7,
        validation: { min: 0, max: 1 }
      },
      max_content_length: {
        type: 'number',
        label: 'Maximum Content Length (words)',
        description: 'Maximum number of words for generated content',
        default: 2000,
        validation: { min: 100, max: 10000 }
      }
    }
  }
};

export const marketIntelSettings: FeatureSettingsSchema = {
  data_sources: {
    title: "Data Sources",
    description: "Configure market intelligence data sources",
    requiresRole: 'admin',
    settings: {
      crunchbase_api_key: {
        type: 'text',
        label: 'Crunchbase API Key',
        description: 'API key for Crunchbase data access',
        sensitive: true,
        placeholder: 'Enter your Crunchbase API key...'
      },
      pitchbook_integration: {
        type: 'boolean',
        label: 'Enable PitchBook Integration',
        description: 'Connect to PitchBook for funding data',
        default: false
      },
      news_sources: {
        type: 'multiselect',
        label: 'News Sources',
        description: 'Select news sources for market intelligence',
        options: [
          { value: 'techcrunch', label: 'TechCrunch' },
          { value: 'bloomberg', label: 'Bloomberg' },
          { value: 'reuters', label: 'Reuters' },
          { value: 'wsj', label: 'Wall Street Journal' }
        ],
        default: ['techcrunch', 'bloomberg']
      }
    }
  },
  alert_configuration: {
    title: "Alert Configuration",
    description: "Set up market intelligence alerts and notifications",
    settings: {
      funding_alerts: {
        type: 'boolean',
        label: 'Funding Round Alerts',
        description: 'Get notified about new funding rounds',
        default: true
      },
      competitor_alerts: {
        type: 'boolean',
        label: 'Competitor Alerts',
        description: 'Monitor competitor activities and news',
        default: true
      },
      minimum_funding_amount: {
        type: 'number',
        label: 'Minimum Funding Amount ($M)',
        description: 'Only alert for funding rounds above this amount',
        default: 1,
        validation: { min: 0.1, max: 1000 },
        dependsOn: 'funding_alerts'
      },
      alert_frequency: {
        type: 'select',
        label: 'Alert Frequency',
        description: 'How often to send digest emails',
        options: [
          { value: 'realtime', label: 'Real-time' },
          { value: 'daily', label: 'Daily' },
          { value: 'weekly', label: 'Weekly' },
          { value: 'monthly', label: 'Monthly' }
        ],
        default: 'daily'
      }
    }
  }
};

// Export a mapping of feature slugs to their settings schemas
export const featureSettingsMap: Record<string, FeatureSettingsSchema> = {
  'knowledge-base': knowledgeBaseSettings,
  'content-creation': contentCreationSettings,
  'market-intel': marketIntelSettings,
};

export function getFeatureSettings(featureSlug: string): FeatureSettingsSchema | null {
  return featureSettingsMap[featureSlug] || null;
}