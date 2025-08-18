import React, { useState, useCallback, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/auth/AuthProvider';
import { useOrganizationData } from '@/contexts/OrganizationContext';
import { useToast } from '@/hooks/use-toast';
import { ChatWebhookService } from '@/features/knowledge-base/chat/services/ChatWebhookService';

// Enhanced message interface with status tracking
export interface ChatMessage {
  id: string;
  conversation_id: string;
  message_type: 'user' | 'assistant';
  content: string;
  sources?: Array<{
    document_name: string;
    chunk_text: string;
    confidence_score: number;
    file_id: string;
    title?: string;
    filename?: string;
  }>;
  confidence_score?: number;
  response_time_ms?: number;
  status?: 'sending' | 'sent' | 'delivered' | 'failed' | 'retrying';
  optimisticId?: string;
  error_message?: string;
  retry_count?: number;
  processing_status?: 'pending' | 'processing' | 'completed' | 'error';
  metadata?: {
    tokens_used?: number;
    model_used?: string;
    temperature_used?: number;
  };
  created_at: string;
}

export interface ChatConversation {
  id: string;
  organization_id: string;
  user_id: string;
  kb_config_id?: string;
  title?: string;
  model: string;
  temperature: number;
  max_tokens: number;
  message_count: number;
  total_tokens_used: number;
  last_message_at?: string;
  created_at: string;
  updated_at: string;
}

// Enhanced hook state interface
interface UseKBChatState {
  isTyping: boolean;
  isSending: boolean;
  inputDisabled: boolean;
  retryableMessages: Set<string>;
  scrollTrigger: number;
  lastMessageStatus: string;
  optimisticMessages: Map<string, ChatMessage>;
  sendQueue: string[];
  isOnline: boolean;
}

export function useKBConversations() {
  const { user } = useAuth();
  const { currentOrganization } = useOrganizationData();

  return useQuery({
    queryKey: ['kb-conversations', currentOrganization?.id],
    queryFn: async () => {
      if (!currentOrganization?.id) return [];

      const { data, error } = await supabase
        .from('kb_conversations')
        .select('*')
        .eq('organization_id', currentOrganization.id)
        .order('last_message_at', { ascending: false, nullsFirst: false })
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as ChatConversation[];
    },
    enabled: !!currentOrganization?.id,
    staleTime: 30000, // 30 seconds
    gcTime: 300000, // 5 minutes
  });
}

export function useKBMessages(conversationId?: string) {
  return useQuery({
    queryKey: ['kb-messages', conversationId],
    queryFn: async () => {
      if (!conversationId) return [];

      const { data, error } = await supabase
        .from('kb_messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return data as ChatMessage[];
    },
    enabled: !!conversationId,
    staleTime: 10000, // 10 seconds
    gcTime: 300000, // 5 minutes
  });
}

export function useCreateConversation() {
  const { user } = useAuth();
  const { currentOrganization } = useOrganizationData();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      title?: string;
      kb_config_id?: string;
      model?: string;
      temperature?: number;
      max_tokens?: number;
    }) => {
      if (!user?.id || !currentOrganization?.id) {
        throw new Error('User or organization not found');
      }

      const { data, error } = await supabase
        .from('kb_conversations')
        .insert({
          organization_id: currentOrganization.id,
          user_id: user.id,
          title: params.title || 'New Conversation',
          kb_config_id: params.kb_config_id,
          model: params.model || 'gpt-4',
          temperature: params.temperature || 0.7,
          max_tokens: params.max_tokens || 2000,
        })
        .select()
        .single();

      if (error) throw error;
      return data as ChatConversation;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kb-conversations'] });
      toast({
        title: 'Conversation Created',
        description: 'New conversation started successfully',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to create conversation',
        variant: 'destructive',
      });
    },
  });
}

export function useSendMessage() {
  const { user } = useAuth();
  const { currentOrganization } = useOrganizationData();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      conversationId: string;
      content: string;
      message_type: 'user' | 'assistant';
      sources?: any[];
      confidence_score?: number;
      response_time_ms?: number;
      processing_status?: string;
      metadata?: any;
    }) => {
      if (!user?.id || !currentOrganization?.id) {
        throw new Error('User or organization not found');
      }

      const { data, error } = await supabase
        .from('kb_messages')
        .insert({
          conversation_id: params.conversationId,
          organization_id: currentOrganization.id,
          message_type: params.message_type,
          content: params.content,
          sources: params.sources || [],
          confidence_score: params.confidence_score,
          response_time_ms: params.response_time_ms,
          processing_status: params.processing_status || 'completed',
          metadata: params.metadata,
        })
        .select()
        .single();

      if (error) throw error;

      // Update conversation metadata for user messages
      if (params.message_type === 'user') {
        const { data: conversation } = await supabase
          .from('kb_conversations')
          .select('message_count, total_tokens_used')
          .eq('id', params.conversationId)
          .single();

        if (conversation) {
          await supabase
            .from('kb_conversations')
            .update({
              message_count: (conversation.message_count || 0) + 1,
              last_message_at: new Date().toISOString(),
              total_tokens_used: (conversation.total_tokens_used || 0) + (params.metadata?.tokens_used || 0),
            })
            .eq('id', params.conversationId);
        }
      }

      return data as ChatMessage;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['kb-messages', variables.conversationId] });
      queryClient.invalidateQueries({ queryKey: ['kb-conversations'] });
    },
    onError: (error: Error) => {
      console.error('Failed to send message:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to send message',
        variant: 'destructive',
      });
    },
  });
}

export function useKBChat() {
  const { user } = useAuth();
  const { currentOrganization } = useOrganizationData();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Core state
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const [inputValue, setInputValue] = useState('');

  // Enhanced UX state
  const [chatState, setChatState] = useState<UseKBChatState>({
    isTyping: false,
    isSending: false,
    inputDisabled: false,
    retryableMessages: new Set(),
    scrollTrigger: 0,
    lastMessageStatus: 'delivered',
    optimisticMessages: new Map(),
    sendQueue: [],
    isOnline: navigator.onLine,
  });

  // Refs for managing state
  const abortControllerRef = useRef<AbortController | null>(null);
  const sendQueueRef = useRef<string[]>([]);
  const retryTimeoutRef = useRef<NodeJS.Timeout>();

  // Data hooks
  const { data: conversations, isLoading: conversationsLoading } = useKBConversations();
  const { data: messages, isLoading: messagesLoading } = useKBMessages(currentConversationId || undefined);
  const createConversation = useCreateConversation();
  const sendMessage = useSendMessage();

  // Enhanced messages with optimistic updates
  const enhancedMessages = React.useMemo(() => {
    const baseMessages = messages || [];
    const optimisticArray = Array.from(chatState.optimisticMessages.values());
    
    // Merge and sort by created_at
    return [...baseMessages, ...optimisticArray]
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
  }, [messages, chatState.optimisticMessages]);

  // Generate optimistic message ID
  const generateOptimisticId = useCallback(() => {
    return `optimistic_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }, []);

  // Webhook configuration diagnostics
  const verifyWebhookConfiguration = useCallback(async () => {
    try {
      console.log('🔍 Starting webhook configuration diagnostics...');
      
      // 1. Check if Knowledge Base feature exists
      const { data: kbFeature, error: featureError } = await supabase
        .from('system_features')  
        .select('id, name, slug, is_enabled_globally')
        .eq('slug', 'knowledge-base')
        .single();

      if (featureError) {
        console.error('❌ Error finding Knowledge Base feature:', featureError);
        return { success: false, error: 'Knowledge Base feature not found' };
      }

      console.log('✅ Knowledge Base feature found:', {
        id: kbFeature.id,
        name: kbFeature.name,
        enabled: kbFeature.is_enabled_globally
      });

      // 2. Get all webhooks for KB feature
      const { data: webhooks, error: webhooksError } = await supabase
        .from('feature_webhooks')
        .select('id, name, endpoint_url, url, is_active, method, headers, created_at')
        .eq('feature_id', kbFeature.id);

      if (webhooksError) {
        console.error('❌ Error fetching webhooks:', webhooksError);
        return { success: false, error: 'Failed to fetch webhooks' };
      }

      console.log(`📊 Total webhooks for Knowledge Base: ${webhooks?.length || 0}`);
      
      if (webhooks && webhooks.length > 0) {
        console.table(webhooks.map(w => ({
          name: w.name,
          active: w.is_active,
          hasUrl: !!(w.endpoint_url || w.url),
          method: w.method || 'POST',
          created: new Date(w.created_at).toLocaleDateString()
        })));
      }

      // 3. Filter active webhooks
      const activeWebhooks = webhooks?.filter(w => w.is_active) || [];
      console.log(`🟢 Active webhooks: ${activeWebhooks.length}`);

      // 4. Look for chat-related webhooks
      const chatWebhooks = activeWebhooks.filter(w => 
        w.name.toLowerCase().includes('chat') || 
        w.name.toLowerCase().includes('ai') ||
        w.name.toLowerCase().includes('kb')
      );

      console.log(`💬 Chat-related webhooks: ${chatWebhooks.length}`);
      
      if (chatWebhooks.length > 0) {
        console.log('Chat webhooks found:');
        chatWebhooks.forEach(w => {
          console.log(`  - ${w.name}: ${w.endpoint_url || w.url || 'NO URL'}`);
        });
      }

      // 5. Check organization feature access
      const { data: orgFeature, error: orgError } = await supabase
        .from('organization_feature_configs')
        .select('is_enabled')
        .eq('organization_id', currentOrganization?.id)
        .eq('feature_slug', 'knowledge-base')
        .single();

      if (orgError && orgError.code !== 'PGRST116') { // Ignore "no rows" error
        console.warn('⚠️ Error checking organization feature access:', orgError);
      } else if (orgFeature) {
        console.log(`🏢 Organization KB access: ${orgFeature.is_enabled ? '✅ Enabled' : '❌ Disabled'}`);
      }

      // 6. Summary
      const summary = {
        kbFeatureExists: !!kbFeature,
        kbFeatureEnabled: kbFeature?.is_enabled_globally,
        totalWebhooks: webhooks?.length || 0,
        activeWebhooks: activeWebhooks.length,
        chatWebhooks: chatWebhooks.length,
        orgAccessEnabled: orgFeature?.is_enabled,
        firstChatWebhook: chatWebhooks[0] || null
      };

      console.log('📋 Configuration Summary:', summary);

      return { 
        success: true, 
        summary,
        recommendations: generateRecommendations(summary, chatWebhooks)
      };

    } catch (error) {
      console.error('💥 Webhook diagnostics failed:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }, [currentOrganization?.id]);

  // Generate recommendations based on diagnostic results
  const generateRecommendations = (summary: any, chatWebhooks: any[]) => {
    const recommendations = [];

    if (!summary.kbFeatureExists) {
      recommendations.push('❌ Knowledge Base feature is not configured in system_features table');
    } else if (!summary.kbFeatureEnabled) {
      recommendations.push('❌ Knowledge Base feature is globally disabled');
    }

    if (summary.totalWebhooks === 0) {
      recommendations.push('❌ No webhooks configured for Knowledge Base feature');
      recommendations.push('💡 Go to System Settings → Features → Knowledge Base → Webhooks to add a chat webhook');
    } else if (summary.activeWebhooks === 0) {
      recommendations.push('❌ No active webhooks found - check webhook status');
    } else if (summary.chatWebhooks === 0) {
      recommendations.push('❌ No chat-related webhooks found');
      recommendations.push('💡 Create a webhook with "chat", "ai", or "kb" in the name');
    }

    if (summary.chatWebhooks > 0) {
      const webhook = chatWebhooks[0];
      if (!webhook.endpoint_url && !webhook.url) {
        recommendations.push('❌ Chat webhook found but no URL configured');
      } else {
        recommendations.push('✅ Chat webhook appears to be configured correctly');
        recommendations.push(`🔗 Using webhook: ${webhook.name}`);
      }
    }

    if (summary.orgAccessEnabled === false) {
      recommendations.push('❌ Organization does not have access to Knowledge Base feature');
    }

    return recommendations;
  };

  // Handle webhook failures with helpful fallback messages
  const handleWebhookFailure = useCallback(async (conversationId: string, userMessage: string, error: Error) => {
    console.error('🚨 Webhook failed:', error);
    
    // Determine appropriate fallback message based on error type
    let fallbackMessage = "I'm having trouble processing your message right now. Please try again in a moment.";
    
    if (error.message.includes('webhook found') || error.message.includes('No active webhooks')) {
      fallbackMessage = "I'm not properly configured to provide AI responses yet. Please ask your administrator to set up the Knowledge Base AI webhook in the system settings.";
    } else if (error.message.includes('feature not found')) {
      fallbackMessage = "The Knowledge Base feature is not properly configured. Please contact your administrator.";
    } else if (error.message.includes('base URL') || error.message.includes('endpoint URL')) {
      fallbackMessage = "The AI webhook is configured but the URL is not set correctly. Please ask your administrator to check the webhook configuration.";
    } else if (error.message.includes('timeout') || error.message.includes('network')) {
      fallbackMessage = "I'm having trouble connecting to the AI service. Please try again in a moment.";
    }

    // Send fallback message to user
    try {
      await sendMessage.mutateAsync({
        conversationId,
        content: fallbackMessage,
        message_type: 'assistant',
        sources: [],
        confidence_score: 0,
        processing_status: 'completed',
        metadata: {
          error_type: 'webhook_failure',
          original_error: error.message,
        }
      });

      // Log analytics event
      if (currentOrganization?.id && user?.id) {
        await supabase.from('kb_analytics').insert({
          organization_id: currentOrganization.id,
          user_id: user.id,
          event_type: 'webhook_error',
          processing_time_ms: 0,
          tokens_consumed: 0,
          created_at: new Date().toISOString(),
        });
      }
    } catch (fallbackError) {
      console.error('Failed to send fallback message:', fallbackError);
    }
  }, [sendMessage, currentOrganization?.id, user?.id]);

  // Create optimistic message
  const createOptimisticMessage = useCallback((content: string): ChatMessage => {
    const optimisticId = generateOptimisticId();
    return {
      id: optimisticId,
      conversation_id: currentConversationId || '',
      message_type: 'user',
      content,
      status: 'sending',
      optimisticId,
      created_at: new Date().toISOString(),
      processing_status: 'pending',
    };
  }, [currentConversationId, generateOptimisticId]);

  // Add optimistic message
  const addOptimisticMessage = useCallback((message: ChatMessage) => {
    setChatState(prev => ({
      ...prev,
      optimisticMessages: new Map(prev.optimisticMessages).set(message.optimisticId!, message),
      scrollTrigger: prev.scrollTrigger + 1,
    }));
  }, []);

  // Replace optimistic message with real one
  const replaceOptimisticMessage = useCallback((optimisticId: string, realMessage: ChatMessage) => {
    setChatState(prev => {
      const newOptimistic = new Map(prev.optimisticMessages);
      newOptimistic.delete(optimisticId);
      return {
        ...prev,
        optimisticMessages: newOptimistic,
        scrollTrigger: prev.scrollTrigger + 1,
      };
    });
  }, []);

  // Update message status
  const updateMessageStatus = useCallback((messageId: string, status: ChatMessage['status'], errorMessage?: string) => {
    setChatState(prev => {
      const newOptimistic = new Map(prev.optimisticMessages);
      const message = newOptimistic.get(messageId);
      
      if (message) {
        newOptimistic.set(messageId, {
          ...message,
          status,
          error_message: errorMessage,
          retry_count: status === 'retrying' ? (message.retry_count || 0) + 1 : message.retry_count,
        });
      }

      const newRetryable = new Set(prev.retryableMessages);
      if (status === 'failed') {
        newRetryable.add(messageId);
      } else {
        newRetryable.delete(messageId);
      }

      return {
        ...prev,
        optimisticMessages: newOptimistic,
        retryableMessages: newRetryable,
        lastMessageStatus: status || 'delivered',
      };
    });
  }, []);

  // Debounced send function
  const debouncedSend = useCallback(
    debounce(async (content: string, conversationId: string) => {
      if (!content.trim() || !conversationId) return;

      try {
        // Abort any previous request
        if (abortControllerRef.current) {
          abortControllerRef.current.abort();
        }
        abortControllerRef.current = new AbortController();

        setChatState(prev => ({ ...prev, isSending: true, inputDisabled: true }));

        // Create optimistic user message
        const optimisticMessage = createOptimisticMessage(content);
        addOptimisticMessage(optimisticMessage);

        // Send user message to database
        const userMessage = await sendMessage.mutateAsync({
          conversationId,
          content: content.trim(),
          message_type: 'user',
          processing_status: 'completed',
        });

        // Replace optimistic with real message
        replaceOptimisticMessage(optimisticMessage.optimisticId!, userMessage);
        updateMessageStatus(optimisticMessage.optimisticId!, 'sent');

        // Clear input immediately for better UX
        setInputValue('');

        // Start typing indicator for AI
        setChatState(prev => ({ ...prev, isTyping: true }));

        // Track analytics
        await supabase
          .from('kb_analytics')
          .insert({
            organization_id: currentOrganization?.id,
            user_id: user?.id,
            event_type: 'chat',
            processing_time_ms: 0,
            created_at: new Date().toISOString(),
          });

        // Call AI webhook service
        try {
          // Get conversation's KB config for context
          const conversation = conversations?.find(c => c.id === conversationId);
          const kbIds = conversation?.kb_config_id ? [conversation.kb_config_id] : [];

          await ChatWebhookService.sendChatMessage(
            conversationId,
            userMessage.id,
            content.trim(),
            currentOrganization?.id || '',
            user?.id || '',
            kbIds,
            enhancedMessages.filter(m => !m.optimisticId), // Only real messages for context
            {
              model: conversation?.model || 'gpt-4',
              temperature: conversation?.temperature || 0.7,
              max_tokens: conversation?.max_tokens || 2000,
            }
          );

          updateMessageStatus(optimisticMessage.optimisticId!, 'delivered');
          
        } catch (webhookError) {
          console.error('Webhook error:', webhookError);
          updateMessageStatus(optimisticMessage.optimisticId!, 'failed', 
            webhookError instanceof Error ? webhookError.message : 'AI processing failed');
          
          // Use our enhanced error handling with helpful fallback messages
          await handleWebhookFailure(
            conversationId, 
            content.trim(), 
            webhookError instanceof Error ? webhookError : new Error('AI processing failed')
          );
        }

      } catch (error) {
        console.error('Send message error:', error);
        toast({
          title: 'Error',
          description: error instanceof Error ? error.message : 'Failed to send message',
          variant: 'destructive',
        });
      } finally {
        setChatState(prev => ({ 
          ...prev, 
          isSending: false, 
          inputDisabled: false, 
          isTyping: false 
        }));
      }
    }, 300), // 300ms debounce
    [sendMessage, currentOrganization, user, enhancedMessages, createOptimisticMessage, addOptimisticMessage, replaceOptimisticMessage, updateMessageStatus, toast]
  );

  // Retry failed message
  const retryMessage = useCallback(async (messageId: string) => {
    const failedMessage = enhancedMessages.find(m => m.id === messageId || m.optimisticId === messageId);
    if (!failedMessage || !currentConversationId) return;

    updateMessageStatus(messageId, 'retrying');
    
    try {
      await debouncedSend(failedMessage.content, currentConversationId);
      setChatState(prev => {
        const newRetryable = new Set(prev.retryableMessages);
        newRetryable.delete(messageId);
        return { ...prev, retryableMessages: newRetryable };
      });
    } catch (error) {
      updateMessageStatus(messageId, 'failed', 
        error instanceof Error ? error.message : 'Retry failed');
    }
  }, [enhancedMessages, currentConversationId, debouncedSend, updateMessageStatus]);

  // Start new conversation
  const startNewConversation = useCallback(async (kbConfigId?: string) => {
    try {
      setChatState(prev => ({ ...prev, inputDisabled: true }));
      
      const conversation = await createConversation.mutateAsync({
        title: 'New Conversation',
        kb_config_id: kbConfigId,
        model: 'gpt-4',
        temperature: 0.7,
        max_tokens: 2000,
      });
      
      setCurrentConversationId(conversation.id);
      
      // Reset chat state for new conversation
      setChatState(prev => ({
        ...prev,
        optimisticMessages: new Map(),
        retryableMessages: new Set(),
        scrollTrigger: prev.scrollTrigger + 1,
        inputDisabled: false,
      }));
      
    } catch (error) {
      console.error('Failed to create conversation:', error);
      setChatState(prev => ({ ...prev, inputDisabled: false }));
    }
  }, [createConversation]);

  // Send user message with enhanced UX
  const sendUserMessage = useCallback(async (content: string) => {
    if (!content.trim()) return;
    
    // Handle offline queueing
    if (!chatState.isOnline) {
      sendQueueRef.current.push(content);
      toast({
        title: 'Message Queued',
        description: 'Your message will be sent when you come back online',
      });
      setInputValue(''); // Clear input even when offline
      return;
    }
    
    let conversationId = currentConversationId;
    
    // Create conversation if none exists
    if (!conversationId) {
      try {
        const conversation = await createConversation.mutateAsync({
          title: content.length > 50 ? content.substring(0, 50) + '...' : content,
        });
        conversationId = conversation.id;
        setCurrentConversationId(conversation.id);
      } catch (error) {
        toast({
          title: 'Error',
          description: 'Failed to create conversation',
          variant: 'destructive',
        });
        return;
      }
    }

    // Use debounced send
    await debouncedSend(content, conversationId);
  }, [currentConversationId, createConversation, debouncedSend, toast, chatState.isOnline]);

  // Handle conversation switching
  const handleConversationChange = useCallback((conversationId: string) => {
    // Cancel any pending operations
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    setCurrentConversationId(conversationId);
    
    // Reset state for new conversation
    setChatState(prev => ({
      ...prev,
      optimisticMessages: new Map(),
      retryableMessages: new Set(),
      isTyping: false,
      isSending: false,
      inputDisabled: false,
      scrollTrigger: prev.scrollTrigger + 1,
    }));
  }, []);

  // Monitor online status and handle offline queue
  useEffect(() => {
    const handleOnline = () => {
      setChatState(prev => ({ ...prev, isOnline: true }));
      
      // Process any queued messages when coming back online
      if (sendQueueRef.current.length > 0) {
        const queuedMessages = [...sendQueueRef.current];
        sendQueueRef.current = [];
        
        queuedMessages.forEach(async (content) => {
          if (currentConversationId) {
            await debouncedSend(content, currentConversationId);
          }
        });
      }
    };
    
    const handleOffline = () => setChatState(prev => ({ ...prev, isOnline: false }));

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [currentConversationId, debouncedSend]);

  // Run webhook diagnostics on mount (development only)
  useEffect(() => {
    if (import.meta.env.DEV && currentOrganization?.id) {
      console.log('🚀 Running webhook diagnostics on mount...');
      verifyWebhookConfiguration().then(result => {
        if (result.recommendations) {
          console.log('📝 Webhook Configuration Recommendations:');
          result.recommendations.forEach(rec => console.log(`  ${rec}`));
        }
      });
    }
  }, [currentOrganization?.id, verifyWebhookConfiguration]);

  // Set up real-time subscriptions for message updates
  useEffect(() => {
    if (!currentConversationId || !currentOrganization?.id) return;

    const channel = supabase
      .channel(`kb-messages-${currentConversationId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'kb_messages',
        filter: `conversation_id=eq.${currentConversationId}`,
      }, (payload) => {
        const newMessage = payload.new as ChatMessage;
        
        // Only handle assistant messages from webhook responses
        if (newMessage.message_type === 'assistant') {
          queryClient.invalidateQueries({ queryKey: ['kb-messages', currentConversationId] });
          
          setChatState(prev => ({ 
            ...prev, 
            isTyping: false,
            scrollTrigger: prev.scrollTrigger + 1,
          }));
        }
      })
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'kb_messages',
        filter: `conversation_id=eq.${currentConversationId}`,
      }, (payload) => {
        const updatedMessage = payload.new as ChatMessage;
        
        // Handle status updates
        if (updatedMessage.processing_status === 'completed') {
          setChatState(prev => ({ 
            ...prev, 
            isTyping: false,
            scrollTrigger: prev.scrollTrigger + 1,
          }));
        }
        
        queryClient.invalidateQueries({ queryKey: ['kb-messages', currentConversationId] });
      })
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [currentConversationId, currentOrganization?.id, queryClient]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
    };
  }, []);

  return {
    // Core data
    conversations: conversations || [],
    currentConversationId,
    setCurrentConversationId: handleConversationChange,
    messages: enhancedMessages,
    inputValue,
    setInputValue,
    
    // Loading states
    isLoading: conversationsLoading || messagesLoading,
    isSending: chatState.isSending || sendMessage.isPending,
    isTyping: chatState.isTyping,
    
    // UX states
    inputDisabled: chatState.inputDisabled || !chatState.isOnline,
    scrollTrigger: chatState.scrollTrigger,
    retryableMessages: chatState.retryableMessages,
    isOnline: chatState.isOnline,
    
    // Actions
    startNewConversation,
    sendUserMessage,
    retryMessage,
    
    // Status helpers
    getMessageStatus: (messageId: string) => {
      const optimistic = chatState.optimisticMessages.get(messageId);
      return optimistic?.status || 'delivered';
    },
    
    // Diagnostics
    verifyWebhookConfiguration,
    
    // Analytics
    getTotalTokensUsed: () => {
      const current = conversations?.find(c => c.id === currentConversationId);
      return current?.total_tokens_used || 0;
    },
  };
}

// Utility function for debouncing
function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}