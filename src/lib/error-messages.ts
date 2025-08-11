export const FEATURE_ERROR_MESSAGES = {
  ENABLE_FAILED: 'Unable to enable this feature. Please try again or contact support.',
  DISABLE_FAILED: 'Unable to disable this feature. Please try again.',
  LOAD_FAILED: 'Failed to load features. Please refresh the page.',
  ACCESS_DENIED: 'You do not have permission to access this feature.',
  NOT_FOUND: 'The requested feature was not found or is not available.',
  SETUP_REQUIRED: 'This feature requires additional setup before it can be used.',
  RATE_LIMITED: 'Too many requests. Please wait a moment before trying again.',
};

export const SUCCESS_MESSAGES = {
  FEATURE_ENABLED: (name: string) => `${name} has been enabled successfully.`,
  FEATURE_DISABLED: (name: string) => `${name} has been disabled.`,
  SETTINGS_SAVED: 'Feature settings have been saved successfully.',
};