import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Settings } from 'lucide-react';

export default function CompanySettings() {
  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center space-x-2">
        <Settings className="h-6 w-6" />
        <h1 className="text-3xl font-bold">Company Settings</h1>
        <Badge variant="secondary">Coming Soon</Badge>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Company Configuration</CardTitle>
          <CardDescription>
            Manage your organization's settings, preferences, and configurations
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-center py-12">
            <Settings className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Coming Soon</h3>
            <p className="text-muted-foreground max-w-md mx-auto">
              This feature is currently in development. You'll soon be able to configure company-wide settings, 
              manage organizational preferences, and customize your workspace.
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 gap-4 mt-8">
            <div className="p-4 border rounded-lg">
              <h4 className="font-medium mb-2">General Settings</h4>
              <p className="text-sm text-muted-foreground">
                Company name, logo, timezone, and basic information
              </p>
            </div>
            <div className="p-4 border rounded-lg">
              <h4 className="font-medium mb-2">Security Policies</h4>
              <p className="text-sm text-muted-foreground">
                Password policies, session timeouts, and security configurations
              </p>
            </div>
            <div className="p-4 border rounded-lg">
              <h4 className="font-medium mb-2">Integrations</h4>
              <p className="text-sm text-muted-foreground">
                Connect third-party services and manage API integrations
              </p>
            </div>
            <div className="p-4 border rounded-lg">
              <h4 className="font-medium mb-2">Notifications</h4>
              <p className="text-sm text-muted-foreground">
                Configure email notifications and communication preferences
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}