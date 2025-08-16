import React from 'react';
import { Settings, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { ChatSettingsForm } from '../components/ChatSettingsForm';
import { useCanManageChatSettings } from '../hooks/useChatSettings';

export function ChatSettingsPage() {
  const navigate = useNavigate();
  const canManageSettings = useCanManageChatSettings();

  // Redirect if user doesn't have permission
  if (!canManageSettings) {
    return (
      <div className="container max-w-4xl mx-auto py-8">
        <div className="text-center py-12">
          <Settings className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
          <h2 className="text-xl font-semibold mb-2">Access Denied</h2>
          <p className="text-muted-foreground mb-6">
            You don't have permission to manage chat settings. 
            Please contact your organization administrator.
          </p>
          <Button onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Go Back
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container max-w-4xl mx-auto py-8">
      {/* Navigation */}
      <div className="mb-6">
        <Button 
          variant="ghost" 
          onClick={() => navigate(-1)}
          className="mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
      </div>

      {/* Settings Form */}
      <ChatSettingsForm />
    </div>
  );
}