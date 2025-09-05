import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Icons } from '@/components/ui/icons';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';

export interface QuickAction {
  label: string;
  href: string;
  icon: keyof typeof Icons;
  badge?: number;
  priority: number;
  description?: string;
}

interface QuickActionsProps {
  actions: QuickAction[];
  className?: string;
}

const QuickActionButton = React.memo<{
  action: QuickAction;
  className?: string;
}>(({ action, className }) => {
  const IconComponent = Icons[action.icon] || Icons.home;
  
  return (
    <Button 
      asChild 
      variant="outline" 
      className={cn(
        "h-auto flex-col py-4 relative group hover:bg-accent/50 transition-colors",
        className
      )}
    >
      <Link to={action.href} className="gap-3">
        <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
          <IconComponent className="h-5 w-5 text-primary" />
        </div>
        <div className="flex flex-col items-center gap-1">
          <span className="text-sm font-medium">{action.label}</span>
          {action.description && (
            <span className="text-xs text-muted-foreground text-center">
              {action.description}
            </span>
          )}
        </div>
        {action.badge && action.badge > 0 && (
          <Badge 
            variant="destructive" 
            className="absolute -top-1 -right-1 h-5 w-5 p-0 text-xs flex items-center justify-center"
          >
            {action.badge > 99 ? '99+' : action.badge}
          </Badge>
        )}
      </Link>
    </Button>
  );
}, (prevProps, nextProps) => {
  return (
    prevProps.action.label === nextProps.action.label &&
    prevProps.action.href === nextProps.action.href &&
    prevProps.action.badge === nextProps.action.badge
  );
});

QuickActionButton.displayName = 'QuickActionButton';

export const QuickActions = React.memo<QuickActionsProps>(({ 
  actions, 
  className 
}) => {
  const priorityActions = actions.filter(a => a.priority <= 2);
  const standardActions = actions.filter(a => a.priority > 2);
  
  if (actions.length === 0) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Icons.zap className="h-5 w-5" />
            Quick Actions
          </CardTitle>
          <CardDescription>
            Common tasks and shortcuts
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8 text-muted-foreground">
            <div className="text-center">
              <Icons.coffee className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">All caught up! No urgent actions needed.</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Icons.zap className="h-5 w-5" />
          Quick Actions
          {priorityActions.length > 0 && (
            <Badge variant="destructive" className="ml-2">
              {priorityActions.length} urgent
            </Badge>
          )}
        </CardTitle>
        <CardDescription>
          {priorityActions.length > 0 
            ? "Items requiring your attention" 
            : "Common tasks and shortcuts"
          }
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Priority Actions (with badges) */}
          {priorityActions.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Icons.alertCircle className="h-4 w-4 text-destructive" />
                <span className="text-sm font-medium text-destructive">Needs Attention</span>
              </div>
              <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                {priorityActions.map((action, index) => (
                  <QuickActionButton 
                    key={`${action.href}-${index}`}
                    action={action}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Standard Actions */}
          {standardActions.length > 0 && (
            <div>
              {priorityActions.length > 0 && (
                <>
                  <div className="border-t my-4" />
                  <div className="flex items-center gap-2 mb-3">
                    <Icons.grid3x3 className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">Quick Access</span>
                  </div>
                </>
              )}
              <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
                {standardActions.map((action, index) => (
                  <QuickActionButton 
                    key={`${action.href}-${index}`}
                    action={action}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}, (prevProps, nextProps) => {
  // Only re-render if actions change
  return (
    prevProps.actions.length === nextProps.actions.length &&
    prevProps.actions.every((action, index) => {
      const nextAction = nextProps.actions[index];
      return (
        action.label === nextAction.label &&
        action.href === nextAction.href &&
        action.badge === nextAction.badge &&
        action.priority === nextAction.priority
      );
    })
  );
});

QuickActions.displayName = 'QuickActions';