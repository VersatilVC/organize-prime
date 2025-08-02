import React from 'react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

interface ToggleSettingsFieldProps {
  id: string;
  label: string;
  value: boolean;
  onChange: (value: boolean) => void;
  disabled?: boolean;
  error?: string;
  description?: string;
  className?: string;
  layout?: 'horizontal' | 'vertical';
}

export function ToggleSettingsField({
  id,
  label,
  value,
  onChange,
  disabled = false,
  error,
  description,
  className,
  layout = 'horizontal'
}: ToggleSettingsFieldProps) {
  if (layout === 'vertical') {
    return (
      <div className={`space-y-3 ${className || ''}`}>
        <div className="space-y-1">
          <Label htmlFor={id}>{label}</Label>
          {description && (
            <p className="text-sm text-muted-foreground">{description}</p>
          )}
        </div>
        <Switch
          id={id}
          checked={value}
          onCheckedChange={onChange}
          disabled={disabled}
        />
        {error && (
          <p className="text-sm text-destructive">{error}</p>
        )}
      </div>
    );
  }

  return (
    <div className={`flex items-center justify-between ${className || ''}`}>
      <div className="space-y-0.5">
        <Label htmlFor={id}>{label}</Label>
        {description && (
          <p className="text-sm text-muted-foreground">{description}</p>
        )}
        {error && (
          <p className="text-sm text-destructive">{error}</p>
        )}
      </div>
      <Switch
        id={id}
        checked={value}
        onCheckedChange={onChange}
        disabled={disabled}
      />
    </div>
  );
}