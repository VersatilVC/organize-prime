export interface FeaturePage {
  id: string;
  title: string;
  route: string;
  description?: string;
  component: string; // Component identifier
  permissions: string[];
  isDefault: boolean; // Default page for the feature
  menuOrder: number;
  icon?: string;
}

export interface FeaturePageFormData {
  title: string;
  route: string;
  description: string;
  component: string;
  permissions: string[];
  isDefault: boolean;
  icon: string;
}

export const AVAILABLE_COMPONENTS = [
  { value: 'Dashboard', label: 'Dashboard', description: 'Main feature dashboard' },
  { value: 'Settings', label: 'Settings', description: 'Feature configuration page' },
  { value: 'Analytics', label: 'Analytics', description: 'Analytics and reporting' },
  { value: 'Users', label: 'Users', description: 'User management' },
  { value: 'Files', label: 'Files', description: 'File management' },
  { value: 'Chat', label: 'Chat', description: 'Chat interface' },
  { value: 'Search', label: 'Search', description: 'Search interface' },
  { value: 'Custom', label: 'Custom', description: 'Custom component' },
];

export const AVAILABLE_PERMISSIONS = [
  { value: 'read', label: 'Read', description: 'View page content' },
  { value: 'write', label: 'Write', description: 'Edit page content' },
  { value: 'admin', label: 'Admin', description: 'Administrative access' },
  { value: 'super_admin', label: 'Super Admin', description: 'System-wide access' },
];