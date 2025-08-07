import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Save, AlertTriangle, CheckCircle, TestTube } from 'lucide-react';
import { useAppContext } from './AppLayout';
import { AppSettingsSchema, SettingsField, N8NWebhookConfig } from '../types/AppTypes';
import { AppConfigService } from '../services/AppConfigService';
import { useN8NIntegration } from '../hooks/useN8NIntegration';
import { N8NWebhookService } from '../services/N8NWebhookService';

export interface AppSettingsProps {
  schema: AppSettingsSchema;
  title?: string;
  description?: string;
  onSave?: (settings: Record<string, any>) => Promise<void>;
  showWebhookConfig?: boolean;
}

export function AppSettings({
  schema,
  title,
  description,
  onSave,
  showWebhookConfig = false,
}: AppSettingsProps) {
  const appContext = useAppContext();
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  const { testWebhook, isTesting } = useN8NIntegration({ appId: appContext.appId });

  const form = useForm({
    defaultValues: appContext.configuration.settings || {},
  });

  // Render individual field based on type
  const renderField = (field: SettingsField) => {
    const value = form.watch(field.key);
    const error = form.formState.errors[field.key];

    const commonProps = {
      id: field.key,
      ...form.register(field.key, {
        required: field.required ? `${field.label} is required` : false,
        pattern: field.validation?.pattern ? {
          value: new RegExp(field.validation.pattern),
          message: field.validation.message || `${field.label} format is invalid`
        } : undefined,
        min: field.validation?.min ? {
          value: field.validation.min,
          message: field.validation.message || `${field.label} must be at least ${field.validation.min}`
        } : undefined,
        max: field.validation?.max ? {
          value: field.validation.max,
          message: field.validation.message || `${field.label} must be no more than ${field.validation.max}`
        } : undefined,
      })
    };

    const fieldComponent = () => {
      switch (field.type) {
        case 'text':
        case 'email':
        case 'url':
          return (
            <Input
              {...commonProps}
              type={field.type}
              placeholder={field.placeholder}
              className={error ? 'border-destructive' : ''}
            />
          );

        case 'number':
          return (
            <Input
              {...commonProps}
              type="number"
              placeholder={field.placeholder}
              className={error ? 'border-destructive' : ''}
            />
          );

        case 'textarea':
          return (
            <Textarea
              {...commonProps}
              placeholder={field.placeholder}
              className={error ? 'border-destructive' : ''}
            />
          );

        case 'toggle':
          return (
            <Switch
              checked={value || field.default || false}
              onCheckedChange={(checked) => form.setValue(field.key, checked)}
            />
          );

        case 'select':
          return (
            <Select
              value={value || field.default || ''}
              onValueChange={(selectedValue) => form.setValue(field.key, selectedValue)}
            >
              <SelectTrigger className={error ? 'border-destructive' : ''}>
                <SelectValue placeholder={field.placeholder || `Select ${field.label.toLowerCase()}`} />
              </SelectTrigger>
              <SelectContent>
                {field.options?.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          );

        case 'file':
          return (
            <Input
              {...commonProps}
              type="file"
              className={error ? 'border-destructive' : ''}
            />
          );

        default:
          return (
            <Input
              {...commonProps}
              placeholder={field.placeholder}
              className={error ? 'border-destructive' : ''}
            />
          );
      }
    };

    return (
      <div key={field.key} className="space-y-2">
        <Label htmlFor={field.key} className="flex items-center gap-2">
          {field.label}
          {field.required && <span className="text-destructive">*</span>}
        </Label>
        {field.description && (
          <p className="text-sm text-muted-foreground">{field.description}</p>
        )}
        {fieldComponent()}
        {error && (
          <p className="text-sm text-destructive">
            {typeof error === 'object' && error && 'message' in error ? String(error.message) : 'This field is required'}
          </p>
        )}
      </div>
    );
  };

  // Handle form submission
  const handleSubmit = async (data: Record<string, any>) => {
    setIsSaving(true);
    setSaveSuccess(false);
    setValidationErrors([]);

    try {
      // Validate settings against schema
      const validation = appContext.configuration.settings 
        ? AppConfigService.validateSettings(data, schema)
        : { valid: true, errors: [] };

      if (!validation.valid) {
        setValidationErrors(validation.errors);
        return;
      }

      // Save settings
      if (onSave) {
        await onSave(data);
      } else {
        await appContext.updateConfiguration({ settings: data });
      }

      setSaveSuccess(true);
      
      // Track settings update
      await appContext.trackEvent('settings_updated', {
        sections_updated: schema.sections.map(s => s.id),
        settings_count: Object.keys(data).length
      });

      // Auto-hide success message after 3 seconds
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (error) {
      console.error('Failed to save settings:', error);
      setValidationErrors([error instanceof Error ? error.message : 'Failed to save settings']);
    } finally {
      setIsSaving(false);
    }
  };

  // Test webhook configuration
  const handleTestWebhook = async (webhookId: string, config: N8NWebhookConfig) => {
    try {
      const result = await testWebhook(config);
      
      await appContext.trackEvent('webhook_tested', {
        webhook_id: webhookId,
        success: result.success,
        response_time: result.responseTime
      });
    } catch (error) {
      console.error('Webhook test failed:', error);
    }
  };

  const settingsTitle = title || `${appContext.appName} Settings`;
  const settingsDescription = description || `Configure settings for ${appContext.appName}`;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{settingsTitle}</h1>
        <p className="text-muted-foreground mt-1">{settingsDescription}</p>
      </div>

      {/* Success/Error Messages */}
      {saveSuccess && (
        <Alert className="border-green-200 bg-green-50">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">
            Settings saved successfully!
          </AlertDescription>
        </Alert>
      )}

      {validationErrors.length > 0 && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <div className="space-y-1">
              {validationErrors.map((error, index) => (
                <div key={index}>{error}</div>
              ))}
            </div>
          </AlertDescription>
        </Alert>
      )}

      <form onSubmit={form.handleSubmit(handleSubmit)}>
        <Tabs defaultValue={schema.sections[0]?.id || 'general'} className="space-y-6">
          {/* Tab Navigation */}
          {schema.sections.length > 1 && (
            <TabsList>
              {schema.sections.map((section) => (
                <TabsTrigger key={section.id} value={section.id}>
                  {section.title}
                </TabsTrigger>
              ))}
              {showWebhookConfig && (
                <TabsTrigger value="webhooks">Webhooks</TabsTrigger>
              )}
            </TabsList>
          )}

          {/* Settings Sections */}
          {schema.sections.map((section) => (
            <TabsContent key={section.id} value={section.id}>
              <Card>
                <CardHeader>
                  <CardTitle>{section.title}</CardTitle>
                  {section.description && (
                    <CardDescription>{section.description}</CardDescription>
                  )}
                </CardHeader>
                <CardContent className="space-y-6">
                  {section.fields.map(renderField)}
                </CardContent>
              </Card>
            </TabsContent>
          ))}

          {/* Webhook Configuration */}
          {showWebhookConfig && (
            <TabsContent value="webhooks">
              <Card>
                <CardHeader>
                  <CardTitle>N8N Webhook Configuration</CardTitle>
                  <CardDescription>
                    Configure webhooks for integrating with N8N workflows
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-4">
                    <p className="text-sm text-muted-foreground">
                      Webhooks allow this app to trigger N8N workflows. Configure your webhook URLs 
                      and authentication settings below.
                    </p>
                    
                    {/* Webhook configuration fields would go here */}
                    {/* This is a placeholder - actual implementation would depend on the specific app's webhook needs */}
                    <div className="rounded-lg border border-dashed p-8 text-center">
                      <TestTube className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                      <p className="text-sm text-muted-foreground">
                        Webhook configuration UI will be implemented based on the app's specific needs
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          )}
        </Tabs>

        {/* Form Actions */}
        <div className="flex justify-end gap-2 pt-6">
          <Button
            type="button"
            variant="outline"
            onClick={() => form.reset()}
            disabled={isSaving}
          >
            Reset
          </Button>
          <Button type="submit" disabled={isSaving}>
            {isSaving ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Save Settings
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}