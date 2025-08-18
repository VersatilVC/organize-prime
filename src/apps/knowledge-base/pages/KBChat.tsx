import React from 'react';
import { useToast } from '@/hooks/use-toast';
import { useKBChat } from '../hooks/useKBChat';
import { useKnowledgeBases } from '@/features/knowledge-base/hooks/useKnowledgeBases';
import { ChatWindow } from '../components/chat/ChatWindow';

export default function KBChat() {
  const { toast } = useToast();
  const [selectedKBId, setSelectedKBId] = React.useState<string>();

  // Hooks
  const { data: knowledgeBases, isLoading: kbLoading } = useKnowledgeBases();
  const {
    conversations,
    currentConversationId,
    setCurrentConversationId,
    messages,
    inputValue,
    setInputValue,
    isLoading,
    isSending,
    isTyping,
    inputDisabled,
    scrollTrigger,
    retryableMessages,
    isOnline,
    startNewConversation,
    sendUserMessage,
    retryMessage,
    getMessageStatus,
    getTotalTokensUsed,
  } = useKBChat();

  // Set document title
  React.useEffect(() => {
    document.title = 'Knowledge Base - AI Chat';
  }, []);

  // Handle sending message
  const handleSendMessage = React.useCallback(async (content: string) => {
    await sendUserMessage(content);
  }, [sendUserMessage]);

  // Handle message retry
  const handleRetryMessage = React.useCallback(async (messageId: string) => {
    await retryMessage(messageId);
  }, [retryMessage]);

  // Handle conversation selection
  const handleConversationSelect = React.useCallback((id: string) => {
    setCurrentConversationId(id);
  }, [setCurrentConversationId]);

  // Handle new conversation
  const handleNewConversation = React.useCallback(async () => {
    await startNewConversation(selectedKBId);
  }, [startNewConversation, selectedKBId]);

  // Handle source click
  const handleSourceClick = React.useCallback((source: any) => {
    toast({
      title: 'Source Document',
      description: `Reference: ${source.title || source.filename || 'Document'}`,
    });
  }, [toast]);

  return (
    <ChatWindow
      conversations={conversations}
      currentConversationId={currentConversationId}
      messages={messages}
      onSendMessage={handleSendMessage}
      onSelectConversation={handleConversationSelect}
      onNewConversation={handleNewConversation}
      isLoading={isLoading}
      isTyping={isTyping}
      selectedKBId={selectedKBId}
      onKBSelect={setSelectedKBId}
      knowledgeBases={knowledgeBases || []}
      inputValue={inputValue}
      onInputChange={setInputValue}
      inputDisabled={inputDisabled}
      retryableMessages={retryableMessages}
      onRetryMessage={handleRetryMessage}
      isOnline={isOnline}
      isSending={isSending}
      scrollTrigger={scrollTrigger}
      onSourceClick={handleSourceClick}
      getTotalTokensUsed={getTotalTokensUsed}
      getMessageStatus={getMessageStatus}
    />
  );
}