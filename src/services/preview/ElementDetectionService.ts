/**
 * ElementDetectionService - DOM Scanning and Element Classification
 * Automatically detects and classifies interactive elements for webhook configuration
 */

import {
  DetectedElement,
  ElementType,
  ElementMetadata,
  ElementScanResult,
  WebhookStatus,
  ScanConfiguration
} from '@/types/preview';

// Default scan configuration
const DEFAULT_SCAN_CONFIG: ScanConfiguration = {
  selectors: [
    'button',
    'input[type="button"]',
    'input[type="submit"]',
    'input[type="reset"]',
    'a[href]',
    'form',
    'input[type="text"]',
    'input[type="email"]',
    'input[type="password"]',
    'input[type="search"]',
    'input[type="tel"]',
    'input[type="url"]',
    'input[type="number"]',
    'input[type="date"]',
    'input[type="time"]',
    'input[type="datetime-local"]',
    'input[type="file"]',
    'input[type="checkbox"]',
    'input[type="radio"]',
    'select',
    'textarea',
    '[role="button"]',
    '[onclick]',
    '[data-testid]',
    '.btn',
    '.button'
  ],
  excludeSelectors: [
    'script',
    'style',
    'meta',
    'link',
    'title',
    '[hidden]',
    '[disabled]',
    '.preview-overlay',
    '.preview-indicator',
    '.preview-panel',
    '[data-preview-ignore]'
  ],
  includeHidden: false,
  includeDisabled: false,
  minSize: { width: 10, height: 10 },
  scanDelay: 300,
  maxElements: 1000,
  enablePerformanceMode: true
};

export class ElementDetectionService {
  private observer: MutationObserver | null = null;
  private scanTimeout: NodeJS.Timeout | null = null;
  private config: ScanConfiguration;
  private onElementsDetected?: (results: ElementScanResult) => void;
  private lastScanTime = 0;
  private elementCache = new Map<string, DetectedElement>();
  
  constructor(config: Partial<ScanConfiguration> = {}) {
    this.config = { ...DEFAULT_SCAN_CONFIG, ...config };
    
    // Create mutation observer for dynamic content
    this.observer = new MutationObserver(this.handleMutations.bind(this));
  }
  
  /**
   * Start monitoring the DOM for changes
   */
  startMonitoring(onElementsDetected: (results: ElementScanResult) => void) {
    this.onElementsDetected = onElementsDetected;
    
    // Start observing DOM changes
    if (this.observer) {
      this.observer.observe(document.body, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['class', 'id', 'style', 'hidden', 'disabled']
      });
    }
    
    // Initial scan
    this.scanElements();
  }
  
  /**
   * Stop monitoring the DOM
   */
  stopMonitoring() {
    if (this.observer) {
      this.observer.disconnect();
    }
    
    if (this.scanTimeout) {
      clearTimeout(this.scanTimeout);
    }
    
    this.onElementsDetected = undefined;
    this.elementCache.clear();
  }
  
  /**
   * Perform a manual scan of the DOM
   */
  async scanElements(): Promise<ElementScanResult> {
    const startTime = performance.now();
    
    try {
      // Get all potentially interactive elements
      const elements = this.findInteractiveElements();
      
      // Classify and process elements
      const detectedElements = await this.processElements(elements);
      
      // Create scan result
      const result: ElementScanResult = {
        timestamp: new Date(),
        elementsFound: detectedElements.length,
        elementsWithWebhooks: detectedElements.filter(el => el.webhookStatus !== 'none').length,
        scanDuration: Math.round(performance.now() - startTime),
        elements: detectedElements
      };
      
      // Update cache
      detectedElements.forEach(el => {
        this.elementCache.set(el.id, el);
      });
      
      // Notify listeners
      this.onElementsDetected?.(result);
      this.lastScanTime = Date.now();
      
      return result;
    } catch (error) {
      console.error('Element scan failed:', error);
      
      const errorResult: ElementScanResult = {
        timestamp: new Date(),
        elementsFound: 0,
        elementsWithWebhooks: 0,
        scanDuration: Math.round(performance.now() - startTime),
        elements: []
      };
      
      return errorResult;
    }
  }
  
  /**
   * Get a specific element by ID
   */
  getElement(elementId: string): DetectedElement | null {
    return this.elementCache.get(elementId) || null;
  }
  
  /**
   * Update an element's webhook status
   */
  updateElementStatus(elementId: string, status: WebhookStatus, webhookCount = 0) {
    const element = this.elementCache.get(elementId);
    if (element) {
      element.webhookStatus = status;
      element.webhookCount = webhookCount;
      this.elementCache.set(elementId, element);
    }
  }
  
  /**
   * Handle DOM mutations with debouncing
   */
  private handleMutations(mutations: MutationRecord[]) {
    // Check if any meaningful changes occurred
    const shouldRescan = mutations.some(mutation => {
      // Skip our own preview elements
      if (mutation.target instanceof Element) {
        if (mutation.target.closest('.preview-overlay, .preview-indicator, .preview-panel')) {
          return false;
        }
      }
      
      return (
        mutation.type === 'childList' && 
        (mutation.addedNodes.length > 0 || mutation.removedNodes.length > 0)
      ) || (
        mutation.type === 'attributes' && 
        ['class', 'id', 'hidden', 'disabled'].includes(mutation.attributeName || '')
      );
    });
    
    if (shouldRescan) {
      this.debouncedScan();
    }
  }
  
  /**
   * Debounced scanning to avoid excessive scans
   */
  private debouncedScan() {
    if (this.scanTimeout) {
      clearTimeout(this.scanTimeout);
    }
    
    this.scanTimeout = setTimeout(() => {
      this.scanElements();
    }, this.config.scanDelay);
  }
  
  /**
   * Find all potentially interactive elements
   */
  private findInteractiveElements(): Element[] {
    const elements: Element[] = [];
    
    // Query all selectors
    this.config.selectors.forEach(selector => {
      try {
        const foundElements = document.querySelectorAll(selector);
        elements.push(...Array.from(foundElements));
      } catch (error) {
        console.warn(`Invalid selector: ${selector}`, error);
      }
    });
    
    // Remove duplicates and filter excluded elements
    const uniqueElements = Array.from(new Set(elements));
    
    return uniqueElements.filter(element => {
      // Check exclude selectors
      for (const excludeSelector of this.config.excludeSelectors) {
        try {
          if (element.matches(excludeSelector) || element.closest(excludeSelector)) {
            return false;
          }
        } catch (error) {
          console.warn(`Invalid exclude selector: ${excludeSelector}`, error);
        }
      }
      
      // Check visibility and size requirements
      if (!this.isElementValid(element)) {
        return false;
      }
      
      return true;
    }).slice(0, this.config.maxElements);
  }
  
  /**
   * Check if an element meets our requirements
   */
  private isElementValid(element: Element): boolean {
    // Check if element is visible (unless includeHidden is true)
    if (!this.config.includeHidden) {
      const style = window.getComputedStyle(element);
      if (style.display === 'none' || 
          style.visibility === 'hidden' || 
          style.opacity === '0' ||
          element.hasAttribute('hidden')) {
        return false;
      }
    }
    
    // Check if element is enabled (unless includeDisabled is true)
    if (!this.config.includeDisabled) {
      if (element.hasAttribute('disabled') || 
          element.getAttribute('aria-disabled') === 'true') {
        return false;
      }
    }
    
    // Check minimum size
    try {
      const rect = element.getBoundingClientRect();
      if (rect.width < this.config.minSize.width || 
          rect.height < this.config.minSize.height) {
        return false;
      }
    } catch (error) {
      // If we can't get bounding rect, skip the element
      return false;
    }
    
    return true;
  }
  
  /**
   * Process and classify elements
   */
  private async processElements(elements: Element[]): Promise<DetectedElement[]> {
    const detectedElements: DetectedElement[] = [];
    
    for (const element of elements) {
      try {
        const detected = await this.processElement(element);
        if (detected) {
          detectedElements.push(detected);
        }
      } catch (error) {
        console.warn('Failed to process element:', element, error);
      }
    }
    
    return detectedElements;
  }
  
  /**
   * Process a single element
   */
  private async processElement(element: Element): Promise<DetectedElement | null> {
    try {
      const rect = element.getBoundingClientRect();
      const elementType = this.classifyElement(element);
      const metadata = this.extractMetadata(element);
      const elementId = this.generateElementId(element, metadata);
      
      // Check for existing webhook (mock for now)
      const webhookStatus = await this.getWebhookStatus(elementId);
      const webhookCount = webhookStatus === 'none' ? 0 : 1;
      
      const detected: DetectedElement = {
        id: elementId,
        elementType,
        domPath: this.generateDOMPath(element),
        contentHash: this.generateContentHash(element),
        boundingRect: rect,
        webhookStatus,
        webhookCount,
        metadata,
        isVisible: rect.width > 0 && rect.height > 0,
        zIndex: parseInt(window.getComputedStyle(element).zIndex) || 0
      };
      
      return detected;
    } catch (error) {
      console.error('Error processing element:', error);
      return null;
    }
  }
  
  /**
   * Classify element type
   */
  private classifyElement(element: Element): ElementType {
    const tagName = element.tagName.toLowerCase();
    const type = element.getAttribute('type')?.toLowerCase();
    const role = element.getAttribute('role')?.toLowerCase();
    
    // Button-like elements
    if (tagName === 'button' || 
        type === 'button' || 
        type === 'submit' || 
        type === 'reset' ||
        role === 'button' ||
        element.hasAttribute('onclick') ||
        element.classList.contains('btn') ||
        element.classList.contains('button')) {
      return 'button';
    }
    
    // Links
    if (tagName === 'a' && element.hasAttribute('href')) {
      return 'link';
    }
    
    // Forms
    if (tagName === 'form') {
      return 'form';
    }
    
    // Input types
    if (tagName === 'input') {
      switch (type) {
        case 'text':
        case 'email':
        case 'password':
        case 'search':
        case 'tel':
        case 'url':
        case 'number':
        case 'date':
        case 'time':
        case 'datetime-local':
          return 'input';
        case 'checkbox':
          return 'checkbox';
        case 'radio':
          return 'radio';
        case 'file':
          return 'file-upload';
        default:
          return 'input';
      }
    }
    
    // Select and textarea
    if (tagName === 'select') return 'select';
    if (tagName === 'textarea') return 'textarea';
    
    // Custom elements or unknown
    if (element.hasAttribute('data-testid') || 
        element.hasAttribute('data-element-id')) {
      return 'custom';
    }
    
    return 'unknown';
  }
  
  /**
   * Extract element metadata
   */
  private extractMetadata(element: Element): ElementMetadata {
    const rect = element.getBoundingClientRect();
    
    return {
      tagName: element.tagName.toLowerCase(),
      className: element.className || '',
      id: element.id || undefined,
      textContent: element.textContent?.trim().slice(0, 100) || '',
      href: element.getAttribute('href') || undefined,
      formAction: element.getAttribute('action') || undefined,
      inputType: element.getAttribute('type') || undefined,
      role: element.getAttribute('role') || undefined,
      ariaLabel: element.getAttribute('aria-label') || undefined,
      featureSlug: this.detectFeatureSlug(),
      pagePath: window.location.pathname,
      parentElement: element.parentElement?.tagName.toLowerCase(),
      childrenCount: element.children.length,
      isInteractive: this.isInteractiveElement(element),
      hasEventListeners: this.hasEventListeners(element),
      customAttributes: this.extractCustomAttributes(element)
    };
  }
  
  /**
   * Generate unique element ID
   */
  private generateElementId(element: Element, metadata: ElementMetadata): string {
    // Use existing ID if available
    if (element.id) {
      return `id_${element.id}`;
    }
    
    // Use data-testid if available
    const testId = element.getAttribute('data-testid');
    if (testId) {
      return `testid_${testId}`;
    }
    
    // Generate based on DOM path and content
    const domPath = this.generateDOMPath(element);
    const content = metadata.textContent.replace(/\s+/g, '_').toLowerCase();
    const hash = this.simpleHash(domPath + content);
    
    return `element_${metadata.tagName}_${hash}`;
  }
  
  /**
   * Generate DOM path for element
   */
  private generateDOMPath(element: Element): string {
    const path: string[] = [];
    let current = element;
    
    while (current && current !== document.body) {
      let selector = current.tagName.toLowerCase();
      
      // Add ID if available
      if (current.id) {
        selector += `#${current.id}`;
        path.unshift(selector);
        break; // ID is unique, we can stop here
      }
      
      // Add class if available
      if (current.className) {
        const classes = current.className.split(' ')
          .filter(cls => cls && !cls.startsWith('preview-'))
          .slice(0, 2) // Limit to first 2 classes
          .join('.');
        if (classes) {
          selector += `.${classes}`;
        }
      }
      
      // Add index if needed (when there are siblings with same selector)
      const parent = current.parentElement;
      if (parent) {
        const siblings = Array.from(parent.children).filter(el => 
          el.tagName === current.tagName
        );
        if (siblings.length > 1) {
          const index = siblings.indexOf(current);
          selector += `:nth-child(${index + 1})`;
        }
      }
      
      path.unshift(selector);
      current = current.parentElement!;
    }
    
    return path.join(' > ');
  }
  
  /**
   * Generate content hash for element
   */
  private generateContentHash(element: Element): string {
    const content = [
      element.tagName,
      element.textContent?.trim() || '',
      element.getAttribute('href') || '',
      element.getAttribute('type') || '',
      element.className || ''
    ].join('|');
    
    return this.simpleHash(content);
  }
  
  /**
   * Simple hash function
   */
  private simpleHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash).toString(36);
  }
  
  /**
   * Detect current feature slug from URL
   */
  private detectFeatureSlug(): string {
    const path = window.location.pathname;
    const segments = path.split('/').filter(s => s);
    
    // Common feature patterns
    const featureMap: Record<string, string> = {
      'admin': 'admin',
      'settings': 'settings',
      'dashboard': 'dashboard',
      'knowledge-base': 'knowledge-base',
      'kb': 'knowledge-base',
      'users': 'users',
      'organizations': 'organizations',
      'feedback': 'feedback'
    };
    
    for (const segment of segments) {
      if (featureMap[segment]) {
        return featureMap[segment];
      }
    }
    
    return segments[0] || 'dashboard';
  }
  
  /**
   * Check if element is interactive
   */
  private isInteractiveElement(element: Element): boolean {
    const interactiveTags = ['button', 'a', 'input', 'select', 'textarea'];
    const tagName = element.tagName.toLowerCase();
    
    return (
      interactiveTags.includes(tagName) ||
      element.hasAttribute('onclick') ||
      element.hasAttribute('role') ||
      element.getAttribute('tabindex') !== null
    );
  }
  
  /**
   * Check if element has event listeners (simplified check)
   */
  private hasEventListeners(element: Element): boolean {
    return !!(
      element.hasAttribute('onclick') ||
      element.hasAttribute('onchange') ||
      element.hasAttribute('onsubmit') ||
      element.hasAttribute('onfocus') ||
      element.hasAttribute('onblur')
    );
  }
  
  /**
   * Extract custom attributes
   */
  private extractCustomAttributes(element: Element): Record<string, string> {
    const customAttrs: Record<string, string> = {};
    
    for (const attr of element.attributes) {
      if (attr.name.startsWith('data-') || 
          attr.name.startsWith('aria-') ||
          attr.name === 'role' ||
          attr.name === 'tabindex') {
        customAttrs[attr.name] = attr.value;
      }
    }
    
    return customAttrs;
  }
  
  /**
   * Get webhook status for element (mock implementation)
   */
  private async getWebhookStatus(elementId: string): Promise<WebhookStatus> {
    // TODO: Replace with actual webhook lookup
    // This would check the database for existing webhooks
    
    // Mock some elements having webhooks for demonstration
    const mockWebhookElements = [
      'submit-button',
      'contact-form',
      'search-input'
    ];
    
    if (mockWebhookElements.some(mock => elementId.includes(mock))) {
      return Math.random() > 0.5 ? 'healthy' : 'warning';
    }
    
    return 'none';
  }
  
  /**
   * Update scan configuration
   */
  updateConfiguration(newConfig: Partial<ScanConfiguration>) {
    this.config = { ...this.config, ...newConfig };
  }
  
  /**
   * Get current configuration
   */
  getConfiguration(): ScanConfiguration {
    return { ...this.config };
  }
}