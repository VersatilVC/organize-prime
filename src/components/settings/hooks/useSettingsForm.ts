import { useCallback, useEffect } from 'react';
import { useOptimizedForm, ValidationRule, commonValidationRules } from '@/hooks/useOptimizedForm';
import { useToast } from '@/hooks/use-toast';
import { useMutation, useQueryClient } from '@tanstack/react-query';

interface UseSettingsFormOptions<T extends Record<string, any>> {
  initialData: T;
  validationRules?: ValidationRule<T>[];
  queryKey: string[];
  mutationFn: (data: T) => Promise<void>;
  successMessage?: string;
  errorMessage?: string;
  onSuccess?: () => void;
  onError?: (error: Error) => void;
  debounceMs?: number;
}

export function useSettingsForm<T extends Record<string, any>>({
  initialData,
  validationRules = [],
  queryKey,
  mutationFn,
  successMessage = 'Settings updated successfully',
  errorMessage = 'Failed to update settings. Please try again.',
  onSuccess,
  onError,
  debounceMs = 300
}: UseSettingsFormOptions<T>) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const {
    formData,
    handleChange,
    getFieldState,
    isDirty,
    hasErrors,
    isFormValidating,
    validateAll,
    reset,
    setFieldValue
  } = useOptimizedForm({
    initialData,
    validationRules,
    debounceMs
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn,
    onSuccess: () => {
      toast({
        title: 'Success',
        description: successMessage,
      });
      reset();
      queryClient.invalidateQueries({ queryKey });
      onSuccess?.();
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });
      console.error('Settings update error:', error);
      onError?.(error);
    }
  });

  // Auto-save functionality (optional)
  const handleAutoSave = useCallback(() => {
    if (isDirty && !hasErrors) {
      updateMutation.mutate(formData);
    }
  }, [isDirty, hasErrors, formData, updateMutation]);

  // Submit handler with validation
  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateAll()) {
      toast({
        title: 'Validation Error',
        description: 'Please fix the errors in the form',
        variant: 'destructive',
      });
      return;
    }

    updateMutation.mutate(formData);
  }, [formData, validateAll, updateMutation, toast]);

  // Warn about unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDirty]);

  return {
    formData,
    handleChange,
    getFieldState,
    setFieldValue,
    isDirty,
    hasErrors,
    isFormValidating,
    handleSubmit,
    handleAutoSave,
    reset,
    isUpdating: updateMutation.isPending,
    updateError: updateMutation.error
  };
}

// Common validation rules for settings forms
export const settingsValidationRules = {
  appName: {
    field: 'app_name' as const,
    validate: commonValidationRules.required('Application name is required')
  },
  companyName: {
    field: 'name' as const,
    validate: commonValidationRules.required('Company name is required')
  },
  fullName: {
    field: 'full_name' as const,
    validate: commonValidationRules.required('Full name is required')
  },
  bio: {
    field: 'bio' as const,
    validate: commonValidationRules.maxLength(160, 'Bio must be 160 characters or less')
  },
  websiteUrl: {
    field: 'website_url' as const,
    validate: (value: string) => {
      if (value && value.trim()) {
        try {
          new URL(value.startsWith('http') ? value : `https://${value}`);
          return null;
        } catch {
          return 'Please enter a valid website URL';
        }
      }
      return null;
    }
  },
  phoneNumber: {
    field: 'phone_number' as const,
    validate: (value: string) => {
      if (value && !/^[\+]?[1-9][\d\s\-\(\)]{7,20}$/.test(value)) {
        return 'Please enter a valid phone number';
      }
      return null;
    }
  },
  maxUsers: {
    field: 'max_users_per_org' as const,
    validate: commonValidationRules.min(0, 'Maximum users per organization must be 0 or greater')
  }
};