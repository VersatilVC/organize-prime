import React from 'react';
import { LucideIcon, BarChart3, Users, Building, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
  } | React.ReactNode;
  className?: string;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className
}: EmptyStateProps) {
  return (
    <Card className={cn('border-dashed', className)}>
      <CardContent className="flex flex-col items-center justify-center p-8 text-center">
        <Icon className="h-12 w-12 text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold text-foreground mb-2">{title}</h3>
        <p className="text-sm text-muted-foreground mb-6 max-w-sm">{description}</p>
        {action && (
          typeof action === 'object' && 'label' in action && 'onClick' in action ? (
            <Button onClick={action.onClick}>
              {action.label}
            </Button>
          ) : (
            action
          )
        )}
      </CardContent>
    </Card>
  );
}

// Predefined empty states for common scenarios
export function DashboardEmptyState() {
  return (
    <EmptyState
      icon={BarChart3}
      title="Welcome to your dashboard"
      description="Your dashboard will show activity and analytics once you start using the platform."
      action={{
        label: "Get Started",
        onClick: () => window.location.href = '/users'
      }}
    />
  );
}

export function UsersEmptyState() {
  return (
    <EmptyState
      icon={Users}
      title="No team members yet"
      description="Invite your first team member to get started with collaboration."
      action={{
        label: "Invite User",
        onClick: () => {
          // Will be implemented with invite dialog
          console.log('Invite user clicked');
        }
      }}
    />
  );
}

export function OrganizationsEmptyState() {
  return (
    <EmptyState
      icon={Building}
      title="No organizations found"
      description="Create your first organization to start managing teams and projects."
      action={{
        label: "Create Organization",
        onClick: () => {
          // Will be implemented with org creation
          console.log('Create organization clicked');
        }
      }}
    />
  );
}

export function FeedbackEmptyState() {
  return (
    <EmptyState
      icon={MessageSquare}
      title="No feedback yet"
      description="Share your thoughts and feedback to help us improve the platform."
      action={{
        label: "Send Feedback",
        onClick: () => window.location.href = '/feedback'
      }}
    />
  );
}