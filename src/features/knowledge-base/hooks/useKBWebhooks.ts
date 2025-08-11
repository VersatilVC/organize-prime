import { useWebhookCall } from '@/hooks/useWebhookCall';

/**
 * Document processing webhook
 */
export const useDocumentProcessingWebhook = () => {
  const { callWebhook, callWebhookAsync, isLoading } = useWebhookCall('knowledge-base', 'process-document');

  const processDocument = async (file: File, options?: {
    extractImages?: boolean;
    extractTables?: boolean;
    chunkSize?: number;
    overlap?: number;
  }) => {
    // Create form data for file upload
    const formData = new FormData();
    formData.append('file', file);

    return callWebhookAsync({
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type,
      options: {
        extractImages: options?.extractImages ?? false,
        extractTables: options?.extractTables ?? true,
        chunkSize: options?.chunkSize ?? 1000,
        overlap: options?.overlap ?? 200
      }
    });
  };

  return {
    processDocument,
    isProcessing: isLoading
  };
};

/**
 * AI chat webhook
 */
export const useAIChatWebhook = () => {
  const { callWebhook, callWebhookAsync, isLoading } = useWebhookCall('knowledge-base', 'ai-chat');

  const sendChatMessage = async (
    message: string, 
    conversationId?: string,
    context?: {
      kbConfigId?: string;
      searchResults?: any[];
      maxTokens?: number;
      temperature?: number;
    }
  ) => {
    return callWebhookAsync({
      message,
      conversationId,
      context: {
        kbConfigId: context?.kbConfigId,
        searchResults: context?.searchResults || [],
        maxTokens: context?.maxTokens || 2000,
        temperature: context?.temperature || 0.7
      }
    });
  };

  return {
    sendChatMessage,
    isSending: isLoading
  };
};

/**
 * Document search webhook
 */
export const useDocumentSearchWebhook = () => {
  const { callWebhook, callWebhookAsync, isLoading } = useWebhookCall('knowledge-base', 'search-documents');

  const searchDocuments = async (
    query: string,
    options?: {
      kbConfigId?: string;
      limit?: number;
      threshold?: number;
      filters?: Record<string, any>;
    }
  ) => {
    return callWebhookAsync({
      query,
      kbConfigId: options?.kbConfigId,
      limit: options?.limit || 10,
      threshold: options?.threshold || 0.7,
      filters: options?.filters || {}
    });
  };

  return {
    searchDocuments,
    isSearching: isLoading
  };
};

/**
 * Knowledge base indexing webhook
 */
export const useKBIndexingWebhook = () => {
  const { callWebhook, callWebhookAsync, isLoading } = useWebhookCall('knowledge-base', 'index-knowledge-base');

  const indexKnowledgeBase = async (kbConfigId: string, options?: {
    rebuildIndex?: boolean;
    batchSize?: number;
  }) => {
    return callWebhookAsync({
      kbConfigId,
      rebuildIndex: options?.rebuildIndex ?? false,
      batchSize: options?.batchSize ?? 100
    });
  };

  return {
    indexKnowledgeBase,
    isIndexing: isLoading
  };
};

/**
 * Document summary webhook
 */
export const useDocumentSummaryWebhook = () => {
  const { callWebhook, callWebhookAsync, isLoading } = useWebhookCall('knowledge-base', 'summarize-document');

  const summarizeDocument = async (
    documentId: string,
    summaryType: 'brief' | 'detailed' | 'key-points'
  ) => {
    return callWebhookAsync({
      documentId,
      summaryType,
      maxLength: summaryType === 'brief' ? 200 : summaryType === 'detailed' ? 1000 : 500
    });
  };

  return {
    summarizeDocument,
    isSummarizing: isLoading
  };
};

/**
 * Knowledge base analytics webhook
 */
export const useKBAnalyticsWebhook = () => {
  const { callWebhook, callWebhookAsync, isLoading } = useWebhookCall('knowledge-base', 'analytics-report');

  const generateAnalyticsReport = async (
    reportType: 'usage' | 'performance' | 'content-gaps',
    dateRange: { start: string; end: string }
  ) => {
    return callWebhookAsync({
      reportType,
      dateRange,
      includeCharts: true,
      exportFormat: 'json'
    });
  };

  return {
    generateAnalyticsReport,
    isGenerating: isLoading
  };
};