import { z } from 'zod';
import { FeatureSettingsSchema, FeatureSettingField } from '@/types/feature-settings';

export function createSettingsSchema(settingsSchema: FeatureSettingsSchema) {
  const schemaObject: Record<string, any> = {};
  
  Object.entries(settingsSchema).forEach(([sectionKey, section]) => {
    Object.entries(section.settings).forEach(([key, setting]) => {
      let validator: any;
      
      switch (setting.type) {
        case 'text':
          validator = z.string();
          if (setting.validation?.pattern) {
            validator = validator.regex(
              new RegExp(setting.validation.pattern),
              `Invalid format for ${setting.label}`
            );
          }
          if (setting.validation?.min) {
            validator = validator.min(setting.validation.min, 
              `${setting.label} must be at least ${setting.validation.min} characters`
            );
          }
          if (setting.validation?.max) {
            validator = validator.max(setting.validation.max,
              `${setting.label} must be at most ${setting.validation.max} characters`
            );
          }
          break;
          
        case 'number':
          validator = z.number();
          if (setting.validation?.min !== undefined) {
            validator = validator.min(setting.validation.min,
              `${setting.label} must be at least ${setting.validation.min}`
            );
          }
          if (setting.validation?.max !== undefined) {
            validator = validator.max(setting.validation.max,
              `${setting.label} must be at most ${setting.validation.max}`
            );
          }
          break;
          
        case 'boolean':
          validator = z.boolean();
          break;
          
        case 'select':
          if (setting.options) {
            const validValues = setting.options.map(opt => opt.value);
            validator = z.enum(validValues as [string, ...string[]]);
          } else {
            validator = z.string();
          }
          break;
          
        case 'multiselect':
          if (setting.options) {
            const validValues = setting.options.map(opt => opt.value);
            validator = z.array(z.enum(validValues as [string, ...string[]]));
          } else {
            validator = z.array(z.string());
          }
          break;
          
        case 'textarea':
          validator = z.string();
          if (setting.validation?.min) {
            validator = validator.min(setting.validation.min);
          }
          if (setting.validation?.max) {
            validator = validator.max(setting.validation.max);
          }
          break;
          
        case 'file':
          validator = z.any(); // File validation handled separately
          break;
          
        default:
          validator = z.any();
      }
      
      if (!setting.required) {
        validator = validator.optional();
      }
      
      schemaObject[key] = validator;
    });
  });
  
  return z.object(schemaObject);
}

export function validateSetting(setting: FeatureSettingField, value: any): string | null {
  try {
    let validator: any;
    
    switch (setting.type) {
      case 'text':
      case 'textarea':
        validator = z.string();
        if (setting.validation?.pattern) {
          validator = validator.regex(new RegExp(setting.validation.pattern));
        }
        if (setting.validation?.min) validator = validator.min(setting.validation.min);
        if (setting.validation?.max) validator = validator.max(setting.validation.max);
        break;
        
      case 'number':
        validator = z.number();
        if (setting.validation?.min !== undefined) validator = validator.min(setting.validation.min);
        if (setting.validation?.max !== undefined) validator = validator.max(setting.validation.max);
        break;
        
      case 'boolean':
        validator = z.boolean();
        break;
        
      case 'select':
        if (setting.options) {
          const validValues = setting.options.map(opt => opt.value);
          validator = z.enum(validValues as [string, ...string[]]);
        } else {
          validator = z.string();
        }
        break;
        
      case 'multiselect':
        if (setting.options) {
          const validValues = setting.options.map(opt => opt.value);
          validator = z.array(z.enum(validValues as [string, ...string[]]));
        } else {
          validator = z.array(z.string());
        }
        break;
        
      case 'file':
        // File validation is handled separately in the component
        return null;
        
      default:
        return null;
    }
    
    if (!setting.required && (value === undefined || value === null || value === '')) {
      return null;
    }
    
    validator.parse(value);
    return null;
  } catch (error) {
    if (error instanceof z.ZodError) {
      return error.errors[0]?.message || 'Invalid value';
    }
    return 'Validation error';
  }
}

export function getDefaultValues(settingsSchema: FeatureSettingsSchema): Record<string, any> {
  const defaults: Record<string, any> = {};
  
  Object.entries(settingsSchema).forEach(([sectionKey, section]) => {
    Object.entries(section.settings).forEach(([key, setting]) => {
      if (setting.default !== undefined) {
        defaults[key] = setting.default;
      }
    });
  });
  
  return defaults;
}