/**
 * TypeScript definitions for Visual Preview Interface
 * Phase 4.1: Visual Button-Level Webhook System
 */

// Core preview mode state
export interface PreviewModeState {
  isActive: boolean;
  selectedElements: string[];
  overlayOpacity: number;
  showInactiveElements: boolean;
  filterOptions: PreviewFilterOptions;
  scanResults: ElementScanResult[];
  currentSession: PreviewSession | null;
}

// Preview filter options
export interface PreviewFilterOptions {
  elementTypes: ElementType[];
  webhookStatus: WebhookStatusFilter[];
  featureSlug?: string;
  searchQuery?: string;
}

// Element detection and classification
export interface DetectedElement {
  id: string;
  elementType: ElementType;
  domPath: string;
  contentHash: string;
  boundingRect: DOMRect;
  webhookStatus: WebhookStatus;
  webhookCount: number;
  metadata: ElementMetadata;
  isVisible: boolean;
  zIndex: number;
}

export interface ElementScanResult {
  timestamp: Date;
  elementsFound: number;
  elementsWithWebhooks: number;
  scanDuration: number;
  elements: DetectedElement[];
}

// Element types and metadata
export type ElementType = 
  | 'button'
  | 'link' 
  | 'form'
  | 'input'
  | 'select'
  | 'textarea'
  | 'checkbox'
  | 'radio'
  | 'file-upload'
  | 'custom'
  | 'unknown';

export interface ElementMetadata {
  tagName: string;
  className: string;
  id?: string;
  textContent: string;
  href?: string;
  formAction?: string;
  inputType?: string;
  role?: string;
  ariaLabel?: string;
  featureSlug: string;
  pagePath: string;
  parentElement?: string;
  childrenCount: number;
  isInteractive: boolean;
  hasEventListeners: boolean;
  customAttributes: Record<string, string>;
}

// Webhook status for visual indicators
export type WebhookStatus = 
  | 'none'      // No webhook configured (gray)
  | 'healthy'   // Active webhook, working (green)
  | 'warning'   // Webhook disabled or has warnings (orange)
  | 'error'     // Webhook error or failed (red)
  | 'testing'   // Webhook in test mode (blue)
  | 'loading';  // Status being determined (pulsing)

export type WebhookStatusFilter = WebhookStatus | 'all';

// Preview session management
export interface PreviewSession {
  id: string;
  userId: string;
  organizationId: string;
  featureSlug: string;
  pagePath: string;
  startedAt: Date;
  lastActivity: Date;
  sessionData: PreviewSessionData;
}

export interface PreviewSessionData {
  elementsInteracted: string[];
  webhooksConfigured: number;
  webhooksTested: number;
  timeSpent: number;
  actionsPerformed: PreviewAction[];
  preferences: PreviewPreferences;
}

// User actions and interactions
export interface PreviewAction {
  id: string;
  type: PreviewActionType;
  elementId: string;
  timestamp: Date;
  details: Record<string, any>;
  success: boolean;
  duration: number;
}

export type PreviewActionType =
  | 'element_selected'
  | 'webhook_created'
  | 'webhook_updated'
  | 'webhook_deleted'
  | 'webhook_tested'
  | 'bulk_operation'
  | 'configuration_copied'
  | 'template_applied';

// User preferences for preview mode
export interface PreviewPreferences {
  overlayOpacity: number;
  showTooltips: boolean;
  enableKeyboardShortcuts: boolean;
  highlightOnHover: boolean;
  showElementInfo: boolean;
  autoSaveConfigurations: boolean;
  groupRelatedElements: boolean;
  compactMode: boolean;
}

// Visual overlay components
export interface OverlayPosition {
  top: number;
  left: number;
  width: number;
  height: number;
  zIndex: number;
}

export interface ElementIndicator {
  elementId: string;
  position: OverlayPosition;
  status: WebhookStatus;
  webhookCount: number;
  isSelected: boolean;
  isHovered: boolean;
  tooltipContent?: string;
}

// Context menu options
export interface ContextMenuOption {
  id: string;
  label: string;
  icon: string;
  action: ContextMenuAction;
  disabled?: boolean;
  danger?: boolean;
  shortcut?: string;
}

export type ContextMenuAction =
  | 'create_webhook'
  | 'edit_webhook'
  | 'delete_webhook'
  | 'test_webhook'
  | 'copy_configuration'
  | 'paste_configuration'
  | 'view_history'
  | 'bulk_select'
  | 'show_info';

// Element information panel data
export interface ElementInfo {
  element: DetectedElement;
  webhooks: ElementWebhookSummary[];
  executionHistory: WebhookExecutionSummary[];
  analytics: ElementAnalytics;
  recommendations: WebhookRecommendation[];
}

export interface ElementWebhookSummary {
  id: string;
  displayName: string;
  endpointUrl: string;
  isActive: boolean;
  healthStatus: WebhookStatus;
  lastExecuted?: Date;
  totalExecutions: number;
  successRate: number;
}

export interface WebhookExecutionSummary {
  id: string;
  timestamp: Date;
  success: boolean;
  responseTime: number;
  statusCode?: number;
  errorMessage?: string;
}

export interface ElementAnalytics {
  totalClicks: number;
  uniqueUsers: number;
  averageResponseTime: number;
  successRate: number;
  lastUsed: Date;
  usagePattern: UsagePattern;
  performanceMetrics: PerformanceMetrics;
}

export interface UsagePattern {
  hourlyDistribution: number[];
  dailyDistribution: number[];
  weeklyDistribution: number[];
  peakUsageHours: string[];
}

export interface PerformanceMetrics {
  averageLoadTime: number;
  renderTime: number;
  interactionDelay: number;
  errorRate: number;
  bounceRate: number;
}

export interface WebhookRecommendation {
  type: RecommendationType;
  priority: 'low' | 'medium' | 'high';
  title: string;
  description: string;
  actionText: string;
  action: () => void;
  benefits: string[];
}

export type RecommendationType =
  | 'performance_optimization'
  | 'security_enhancement'
  | 'error_handling'
  | 'monitoring_improvement'
  | 'user_experience'
  | 'data_collection';

// Bulk operations
export interface BulkOperation {
  type: BulkOperationType;
  elementIds: string[];
  configuration?: Partial<ElementWebhook>;
  templateId?: string;
  confirmation: boolean;
}

export type BulkOperationType =
  | 'enable_webhooks'
  | 'disable_webhooks'
  | 'delete_webhooks'
  | 'apply_template'
  | 'copy_configuration'
  | 'test_webhooks'
  | 'update_settings';

// DOM scanning configuration
export interface ScanConfiguration {
  selectors: string[];
  excludeSelectors: string[];
  includeHidden: boolean;
  includeDisabled: boolean;
  minSize: { width: number; height: number };
  scanDelay: number;
  maxElements: number;
  enablePerformanceMode: boolean;
}

// Error handling
export interface PreviewError {
  code: string;
  message: string;
  details?: Record<string, any>;
  timestamp: Date;
  recoverable: boolean;
  action?: () => void;
}

// Events and callbacks
export interface PreviewModeEvents {
  onActivate?: () => void;
  onDeactivate?: () => void;
  onElementDetected?: (element: DetectedElement) => void;
  onElementSelected?: (elementId: string) => void;
  onWebhookConfigured?: (elementId: string, webhook: ElementWebhook) => void;
  onError?: (error: PreviewError) => void;
  onScanComplete?: (results: ElementScanResult) => void;
}

// Export commonly used types
export type { ElementWebhook } from './webhook';