import { supabase } from '@/integrations/supabase/client';
import type { ChatSettings } from '../types/ChatSettings';
import { DEFAULT_CHAT_SETTINGS } from '../types/ChatSettings';

export class ChatSettingsService {
  private static readonly SETTINGS_KEY = 'chat_preferences';

  /**
   * Get chat settings for organization
   */
  static async getChatSettings(organizationId: string): Promise<ChatSettings> {
    try {
      const { data, error } = await supabase
        .from('organization_settings')
        .select('settings')
        .eq('organization_id', organizationId)
        .eq('key', this.SETTINGS_KEY)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
        console.error('Error fetching chat settings:', error);
        throw new Error(`Failed to fetch chat settings: ${error.message}`);
      }

      if (!data || !data.settings) {
        // Return default settings if none exist
        return DEFAULT_CHAT_SETTINGS;
      }

      // Merge with defaults to ensure all properties exist
      return this.mergeWithDefaults(data.settings as Partial<ChatSettings>);
    } catch (error) {
      console.error('ChatSettingsService.getChatSettings error:', error);
      throw error;
    }
  }

  /**
   * Update chat settings for organization
   */
  static async updateChatSettings(organizationId: string, settings: ChatSettings): Promise<void> {
    try {
      const { error } = await supabase
        .from('organization_settings')
        .upsert({
          organization_id: organizationId,
          key: this.SETTINGS_KEY,
          settings: settings,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'organization_id,key'
        });

      if (error) {
        console.error('Error updating chat settings:', error);
        throw new Error(`Failed to update chat settings: ${error.message}`);
      }

      console.log('✅ Chat settings updated successfully');
    } catch (error) {
      console.error('ChatSettingsService.updateChatSettings error:', error);
      throw error;
    }
  }

  /**
   * Reset chat settings to defaults
   */
  static async resetChatSettings(organizationId: string): Promise<void> {
    try {
      await this.updateChatSettings(organizationId, DEFAULT_CHAT_SETTINGS);
      console.log('✅ Chat settings reset to defaults');
    } catch (error) {
      console.error('ChatSettingsService.resetChatSettings error:', error);
      throw error;
    }
  }

  /**
   * Check if organization has custom chat settings
   */
  static async hasCustomSettings(organizationId: string): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from('organization_settings')
        .select('id')
        .eq('organization_id', organizationId)
        .eq('key', this.SETTINGS_KEY)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error checking custom settings:', error);
        return false;
      }

      return !!data;
    } catch (error) {
      console.error('ChatSettingsService.hasCustomSettings error:', error);
      return false;
    }
  }

  /**
   * Merge partial settings with defaults
   */
  private static mergeWithDefaults(settings: Partial<ChatSettings>): ChatSettings {
    return {
      assistant: {
        ...DEFAULT_CHAT_SETTINGS.assistant,
        ...settings.assistant
      },
      behavior: {
        ...DEFAULT_CHAT_SETTINGS.behavior,
        ...settings.behavior
      },
      knowledgeBases: {
        ...DEFAULT_CHAT_SETTINGS.knowledgeBases,
        ...settings.knowledgeBases
      },
      userPreferences: {
        ...DEFAULT_CHAT_SETTINGS.userPreferences,
        ...settings.userPreferences
      }
    };
  }

  /**
   * Validate chat settings
   */
  static validateSettings(settings: ChatSettings): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Validate assistant name
    if (!settings.assistant.name || settings.assistant.name.trim().length === 0) {
      errors.push('Assistant name is required');
    }

    if (settings.assistant.name && settings.assistant.name.length > 100) {
      errors.push('Assistant name must be 100 characters or less');
    }

    // Validate assistant goal
    if (settings.assistant.goal && settings.assistant.goal.length > 500) {
      errors.push('Assistant goal must be 500 characters or less');
    }

    // Validate context memory
    if (settings.behavior.contextMemory < 5 || settings.behavior.contextMemory > 20) {
      errors.push('Context memory must be between 5 and 20 messages');
    }

    // Validate default KBs exist (this would require checking against actual KBs)
    // For now, just ensure it's an array
    if (!Array.isArray(settings.knowledgeBases.defaultKBs)) {
      errors.push('Default knowledge bases must be an array');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Get system prompt based on settings
   */
  static generateSystemPrompt(settings: ChatSettings): string {
    const { assistant, behavior } = settings;
    
    let prompt = `You are ${assistant.name}, an AI assistant for this organization. `;
    
    // Add tone-specific instructions
    switch (assistant.tone) {
      case 'professional':
        prompt += 'Maintain a professional, respectful tone in all interactions. ';
        break;
      case 'friendly':
        prompt += 'Be warm, approachable, and friendly while remaining helpful. ';
        break;
      case 'casual':
        prompt += 'Use a casual, relaxed tone that feels natural and conversational. ';
        break;
      case 'technical':
        prompt += 'Focus on precision, accuracy, and technical details in your responses. ';
        break;
      case 'creative':
        prompt += 'Be creative, innovative, and think outside the box in your responses. ';
        break;
    }

    // Add goal
    if (assistant.goal) {
      prompt += `${assistant.goal} `;
    }

    // Add response style instructions
    switch (behavior.responseStyle) {
      case 'concise':
        prompt += 'Keep your responses concise and to the point. ';
        break;
      case 'detailed':
        prompt += 'Provide comprehensive, detailed responses with thorough explanations. ';
        break;
      case 'conversational':
        prompt += 'Respond in a natural, conversational manner as if speaking with a colleague. ';
        break;
      case 'technical':
        prompt += 'Focus on technical accuracy and include relevant technical details. ';
        break;
    }

    // Add source citation instructions
    if (behavior.includeSources) {
      prompt += 'Always cite your sources and reference specific documents when providing information. ';
    }

    prompt += 'Be helpful, accurate, and ensure your responses are relevant to the user\'s needs.';

    return prompt;
  }
}