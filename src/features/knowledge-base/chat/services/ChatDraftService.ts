import { useCallback, useEffect, useState } from 'react';

export interface ChatDraft {
  conversationId: string;
  content: string;
  timestamp: number;
  selectedKbIds?: string[];
}

export interface MessageTemplate {
  id: string;
  title: string;
  content: string;
  category: string;
  variables: string[]; // Variables like {{name}}, {{topic}}
  isOrganizationWide?: boolean;
  createdBy?: string;
  createdAt: string;
  usage_count?: number;
}

export class ChatDraftService {
  private static readonly DRAFT_KEY_PREFIX = 'chat_draft_';
  private static readonly TEMPLATES_KEY = 'chat_templates';
  private static readonly AUTO_SAVE_DELAY = 1000; // 1 second

  /**
   * Save draft to localStorage
   */
  static saveDraft(conversationId: string, content: string, selectedKbIds?: string[]): void {
    if (!content.trim()) {
      this.deleteDraft(conversationId);
      return;
    }

    const draft: ChatDraft = {
      conversationId,
      content: content.trim(),
      timestamp: Date.now(),
      selectedKbIds
    };

    try {
      localStorage.setItem(
        `${this.DRAFT_KEY_PREFIX}${conversationId}`,
        JSON.stringify(draft)
      );
    } catch (error) {
      console.warn('Failed to save draft:', error);
    }
  }

  /**
   * Load draft from localStorage
   */
  static loadDraft(conversationId: string): ChatDraft | null {
    try {
      const stored = localStorage.getItem(`${this.DRAFT_KEY_PREFIX}${conversationId}`);
      if (!stored) return null;

      const draft: ChatDraft = JSON.parse(stored);
      
      // Check if draft is not too old (24 hours)
      const isExpired = Date.now() - draft.timestamp > 24 * 60 * 60 * 1000;
      if (isExpired) {
        this.deleteDraft(conversationId);
        return null;
      }

      return draft;
    } catch (error) {
      console.warn('Failed to load draft:', error);
      return null;
    }
  }

  /**
   * Delete draft from localStorage
   */
  static deleteDraft(conversationId: string): void {
    try {
      localStorage.removeItem(`${this.DRAFT_KEY_PREFIX}${conversationId}`);
    } catch (error) {
      console.warn('Failed to delete draft:', error);
    }
  }

  /**
   * Get all drafts
   */
  static getAllDrafts(): ChatDraft[] {
    const drafts: ChatDraft[] = [];
    
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key?.startsWith(this.DRAFT_KEY_PREFIX)) {
          const stored = localStorage.getItem(key);
          if (stored) {
            const draft: ChatDraft = JSON.parse(stored);
            // Filter out expired drafts
            if (Date.now() - draft.timestamp <= 24 * 60 * 60 * 1000) {
              drafts.push(draft);
            } else {
              localStorage.removeItem(key);
            }
          }
        }
      }
    } catch (error) {
      console.warn('Failed to get all drafts:', error);
    }

    return drafts.sort((a, b) => b.timestamp - a.timestamp);
  }

  /**
   * Clean up old drafts
   */
  static cleanupOldDrafts(): void {
    const cutoff = Date.now() - 24 * 60 * 60 * 1000; // 24 hours ago

    try {
      const keysToRemove: string[] = [];
      
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key?.startsWith(this.DRAFT_KEY_PREFIX)) {
          const stored = localStorage.getItem(key);
          if (stored) {
            const draft: ChatDraft = JSON.parse(stored);
            if (draft.timestamp < cutoff) {
              keysToRemove.push(key);
            }
          }
        }
      }

      keysToRemove.forEach(key => localStorage.removeItem(key));
    } catch (error) {
      console.warn('Failed to cleanup old drafts:', error);
    }
  }
}

export class MessageTemplateService {
  private static readonly TEMPLATES_KEY = 'chat_templates';
  private static readonly ORG_TEMPLATES_KEY = 'org_chat_templates';

  /**
   * Default message templates
   */
  static getDefaultTemplates(): MessageTemplate[] {
    return [
      {
        id: 'explain-concept',
        title: 'Explain a Concept',
        content: 'Can you explain {{concept}} in simple terms? Please include examples and any relevant details from our knowledge base.',
        category: 'Learning',
        variables: ['concept'],
        createdAt: new Date().toISOString()
      },
      {
        id: 'troubleshooting',
        title: 'Troubleshooting Help',
        content: 'I\'m having trouble with {{issue}}. Can you help me troubleshoot this step by step using our documentation?',
        category: 'Support',
        variables: ['issue'],
        createdAt: new Date().toISOString()
      },
      {
        id: 'best-practices',
        title: 'Best Practices',
        content: 'What are the best practices for {{topic}} according to our organizational guidelines and documentation?',
        category: 'Guidelines',
        variables: ['topic'],
        createdAt: new Date().toISOString()
      },
      {
        id: 'comparison',
        title: 'Compare Options',
        content: 'Can you compare {{option1}} and {{option2}}? Please highlight the key differences, pros and cons of each.',
        category: 'Analysis',
        variables: ['option1', 'option2'],
        createdAt: new Date().toISOString()
      },
      {
        id: 'summary',
        title: 'Summarize Information',
        content: 'Please provide a comprehensive summary of {{topic}} based on our knowledge base. Include key points and actionable insights.',
        category: 'Research',
        variables: ['topic'],
        createdAt: new Date().toISOString()
      }
    ];
  }

  /**
   * Get user templates
   */
  static getUserTemplates(): MessageTemplate[] {
    try {
      const stored = localStorage.getItem(this.TEMPLATES_KEY);
      if (!stored) return [];
      return JSON.parse(stored);
    } catch (error) {
      console.warn('Failed to load user templates:', error);
      return [];
    }
  }

  /**
   * Get all templates (default + user + organization)
   */
  static getAllTemplates(): MessageTemplate[] {
    const defaultTemplates = this.getDefaultTemplates();
    const userTemplates = this.getUserTemplates();
    // TODO: Add organization templates from database
    
    return [...defaultTemplates, ...userTemplates];
  }

  /**
   * Save user template
   */
  static saveUserTemplate(template: Omit<MessageTemplate, 'id' | 'createdAt'>): MessageTemplate {
    const newTemplate: MessageTemplate = {
      ...template,
      id: `user_${Date.now()}`,
      createdAt: new Date().toISOString()
    };

    try {
      const userTemplates = this.getUserTemplates();
      const updatedTemplates = [...userTemplates, newTemplate];
      localStorage.setItem(this.TEMPLATES_KEY, JSON.stringify(updatedTemplates));
      return newTemplate;
    } catch (error) {
      console.error('Failed to save template:', error);
      throw error;
    }
  }

  /**
   * Delete user template
   */
  static deleteUserTemplate(templateId: string): void {
    try {
      const userTemplates = this.getUserTemplates();
      const updatedTemplates = userTemplates.filter(t => t.id !== templateId);
      localStorage.setItem(this.TEMPLATES_KEY, JSON.stringify(updatedTemplates));
    } catch (error) {
      console.error('Failed to delete template:', error);
      throw error;
    }
  }

  /**
   * Apply template with variable substitution
   */
  static applyTemplate(template: MessageTemplate, variables: Record<string, string>): string {
    let content = template.content;
    
    // Replace variables in format {{variable}}
    template.variables.forEach(variable => {
      const placeholder = `{{${variable}}}`;
      const value = variables[variable] || `[${variable}]`;
      content = content.replace(new RegExp(placeholder, 'g'), value);
    });

    return content;
  }

  /**
   * Extract variables from template content
   */
  static extractVariables(content: string): string[] {
    const matches = content.match(/\{\{([^}]+)\}\}/g);
    if (!matches) return [];
    
    return matches.map(match => match.replace(/[{}]/g, ''));
  }

  /**
   * Track template usage
   */
  static trackTemplateUsage(templateId: string): void {
    // TODO: Implement usage tracking in database for analytics
    console.log('Template used:', templateId);
  }
}

/**
 * Hook for draft management
 */
export function useChatDraft(conversationId: string) {
  const [draft, setDraft] = useState<string>('');
  const [autoSaveTimeout, setAutoSaveTimeout] = useState<NodeJS.Timeout | null>(null);

  // Load draft on mount
  useEffect(() => {
    if (conversationId) {
      const savedDraft = ChatDraftService.loadDraft(conversationId);
      if (savedDraft) {
        setDraft(savedDraft.content);
      }
    }
  }, [conversationId]);

  // Auto-save draft with debouncing
  const saveDraftDebounced = useCallback((content: string, selectedKbIds?: string[]) => {
    if (autoSaveTimeout) {
      clearTimeout(autoSaveTimeout);
    }

    const timeout = setTimeout(() => {
      ChatDraftService.saveDraft(conversationId, content, selectedKbIds);
    }, ChatDraftService['AUTO_SAVE_DELAY']);

    setAutoSaveTimeout(timeout);
  }, [conversationId, autoSaveTimeout]);

  // Update draft content
  const updateDraft = useCallback((content: string, selectedKbIds?: string[]) => {
    setDraft(content);
    saveDraftDebounced(content, selectedKbIds);
  }, [saveDraftDebounced]);

  // Clear draft
  const clearDraft = useCallback(() => {
    setDraft('');
    ChatDraftService.deleteDraft(conversationId);
    if (autoSaveTimeout) {
      clearTimeout(autoSaveTimeout);
    }
  }, [conversationId, autoSaveTimeout]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (autoSaveTimeout) {
        clearTimeout(autoSaveTimeout);
      }
    };
  }, [autoSaveTimeout]);

  return {
    draft,
    updateDraft,
    clearDraft,
    hasDraft: draft.length > 0
  };
}

/**
 * Hook for message templates
 */
export function useMessageTemplates() {
  const [templates, setTemplates] = useState<MessageTemplate[]>([]);

  // Load templates on mount
  useEffect(() => {
    const allTemplates = MessageTemplateService.getAllTemplates();
    setTemplates(allTemplates);
  }, []);

  const saveTemplate = useCallback(async (template: Omit<MessageTemplate, 'id' | 'createdAt'>) => {
    try {
      const savedTemplate = MessageTemplateService.saveUserTemplate(template);
      setTemplates(prev => [...prev, savedTemplate]);
      return savedTemplate;
    } catch (error) {
      console.error('Failed to save template:', error);
      throw error;
    }
  }, []);

  const deleteTemplate = useCallback(async (templateId: string) => {
    try {
      MessageTemplateService.deleteUserTemplate(templateId);
      setTemplates(prev => prev.filter(t => t.id !== templateId));
    } catch (error) {
      console.error('Failed to delete template:', error);
      throw error;
    }
  }, []);

  const applyTemplate = useCallback((template: MessageTemplate, variables: Record<string, string>) => {
    MessageTemplateService.trackTemplateUsage(template.id);
    return MessageTemplateService.applyTemplate(template, variables);
  }, []);

  const getTemplatesByCategory = useCallback((category: string) => {
    return templates.filter(t => t.category === category);
  }, [templates]);

  const getCategories = useCallback(() => {
    const categories = new Set(templates.map(t => t.category));
    return Array.from(categories).sort();
  }, [templates]);

  return {
    templates,
    saveTemplate,
    deleteTemplate,
    applyTemplate,
    getTemplatesByCategory,
    getCategories,
    extractVariables: MessageTemplateService.extractVariables
  };
}