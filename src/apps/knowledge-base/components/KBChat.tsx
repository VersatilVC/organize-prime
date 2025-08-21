import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { SimpleChat } from '@/components/SimpleChat';
import { DebugSimpleChat } from '@/components/DebugSimpleChat';
import { ConversationSidebar } from '@/components/ConversationSidebar';
import { useUserRole } from '@/hooks/useUserRole';
import { useConversationCRUD } from '@/hooks/useConversationCRUD';
import { cn } from '@/lib/utils';
import { Plus, MessageSquare } from 'lucide-react';

export function KBChat() {
  const { role } = useUserRole();
  const isSuperAdmin = role === 'super_admin';
  const [showDebug, setShowDebug] = useState(false);
  const [activeConversationId, setActiveConversationId] = useState<string>('');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const { createConversation } = useConversationCRUD();

  const handleConversationSelect = (conversationId: string) => {
    setActiveConversationId(conversationId);
  };

  const handleConversationCreate = (conversationId: string) => {
    setActiveConversationId(conversationId);
  };

  const handleCreateNewConversation = () => {
    const title = `New Chat ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    createConversation.mutate(title, {
      onSuccess: (conversationId) => {
        setActiveConversationId(conversationId);
        handleConversationCreate(conversationId);
      },
    });
  };

  return (
    <div className="h-screen flex">
      {/* Conversation Sidebar */}
      <ConversationSidebar
        activeConversationId={activeConversationId}
        onConversationSelect={handleConversationSelect}
        onConversationCreate={handleConversationCreate}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
        className="flex-shrink-0"
      />

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <div className="flex-shrink-0 p-6 border-b bg-background/95 backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">AI Chat</h1>
              <p className="text-muted-foreground mt-1">
                Chat with AI to get instant answers and insights.
              </p>
            </div>
            
            {/* Debug toggle - only for super admins */}
            {isSuperAdmin && (
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setShowDebug(!showDebug)}
                className="ml-4"
              >
                {showDebug ? 'Production' : 'Debug'} Mode
              </Button>
            )}
          </div>
        </div>

        {/* Chat Area */}
        <div className="flex-1 p-6 min-h-0">
          <div className="max-w-4xl mx-auto h-full">
            {activeConversationId ? (
              showDebug && isSuperAdmin ? (
                <DebugSimpleChat />
              ) : (
                <SimpleChat 
                  conversationId={activeConversationId}
                  onConversationCreated={handleConversationCreate}
                />
              )
            ) : (
              <div className="h-full flex items-center justify-center">
                <div className="text-center">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full h-full rounded-full p-0"
                      onClick={() => setIsSidebarCollapsed(false)}
                    >
                      <MessageSquare className="h-8 w-8 text-primary" />
                    </Button>
                  </div>
                  <h3 className="text-lg font-medium mb-2">Select a Conversation</h3>
                  <p className="text-muted-foreground mb-4">
                    Choose an existing conversation or create a new one to start chatting.
                  </p>
                  <Button 
                    onClick={handleCreateNewConversation}
                    disabled={createConversation.isPending}
                    className="gap-2"
                  >
                    <Plus className="h-4 w-4" />
                    Start New Conversation
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default KBChat;