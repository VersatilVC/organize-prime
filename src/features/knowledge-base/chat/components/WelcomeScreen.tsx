import React from 'react';
import { MessageSquare, Brain, Sparkles, Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StickyInput } from './StickyInput';
import { cn } from '@/lib/utils';

interface WelcomeScreenProps {
  onNewChat: () => void;
  knowledgeBasesCount: number;
  onToggleSidebar: () => void;
  isSidebarOpen: boolean;
  isMobile: boolean;
  className?: string;
}

export function WelcomeScreen({ 
  onNewChat, 
  knowledgeBasesCount,
  onToggleSidebar,
  isSidebarOpen,
  isMobile,
  className
}: WelcomeScreenProps) {
  
  const handleSendMessage = (message: string) => {
    // Only create a new chat if there's actually a message
    if (!message || !message.trim()) {
      console.warn('🚫 Empty message, not creating chat');
      return;
    }
    
    // For welcome screen, we'll create a new chat with this message
    console.log('Starting new chat with message:', message.trim());
    onNewChat();
  };

  return (
    <div className={cn("flex flex-col h-full", className)}>
      {/* Header */}
      <div className="flex-shrink-0 border-b bg-background p-4">
        <div className="flex items-center gap-3">
          {(!isSidebarOpen || isMobile) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onToggleSidebar}
              className="flex-shrink-0"
            >
              <Menu className="h-4 w-4" />
            </Button>
          )}
          <h1 className="font-semibold text-lg">Knowledge Base Chat</h1>
        </div>
      </div>

      {/* Welcome Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="flex items-center justify-center p-8 min-h-full">
          <div className="max-w-2xl w-full text-center space-y-8">
            {/* Hero Section */}
            <div className="space-y-6">
              <div className="relative">
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center">
                    <Brain className="h-10 w-10 text-primary" />
                  </div>
                </div>
                <div className="relative w-24 h-24 mx-auto">
                  <Sparkles className="absolute top-0 right-0 h-5 w-5 text-yellow-500 animate-pulse" />
                  <Sparkles className="absolute bottom-2 left-1 h-4 w-4 text-blue-500 animate-pulse delay-1000" />
                  <Sparkles className="absolute top-4 left-0 h-3 w-3 text-purple-500 animate-pulse delay-500" />
                </div>
              </div>

              <div>
                <h2 className="text-3xl font-bold mb-4">Welcome to AI Chat</h2>
                <p className="text-lg text-muted-foreground leading-relaxed">
                  Start a conversation with your knowledge base. Ask questions, get insights, 
                  and explore your documents with AI assistance.
                </p>
              </div>
            </div>

            {/* Quick Start */}
            <div className="space-y-4">
              <Button 
                onClick={onNewChat} 
                size="lg" 
                className="w-full max-w-md mx-auto text-lg py-6"
              >
                <MessageSquare className="h-5 w-5 mr-3" />
                Start New Chat
              </Button>

              {knowledgeBasesCount > 0 && (
                <div className="text-sm text-muted-foreground">
                  Ready to search across{' '}
                  <span className="font-medium text-foreground">
                    {knowledgeBasesCount} knowledge base{knowledgeBasesCount > 1 ? 's' : ''}
                  </span>
                </div>
              )}
            </div>

            {/* Feature Highlights */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-12">
              <FeatureCard
                icon={<Brain className="h-6 w-6" />}
                title="AI-Powered Search"
                description="Get intelligent answers from your knowledge base with context-aware responses."
              />
              
              <FeatureCard
                icon={<MessageSquare className="h-6 w-6" />}
                title="Natural Conversation"
                description="Ask follow-up questions and maintain context throughout your conversation."
              />
              
              <FeatureCard
                icon={<Sparkles className="h-6 w-6" />}
                title="Source References"
                description="See exactly which documents and sections were used to answer your questions."
              />
            </div>

            {/* Quick Examples */}
            <div className="space-y-4 mt-12">
              <h3 className="text-lg font-semibold text-foreground">Try asking...</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <ExamplePrompt 
                  text="What are the key features of our product?"
                  onClick={() => handleSendMessage("What are the key features of our product?")}
                />
                <ExamplePrompt 
                  text="How do I configure the settings?"
                  onClick={() => handleSendMessage("How do I configure the settings?")}
                />
                <ExamplePrompt 
                  text="What's the latest update about?"
                  onClick={() => handleSendMessage("What's the latest update about?")}
                />
                <ExamplePrompt 
                  text="Show me troubleshooting steps"
                  onClick={() => handleSendMessage("Show me troubleshooting steps")}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Sticky Input */}
      <StickyInput
        conversationId=""
        onSendMessage={handleSendMessage}
        disabled={false}
        isProcessing={false}
        placeholder="Ask a question about your knowledge base..."
      />
    </div>
  );
}

interface FeatureCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
}

const FeatureCard = React.memo(({ icon, title, description }: FeatureCardProps) => (
  <Card className="text-left border-muted hover:border-primary/20 transition-colors">
    <CardHeader className="pb-3">
      <CardTitle className="text-sm flex items-center gap-2 text-foreground">
        {icon}
        {title}
      </CardTitle>
    </CardHeader>
    <CardContent className="pt-0">
      <p className="text-xs text-muted-foreground leading-relaxed">
        {description}
      </p>
    </CardContent>
  </Card>
));

FeatureCard.displayName = 'FeatureCard';

interface ExamplePromptProps {
  text: string;
  onClick: () => void;
}

const ExamplePrompt = React.memo(({ text, onClick }: ExamplePromptProps) => (
  <Button 
    variant="outline" 
    size="sm" 
    onClick={onClick}
    className="text-left justify-start h-auto py-3 px-4 whitespace-normal hover:bg-primary/5 hover:border-primary/20 transition-colors"
  >
    <MessageSquare className="h-4 w-4 mr-2 flex-shrink-0 opacity-60" />
    <span className="text-sm">{text}</span>
  </Button>
));

ExamplePrompt.displayName = 'ExamplePrompt';