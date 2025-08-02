import React from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from '@/components/ui/breadcrumb';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';

interface SettingsLayoutProps {
  title: string;
  breadcrumbItems?: { label: string; href?: string }[];
  isLoading?: boolean;
  children: React.ReactNode;
  actions?: React.ReactNode;
  maxWidth?: 'md' | 'lg' | 'xl' | '2xl' | '4xl' | '6xl';
}

export function SettingsLayout({
  title,
  breadcrumbItems = [],
  isLoading = false,
  children,
  actions,
  maxWidth = '4xl'
}: SettingsLayoutProps) {
  const maxWidthClass = {
    'md': 'max-w-md',
    'lg': 'max-w-lg', 
    'xl': 'max-w-xl',
    '2xl': 'max-w-2xl',
    '4xl': 'max-w-4xl',
    '6xl': 'max-w-6xl'
  }[maxWidth];

  if (isLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className={`container mx-auto px-6 py-6 ${maxWidthClass}`}>
        {/* Header */}
        <div className="mb-6">
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink href="/">Dashboard</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              {breadcrumbItems.map((item, index) => (
                <React.Fragment key={index}>
                  <BreadcrumbItem>
                    {item.href ? (
                      <BreadcrumbLink href={item.href}>{item.label}</BreadcrumbLink>
                    ) : (
                      <BreadcrumbPage>{item.label}</BreadcrumbPage>
                    )}
                  </BreadcrumbItem>
                  {index < breadcrumbItems.length - 1 && <BreadcrumbSeparator />}
                </React.Fragment>
              ))}
              {breadcrumbItems.length === 0 && (
                <BreadcrumbItem>
                  <BreadcrumbPage>{title}</BreadcrumbPage>
                </BreadcrumbItem>
              )}
            </BreadcrumbList>
          </Breadcrumb>
          
          <div className="flex items-center justify-between mt-4">
            <h1 className="text-3xl font-bold">{title}</h1>
            {actions && <div className="flex items-center space-x-4">{actions}</div>}
          </div>
        </div>

        {children}
      </div>
    </AppLayout>
  );
}

interface SettingsActionsProps {
  onCancel?: () => void;
  onSubmit?: (e?: React.FormEvent) => void;
  onReset?: () => void;
  isDirty?: boolean;
  isLoading?: boolean;
  hasErrors?: boolean;
  cancelText?: string;
  submitText?: string;
  resetText?: string;
  showReset?: boolean;
}

export function SettingsActions({
  onCancel,
  onSubmit,
  onReset,
  isDirty = false,
  isLoading = false,
  hasErrors = false,
  cancelText = 'Cancel',
  submitText = 'Save Changes',
  resetText = 'Reset to Defaults',
  showReset = false
}: SettingsActionsProps) {
  return (
    <div className="flex items-center justify-between pt-4">
      <div>
        {showReset && onReset && (
          <Button
            type="button"
            variant="ghost"
            onClick={onReset}
            disabled={isLoading}
          >
            {resetText}
          </Button>
        )}
      </div>
      
      <div className="flex items-center space-x-4">
        {onCancel && (
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={isLoading}
          >
            {cancelText}
          </Button>
        )}
        
        {onSubmit && (
          <Button
            type="submit"
            onClick={onSubmit}
            disabled={!isDirty || isLoading || hasErrors}
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Saving...
              </>
            ) : (
              submitText
            )}
          </Button>
        )}
      </div>
    </div>
  );
}