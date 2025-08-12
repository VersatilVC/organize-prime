import React from 'react';
import { FileText, Settings, BarChart3, Users, Files, MessageSquare, Construction, ArrowLeft } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Link } from 'react-router-dom';

interface KBPlaceholderPageProps {
  component: string;
  title: string;
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
  Custom: FileText,
} as const;

const COMPONENT_DESCRIPTIONS = {
  Dashboard: 'Monitor your knowledge base performance and usage statistics.',
  Settings: 'Configure your knowledge base settings and preferences.',
  Analytics: 'View detailed analytics and insights about your knowledge base.',
  Users: 'Manage user access and permissions for your knowledge base.',
  Files: 'Organize and manage your knowledge base documents and files.',
  Chat: 'Interactive AI chat interface for your knowledge base.',
  Search: 'Advanced search capabilities for your knowledge base content.',
  Custom: 'Custom functionality for your knowledge base.',
} as const;

export function KBPlaceholderPage({ component, title, description }: KBPlaceholderPageProps) {
  const IconComponent = COMPONENT_ICONS[component as keyof typeof COMPONENT_ICONS] || FileText;
  const defaultDescription = COMPONENT_DESCRIPTIONS[component as keyof typeof COMPONENT_DESCRIPTIONS] || 'This feature is coming soon.';

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link to="/features/knowledge-base/dashboard" className="hover:text-foreground">
          Knowledge Base
        </Link>
        <span>/</span>
        <span className="text-foreground">{title}</span>
      </div>

      <Card className="max-w-2xl mx-auto">
        <CardHeader className="text-center pb-4">
          <div className="flex justify-center mb-4">
            <div className="p-4 rounded-full bg-muted">
              <IconComponent className="h-8 w-8 text-muted-foreground" />
            </div>
          </div>
          <CardTitle className="text-2xl flex items-center justify-center gap-2">
            {title}
            <Badge variant="secondary" className="text-xs">
              <Construction className="h-3 w-3 mr-1" />
              Coming Soon
            </Badge>
          </CardTitle>
          <CardDescription className="text-base mt-2">
            {description || defaultDescription}
          </CardDescription>
        </CardHeader>
        
        <CardContent className="text-center space-y-4">
          <div className="p-6 bg-muted/50 rounded-lg">
            <p className="text-sm text-muted-foreground">
              This feature is currently under development. We're working hard to bring you the best possible experience.
            </p>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button variant="outline" asChild className="flex items-center gap-2">
              <Link to="/features/knowledge-base/dashboard">
                <ArrowLeft className="h-4 w-4" />
                Back to Dashboard
              </Link>
            </Button>
            <Button asChild className="flex items-center gap-2">
              <Link to="/feedback">
                Send Feedback
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}