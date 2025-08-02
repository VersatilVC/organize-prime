import React from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';

interface TextareaSettingsFieldProps {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  error?: string;
  maxLength?: number;
  minHeight?: string;
  showCharCount?: boolean;
  description?: string;
  className?: string;
}

export function TextareaSettingsField({
  id,
  label,
  value,
  onChange,
  placeholder,
  required = false,
  disabled = false,
  error,
  maxLength,
  minHeight = '100px',
  showCharCount = false,
  description,
  className
}: TextareaSettingsFieldProps) {
  return (
    <div className={`space-y-2 ${className || ''}`}>
      <Label htmlFor={id}>
        {label}
        {required && <span className="text-destructive ml-1">*</span>}
      </Label>
      <Textarea
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        disabled={disabled}
        maxLength={maxLength}
        className={`min-h-[${minHeight}]`}
      />
      
      <div className="flex justify-between items-center text-sm">
        {error ? (
          <span className="text-destructive">{error}</span>
        ) : description ? (
          <span className="text-muted-foreground">{description}</span>
        ) : (
          <span></span>
        )}
        
        {showCharCount && maxLength && (
          <span className="text-muted-foreground">
            {value?.length || 0}/{maxLength} characters
          </span>
        )}
      </div>
    </div>
  );
}