// Composable form section component for consistent form layouts
import React, { memo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';

interface FormSectionProps {
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
  variant?: 'card' | 'inline';
  collapsible?: boolean;
  defaultOpen?: boolean;
}

export const FormSection = memo(({
  title,
  description,
  children,
  className,
  variant = 'inline',
  collapsible = false,
  defaultOpen = true
}: FormSectionProps) => {
  const [isOpen, setIsOpen] = React.useState(defaultOpen);

  if (variant === 'card') {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="text-lg">{title}</CardTitle>
          {description && (
            <CardDescription>{description}</CardDescription>
          )}
        </CardHeader>
        <CardContent className="space-y-6">
          {children}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={cn("space-y-6", className)}>
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium">{title}</h3>
          {collapsible && (
            <button
              type="button"
              onClick={() => setIsOpen(!isOpen)}
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              {isOpen ? 'Collapse' : 'Expand'}
            </button>
          )}
        </div>
        {description && (
          <p className="text-sm text-muted-foreground">{description}</p>
        )}
        <Separator />
      </div>
      
      {(!collapsible || isOpen) && (
        <div className="space-y-6">
          {children}
        </div>
      )}
    </div>
  );
});

FormSection.displayName = 'FormSection';