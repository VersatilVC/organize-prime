import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Settings,
  User,
  Brain,
  Database,
  UserCheck,
  RotateCcw,
  Save,
  CheckCircle,
  Loader2,
  AlertCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { cn } from '@/lib/utils';
import { useChatSettings } from '../hooks/useChatSettings';
import { useKnowledgeBases } from '../../hooks/useKnowledgeBases';
import {
  ASSISTANT_TONES,
  AI_MODELS,
  RESPONSE_STYLES,
  SEARCH_SCOPES,
  DEFAULT_CHAT_SETTINGS
} from '../types/ChatSettings';
import type { ChatSettings } from '../types/ChatSettings';

// Form validation schema
const chatSettingsSchema = z.object({
  assistant: z.object({
    name: z.string()
      .min(1, 'Assistant name is required')
      .max(100, 'Assistant name must be 100 characters or less'),
    tone: z.enum(['professional', 'friendly', 'casual', 'technical', 'creative']),
    goal: z.string()
      .max(500, 'Assistant goal must be 500 characters or less')
      .optional()
  }),
  behavior: z.object({
    defaultModel: z.enum(['gpt-4', 'gpt-3.5-turbo', 'claude-3']),
    responseStyle: z.enum(['concise', 'detailed', 'conversational', 'technical']),
    includeSources: z.boolean(),
    contextMemory: z.number().min(5).max(20)
  }),
  knowledgeBases: z.object({
    defaultKBs: z.array(z.string()),
    searchScope: z.enum(['current', 'all', 'ask'])
  }),
  userPreferences: z.object({
    autoScroll: z.boolean(),
    soundNotifications: z.boolean(),
    showTimestamps: z.boolean()
  })
});

type ChatSettingsFormData = z.infer<typeof chatSettingsSchema>;

interface ChatSettingsFormProps {
  className?: string;
}

export function ChatSettingsForm({ className }: ChatSettingsFormProps) {
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [lastSaveTime, setLastSaveTime] = useState<Date | null>(null);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  const {
    settings,
    isLoading,
    error,
    autoSaveSettings,
    saveSettings,
    resetToDefaults,
    isSaving,
    isResetting
  } = useChatSettings();

  const { data: knowledgeBases } = useKnowledgeBases();

  const form = useForm<ChatSettingsFormData>({
    resolver: zodResolver(chatSettingsSchema),
    defaultValues: DEFAULT_CHAT_SETTINGS,
    mode: 'onChange'
  });

  const { watch, reset, handleSubmit, formState: { isDirty, isValid } } = form;
  const watchedValues = watch();

  // Update form when settings are loaded
  useEffect(() => {
    if (settings) {
      reset(settings);
      setHasUnsavedChanges(false);
    }
  }, [settings, reset]);

  // Auto-save when form values change
  useEffect(() => {
    if (isDirty && isValid && settings) {
      setHasUnsavedChanges(true);
      autoSaveSettings(watchedValues as ChatSettings);
      
      // Set save time when auto-save is triggered
      const saveTimer = setTimeout(() => {
        setLastSaveTime(new Date());
        setHasUnsavedChanges(false);
      }, 2000);

      return () => clearTimeout(saveTimer);
    }
  }, [watchedValues, isDirty, isValid, settings, autoSaveSettings]);

  const handleManualSave = () => {
    if (isValid) {
      saveSettings(watchedValues as ChatSettings);
      setLastSaveTime(new Date());
      setHasUnsavedChanges(false);
    }
  };

  const handleReset = () => {
    resetToDefaults();
    setShowResetConfirm(false);
    setHasUnsavedChanges(false);
    setLastSaveTime(null);
  };

  const getSaveStatusIndicator = () => {
    if (isSaving || isResetting) {
      return (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>{isResetting ? 'Resetting...' : 'Saving...'}</span>
        </div>
      );
    }

    if (hasUnsavedChanges) {
      return (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <AlertCircle className="h-4 w-4 text-yellow-500" />
          <span>Unsaved changes</span>
        </div>
      );
    }

    if (lastSaveTime) {
      return (
        <div className="flex items-center gap-2 text-sm text-green-600">
          <CheckCircle className="h-4 w-4" />
          <span>Saved at {lastSaveTime.toLocaleTimeString()}</span>
        </div>
      );
    }

    return null;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading chat settings...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <AlertCircle className="h-8 w-8 mx-auto mb-4 text-red-500" />
          <h3 className="font-medium text-lg mb-2">Failed to Load Settings</h3>
          <p className="text-muted-foreground mb-4">
            There was an error loading your chat settings.
          </p>
          <Button onClick={() => window.location.reload()}>
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("space-y-6", className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Chat Settings</h1>
          <p className="text-muted-foreground">
            Configure your AI assistant and chat preferences for your organization.
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          {getSaveStatusIndicator()}
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={handleSubmit(handleManualSave)} className="space-y-6">
          {/* Assistant Identity Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Assistant Identity
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <FormField
                control={form.control}
                name="assistant.name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Assistant Name</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="AI Assistant" 
                        {...field} 
                        className="max-w-md"
                      />
                    </FormControl>
                    <FormDescription>
                      The name your AI assistant will use when responding to users.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="assistant.tone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Assistant Tone</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger className="max-w-md">
                          <SelectValue placeholder="Select tone" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {ASSISTANT_TONES.map((tone) => (
                          <SelectItem key={tone.value} value={tone.value}>
                            {tone.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      The communication style your assistant will use.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="assistant.goal"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Assistant Goal</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="I help you find information from your knowledge bases..."
                        className="min-h-[100px] max-w-2xl"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      Describe what your assistant is designed to help with.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Chat Behavior Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Brain className="h-5 w-5" />
                Chat Behavior
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="behavior.defaultModel"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Default Model</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select model" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {AI_MODELS.map((model) => (
                            <SelectItem key={model.value} value={model.value}>
                              {model.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        The AI model to use for generating responses.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="behavior.responseStyle"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Response Style</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select style" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {RESPONSE_STYLES.map((style) => (
                            <SelectItem key={style.value} value={style.value}>
                              {style.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        How detailed the assistant's responses should be.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="behavior.includeSources"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">Include Sources</FormLabel>
                      <FormDescription>
                        Always show document citations in responses
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="behavior.contextMemory"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Context Memory: {field.value} messages</FormLabel>
                    <FormControl>
                      <div className="px-3">
                        <Slider
                          min={5}
                          max={20}
                          step={1}
                          value={[field.value]}
                          onValueChange={(value) => field.onChange(value[0])}
                          className="w-full max-w-md"
                        />
                      </div>
                    </FormControl>
                    <FormDescription>
                      How many previous messages the assistant should remember for context.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Knowledge Base Defaults Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5" />
                Knowledge Base Defaults
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <FormField
                control={form.control}
                name="knowledgeBases.defaultKBs"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Default Knowledge Bases</FormLabel>
                    <FormDescription className="mb-4">
                      Select which knowledge bases should be active by default in new conversations.
                    </FormDescription>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {knowledgeBases?.map((kb) => (
                        <div key={kb.id} className="flex items-center space-x-2">
                          <Checkbox
                            id={`kb-${kb.id}`}
                            checked={field.value.includes(kb.id)}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                field.onChange([...field.value, kb.id]);
                              } else {
                                field.onChange(field.value.filter(id => id !== kb.id));
                              }
                            }}
                          />
                          <Label htmlFor={`kb-${kb.id}`} className="text-sm font-normal">
                            {kb.display_name}
                          </Label>
                        </div>
                      ))}
                    </div>
                    {field.value.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-2">
                        {field.value.map((kbId) => {
                          const kb = knowledgeBases?.find(k => k.id === kbId);
                          return kb ? (
                            <Badge key={kbId} variant="secondary">
                              {kb.display_name}
                            </Badge>
                          ) : null;
                        })}
                      </div>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="knowledgeBases.searchScope"
                render={({ field }) => (
                  <FormItem className="space-y-3">
                    <FormLabel>Search Scope</FormLabel>
                    <FormControl>
                      <RadioGroup
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                        className="flex flex-col space-y-2"
                      >
                        {SEARCH_SCOPES.map((scope) => (
                          <div key={scope.value} className="flex items-center space-x-2">
                            <RadioGroupItem value={scope.value} id={scope.value} />
                            <Label htmlFor={scope.value} className="text-sm font-normal">
                              {scope.label}
                            </Label>
                          </div>
                        ))}
                      </RadioGroup>
                    </FormControl>
                    <FormDescription>
                      How the assistant should determine which knowledge bases to search.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* User Preferences Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserCheck className="h-5 w-5" />
                User Preferences
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="userPreferences.autoScroll"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">Auto-scroll</FormLabel>
                      <FormDescription>
                        Automatically scroll to new messages
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="userPreferences.soundNotifications"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">Sound Notifications</FormLabel>
                      <FormDescription>
                        Play sound for new messages
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="userPreferences.showTimestamps"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">Show Timestamps</FormLabel>
                      <FormDescription>
                        Display message timestamps
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex items-center justify-between pt-6 border-t">
            <AlertDialog open={showResetConfirm} onOpenChange={setShowResetConfirm}>
              <AlertDialogTrigger asChild>
                <Button variant="outline" disabled={isResetting}>
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Reset to Defaults
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Reset Chat Settings?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will reset all chat settings to their default values. 
                    This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleReset}>
                    Reset Settings
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>

            <div className="flex items-center gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={handleManualSave}
                disabled={!isDirty || !isValid || isSaving}
              >
                <Save className="h-4 w-4 mr-2" />
                Save Now
              </Button>
            </div>
          </div>
        </form>
      </Form>
    </div>
  );
}