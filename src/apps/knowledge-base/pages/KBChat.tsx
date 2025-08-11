import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MessageCircle, Plus, Send } from 'lucide-react';

export default function KBChat() {
  React.useEffect(() => {
    document.title = 'Knowledge Base - AI Chat';
  }, []);

  return (
    <div className="flex h-full gap-4" aria-label="Knowledge Base AI Chat">
      {/* Conversation Sidebar */}
      <div className="w-80 flex flex-col gap-4">
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Conversations</CardTitle>
              <Button size="sm" className="gap-1">
                <Plus className="h-4 w-4" />
                New Chat
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="p-3 rounded-lg border bg-muted/50 hover:bg-muted/80 cursor-pointer">
                <p className="text-sm font-medium">New conversation</p>
                <p className="text-xs text-muted-foreground">Start chatting with your documents</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Chat Area */}
      <Card className="flex-1 flex flex-col">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5" />
            AI Chat
          </CardTitle>
        </CardHeader>
        <CardContent className="flex-1 flex flex-col">
          {/* Messages Area */}
          <div className="flex-1 space-y-4 min-h-0 overflow-y-auto">
            <div className="text-center py-8">
              <MessageCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">Start a conversation</h3>
              <p className="text-sm text-muted-foreground">
                Ask questions about your documents and get AI-powered answers with source citations.
              </p>
            </div>
          </div>

          {/* Input Area */}
          <div className="mt-4 pt-4 border-t">
            <div className="flex gap-2">
              <div className="flex-1 min-h-[40px] p-3 border rounded-lg bg-background">
                <p className="text-sm text-muted-foreground">Type your message here...</p>
              </div>
              <Button size="default" className="gap-2">
                <Send className="h-4 w-4" />
                Send
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}