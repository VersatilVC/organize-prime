// Composable empty state component for consistent empty UIs
import React, { memo } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { LucideIcon } from 'lucide-react';

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
    variant?: 'default' | 'outline' | 'secondary';
  };
  children?: React.ReactNode;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export const EmptyState = memo(({
  icon: Icon,
  title,
  description,
  action,
  children,
  className,
  size = 'md'
}: EmptyStateProps) => {
  const sizeClasses = {
    sm: 'py-8',
    md: 'py-12',
    lg: 'py-16'
  };

  const iconSizes = {
    sm: 'h-8 w-8',
    md: 'h-12 w-12',
    lg: 'h-16 w-16'
  };

  return (
    <div className={cn(
      "flex flex-col items-center justify-center text-center",
      sizeClasses[size],
      className
    )}>
      {Icon && (
        <Icon className={cn(
          "text-muted-foreground mb-4",
          iconSizes[size]
        )} />
      )}
      
      <div className="space-y-2 max-w-md">
        <h3 className={cn(
          "font-semibold",
          size === 'sm' ? 'text-sm' : size === 'md' ? 'text-base' : 'text-lg'
        )}>
          {title}
        </h3>
        
        {description && (
          <p className={cn(
            "text-muted-foreground",
            size === 'sm' ? 'text-xs' : 'text-sm'
          )}>
            {description}
          </p>
        )}
      </div>

      {action && (
        <Button
          onClick={action.onClick}
          variant={action.variant || 'default'}
          size={size === 'sm' ? 'sm' : 'default'}
          className="mt-4"
        >
          {action.label}
        </Button>
      )}

      {children && (
        <div className="mt-4">
          {children}
        </div>
      )}
    </div>
  );
});

EmptyState.displayName = 'EmptyState';