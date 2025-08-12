import React from 'react';
import { FileText, Settings, BarChart3, Users, Files, MessageSquare } from 'lucide-react';
import { EmptyState } from '@/components/composition/EmptyState';

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
    <div className="container mx-auto py-8">
      <EmptyState
        icon={IconComponent}
        title={`${title} - Coming Soon`}
        description={description || defaultDescription}
        action={{
          label: "Send Feedback",
          onClick: () => window.location.href = '/feedback'
        }}
      />
    </div>
  );
}