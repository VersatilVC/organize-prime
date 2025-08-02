import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus } from 'lucide-react';

export default function Marketplace() {
  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center space-x-2">
        <Plus className="h-6 w-6" />
        <h1 className="text-3xl font-bold">Feature Marketplace</h1>
        <Badge variant="secondary">Coming Soon</Badge>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Extend Your Platform</CardTitle>
          <CardDescription>
            Discover and install new features to enhance your organization's capabilities
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-center py-12">
            <Plus className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Coming Soon</h3>
            <p className="text-muted-foreground max-w-md mx-auto">
              This feature is currently in development. You'll soon be able to browse and install 
              new features to extend your platform's functionality.
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 mt-8">
            <div className="p-4 border rounded-lg">
              <h4 className="font-medium mb-2">Analytics & Reporting</h4>
              <p className="text-sm text-muted-foreground">
                Advanced analytics dashboards and custom reports
              </p>
            </div>
            <div className="p-4 border rounded-lg">
              <h4 className="font-medium mb-2">Automation Tools</h4>
              <p className="text-sm text-muted-foreground">
                Workflow automation and business process tools
              </p>
            </div>
            <div className="p-4 border rounded-lg">
              <h4 className="font-medium mb-2">Integration Connectors</h4>
              <p className="text-sm text-muted-foreground">
                Connect with popular third-party services
              </p>
            </div>
            <div className="p-4 border rounded-lg">
              <h4 className="font-medium mb-2">Communication</h4>
              <p className="text-sm text-muted-foreground">
                Enhanced messaging and collaboration features
              </p>
            </div>
            <div className="p-4 border rounded-lg">
              <h4 className="font-medium mb-2">Project Management</h4>
              <p className="text-sm text-muted-foreground">
                Task tracking and project organization tools
              </p>
            </div>
            <div className="p-4 border rounded-lg">
              <h4 className="font-medium mb-2">Custom Modules</h4>
              <p className="text-sm text-muted-foreground">
                Build and deploy custom functionality
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}