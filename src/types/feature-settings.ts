export interface FeatureSettingOption {
  value: any;
  label: string;
}

export interface FeatureSettingValidation {
  min?: number;
  max?: number;
  pattern?: string;
  fileTypes?: string[];
  maxFileSize?: number; // in bytes
}

export interface FeatureSettingField {
  type: 'text' | 'number' | 'boolean' | 'select' | 'multiselect' | 'textarea' | 'file';
  label: string;
  description?: string;
  required?: boolean;
  default?: any;
  options?: FeatureSettingOption[]; // for select types
  validation?: FeatureSettingValidation;
  dependsOn?: string; // conditional settings
  sensitive?: boolean; // hide value in UI
  placeholder?: string;
}

export interface FeatureSettingsSection {
  title: string;
  description: string;
  requiresRole?: 'admin' | 'super_admin';
  settings: {
    [settingKey: string]: FeatureSettingField;
  };
}

export interface FeatureSettingsSchema {
  [sectionKey: string]: FeatureSettingsSection;
}

export interface SettingsFieldProps {
  setting: FeatureSettingField;
  value: any;
  onChange: (value: any) => void;
  error?: string;
  dependencies?: Record<string, any>;
  name: string;
}