import { useState, useCallback, useMemo, useRef } from 'react';
import { debounce } from 'lodash';

export interface ValidationRule<T> {
  field: keyof T;
  validate: (value: any, formData: T) => string | null;
}

interface UseOptimizedFormOptions<T> {
  initialData: T;
  validationRules?: ValidationRule<T>[];
  debounceMs?: number;
}

interface FormField {
  value: any;
  error: string | null;
  isDirty: boolean;
}

export function useOptimizedForm<T extends Record<string, any>>({
  initialData,
  validationRules = [],
  debounceMs = 300
}: UseOptimizedFormOptions<T>) {
  const [formData, setFormData] = useState<T>(initialData);
  const [dirtyFields, setDirtyFields] = useState<Set<keyof T>>(new Set());
  const [fieldErrors, setFieldErrors] = useState<Map<keyof T, string>>(new Map());
  const [isValidating, setIsValidating] = useState<Set<keyof T>>(new Set());
  
  // Cache for validation results to avoid re-computation
  const validationCache = useRef<Map<string, string | null>>(new Map());
  const initialDataRef = useRef(initialData);

  // Update initial data reference when it changes
  useMemo(() => {
    initialDataRef.current = initialData;
    setFormData(initialData);
    setDirtyFields(new Set());
    setFieldErrors(new Map());
    validationCache.current.clear();
  }, [initialData]);

  // Memoized validation function with caching
  const validateField = useCallback((field: keyof T, value: any, currentFormData: T) => {
    const cacheKey = `${String(field)}-${JSON.stringify(value)}`;
    
    // Check cache first
    if (validationCache.current.has(cacheKey)) {
      return validationCache.current.get(cacheKey);
    }

    const rule = validationRules.find(r => r.field === field);
    if (!rule) {
      validationCache.current.set(cacheKey, null);
      return null;
    }

    const error = rule.validate(value, currentFormData);
    validationCache.current.set(cacheKey, error);
    return error;
  }, [validationRules]);

  // Debounced update function
  const debouncedUpdate = useMemo(
    () => debounce((field: keyof T, value: any) => {
      setFormData(prev => {
        const newFormData = { ...prev, [field]: value };
        
        // Validate the field
        const error = validateField(field, value, newFormData);
        setFieldErrors(prevErrors => {
          const newErrors = new Map(prevErrors);
          if (error) {
            newErrors.set(field, error);
          } else {
            newErrors.delete(field);
          }
          return newErrors;
        });

        setIsValidating(prev => {
          const newValidating = new Set(prev);
          newValidating.delete(field);
          return newValidating;
        });

        return newFormData;
      });

      // Mark field as dirty if value differs from initial
      const initialValue = initialDataRef.current[field];
      setDirtyFields(prev => {
        const newDirtyFields = new Set(prev);
        if (value !== initialValue) {
          newDirtyFields.add(field);
        } else {
          newDirtyFields.delete(field);
        }
        return newDirtyFields;
      });
    }, debounceMs),
    [debounceMs, validateField]
  );

  // Optimized change handler with immediate UI update for better UX
  const handleChange = useCallback((field: keyof T, value: any) => {
    // Immediately update the form data for instant UI feedback
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Mark as validating
    setIsValidating(prev => new Set([...prev, field]));
    
    // Debounce the actual validation and dirty tracking
    debouncedUpdate(field, value);
  }, [debouncedUpdate]);

  // Memoized computed values
  const isDirty = dirtyFields.size > 0;
  const hasErrors = fieldErrors.size > 0;
  const isFormValidating = isValidating.size > 0;

  // Get field state
  const getFieldState = useCallback((field: keyof T): FormField => ({
    value: formData[field],
    error: fieldErrors.get(field) || null,
    isDirty: dirtyFields.has(field)
  }), [formData, fieldErrors, dirtyFields]);

  // Reset form
  const reset = useCallback(() => {
    setFormData(initialDataRef.current);
    setDirtyFields(new Set());
    setFieldErrors(new Map());
    setIsValidating(new Set());
    validationCache.current.clear();
    debouncedUpdate.cancel();
  }, [debouncedUpdate]);

  // Validate all fields
  const validateAll = useCallback(() => {
    const errors = new Map<keyof T, string>();
    
    Object.keys(formData).forEach(key => {
      const field = key as keyof T;
      const error = validateField(field, formData[field], formData);
      if (error) {
        errors.set(field, error);
      }
    });
    
    setFieldErrors(errors);
    return errors.size === 0;
  }, [formData, validateField]);

  // Set field value programmatically (useful for external updates)
  const setFieldValue = useCallback((field: keyof T, value: any) => {
    handleChange(field, value);
  }, [handleChange]);

  // Get dirty field names
  const getDirtyFieldNames = useCallback(() => {
    return Array.from(dirtyFields);
  }, [dirtyFields]);

  // Check if specific field is dirty
  const isFieldDirty = useCallback((field: keyof T) => {
    return dirtyFields.has(field);
  }, [dirtyFields]);

  return {
    formData,
    handleChange,
    getFieldState,
    isDirty,
    hasErrors,
    isFormValidating,
    dirtyFields,
    fieldErrors,
    reset,
    validateAll,
    setFieldValue,
    getDirtyFieldNames,
    isFieldDirty
  };
}

// Default validation rules for common use cases
export const commonValidationRules = {
  required: (message = 'This field is required') => (value: any) => {
    if (!value || (typeof value === 'string' && !value.trim())) {
      return message;
    }
    return null;
  },
  minLength: (min: number, message?: string) => (value: string) => {
    if (value && value.length < min) {
      return message || `Must be at least ${min} characters`;
    }
    return null;
  },
  maxLength: (max: number, message?: string) => (value: string) => {
    if (value && value.length > max) {
      return message || `Must be ${max} characters or less`;
    }
    return null;
  },
  email: (message = 'Please enter a valid email address') => (value: string) => {
    if (value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      return message;
    }
    return null;
  },
  phone: (message = 'Please enter a valid phone number') => (value: string) => {
    if (value && !/^[\+]?[1-9][\d]{0,15}$/.test(value.replace(/[\s\-\(\)]/g, ''))) {
      return message;
    }
    return null;
  },
  number: (message = 'Please enter a valid number') => (value: any) => {
    if (value !== null && value !== undefined && value !== '' && isNaN(Number(value))) {
      return message;
    }
    return null;
  },
  min: (min: number, message?: string) => (value: number) => {
    if (value !== null && value !== undefined && value < min) {
      return message || `Must be at least ${min}`;
    }
    return null;
  },
  max: (max: number, message?: string) => (value: number) => {
    if (value !== null && value !== undefined && value > max) {
      return message || `Must be ${max} or less`;
    }
    return null;
  }
};