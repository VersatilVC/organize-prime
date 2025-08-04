import React from 'react';
import { SettingsFieldProps } from '@/types/feature-settings';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FileUpload } from '@/components/ui/file-upload';
import { FormField, FormItem, FormLabel, FormControl, FormDescription, FormMessage } from '@/components/ui/form';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';

export const SettingsFieldRenderer: React.FC<SettingsFieldProps> = ({
  setting,
  value,
  onChange,
  error,
  dependencies,
  name
}) => {
  // Show/hide based on dependencies
  if (setting.dependsOn && dependencies) {
    const dependencyValue = dependencies[setting.dependsOn];
    
    // For custom brand voice, only show if brand_voice is 'custom'
    if (setting.dependsOn === 'brand_voice' && dependencyValue !== 'custom') {
      return null;
    }
    
    // For funding alerts dependency, only show if funding_alerts is true
    if (setting.dependsOn === 'funding_alerts' && !dependencyValue) {
      return null;
    }
    
    // For AI provider dependency, only show if ai_provider is set
    if (setting.dependsOn === 'ai_provider' && !dependencyValue) {
      return null;
    }
    
    // General case: if dependency is falsy, don't show
    if (!dependencyValue) {
      return null;
    }
  }

  const currentValue = value ?? setting.default;

  switch (setting.type) {
    case 'text':
      return (
        <FormItem className="space-y-2">
          <FormLabel className="text-sm font-medium">
            {setting.label}
            {setting.required && <span className="text-destructive ml-1">*</span>}
          </FormLabel>
          <FormControl>
            <Input
              name={name}
              value={currentValue || ''}
              onChange={(e) => onChange(e.target.value)}
              placeholder={setting.placeholder}
              type={setting.sensitive ? 'password' : 'text'}
              className={cn(error && "border-destructive")}
            />
          </FormControl>
          {setting.description && (
            <FormDescription className="text-xs text-muted-foreground">
              {setting.description}
            </FormDescription>
          )}
          {error && (
            <FormMessage className="text-xs text-destructive">
              {error}
            </FormMessage>
          )}
        </FormItem>
      );
    
    case 'number':
      return (
        <FormItem className="space-y-2">
          <FormLabel className="text-sm font-medium">
            {setting.label}
            {setting.required && <span className="text-destructive ml-1">*</span>}
          </FormLabel>
          <FormControl>
            <Input
              name={name}
              type="number"
              value={currentValue ?? ''}
              onChange={(e) => onChange(e.target.value ? Number(e.target.value) : undefined)}
              placeholder={setting.placeholder}
              min={setting.validation?.min}
              max={setting.validation?.max}
              step={setting.validation?.min !== undefined && setting.validation.min < 1 ? 0.1 : 1}
              className={cn(error && "border-destructive")}
            />
          </FormControl>
          {setting.description && (
            <FormDescription className="text-xs text-muted-foreground">
              {setting.description}
            </FormDescription>
          )}
          {error && (
            <FormMessage className="text-xs text-destructive">
              {error}
            </FormMessage>
          )}
        </FormItem>
      );
    
    case 'textarea':
      return (
        <FormItem className="space-y-2">
          <FormLabel className="text-sm font-medium">
            {setting.label}
            {setting.required && <span className="text-destructive ml-1">*</span>}
          </FormLabel>
          <FormControl>
            <Textarea
              name={name}
              value={currentValue || ''}
              onChange={(e) => onChange(e.target.value)}
              placeholder={setting.placeholder}
              rows={4}
              className={cn(error && "border-destructive")}
            />
          </FormControl>
          {setting.description && (
            <FormDescription className="text-xs text-muted-foreground">
              {setting.description}
            </FormDescription>
          )}
          {error && (
            <FormMessage className="text-xs text-destructive">
              {error}
            </FormMessage>
          )}
        </FormItem>
      );
    
    case 'select':
      return (
        <FormItem className="space-y-2">
          <FormLabel className="text-sm font-medium">
            {setting.label}
            {setting.required && <span className="text-destructive ml-1">*</span>}
          </FormLabel>
          <FormControl>
            <Select value={currentValue || ''} onValueChange={onChange}>
              <SelectTrigger className={cn(error && "border-destructive")}>
                <SelectValue placeholder={`Select ${setting.label}`} />
              </SelectTrigger>
              <SelectContent>
                {setting.options?.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormControl>
          {setting.description && (
            <FormDescription className="text-xs text-muted-foreground">
              {setting.description}
            </FormDescription>
          )}
          {error && (
            <FormMessage className="text-xs text-destructive">
              {error}
            </FormMessage>
          )}
        </FormItem>
      );
    
    case 'multiselect':
      return (
        <FormItem className="space-y-2">
          <FormLabel className="text-sm font-medium">
            {setting.label}
            {setting.required && <span className="text-destructive ml-1">*</span>}
          </FormLabel>
          <FormControl>
            <div className="space-y-2">
              {setting.options?.map((option) => (
                <div key={option.value} className="flex items-center space-x-2">
                  <Checkbox
                    id={`${name}-${option.value}`}
                    checked={(currentValue || []).includes(option.value)}
                    onCheckedChange={(checked) => {
                      const currentArray = currentValue || [];
                      if (checked) {
                        onChange([...currentArray, option.value]);
                      } else {
                        onChange(currentArray.filter((v: any) => v !== option.value));
                      }
                    }}
                  />
                  <Label 
                    htmlFor={`${name}-${option.value}`}
                    className="text-sm font-normal cursor-pointer"
                  >
                    {option.label}
                  </Label>
                </div>
              ))}
            </div>
          </FormControl>
          {setting.description && (
            <FormDescription className="text-xs text-muted-foreground">
              {setting.description}
            </FormDescription>
          )}
          {error && (
            <FormMessage className="text-xs text-destructive">
              {error}
            </FormMessage>
          )}
        </FormItem>
      );
    
    case 'boolean':
      return (
        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
          <div className="space-y-0.5">
            <FormLabel className="text-sm font-medium">
              {setting.label}
            </FormLabel>
            {setting.description && (
              <FormDescription className="text-xs text-muted-foreground">
                {setting.description}
              </FormDescription>
            )}
          </div>
          <FormControl>
            <Switch
              checked={currentValue ?? false}
              onCheckedChange={onChange}
            />
          </FormControl>
          {error && (
            <FormMessage className="text-xs text-destructive">
              {error}
            </FormMessage>
          )}
        </FormItem>
      );
    
    case 'file':
      return (
        <FormItem className="space-y-2">
          <FormLabel className="text-sm font-medium">
            {setting.label}
            {setting.required && <span className="text-destructive ml-1">*</span>}
          </FormLabel>
          <FormControl>
            <FileUpload
              onFileUploaded={(path, name) => onChange({ path, name })}
              onFileRemoved={() => onChange(null)}
              maxSize={setting.validation?.maxFileSize ? setting.validation.maxFileSize / (1024 * 1024) : 10}
              acceptedTypes={setting.validation?.fileTypes}
            />
          </FormControl>
          {setting.description && (
            <FormDescription className="text-xs text-muted-foreground">
              {setting.description}
            </FormDescription>
          )}
          {error && (
            <FormMessage className="text-xs text-destructive">
              {error}
            </FormMessage>
          )}
        </FormItem>
      );
    
    default:
      return null;
  }
};