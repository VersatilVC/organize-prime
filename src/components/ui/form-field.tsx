import { forwardRef } from 'react';
import { cn } from '@/lib/utils';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

interface BaseFormFieldProps {
  label: string;
  error?: string;
  helperText?: string;
  required?: boolean;
  className?: string;
  id?: string;
}

interface InputFormFieldProps extends BaseFormFieldProps, Omit<React.InputHTMLAttributes<HTMLInputElement>, keyof BaseFormFieldProps> {
  variant?: 'input';
}

interface TextareaFormFieldProps extends BaseFormFieldProps, Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, keyof BaseFormFieldProps> {
  variant: 'textarea';
}

interface SelectFormFieldProps extends BaseFormFieldProps {
  variant: 'select';
  children: React.ReactNode;
  value?: string;
  onChange?: (value: string) => void;
}

type FormFieldProps = InputFormFieldProps | TextareaFormFieldProps | SelectFormFieldProps;

export const FormField = forwardRef<
  HTMLInputElement | HTMLTextAreaElement,
  FormFieldProps
>(({ 
  label, 
  error, 
  helperText, 
  required, 
  variant = 'input', 
  className, 
  id, 
  ...props 
}, ref) => {
  const fieldId = id || `field-${label.toLowerCase().replace(/\s+/g, '-')}`;
  const errorId = `${fieldId}-error`;
  const helperId = `${fieldId}-helper`;

  const ariaInvalid = error ? 'true' as const : 'false' as const;
  const ariaDescribedBy = [
    error && errorId,
    helperText && helperId
  ].filter(Boolean).join(' ') || undefined;

  const commonProps = {
    id: fieldId,
    className: cn(
      error && "border-destructive focus:border-destructive focus:ring-destructive",
      className
    ),
    'aria-invalid': ariaInvalid,
    'aria-describedby': ariaDescribedBy,
  };

  const renderInput = () => {
    switch (variant) {
      case 'textarea':
        const textareaProps = props as TextareaFormFieldProps;
        return (
          <Textarea 
            {...commonProps}
            {...textareaProps}
            ref={ref as React.ForwardedRef<HTMLTextAreaElement>}
          />
        );
      case 'select':
        const selectProps = props as SelectFormFieldProps;
        return (
          <select
            {...commonProps}
            value={selectProps.value}
            onChange={(e) => selectProps.onChange?.(e.target.value)}
            className={cn(
              "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
              commonProps.className
            )}
          >
            {selectProps.children}
          </select>
        );
      default:
        const inputProps = props as InputFormFieldProps;
        return (
          <Input 
            {...commonProps}
            {...inputProps}
            ref={ref as React.ForwardedRef<HTMLInputElement>}
          />
        );
    }
  };

  return (
    <div className="space-y-2">
      <Label 
        htmlFor={fieldId} 
        className={cn(
          "text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70",
          required && "after:content-['*'] after:ml-0.5 after:text-destructive"
        )}
      >
        {label}
      </Label>
      
      {renderInput()}
      
      {error && (
        <p 
          id={errorId} 
          className="text-sm text-destructive flex items-center gap-1" 
          role="alert"
          aria-live="polite"
        >
          <span className="inline-block w-1 h-1 rounded-full bg-destructive flex-shrink-0 mt-2" />
          {error}
        </p>
      )}
      
      {helperText && !error && (
        <p 
          id={helperId} 
          className="text-sm text-muted-foreground"
        >
          {helperText}
        </p>
      )}
    </div>
  );
});

FormField.displayName = 'FormField';

// Form section wrapper for better organization
export const FormSection = ({ 
  title, 
  description, 
  children, 
  className 
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}) => (
  <div className={cn("space-y-4", className)}>
    <div className="space-y-1">
      <h3 className="text-lg font-medium">{title}</h3>
      {description && (
        <p className="text-sm text-muted-foreground">{description}</p>
      )}
    </div>
    <div className="space-y-4">
      {children}
    </div>
  </div>
);

// Form actions wrapper
export const FormActions = ({ 
  children, 
  align = 'end',
  className 
}: {
  children: React.ReactNode;
  align?: 'start' | 'center' | 'end';
  className?: string;
}) => (
  <div className={cn(
    "flex gap-3 pt-6 border-t",
    {
      'justify-start': align === 'start',
      'justify-center': align === 'center',
      'justify-end': align === 'end',
    },
    className
  )}>
    {children}
  </div>
);