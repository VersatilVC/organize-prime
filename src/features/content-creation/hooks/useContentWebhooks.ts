import { useWebhookCall } from '@/hooks/useWebhookCall';
import type { ContentProject, GenerationRequest } from '../types/contentCreationTypes';

/**
 * Content generation webhook
 */
export const useContentGenerationWebhook = () => {
  const { callWebhook, callWebhookAsync, isLoading } = useWebhookCall('content-creation', 'generate-content');

  const generateContent = async (request: GenerationRequest) => {
    return callWebhookAsync({
      prompt: request.prompt,
      contentType: request.content_type,
      targetAudience: request.target_audience,
      tone: request.tone,
      keywords: request.keywords,
      model: request.model || 'gpt-4o-mini',
      maxTokens: request.max_tokens || 2000,
      temperature: request.temperature || 0.7
    });
  };

  return {
    generateContent,
    isGenerating: isLoading
  };
};

/**
 * Content optimization webhook
 */
export const useContentOptimizationWebhook = () => {
  const { callWebhook, callWebhookAsync, isLoading } = useWebhookCall('content-creation', 'optimize-content');

  const optimizeContent = async (content: string, optimizationType: string) => {
    return callWebhookAsync({
      content,
      optimizationType, // 'seo', 'readability', 'engagement', 'length'
      targetKeywords: [],
      targetLength: null
    });
  };

  return {
    optimizeContent,
    isOptimizing: isLoading
  };
};

/**
 * Content analysis webhook
 */
export const useContentAnalysisWebhook = () => {
  const { callWebhook, callWebhookAsync, isLoading } = useWebhookCall('content-creation', 'analyze-content');

  const analyzeContent = async (content: string) => {
    return callWebhookAsync({
      content,
      analysisTypes: ['sentiment', 'readability', 'seo', 'keywords', 'tone']
    });
  };

  return {
    analyzeContent,
    isAnalyzing: isLoading
  };
};

/**
 * Content translation webhook
 */
export const useContentTranslationWebhook = () => {
  const { callWebhook, callWebhookAsync, isLoading } = useWebhookCall('content-creation', 'translate-content');

  const translateContent = async (content: string, targetLanguage: string, sourceLanguage = 'auto') => {
    return callWebhookAsync({
      content,
      sourceLanguage,
      targetLanguage,
      preserveFormatting: true
    });
  };

  return {
    translateContent,
    isTranslating: isLoading
  };
};

/**
 * Project workflow webhook
 */
export const useProjectWorkflowWebhook = () => {
  const { callWebhook, callWebhookAsync, isLoading } = useWebhookCall('content-creation', 'project-workflow');

  const triggerWorkflow = async (project: ContentProject, action: string) => {
    return callWebhookAsync({
      projectId: project.id,
      projectTitle: project.title,
      contentType: project.content_type,
      status: project.status,
      action, // 'created', 'updated', 'completed', 'approved'
      assignedTo: project.assigned_to,
      dueDate: project.due_date
    });
  };

  return {
    triggerWorkflow,
    isTriggering: isLoading
  };
};

/**
 * Content publishing webhook
 */
export const useContentPublishingWebhook = () => {
  const { callWebhook, callWebhookAsync, isLoading } = useWebhookCall('content-creation', 'publish-content');

  const publishContent = async (contentId: string, platform: string, scheduledTime?: string) => {
    return callWebhookAsync({
      contentId,
      platform, // 'wordpress', 'social', 'email', 'blog'
      scheduledTime,
      publishSettings: {
        autoTag: true,
        notifyTeam: true
      }
    });
  };

  return {
    publishContent,
    isPublishing: isLoading
  };
};