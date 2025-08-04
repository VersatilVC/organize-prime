// Application constants for better maintainability and type safety

// User roles and permissions
export const USER_ROLES = {
  SUPER_ADMIN: 'super_admin',
  ADMIN: 'admin',
  USER: 'user',
} as const;

export const USER_STATUSES = {
  ACTIVE: 'active',
  INACTIVE: 'inactive',
  PENDING: 'pending',
} as const;

// Feedback types and statuses
export const FEEDBACK_TYPES = {
  BUG: 'bug',
  FEATURE: 'feature',
  IMPROVEMENT: 'improvement',
  OTHER: 'other',
} as const;

export const FEEDBACK_STATUSES = {
  PENDING: 'pending',
  REVIEWING: 'reviewing',
  IN_PROGRESS: 'in_progress',
  RESOLVED: 'resolved',
  CLOSED: 'closed',
} as const;

export const FEEDBACK_PRIORITIES = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  CRITICAL: 'critical',
} as const;

// Notification types
export const NOTIFICATION_TYPES = {
  INFO: 'info',
  WARNING: 'warning',
  SUCCESS: 'success',
  ERROR: 'error',
  SYSTEM: 'system',
  INVITATION: 'invitation',
  FEEDBACK: 'feedback',
  WELCOME: 'welcome_first_login',
} as const;

// File and upload constants
export const FILE_TYPES = {
  IMAGE: 'image',
  DOCUMENT: 'document',
  VIDEO: 'video',
  AUDIO: 'audio',
  ARCHIVE: 'archive',
  OTHER: 'other',
} as const;

export const ALLOWED_IMAGE_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/svg+xml',
] as const;

export const ALLOWED_DOCUMENT_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/plain',
  'text/csv',
] as const;

// API and database constants
export const API_ENDPOINTS = {
  USERS: '/users',
  ORGANIZATIONS: '/organizations',
  FEEDBACK: '/feedback',
  INVITATIONS: '/invitations',
  NOTIFICATIONS: '/notifications',
  FILES: '/files',
  SETTINGS: '/settings',
  AUTH: '/auth',
} as const;

export const STORAGE_BUCKETS = {
  AVATARS: 'avatars',
  SYSTEM_ASSETS: 'system-assets',
  FEEDBACK_ATTACHMENTS: 'feedback-attachments',
  ORGANIZATION_LOGOS: 'organization-logos',
} as const;

// Query keys for React Query
export const QUERY_KEYS = {
  USERS: 'users',
  USER_PROFILE: 'userProfile',
  ORGANIZATIONS: 'organizations',
  CURRENT_ORGANIZATION: 'currentOrganization',
  FEEDBACK: 'feedback',
  FEEDBACK_DETAIL: 'feedbackDetail',
  INVITATIONS: 'invitations',
  NOTIFICATIONS: 'notifications',
  DASHBOARD_STATS: 'dashboardStats',
  SYSTEM_SETTINGS: 'systemSettings',
  ORGANIZATION_SETTINGS: 'organizationSettings',
  USER_ROLE: 'userRole',
  FILES: 'files',
} as const;

// Mutation keys for React Query
export const MUTATION_KEYS = {
  LOGIN: 'login',
  LOGOUT: 'logout',
  REGISTER: 'register',
  UPDATE_PROFILE: 'updateProfile',
  CREATE_ORGANIZATION: 'createOrganization',
  UPDATE_ORGANIZATION: 'updateOrganization',
  INVITE_USER: 'inviteUser',
  ACCEPT_INVITATION: 'acceptInvitation',
  CREATE_FEEDBACK: 'createFeedback',
  UPDATE_FEEDBACK: 'updateFeedback',
  DELETE_FEEDBACK: 'deleteFeedback',
  UPDATE_USER_ROLE: 'updateUserRole',
  REMOVE_USER: 'removeUser',
  UPLOAD_FILE: 'uploadFile',
  DELETE_FILE: 'deleteFile',
} as const;

// UI constants
export const BREAKPOINTS = {
  SM: 640,
  MD: 768,
  LG: 1024,
  XL: 1280,
  '2XL': 1536,
} as const;

export const TOAST_DURATION = {
  SHORT: 3000,
  MEDIUM: 5000,
  LONG: 8000,
} as const;

export const DEBOUNCE_DELAYS = {
  SEARCH: 300,
  TYPING: 500,
  SCROLL: 100,
  RESIZE: 150,
} as const;

export const ANIMATION_DURATIONS = {
  FAST: 150,
  NORMAL: 300,
  SLOW: 500,
} as const;

// Pagination constants
export const PAGINATION = {
  DEFAULT_PAGE_SIZE: 10,
  MAX_PAGE_SIZE: 100,
  LARGE_PAGE_SIZE: 50,
  SMALL_PAGE_SIZE: 5,
} as const;

// Form validation constants
export const VALIDATION = {
  PASSWORD_MIN_LENGTH: 8,
  USERNAME_MIN_LENGTH: 3,
  USERNAME_MAX_LENGTH: 30,
  NAME_MAX_LENGTH: 100,
  EMAIL_MAX_LENGTH: 254,
  DESCRIPTION_MAX_LENGTH: 1000,
  MESSAGE_MAX_LENGTH: 500,
  PHONE_REGEX: /^\+?[\d\s\-\(\)]+$/,
  USERNAME_REGEX: /^[a-zA-Z0-9_-]+$/,
} as const;

// File size limits (in bytes)
export const FILE_SIZE_LIMITS = {
  AVATAR: 2 * 1024 * 1024, // 2MB
  LOGO: 5 * 1024 * 1024, // 5MB
  DOCUMENT: 10 * 1024 * 1024, // 10MB
  ATTACHMENT: 25 * 1024 * 1024, // 25MB
  MAX_TOTAL_SIZE: 100 * 1024 * 1024, // 100MB
} as const;

// Time constants (in milliseconds)
export const TIME_CONSTANTS = {
  SECOND: 1000,
  MINUTE: 60 * 1000,
  HOUR: 60 * 60 * 1000,
  DAY: 24 * 60 * 60 * 1000,
  WEEK: 7 * 24 * 60 * 60 * 1000,
  MONTH: 30 * 24 * 60 * 60 * 1000,
} as const;

// Cache durations
export const CACHE_DURATIONS = {
  SHORT: 2 * TIME_CONSTANTS.MINUTE,
  MEDIUM: 5 * TIME_CONSTANTS.MINUTE,
  LONG: 15 * TIME_CONSTANTS.MINUTE,
  VERY_LONG: TIME_CONSTANTS.HOUR,
  STATIC: 24 * TIME_CONSTANTS.HOUR,
} as const;

// Rate limiting constants
export const RATE_LIMITS = {
  LOGIN_ATTEMPTS: 5,
  API_REQUESTS_PER_MINUTE: 100,
  FILE_UPLOADS_PER_HOUR: 50,
  INVITATIONS_PER_DAY: 20,
  FEEDBACK_PER_HOUR: 10,
} as const;

// Security constants
export const SECURITY = {
  SESSION_TIMEOUT: TIME_CONSTANTS.HOUR,
  INVITATION_EXPIRY: 7 * TIME_CONSTANTS.DAY,
  PASSWORD_RESET_EXPIRY: TIME_CONSTANTS.HOUR,
  MAX_LOGIN_ATTEMPTS: 5,
  LOCKOUT_DURATION: 15 * TIME_CONSTANTS.MINUTE,
} as const;

// Error codes
export const ERROR_CODES = {
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  NOT_FOUND: 'NOT_FOUND',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  DUPLICATE_ENTRY: 'DUPLICATE_ENTRY',
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
  FILE_TOO_LARGE: 'FILE_TOO_LARGE',
  INVALID_FILE_TYPE: 'INVALID_FILE_TYPE',
  NETWORK_ERROR: 'NETWORK_ERROR',
  SERVER_ERROR: 'SERVER_ERROR',
} as const;

// Success message types
export const SUCCESS_TYPES = {
  USER_CREATED: 'USER_CREATED',
  USER_UPDATED: 'USER_UPDATED',
  USER_DELETED: 'USER_DELETED',
  ORGANIZATION_CREATED: 'ORGANIZATION_CREATED',
  ORGANIZATION_UPDATED: 'ORGANIZATION_UPDATED',
  INVITATION_SENT: 'INVITATION_SENT',
  INVITATION_ACCEPTED: 'INVITATION_ACCEPTED',
  FEEDBACK_SUBMITTED: 'FEEDBACK_SUBMITTED',
  FEEDBACK_UPDATED: 'FEEDBACK_UPDATED',
  SETTINGS_SAVED: 'SETTINGS_SAVED',
  FILE_UPLOADED: 'FILE_UPLOADED',
  PASSWORD_CHANGED: 'PASSWORD_CHANGED',
} as const;

// Feature flags
export const FEATURES = {
  ENABLE_NOTIFICATIONS: 'enableNotifications',
  ENABLE_FILE_UPLOADS: 'enableFileUploads',
  ENABLE_ANALYTICS: 'enableAnalytics',
  ENABLE_MFA: 'enableMFA',
  ENABLE_DARK_MODE: 'enableDarkMode',
  ENABLE_REAL_TIME: 'enableRealTime',
  ENABLE_ADVANCED_SEARCH: 'enableAdvancedSearch',
  ENABLE_BULK_OPERATIONS: 'enableBulkOperations',
} as const;

// Local storage keys
export const STORAGE_KEYS = {
  THEME: 'app-theme',
  SIDEBAR_STATE: 'sidebar-collapsed',
  CURRENT_ORGANIZATION: 'currentOrganizationId',
  USER_PREFERENCES: 'userPreferences',
  AUTH_TOKEN: 'authToken',
  LANGUAGE: 'language',
  ONBOARDING_COMPLETED: 'onboardingCompleted',
  LAST_LOGIN: 'lastLogin',
} as const;

// Route paths
export const ROUTES = {
  HOME: '/',
  LOGIN: '/auth',
  DASHBOARD: '/dashboard',
  USERS: '/users',
  ORGANIZATIONS: '/organizations',
  FEEDBACK: '/feedback',
  FEEDBACK_DETAIL: '/feedback/:id',
  MY_FEEDBACK: '/my-feedback',
  SETTINGS: '/settings',
  PROFILE_SETTINGS: '/settings/profile',
  COMPANY_SETTINGS: '/settings/company',
  SYSTEM_SETTINGS: '/settings/system',
  NOTIFICATIONS: '/notifications',
  NOTIFICATION_MANAGEMENT: '/notification-management',
  MARKETPLACE: '/marketplace',
  FEATURE_DETAIL: '/features/:slug',
  BILLING: '/billing',
  INVITE_ACCEPTANCE: '/invite/:token',
  NOT_FOUND: '/404',
} as const;

// Menu sections for sidebar
export const MENU_SECTIONS = {
  MAIN: 'main',
  MANAGEMENT: 'management',
  SETTINGS: 'settings',
  SYSTEM: 'system',
} as const;

// Default values
export const DEFAULTS = {
  PAGE_SIZE: PAGINATION.DEFAULT_PAGE_SIZE,
  THEME: 'system',
  LANGUAGE: 'en',
  TIMEZONE: 'UTC',
  DATE_FORMAT: 'YYYY-MM-DD',
  TIME_FORMAT: 'HH:mm:ss',
  CURRENCY: 'USD',
} as const;

// Regular expressions
export const REGEX_PATTERNS = {
  EMAIL: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
  PHONE: /^\+?[\d\s\-\(\)]+$/,
  USERNAME: /^[a-zA-Z0-9_-]{3,30}$/,
  PASSWORD: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
  SLUG: /^[a-z0-9-]+$/,
  HEX_COLOR: /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/,
  URL: /^https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)$/,
} as const;

// Type utilities for constants
export type UserRole = typeof USER_ROLES[keyof typeof USER_ROLES];
export type UserStatus = typeof USER_STATUSES[keyof typeof USER_STATUSES];
export type FeedbackType = typeof FEEDBACK_TYPES[keyof typeof FEEDBACK_TYPES];
export type FeedbackStatus = typeof FEEDBACK_STATUSES[keyof typeof FEEDBACK_STATUSES];
export type FeedbackPriority = typeof FEEDBACK_PRIORITIES[keyof typeof FEEDBACK_PRIORITIES];
export type NotificationType = typeof NOTIFICATION_TYPES[keyof typeof NOTIFICATION_TYPES];
export type FileType = typeof FILE_TYPES[keyof typeof FILE_TYPES];
export type StorageBucket = typeof STORAGE_BUCKETS[keyof typeof STORAGE_BUCKETS];
export type QueryKey = typeof QUERY_KEYS[keyof typeof QUERY_KEYS];
export type MutationKey = typeof MUTATION_KEYS[keyof typeof MUTATION_KEYS];
export type Route = typeof ROUTES[keyof typeof ROUTES];
export type MenuSection = typeof MENU_SECTIONS[keyof typeof MENU_SECTIONS];
export type Feature = typeof FEATURES[keyof typeof FEATURES];
export type StorageKey = typeof STORAGE_KEYS[keyof typeof STORAGE_KEYS];
export type ErrorCode = typeof ERROR_CODES[keyof typeof ERROR_CODES];
export type SuccessType = typeof SUCCESS_TYPES[keyof typeof SUCCESS_TYPES];

// Utility functions for working with constants
export const getConstantKeys = <T extends Record<string, any>>(obj: T): (keyof T)[] => {
  return Object.keys(obj) as (keyof T)[];
};

export const getConstantValues = <T extends Record<string, any>>(obj: T): T[keyof T][] => {
  return Object.values(obj);
};

export const isValidConstantValue = <T extends Record<string, any>>(
  obj: T,
  value: any
): value is T[keyof T] => {
  return Object.values(obj).includes(value);
};

// Helper functions for common operations
export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

export const isValidEmail = (email: string): boolean => {
  return REGEX_PATTERNS.EMAIL.test(email);
};

export const isValidUsername = (username: string): boolean => {
  return REGEX_PATTERNS.USERNAME.test(username);
};

export const isValidUrl = (url: string): boolean => {
  return REGEX_PATTERNS.URL.test(url);
};

export const getFileType = (mimeType: string): FileType => {
  if (mimeType.startsWith('image/')) return FILE_TYPES.IMAGE;
  if (mimeType.startsWith('video/')) return FILE_TYPES.VIDEO;
  if (mimeType.startsWith('audio/')) return FILE_TYPES.AUDIO;
  if (ALLOWED_DOCUMENT_TYPES.includes(mimeType as any)) return FILE_TYPES.DOCUMENT;
  if (mimeType.includes('zip') || mimeType.includes('rar') || mimeType.includes('tar')) {
    return FILE_TYPES.ARCHIVE;
  }
  return FILE_TYPES.OTHER;
};

export const isImageFile = (mimeType: string): boolean => {
  return ALLOWED_IMAGE_TYPES.includes(mimeType as any);
};

export const isDocumentFile = (mimeType: string): boolean => {
  return ALLOWED_DOCUMENT_TYPES.includes(mimeType as any);
};

export const getMaxFileSize = (fileType: FileType): number => {
  switch (fileType) {
    case FILE_TYPES.IMAGE:
      return FILE_SIZE_LIMITS.AVATAR;
    case FILE_TYPES.DOCUMENT:
      return FILE_SIZE_LIMITS.DOCUMENT;
    default:
      return FILE_SIZE_LIMITS.ATTACHMENT;
  }
};