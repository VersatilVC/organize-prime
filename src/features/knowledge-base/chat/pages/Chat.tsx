import React from 'react';
import { ChatLayout } from '../components/ChatLayout';
import { useOrganization } from '@/contexts/OrganizationContext';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';

export default function Chat() {
  const { currentOrganization } = useOrganization();

  if (!currentOrganization) {
    return (
      <div className="container mx-auto py-6">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Please select an organization to access the chat feature.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container mx-auto h-full">
      <ChatLayout className="h-[calc(100vh-140px)]" />
    </div>
  );
}