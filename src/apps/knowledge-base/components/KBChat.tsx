import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { SimpleChat } from '@/components/SimpleChat';
// Debug component removed for production
import { ConversationSidebar } from '@/components/ConversationSidebar';
import { useUserRole } from '@/hooks/useUserRole';
import { useConversationCRUD } from '@/hooks/useConversationCRUD';
import { useKBAIChatSettings } from '../hooks/useKBAIChatSettings';
import { cn } from '@/lib/utils';
import { Plus, MessageSquare, Loader2 } from 'lucide-react';

export function KBChat() {
  const { role } = useUserRole();
  const isSuperAdmin = role === 'super_admin';
  // Debug mode removed for production
  const [activeConversationId, setActiveConversationId] = useState<string>('');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const { createConversation } = useConversationCRUD();
  const { settings: chatSettings, isLoading: isLoadingSettings } = useKBAIChatSettings();

  // Dynamic assistant name with fallback
  const assistantName = chatSettings?.assistant_name || 'AI Chat';
  const chatSubtitle = `Chat with ${chatSettings?.assistant_name || 'AI'} to get instant answers and insights.`;

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
    <div className="h-[calc(100vh-81px)] flex flex-col relative overflow-hidden">
      {/* Mobile Overlay */}
      {!isSidebarCollapsed && (
        <div 
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 md:hidden"
          onClick={() => setIsSidebarCollapsed(true)}
        />
      )}
      
      {/* Main Content Area */}
      <div className="flex-1 flex min-h-0 overflow-hidden">
        {/* Conversation Sidebar */}
        <ConversationSidebar
          activeConversationId={activeConversationId}
          onConversationSelect={handleConversationSelect}
          onConversationCreate={handleConversationCreate}
          isCollapsed={isSidebarCollapsed}
          onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
          className={cn(
            "flex-shrink-0 transition-all duration-300 ease-in-out z-50 h-full",
            "md:relative md:translate-x-0",
            isSidebarCollapsed 
              ? "md:w-20 -translate-x-full md:translate-x-0" 
              : "md:w-64 translate-x-0 fixed md:relative left-0 top-0"
          )}
        />

        {/* Main Chat Area */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          {/* Header */}
          <div className="flex-shrink-0 p-3 md:p-4 border-b border-border/30 bg-gradient-to-r from-background/80 via-background/95 to-muted/20 backdrop-blur-2xl shadow-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 md:gap-3">
                {/* Mobile Menu Button */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsSidebarCollapsed(false)}
                  className="md:hidden p-2 border-2 border-primary/20 bg-background/50 backdrop-blur-sm hover:bg-primary/10 hover:border-primary/40 transition-all duration-300"
                >
                  <MessageSquare className="h-5 w-5 text-primary" />
                </Button>

                <div className="hidden md:block p-2 rounded-lg bg-gradient-to-br from-primary/10 to-primary/20 border border-primary/30 shadow backdrop-blur-sm">
                  <MessageSquare className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <div className="flex items-center gap-2 md:gap-3 mb-1 md:mb-2">
                    <h1 className="text-lg md:text-2xl font-bold tracking-wide bg-gradient-to-r from-foreground via-primary/80 to-foreground/80 bg-clip-text text-transparent">
                      {assistantName}
                    </h1>
                    <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-50 border border-green-200">
                      <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></div>
                      <span className="text-xs font-medium text-green-700">Online</span>
                    </div>
                  </div>
                  <p className="text-muted-foreground text-xs md:text-sm font-medium leading-relaxed">
                    {chatSubtitle}
                  </p>
                </div>
              </div>
              
              {/* Debug toggle - only for super admins */}
              {/* Debug mode removed for production */}
            </div>
          </div>

          {/* Chat Area */}
          <div className="flex-1 min-h-0 overflow-hidden w-full">
            {activeConversationId ? (
                <SimpleChat 
                  conversationId={activeConversationId}
                  onConversationCreated={handleConversationCreate}
                />
            ) : (
              <div className="h-full flex items-center justify-center animate-fade-in">
                <div className="text-center max-w-md mx-auto p-8">
                  <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-primary/10 to-primary/20 border border-primary/20 flex items-center justify-center shadow-lg animate-scale-in">
                    <MessageSquare className="h-8 w-8 text-primary animate-pulse" />
                  </div>
                  <h3 className="text-xl font-bold mb-3 bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text text-transparent">
                    Select a Conversation
                  </h3>
                  <p className="text-muted-foreground mb-6 text-sm leading-relaxed">
                    Choose an existing conversation or create a new one to start chatting with AI.
                  </p>
                  <div className="space-y-4">
                    <Button 
                      onClick={handleCreateNewConversation}
                      disabled={createConversation.isPending}
                      className="w-full h-10 text-sm font-semibold bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 active:scale-95"
                    >
                      {createConversation.isPending ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Creating...
                        </>
                      ) : (
                        <>
                          <Plus className="h-4 w-4 mr-2" />
                          Start New Conversation
                        </>
                      )}
                    </Button>
                    <Button 
                      variant="outline"
                      onClick={() => setIsSidebarCollapsed(false)}
                      className="w-full h-9 border-2 hover:border-primary/50 transition-all duration-300"
                    >
                      <MessageSquare className="h-4 w-4 mr-2" />
                      Browse Conversations
                    </Button>
                  </div>
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