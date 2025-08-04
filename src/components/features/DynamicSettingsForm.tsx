import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { FeatureSettingsSchema, FeatureSettingsSection } from '@/types/feature-settings';
import { SettingsFieldRenderer } from './SettingsFieldRenderer';
import { createSettingsSchema, getDefaultValues, validateSetting } from '@/lib/settings-validation';
import { Form } from '@/components/ui/form';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Loader2, Save, RotateCcw } from 'lucide-react';
import { useUserRole } from '@/hooks/useUserRole';
import { cn } from '@/lib/utils';

interface DynamicSettingsFormProps {
  schema: FeatureSettingsSchema;
  initialValues?: Record<string, any>;
  onSave: (values: Record<string, any>) => void;
  onReset?: () => void;
  isLoading?: boolean;
  isSaving?: boolean;
  isResetting?: boolean;
  className?: string;
}

export const DynamicSettingsForm: React.FC<DynamicSettingsFormProps> = ({
  schema,
  initialValues = {},
  onSave,
  onReset,
  isLoading = false,
  isSaving = false,
  isResetting = false,
  className
}) => {
  const { role } = useUserRole();
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  // Get default values from schema
  const defaultValues = getDefaultValues(schema);
  
  // Merge defaults with initial values
  const mergedValues = { ...defaultValues, ...initialValues };

  // Create validation schema
  const validationSchema = createSettingsSchema(schema);

  const form = useForm({
    resolver: zodResolver(validationSchema),
    defaultValues: mergedValues,
    mode: 'onChange'
  });

  const { watch, handleSubmit, reset, getValues, setValue } = form;
  const watchedValues = watch();

  // Track changes
  useEffect(() => {
    const subscription = watch((value, { name }) => {
      if (name) {
        const hasChanges = JSON.stringify(value) !== JSON.stringify(mergedValues);
        setHasUnsavedChanges(hasChanges);
        
        // Clear field error when value changes
        if (fieldErrors[name]) {
          setFieldErrors(prev => {
            const newErrors = { ...prev };
            delete newErrors[name];
            return newErrors;
          });
        }
      }
    });
    return () => subscription.unsubscribe();
  }, [watch, mergedValues, fieldErrors]);

  // Reset form when initial values change
  useEffect(() => {
    reset(mergedValues);
    setHasUnsavedChanges(false);
  }, [initialValues, reset, mergedValues]);

  // Filter sections based on user role
  const visibleSections = Object.entries(schema).filter(([key, section]) => {
    if (!section.requiresRole) return true;
    if (section.requiresRole === 'super_admin') return role === 'super_admin';
    if (section.requiresRole === 'admin') return role === 'admin' || role === 'super_admin';
    return true;
  });

  const onSubmit = (data: Record<string, any>) => {
    // Validate each field individually for better error handling
    const errors: Record<string, string> = {};
    let hasErrors = false;

    Object.entries(schema).forEach(([sectionKey, section]) => {
      Object.entries(section.settings).forEach(([settingKey, setting]) => {
        const value = data[settingKey];
        const error = validateSetting(setting, value);
        if (error) {
          errors[settingKey] = error;
          hasErrors = true;
        }
      });
    });

    if (hasErrors) {
      setFieldErrors(errors);
      return;
    }

    setFieldErrors({});
    onSave(data);
    setHasUnsavedChanges(false);
  };

  const handleReset = () => {
    if (onReset) {
      onReset();
    }
    reset(defaultValues);
    setHasUnsavedChanges(false);
    setFieldErrors({});
  };

  const handleFieldChange = (settingKey: string, value: any) => {
    setValue(settingKey, value, { shouldValidate: true, shouldDirty: true });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Loading settings...</span>
      </div>
    );
  }

  if (visibleSections.length === 0) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-muted-foreground text-center">
            No settings available for your role.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={cn("space-y-6", className)}>
      <Form {...form}>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Header with actions */}
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold">Feature Settings</h2>
              <p className="text-muted-foreground">
                Configure settings for this feature
              </p>
            </div>
            
            <div className="flex items-center space-x-2">
              {onReset && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button 
                      type="button" 
                      variant="outline" 
                      size="sm"
                      disabled={isSaving || isResetting}
                    >
                      <RotateCcw className="h-4 w-4 mr-2" />
                      Reset to Defaults
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Reset Settings</AlertDialogTitle>
                      <AlertDialogDescription>
                        This will reset all settings to their default values. This action cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={handleReset} disabled={isResetting}>
                        {isResetting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                        Reset Settings
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
              
              <Button 
                type="submit" 
                size="sm"
                disabled={!hasUnsavedChanges || isSaving}
              >
                {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                <Save className="h-4 w-4 mr-2" />
                Save Changes
              </Button>
            </div>
          </div>

          {/* Settings sections */}
          {visibleSections.length === 1 ? (
            // Single section - render directly
            <SettingsSection
              section={visibleSections[0][1]}
              sectionKey={visibleSections[0][0]}
              watchedValues={watchedValues}
              onFieldChange={handleFieldChange}
              fieldErrors={fieldErrors}
            />
          ) : (
            // Multiple sections - use tabs
            <Tabs defaultValue={visibleSections[0][0]} className="space-y-6">
              <TabsList className="grid w-full" style={{ gridTemplateColumns: `repeat(${visibleSections.length}, 1fr)` }}>
                {visibleSections.map(([sectionKey, section]) => (
                  <TabsTrigger key={sectionKey} value={sectionKey}>
                    {section.title}
                  </TabsTrigger>
                ))}
              </TabsList>
              
              {visibleSections.map(([sectionKey, section]) => (
                <TabsContent key={sectionKey} value={sectionKey}>
                  <SettingsSection
                    section={section}
                    sectionKey={sectionKey}
                    watchedValues={watchedValues}
                    onFieldChange={handleFieldChange}
                    fieldErrors={fieldErrors}
                  />
                </TabsContent>
              ))}
            </Tabs>
          )}

          {/* Unsaved changes indicator */}
          {hasUnsavedChanges && (
            <Card className="border-orange-200 bg-orange-50">
              <CardContent className="p-4">
                <p className="text-sm text-orange-800">
                  You have unsaved changes. Don't forget to save your settings.
                </p>
              </CardContent>
            </Card>
          )}
        </form>
      </Form>
    </div>
  );
};

interface SettingsSectionProps {
  section: FeatureSettingsSection;
  sectionKey: string;
  watchedValues: Record<string, any>;
  onFieldChange: (key: string, value: any) => void;
  fieldErrors: Record<string, string>;
}

const SettingsSection: React.FC<SettingsSectionProps> = ({
  section,
  sectionKey,
  watchedValues,
  onFieldChange,
  fieldErrors
}) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{section.title}</CardTitle>
        <CardDescription>{section.description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {Object.entries(section.settings).map(([settingKey, setting], index) => (
          <div key={settingKey}>
            <SettingsFieldRenderer
              setting={setting}
              value={watchedValues[settingKey]}
              onChange={(value) => onFieldChange(settingKey, value)}
              error={fieldErrors[settingKey]}
              dependencies={watchedValues}
              name={settingKey}
            />
            {index < Object.entries(section.settings).length - 1 && (
              <Separator className="mt-6" />
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
};