import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Webhook, Database, AlertCircle, ExternalLink } from 'lucide-react';

interface WebhookSetupRequiredProps {
  featureName: string;
}

export function WebhookSetupRequired({ featureName }: WebhookSetupRequiredProps) {
  const setupScript = `-- Run this setup script in your Supabase SQL Editor
-- Enhanced Webhook Management System for OrganizePrime

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create feature_webhooks table for webhook configurations
CREATE TABLE IF NOT EXISTS feature_webhooks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    url TEXT NOT NULL,
    description TEXT,
    feature_id UUID NOT NULL REFERENCES system_features(id) ON DELETE CASCADE,
    event_types JSONB DEFAULT '[]'::jsonb,
    is_active BOOLEAN DEFAULT true,
    secret_key TEXT,
    timeout_seconds INTEGER DEFAULT 30 CHECK (timeout_seconds >= 5 AND timeout_seconds <= 300),
    retry_attempts INTEGER DEFAULT 3 CHECK (retry_attempts >= 0 AND retry_attempts <= 10),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    success_count INTEGER DEFAULT 0,
    failure_count INTEGER DEFAULT 0,
    avg_response_time INTEGER DEFAULT 0,
    last_triggered TIMESTAMP WITH TIME ZONE,
    
    -- Constraints
    CONSTRAINT valid_url CHECK (url ~* '^https?://'),
    CONSTRAINT valid_name CHECK (length(trim(name)) > 0)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_feature_webhooks_feature_id ON feature_webhooks(feature_id);
CREATE INDEX IF NOT EXISTS idx_feature_webhooks_is_active ON feature_webhooks(is_active);

-- Enable Row Level Security
ALTER TABLE feature_webhooks ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Super admins can manage all webhooks" ON feature_webhooks
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.user_id = auth.uid() 
            AND profiles.is_super_admin = true
        )
    );
`;

  const copySetupScript = () => {
    navigator.clipboard.writeText(setupScript);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Webhook className="h-5 w-5" />
          Webhooks Configuration
        </CardTitle>
        <p className="text-sm text-muted-foreground mt-1">
          Configure N8N webhook endpoints for the <strong>{featureName}</strong> feature
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <strong>Database Setup Required</strong>
            <br />
            The webhook tables haven't been created yet. Please run the database setup to enable webhook functionality.
          </AlertDescription>
        </Alert>

        <div className="space-y-4">
          <div className="text-center py-8">
            <Database className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-medium mb-2">Webhook System Setup Required</h3>
            <p className="text-muted-foreground mb-6 max-w-md mx-auto">
              To use webhooks with OrganizePrime, you need to run a database setup 
              to create the necessary tables and permissions.
            </p>
          </div>

          <div className="space-y-4">
            <div className="bg-muted/50 p-4 rounded-lg space-y-3">
              <h4 className="font-medium text-sm">Setup Instructions:</h4>
              <ol className="text-sm space-y-2 list-decimal list-inside text-muted-foreground">
                <li>Copy the setup script below</li>
                <li>Open your Supabase project dashboard</li>
                <li>Go to the SQL Editor</li>
                <li>Paste and run the setup script</li>
                <li>Refresh this page to access webhook management</li>
              </ol>
            </div>

            <div className="flex gap-2">
              <Button onClick={copySetupScript} className="flex-1">
                <Database className="h-4 w-4 mr-2" />
                Copy Setup Script
              </Button>
              <Button 
                variant="outline" 
                onClick={() => window.open('https://supabase.com/dashboard', '_blank')}
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                Open Supabase
              </Button>
            </div>

            <details className="border rounded-lg">
              <summary className="p-3 cursor-pointer hover:bg-muted/50 font-medium text-sm">
                View Setup Script
              </summary>
              <div className="border-t p-3">
                <pre className="text-xs bg-muted/50 p-3 rounded overflow-x-auto">
                  <code>{setupScript}</code>
                </pre>
              </div>
            </details>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}