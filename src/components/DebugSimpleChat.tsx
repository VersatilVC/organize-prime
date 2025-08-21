import React, { useState } from 'react';
import { Send, Bot, User, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { SimpleChatService } from '@/services/SimpleChatService';
import { useToast } from '@/hooks/use-toast';

export function DebugSimpleChat() {
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [conversation, setConversation] = useState<string | null>(null);
  const [debugLog, setDebugLog] = useState<string[]>([]);
  const { toast } = useToast();

  const addLog = (msg: string) => {
    console.log(msg);
    setDebugLog(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`]);
  };

  const handleCreateConversation = async () => {
    try {
      setIsLoading(true);
      addLog('Creating new conversation...');
      const conversationId = await SimpleChatService.createConversation('Debug Test Chat');
      setConversation(conversationId);
      addLog(`✅ Created conversation: ${conversationId}`);
    } catch (error) {
      addLog(`❌ Failed to create conversation: ${error.message}`);
      toast({
        title: 'Error',
        description: 'Failed to create conversation',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendMessage = async () => {
    if (!message.trim() || !conversation) return;

    try {
      setIsLoading(true);
      addLog(`Sending message: "${message}"`);
      await SimpleChatService.sendMessage(conversation, message);
      addLog(`✅ Message sent successfully`);
      setMessage('');
      
      // Get updated messages after a delay
      setTimeout(async () => {
        try {
          const messages = await SimpleChatService.getMessages(conversation);
          addLog(`📬 Fetched ${messages.length} messages`);
          messages.forEach((msg, i) => {
            addLog(`  ${i + 1}. [${msg.message_type}] ${msg.content.substring(0, 50)}... (${msg.processing_status})`);
          });
        } catch (error) {
          addLog(`❌ Failed to fetch messages: ${error.message}`);
        }
      }, 2000);
      
    } catch (error) {
      addLog(`❌ Failed to send message: ${error.message}`);
      toast({
        title: 'Error',
        description: 'Failed to send message',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Debug Simple Chat</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Button 
              onClick={handleCreateConversation}
              disabled={isLoading || !!conversation}
            >
              {conversation ? '✅ Conversation Created' : 'Create Conversation'}
            </Button>
            {conversation && (
              <span className="text-sm text-muted-foreground flex items-center">
                ID: {conversation.substring(0, 8)}...
              </span>
            )}
          </div>

          <div className="flex gap-2">
            <Input
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Type test message..."
              disabled={isLoading || !conversation}
              onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
            />
            <Button
              onClick={handleSendMessage}
              disabled={isLoading || !message.trim() || !conversation}
              size="icon"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>

          <Card className="bg-muted/50">
            <CardHeader>
              <CardTitle className="text-sm">Debug Log</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-xs font-mono space-y-1 max-h-40 overflow-y-auto">
                {debugLog.length === 0 ? (
                  <p className="text-muted-foreground">No debug logs yet...</p>
                ) : (
                  debugLog.map((log, i) => (
                    <div key={i} className="whitespace-pre-wrap">
                      {log}
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </CardContent>
      </Card>
    </div>
  );
}