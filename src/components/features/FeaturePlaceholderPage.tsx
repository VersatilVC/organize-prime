import React from 'react';
import { FileText, Settings, BarChart3, Users, Files, MessageSquare, Package } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Link } from 'react-router-dom';

interface FeaturePlaceholderPageProps {
  featureSlug: string;
  featureName: string;
  currentPath: string;
  component?: string;
  title?: string;
  description?: string;
}

const COMPONENT_ICONS = {
  Dashboard: BarChart3,
  Settings: Settings,
  Analytics: BarChart3,
  Users: Users,
  Files: Files,
  Chat: MessageSquare,
  Search: FileText,
  Custom: Package,
} as const;

const COMPONENT_DESCRIPTIONS = {
  Dashboard: 'Monitor your feature performance and usage statistics.',
  Settings: 'Configure your feature settings and preferences.',
  Analytics: 'View detailed analytics and insights.',
  Users: 'Manage user access and permissions.',
  Files: 'Organize and manage documents and files.',
  Chat: 'Interactive chat interface.',
  Search: 'Advanced search capabilities.',
  Custom: 'Custom functionality.',
} as const;

export function FeaturePlaceholderPage({
  featureSlug,
  featureName,
  currentPath,
  component = 'Custom',
  title,
  description
}: FeaturePlaceholderPageProps) {
  const IconComponent = COMPONENT_ICONS[component as keyof typeof COMPONENT_ICONS] || Package;
  const defaultDescription = COMPONENT_DESCRIPTIONS[component as keyof typeof COMPONENT_DESCRIPTIONS] || 'This functionality is coming soon.';

  const pageTitle = title || `${component} - Coming Soon`;

  return (
    <div className="container mx-auto py-8">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <IconComponent className="h-5 w-5" />
            {pageTitle}
          </CardTitle>
          <CardDescription>
            {featureName} - {component} Page
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12">
            <div className="mx-auto mb-4 p-3 rounded-full bg-primary/10 w-fit">
              <IconComponent className="h-8 w-8 text-primary" />
            </div>
            <h3 className="text-lg font-medium mb-2">Under Development</h3>
            <p className="text-muted-foreground mb-4">
              {description || defaultDescription}
            </p>
            <div className="space-y-2 text-sm text-muted-foreground">
              <p>Current path: {currentPath}</p>
              <p>Feature: {featureSlug}</p>
              <p>Component: {component}</p>
            </div>
            <div className="flex gap-2 justify-center mt-6">
              <Button variant="outline" asChild>
                <Link to={`/features/${featureSlug}/dashboard`}>
                  Back to Dashboard
                </Link>
              </Button>
              <Button variant="ghost" onClick={() => window.history.back()}>
                Go Back
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}