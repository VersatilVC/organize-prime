import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Mail } from 'lucide-react';

export default function FeedbackManagement() {
  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center space-x-2">
        <Mail className="h-6 w-6" />
        <h1 className="text-3xl font-bold">Feedback Management</h1>
        <Badge variant="secondary">Coming Soon</Badge>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>System-wide Feedback Management</CardTitle>
          <CardDescription>
            Manage feedback from all organizations and track system-wide improvements
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-center py-12">
            <Mail className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Coming Soon</h3>
            <p className="text-muted-foreground max-w-md mx-auto">
              This feature is currently in development. You'll soon be able to view and manage 
              feedback from all organizations in a centralized dashboard.
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 gap-4 mt-8">
            <div className="p-4 border rounded-lg">
              <h4 className="font-medium mb-2">All Feedback</h4>
              <p className="text-sm text-muted-foreground">
                View feedback from all organizations across the platform
              </p>
            </div>
            <div className="p-4 border rounded-lg">
              <h4 className="font-medium mb-2">Response Management</h4>
              <p className="text-sm text-muted-foreground">
                Respond to feedback and track resolution status
              </p>
            </div>
            <div className="p-4 border rounded-lg">
              <h4 className="font-medium mb-2">Analytics</h4>
              <p className="text-sm text-muted-foreground">
                Analyze feedback trends and identify improvement areas
              </p>
            </div>
            <div className="p-4 border rounded-lg">
              <h4 className="font-medium mb-2">Priority Management</h4>
              <p className="text-sm text-muted-foreground">
                Categorize and prioritize feedback for development
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}