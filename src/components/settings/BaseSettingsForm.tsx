import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { SettingsActions } from './SettingsLayout';

interface BaseSettingsFormProps {
  title?: string;
  description?: string;
  children: React.ReactNode;
  onSubmit?: (e: React.FormEvent) => void;
  onCancel?: () => void;
  onReset?: () => void;
  isDirty?: boolean;
  isLoading?: boolean;
  hasErrors?: boolean;
  showActions?: boolean;
  showReset?: boolean;
  className?: string;
}

export function BaseSettingsForm({
  title,
  description,
  children,
  onSubmit,
  onCancel,
  onReset,
  isDirty = false,
  isLoading = false,
  hasErrors = false,
  showActions = true,
  showReset = false,
  className
}: BaseSettingsFormProps) {
  return (
    <Card className={className}>
      {title && (
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          {description && (
            <p className="text-sm text-muted-foreground">{description}</p>
          )}
        </CardHeader>
      )}
      <CardContent>
        <form onSubmit={onSubmit} className="space-y-6">
          {children}
          
          {showActions && (
            <SettingsActions
              onCancel={onCancel}
              onSubmit={onSubmit ? (e) => onSubmit(e!) : undefined}
              onReset={onReset}
              isDirty={isDirty}
              isLoading={isLoading}
              hasErrors={hasErrors}
              showReset={showReset}
            />
          )}
        </form>
      </CardContent>
    </Card>
  );
}

interface SettingsSectionProps {
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}

export function SettingsSection({
  title,
  description,
  children,
  className
}: SettingsSectionProps) {
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description && (
          <p className="text-sm text-muted-foreground">{description}</p>
        )}
      </CardHeader>
      <CardContent className="space-y-6">
        {children}
      </CardContent>
    </Card>
  );
}