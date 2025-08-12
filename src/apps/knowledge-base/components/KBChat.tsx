import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MessageSquare, Bot, User, Send } from 'lucide-react';
import { Input } from '@/components/ui/input';

export function KBChat() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">AI Chat</h1>
        <p className="text-muted-foreground">
          Chat with your knowledge bases using AI to get instant answers and insights.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-4">
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Knowledge Bases</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-sm text-muted-foreground">
                No knowledge bases available. Create one first to start chatting.
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-3">
          <Card className="h-[600px] flex flex-col">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bot className="h-5 w-5" />
                AI Assistant
              </CardTitle>
              <CardDescription>
                Ask questions about your knowledge base content
              </CardDescription>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col">
              <div className="flex-1 space-y-4 mb-4 overflow-y-auto">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                    <Bot className="h-4 w-4 text-primary" />
                  </div>
                  <div className="flex-1">
                    <div className="bg-muted rounded-lg p-3">
                      <p className="text-sm">
                        Hello! I'm your AI assistant. I can help you find information from your knowledge bases. 
                        To get started, please create a knowledge base and upload some documents.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="flex gap-2">
                <Input 
                  placeholder="Ask a question about your knowledge base..." 
                  disabled
                  className="flex-1"
                />
                <Button disabled size="icon">
                  <Send className="h-4 w-4" />
                </Button>
              </div>
              
              <p className="text-xs text-muted-foreground mt-2">
                Create a knowledge base first to enable AI chat functionality.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}