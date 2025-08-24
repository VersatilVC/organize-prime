import React, { useState, useCallback, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { MessageCircle, Settings, Save, RotateCcw, CheckCircle2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useKBAIChatSettings } from '../hooks/useKBAIChatSettings';
import { KBPermissionGuard } from '../components/shared/KBPermissionGuard';
import { WebhookPanel } from '@/components/webhooks/WebhookPanel';
import { WebhookTriggerButton } from '@/components/webhooks/WebhookTriggerButton';
import type { KBAIChatSettingsInput, AIChatTone, AIChatCommunicationStyle } from '../types/KnowledgeBaseTypes';

// Zod validation schema
const settingsSchema = z.object({
  assistant_name: z.string()
    .min(1, 'Assistant name is required')
    .max(50, 'Assistant name must be 50 characters or less')
    .regex(/^[a-zA-Z0-9\s\-_]+$/, 'Only letters, numbers, spaces, hyphens, and underscores allowed'),
  
  tone: z.enum(['professional', 'friendly', 'casual', 'expert']),
  
  communication_style: z.enum(['concise', 'detailed', 'balanced']),
  
  custom_greeting: z.string()
    .max(200, 'Greeting must be 200 characters or less')
    .optional()
    .or(z.literal('')),
  
  response_preferences: z.object({
    cite_sources: z.boolean(),
    ask_clarifying_questions: z.boolean(),
    suggest_related_topics: z.boolean(),
    use_examples: z.boolean(),
  }).default({
    cite_sources: true,
    ask_clarifying_questions: true,
    suggest_related_topics: true,
    use_examples: true,
  }),
});

type FormData = z.infer<typeof settingsSchema>;

// Tone options with descriptions
const TONE_OPTIONS = [
  {
    value: 'professional' as AIChatTone,
    label: 'Professional',
    description: 'Clear, concise, and business-focused',
  },
  {
    value: 'friendly' as AIChatTone,
    label: 'Friendly',
    description: 'Warm, approachable, and conversational',
  },
  {
    value: 'casual' as AIChatTone,
    label: 'Casual',
    description: 'Relaxed, informal, and easy-going',
  },
  {
    value: 'expert' as AIChatTone,
    label: 'Expert',
    description: 'Detailed, technical, and authoritative',
  },
];

// Communication style options
const STYLE_OPTIONS = [
  {
    value: 'concise' as AIChatCommunicationStyle,
    label: 'Concise',
    description: 'Brief and to-the-point responses',
  },
  {
    value: 'detailed' as AIChatCommunicationStyle,
    label: 'Detailed',
    description: 'Comprehensive explanations with examples',
  },
  {
    value: 'balanced' as AIChatCommunicationStyle,
    label: 'Balanced',
    description: 'Moderate detail with clear structure',
  },
];

// Response preference options
const PREFERENCE_OPTIONS = [
  {
    key: 'cite_sources',
    label: 'Always cite sources when available',
    description: 'Include references to source documents',
  },
  {
    key: 'ask_clarifying_questions',
    label: 'Ask clarifying questions when needed',
    description: 'Prompt for more details when requests are ambiguous',
  },
  {
    key: 'suggest_related_topics',
    label: 'Suggest related topics',
    description: 'Offer additional relevant information',
  },
  {
    key: 'use_examples',
    label: 'Use examples to explain concepts',
    description: 'Provide practical examples when explaining ideas',
  },
] as const;

const CharacterCounter = React.memo(({ current, max }: { current: number; max: number }) => (
  <div className="text-xs text-muted-foreground text-right">
    <span className={current > max ? 'text-destructive' : ''}>{current}</span> / {max}
  </div>
));

const UnsavedChangesIndicator = React.memo(({ hasChanges }: { hasChanges: boolean }) => {
  if (!hasChanges) return null;
  
  return (
    <Badge variant="outline" className="flex items-center gap-1">
      <div className="h-2 w-2 rounded-full bg-amber-500" />
      Unsaved changes
    </Badge>
  );
});

export default function KnowledgeBaseAIChatSettings() {
  const { toast } = useToast();
  const {
    settings,
    defaultSettings,
    isLoading,
    isSaving,
    saveSettings,
    resetToDefaults,
  } = useKBAIChatSettings();

  const [autoSaveTimeoutId, setAutoSaveTimeoutId] = useState<NodeJS.Timeout | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Form setup with validation
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors, isDirty },
  } = useForm<FormData>({
    resolver: zodResolver(settingsSchema),
    defaultValues: defaultSettings,
  });

  // Watch all form values for auto-save
  const formValues = watch();

  // Set page title
  useEffect(() => {
    document.title = 'Knowledge Base - AI Chat Settings';
  }, []);

  // Reset form when settings load
  useEffect(() => {
    if (settings && !isLoading) {
      reset({
        assistant_name: settings.assistant_name,
        tone: settings.tone,
        communication_style: settings.communication_style,
        response_preferences: settings.response_preferences,
        custom_greeting: settings.custom_greeting || '',
      });
    }
  }, [settings, isLoading, reset]);

  // Auto-save functionality
  useEffect(() => {
    if (!isDirty) {
      setHasUnsavedChanges(false);
      return;
    }

    setHasUnsavedChanges(true);

    // Clear existing timeout
    if (autoSaveTimeoutId) {
      clearTimeout(autoSaveTimeoutId);
    }

    // Set new auto-save timeout
    const timeoutId = setTimeout(() => {
      handleSubmit(onSubmit)();
    }, 2000);

    setAutoSaveTimeoutId(timeoutId);

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [formValues, isDirty]);

  // Form submission handler
  const onSubmit = useCallback(async (data: FormData) => {
    try {
      const settingsInput: KBAIChatSettingsInput = {
        assistant_name: data.assistant_name,
        tone: data.tone,
        communication_style: data.communication_style,
        response_preferences: data.response_preferences,
        custom_greeting: data.custom_greeting || undefined,
      };

      await saveSettings(settingsInput);
      setHasUnsavedChanges(false);
    } catch (error) {
      console.error('Failed to save settings:', error);
    }
  }, [saveSettings]);

  // Manual save handler
  const handleSave = useCallback(() => {
    handleSubmit(onSubmit)();
  }, [handleSubmit, onSubmit]);

  // Reset to defaults handler
  const handleResetDefaults = useCallback(async () => {
    try {
      await resetToDefaults();
      toast({
        title: 'Settings Reset',
        description: 'AI chat settings have been reset to defaults.',
      });
    } catch (error) {
      console.error('Failed to reset settings:', error);
    }
  }, [resetToDefaults, toast]);

  // Character counters
  const assistantNameLength = watch('assistant_name')?.length || 0;
  const greetingLength = watch('custom_greeting')?.length || 0;

  if (isLoading) {
    return (
      <section aria-label="AI Chat Settings" className="space-y-6 p-4 md:p-6">
        <div className="space-y-4">
          <div className="h-8 w-64 animate-pulse rounded-md bg-muted" />
          <div className="h-4 w-96 animate-pulse rounded-md bg-muted" />
          <div className="h-64 w-full animate-pulse rounded-lg bg-muted" />
        </div>
      </section>
    );
  }

  return (
    <KBPermissionGuard can="can_chat">
      <section aria-label="AI Chat Settings" className="space-y-6 p-4 md:p-6">
        {/* Header */}
        <header className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <MessageCircle className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-semibold">AI Chat Assistant Settings</h1>
              <p className="text-sm text-muted-foreground">
                Customize your AI assistant's personality and communication style
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <UnsavedChangesIndicator hasChanges={hasUnsavedChanges} />
            <Button
              onClick={handleSave}
              disabled={isSaving || !isDirty}
              className="gap-2"
            >
              {isSaving ? (
                <Settings className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              {isSaving ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </header>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Assistant Identity */}
          <Card>
            <CardHeader>
              <CardTitle>Assistant Identity</CardTitle>
              <CardDescription>
                Give your AI assistant a unique name and personality
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="assistant_name">Assistant Name</Label>
                <Input
                  id="assistant_name"
                  placeholder="e.g., Alex, Knowledge Helper, DocBot"
                  {...register('assistant_name')}
                  aria-invalid={errors.assistant_name ? 'true' : 'false'}
                />
                <div className="flex justify-between items-center">
                  <p className="text-sm text-muted-foreground">
                    Give your AI assistant a friendly name
                  </p>
                  <CharacterCounter current={assistantNameLength} max={50} />
                </div>
                {errors.assistant_name && (
                  <p className="text-sm text-destructive" role="alert">
                    {errors.assistant_name.message}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Personality & Tone */}
          <Card>
            <CardHeader>
              <CardTitle>Personality & Tone</CardTitle>
              <CardDescription>
                Configure how your assistant communicates and responds
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Tone Selection */}
              <div className="space-y-3">
                <Label>Communication Tone</Label>
                <RadioGroup
                  value={watch('tone')}
                  onValueChange={(value) => setValue('tone', value as AIChatTone, { shouldDirty: true })}
                  className="grid grid-cols-1 md:grid-cols-2 gap-4"
                >
                  {TONE_OPTIONS.map((option) => (
                    <div key={option.value} className="flex items-start space-x-2">
                      <RadioGroupItem value={option.value} id={`tone-${option.value}`} />
                      <div className="grid gap-1.5 leading-none">
                        <Label
                          htmlFor={`tone-${option.value}`}
                          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                        >
                          {option.label}
                        </Label>
                        <p className="text-xs text-muted-foreground">
                          {option.description}
                        </p>
                      </div>
                    </div>
                  ))}
                </RadioGroup>
              </div>

              <Separator />

              {/* Communication Style */}
              <div className="space-y-3">
                <Label htmlFor="communication_style">Communication Style</Label>
                <Select
                  value={watch('communication_style')}
                  onValueChange={(value) => setValue('communication_style', value as AIChatCommunicationStyle, { shouldDirty: true })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select communication style" />
                  </SelectTrigger>
                  <SelectContent>
                    {STYLE_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        <div>
                          <div className="font-medium">{option.label}</div>
                          <div className="text-xs text-muted-foreground">
                            {option.description}
                          </div>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Assistant Behavior */}
          <Card>
            <CardHeader>
              <CardTitle>Assistant Behavior</CardTitle>
              <CardDescription>
                Configure how your assistant handles responses and interactions
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Response Preferences */}
              <div className="space-y-4">
                <Label>Response Preferences</Label>
                <div className="space-y-3">
                  {PREFERENCE_OPTIONS.map((option) => (
                    <div key={option.key} className="flex items-start space-x-3">
                      <Checkbox
                        id={`pref-${option.key}`}
                        checked={watch(`response_preferences.${option.key}`)}
                        onCheckedChange={(checked) =>
                          setValue(`response_preferences.${option.key}`, !!checked, { shouldDirty: true })
                        }
                      />
                      <div className="grid gap-1.5 leading-none">
                        <Label
                          htmlFor={`pref-${option.key}`}
                          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                        >
                          {option.label}
                        </Label>
                        <p className="text-xs text-muted-foreground">
                          {option.description}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <Separator />

              {/* Custom Greeting */}
              <div className="space-y-2">
                <Label htmlFor="custom_greeting">Custom Greeting (Optional)</Label>
                <Textarea
                  id="custom_greeting"
                  placeholder="Hi! I'm here to help you find information from your knowledge base. What would you like to know?"
                  className="min-h-[80px] resize-none"
                  {...register('custom_greeting')}
                />
                <div className="flex justify-between items-center">
                  <p className="text-sm text-muted-foreground">
                    Personalize how your assistant greets users
                  </p>
                  <CharacterCounter current={greetingLength} max={200} />
                </div>
                {errors.custom_greeting && (
                  <p className="text-sm text-destructive" role="alert">
                    {errors.custom_greeting.message}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col sm:flex-row gap-3 justify-between">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleResetDefaults}
                  disabled={isSaving}
                  className="gap-2"
                >
                  <RotateCcw className="h-4 w-4" />
                  Reset to Defaults
                </Button>
                
                <div className="flex gap-2">
                  {!hasUnsavedChanges && isDirty === false && (
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                      All changes saved
                    </div>
                  )}
                  <Button
                    type="submit"
                    disabled={isSaving || !isDirty}
                    className="gap-2"
                  >
                    {isSaving ? (
                      <Settings className="h-4 w-4 animate-spin" />
                    ) : (
                      <Save className="h-4 w-4" />
                    )}
                    {isSaving ? 'Saving...' : 'Save Settings'}
                  </Button>
                  
                  <WebhookTriggerButton
                    featurePage="AIChatSettings"
                    buttonPosition="header-actions"
                    context={{
                      event_type: 'settings_updated',
                      settings: watch(),
                    }}
                    variant="outline"
                  >
                    Test Webhook
                  </WebhookTriggerButton>
                </div>
              </div>
            </CardContent>
          </Card>
        </form>

        {/* Simple Webhook Configuration */}
        <section className="space-y-6">
          <WebhookPanel 
            title="Webhooks"
            description="Add your N8N webhook URLs and assign them to buttons"
          />
        </section>
      </section>
    </KBPermissionGuard>
  );
}