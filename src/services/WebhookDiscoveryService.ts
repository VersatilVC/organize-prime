/**
 * WebhookDiscoveryService - Automated discovery and registration of UI elements
 * Provides element scanning, registry management, and intelligent webhook suggestions
 */

import { BaseWebhookService, ServiceConfig } from './base/BaseWebhookService';
import {
  DiscoveredElement,
  PageElement,
  ElementRegistration,
  ElementUpdate,
  DiscoverySession,
  DiscoveryStatus,
  ElementChanges,
  WebhookSuggestion
} from '../types/webhook';

export interface DiscoveryConfig {
  autoApprove?: boolean;
  minInteractionTime?: number;
  excludeSelectors?: string[];
  includeHidden?: boolean;
  maxElementsPerPage?: number;
  scanInterval?: number;
}

export class WebhookDiscoveryService extends BaseWebhookService {
  private activeSessionId: string | null = null;
  private scanningActive: boolean = false;
  private discoveryConfig: DiscoveryConfig;
  private mutationObserver: MutationObserver | null = null;

  constructor(config: ServiceConfig, discoveryConfig: DiscoveryConfig = {}) {
    super(config);
    this.discoveryConfig = {
      autoApprove: false,
      minInteractionTime: 100,
      excludeSelectors: ['script', 'style', 'meta', 'link', 'title'],
      includeHidden: false,
      maxElementsPerPage: 1000,
      scanInterval: 5000,
      ...discoveryConfig
    };
  }

  /**
   * Scan page elements for webhook assignment opportunities
   */
  async scanPageElements(featureSlug: string, pagePath: string): Promise<DiscoveredElement[]> {
    this.validateRequired(featureSlug, 'feature slug');
    this.validateRequired(pagePath, 'page path');

    try {
      const discoveredElements: DiscoveredElement[] = [];
      const scanId = this.generateRequestId();

      this.logRequest('start', scanId, {
        requestId: scanId,
        timestamp: new Date().toISOString()
      }, { action: 'scanPageElements', featureSlug, pagePath });

      // Get all interactive elements from the DOM
      const interactiveSelectors = [
        'button',
        'input[type="button"]',
        'input[type="submit"]',
        'input[type="reset"]',
        'a[href]',
        'form',
        'select',
        'input[type="checkbox"]',
        'input[type="radio"]',
        '[onclick]',
        '[role="button"]',
        '[tabindex]'
      ];

      const allElements = document.querySelectorAll(interactiveSelectors.join(', '));
      let elementCount = 0;

      for (const element of allElements) {
        if (elementCount >= this.discoveryConfig.maxElementsPerPage!) {
          break;
        }

        // Skip excluded elements
        if (this.shouldExcludeElement(element as HTMLElement)) {
          continue;
        }

        // Skip hidden elements unless explicitly included
        if (!this.discoveryConfig.includeHidden && !this.isElementVisible(element as HTMLElement)) {
          continue;
        }

        const discoveredElement = this.extractElementData(element as HTMLElement, featureSlug, pagePath);
        if (discoveredElement) {
          discoveredElements.push(discoveredElement);
          elementCount++;
        }
      }

      // Store discovered elements in the database
      await this.storeDiscoveredElements(discoveredElements, featureSlug, pagePath);

      this.logRequest('success', scanId, undefined, {
        elementsFound: discoveredElements.length,
        totalScanned: allElements.length
      });

      return discoveredElements;

    } catch (error) {
      throw this.createServiceError(
        'DISCOVERY_ERROR',
        `Failed to scan page elements: ${error.message}`,
        { featureSlug, pagePath, error: error.message }
      );
    }
  }

  /**
   * Scan all pages for a feature
   */
  async scanAllPages(featureSlug: string): Promise<Map<string, DiscoveredElement[]>> {
    this.validateRequired(featureSlug, 'feature slug');

    const results = new Map<string, DiscoveredElement[]>();
    
    // Get all known pages for this feature from the database
    const knownPages = await this.getKnownPages(featureSlug);
    
    for (const pagePath of knownPages) {
      try {
        const elements = await this.scanPageElements(featureSlug, pagePath);
        results.set(pagePath, elements);
      } catch (error) {
        console.warn(`Failed to scan page ${pagePath}:`, error);
        results.set(pagePath, []);
      }
    }

    return results;
  }

  /**
   * Register a discovered element
   */
  async registerElement(registration: ElementRegistration): Promise<PageElement> {
    this.validateRequired(registration.featureSlug, 'feature slug');
    this.validateRequired(registration.pagePath, 'page path');
    this.validateRequired(registration.elementId, 'element ID');
    this.validateRequired(registration.displayName, 'display name');

    const elementData = {
      organization_id: this.config.organizationId,
      feature_slug: registration.featureSlug,
      page_path: registration.pagePath,
      element_id: registration.elementId,
      element_type: registration.elementType,
      display_name: registration.displayName,
      description: registration.description || null,
      css_selector: registration.cssSelector,
      xpath: registration.xpath,
      attributes: registration.attributes || {},
      is_stable: false, // Will be determined over time
      last_seen_at: new Date().toISOString(),
      registered_by: await this.getCurrentUserId(),
      registered_at: new Date().toISOString(),
      has_active_webhook: false,
      webhook_count: 0
    };

    return this.executeWithContext(
      async (supabase) => {
        const { data, error } = await supabase
          .from('page_elements_registry')
          .insert(elementData)
          .select(`
            id,
            organization_id,
            feature_slug,
            page_path,
            element_id,
            element_type,
            display_name,
            description,
            css_selector,
            xpath,
            attributes,
            is_stable,
            last_seen_at,
            registered_at,
            registered_by,
            has_active_webhook,
            webhook_count
          `)
          .single();

        return { data: data ? this.snakeToCamel(data) : null, error };
      },
      { requestId: this.generateRequestId() }
    );
  }

  /**
   * Update element registry
   */
  async updateElementRegistry(elementId: string, updates: ElementUpdate): Promise<PageElement> {
    this.validateRequired(elementId, 'element ID');

    const updateData = {
      ...this.camelToSnake(updates),
      last_seen_at: new Date().toISOString()
    };

    return this.executeWithContext(
      async (supabase) => {
        const { data, error } = await supabase
          .from('page_elements_registry')
          .update(updateData)
          .eq('element_id', elementId)
          .eq('organization_id', this.config.organizationId)
          .select(`
            id,
            organization_id,
            feature_slug,
            page_path,
            element_id,
            element_type,
            display_name,
            description,
            css_selector,
            xpath,
            attributes,
            is_stable,
            last_seen_at,
            registered_at,
            registered_by,
            has_active_webhook,
            webhook_count
          `)
          .single();

        return { data: data ? this.snakeToCamel(data) : null, error };
      },
      { requestId: this.generateRequestId() }
    );
  }

  /**
   * Get registered elements
   */
  async getRegisteredElements(featureSlug?: string): Promise<PageElement[]> {
    return this.executeWithContext(
      async (supabase) => {
        let query = supabase
          .from('page_elements_registry')
          .select(`
            id,
            organization_id,
            feature_slug,
            page_path,
            element_id,
            element_type,
            display_name,
            description,
            css_selector,
            xpath,
            attributes,
            is_stable,
            last_seen_at,
            registered_at,
            registered_by,
            has_active_webhook,
            webhook_count
          `)
          .eq('organization_id', this.config.organizationId);

        if (featureSlug) {
          query = query.eq('feature_slug', featureSlug);
        }

        query = query.order('registered_at', { ascending: false });

        const { data, error } = await query;

        return { data: data ? data.map(item => this.snakeToCamel(item)) : [], error };
      },
      { requestId: this.generateRequestId() }
    );
  }

  /**
   * Start auto-discovery session
   */
  async startAutoDiscovery(featureSlug: string): Promise<DiscoverySession> {
    this.validateRequired(featureSlug, 'feature slug');

    if (this.scanningActive) {
      throw this.createServiceError(
        'DISCOVERY_IN_PROGRESS',
        'Auto-discovery session is already active'
      );
    }

    const session: DiscoverySession = {
      id: this.generateExecutionId(),
      featureSlug,
      status: 'active',
      startedAt: new Date().toISOString(),
      elementsDiscovered: 0,
      pagesScanned: [],
      settings: {
        autoApprove: this.discoveryConfig.autoApprove!,
        minInteractionTime: this.discoveryConfig.minInteractionTime!,
        excludeSelectors: this.discoveryConfig.excludeSelectors!,
        includeHidden: this.discoveryConfig.includeHidden!
      }
    };

    this.activeSessionId = session.id;
    this.scanningActive = true;

    // Start monitoring DOM changes
    this.startDOMMonitoring(featureSlug);

    // Store session in database
    await this.storeDiscoverySession(session);

    return session;
  }

  /**
   * Stop auto-discovery session
   */
  async stopAutoDiscovery(sessionId: string): Promise<boolean> {
    this.validateRequired(sessionId, 'session ID');

    if (sessionId !== this.activeSessionId) {
      throw this.createServiceError(
        'INVALID_SESSION',
        'Session ID does not match active session'
      );
    }

    this.scanningActive = false;
    this.activeSessionId = null;

    // Stop DOM monitoring
    this.stopDOMMonitoring();

    // Update session status in database
    await this.updateDiscoverySession(sessionId, {
      status: 'completed',
      completedAt: new Date().toISOString()
    });

    return true;
  }

  /**
   * Get discovery session status
   */
  async getDiscoveryStatus(sessionId: string): Promise<DiscoveryStatus> {
    this.validateRequired(sessionId, 'session ID');

    const session = await this.getDiscoverySession(sessionId);
    if (!session) {
      throw this.createServiceError('NOT_FOUND', 'Discovery session not found');
    }

    const recentElements = await this.getRecentDiscoveredElements(sessionId, 10);
    const statistics = await this.getDiscoveryStatistics(sessionId);

    return {
      session,
      recentElements,
      statistics
    };
  }

  /**
   * Compare element changes between scans
   */
  async compareElementChanges(featureSlug: string, pagePath: string): Promise<ElementChanges> {
    this.validateRequired(featureSlug, 'feature slug');
    this.validateRequired(pagePath, 'page path');

    // Get previously registered elements
    const previousElements = await this.getElementsForPage(featureSlug, pagePath);
    
    // Scan current elements
    const currentElements = await this.scanPageElements(featureSlug, pagePath);

    // Build comparison
    const previousIds = new Set(previousElements.map(e => e.elementId));
    const currentIds = new Set(currentElements.map(e => e.elementId));

    const added = currentElements.filter(e => !previousIds.has(e.elementId));
    const removed = previousElements
      .filter(e => !currentIds.has(e.elementId))
      .map(e => e.elementId);

    const modified: ElementChanges['modified'] = [];
    const unchanged: string[] = [];

    for (const currentElement of currentElements) {
      const previousElement = previousElements.find(e => e.elementId === currentElement.elementId);
      
      if (previousElement) {
        const changes = this.detectElementChanges(previousElement, currentElement);
        
        if (changes.length > 0) {
          modified.push({
            elementId: currentElement.elementId,
            changes
          });
        } else {
          unchanged.push(currentElement.elementId);
        }
      }
    }

    return {
      featureSlug,
      pagePath,
      added,
      removed,
      modified,
      unchanged,
      scanTimestamp: new Date().toISOString()
    };
  }

  /**
   * Generate webhook suggestions for discovered elements
   */
  async suggestWebhookMappings(elements: DiscoveredElement[]): Promise<WebhookSuggestion[]> {
    const suggestions: WebhookSuggestion[] = [];

    for (const element of elements) {
      const suggestion = this.generateWebhookSuggestion(element);
      if (suggestion) {
        suggestions.push(suggestion);
      }
    }

    // Sort by confidence score (highest first)
    return suggestions.sort((a, b) => b.confidence - a.confidence);
  }

  /**
   * Subscribe to element changes (real-time monitoring)
   */
  subscribeToElementChanges(callback: (changes: ElementChanges) => void): () => void {
    // In a real implementation, this would set up WebSocket or server-sent events
    // For now, we'll simulate with a polling mechanism
    
    let isActive = true;
    const pollInterval = 10000; // 10 seconds

    const poll = async () => {
      if (!isActive) return;

      try {
        // This would typically be triggered by actual DOM changes
        // For demo purposes, we'll create a mock change event
        const mockChanges: ElementChanges = {
          featureSlug: 'demo',
          pagePath: '/current-page',
          added: [],
          removed: [],
          modified: [],
          unchanged: [],
          scanTimestamp: new Date().toISOString()
        };

        callback(mockChanges);
      } catch (error) {
        console.warn('Error in element change polling:', error);
      }

      if (isActive) {
        setTimeout(poll, pollInterval);
      }
    };

    // Start polling
    setTimeout(poll, pollInterval);

    // Return unsubscribe function
    return () => {
      isActive = false;
    };
  }

  /**
   * Private helper methods
   */

  private shouldExcludeElement(element: HTMLElement): boolean {
    const tagName = element.tagName.toLowerCase();
    
    // Check excluded selectors
    for (const selector of this.discoveryConfig.excludeSelectors!) {
      if (element.matches(selector)) {
        return true;
      }
    }

    // Skip elements without meaningful interaction
    if (tagName === 'div' && !element.onclick && !element.getAttribute('role')) {
      return true;
    }

    // Skip very small elements
    const rect = element.getBoundingClientRect();
    if (rect.width < 10 || rect.height < 10) {
      return true;
    }

    return false;
  }

  private isElementVisible(element: HTMLElement): boolean {
    const style = window.getComputedStyle(element);
    const rect = element.getBoundingClientRect();
    
    return style.display !== 'none' &&
           style.visibility !== 'hidden' &&
           style.opacity !== '0' &&
           rect.width > 0 &&
           rect.height > 0 &&
           rect.top < window.innerHeight &&
           rect.bottom > 0 &&
           rect.left < window.innerWidth &&
           rect.right > 0;
  }

  private extractElementData(element: HTMLElement, featureSlug: string, pagePath: string): DiscoveredElement | null {
    try {
      const rect = element.getBoundingClientRect();
      const attributes: Record<string, string> = {};
      
      // Extract relevant attributes
      for (const attr of element.attributes) {
        if (['id', 'class', 'name', 'type', 'role', 'data-testid', 'aria-label'].includes(attr.name)) {
          attributes[attr.name] = attr.value;
        }
      }

      // Generate unique element ID
      const elementId = this.generateElementId(element);
      
      // Generate selectors
      const cssSelector = this.generateCSSSelector(element);
      const xpath = this.generateXPath(element);

      // Determine element type
      const elementType = this.determineElementType(element);

      // Generate fingerprint for change detection
      const fingerprint = this.generateElementFingerprint(element);

      return {
        elementId,
        elementType,
        tagName: element.tagName.toLowerCase(),
        textContent: element.textContent?.trim()?.substring(0, 100) || undefined,
        attributes,
        cssSelector,
        xpath,
        boundingRect: {
          x: rect.x,
          y: rect.y,
          width: rect.width,
          height: rect.height
        },
        isVisible: this.isElementVisible(element),
        isInteractable: this.isElementInteractable(element),
        parentElementId: element.parentElement ? this.generateElementId(element.parentElement) : undefined,
        childElementIds: Array.from(element.children).map(child => this.generateElementId(child as HTMLElement)),
        discoveredAt: new Date().toISOString(),
        fingerprint
      };

    } catch (error) {
      console.warn('Failed to extract element data:', error);
      return null;
    }
  }

  private generateElementId(element: HTMLElement): string {
    // Priority order: id, data-testid, name, class + tag + text
    if (element.id) {
      return element.id;
    }

    if (element.getAttribute('data-testid')) {
      return element.getAttribute('data-testid')!;
    }

    if (element.getAttribute('name')) {
      return element.getAttribute('name')!;
    }

    // Generate based on position and content
    const tag = element.tagName.toLowerCase();
    const className = element.className.toString().split(' ').slice(0, 2).join('-');
    const text = element.textContent?.trim().substring(0, 20).replace(/\s+/g, '-') || '';
    const index = Array.from(element.parentElement?.children || []).indexOf(element);

    return `${tag}-${className}-${text}-${index}`.replace(/[^a-zA-Z0-9-]/g, '').toLowerCase();
  }

  private generateCSSSelector(element: HTMLElement): string {
    if (element.id) {
      return `#${element.id}`;
    }

    const path: string[] = [];
    let current: Element | null = element;

    while (current && current.nodeType === Node.ELEMENT_NODE) {
      let selector = current.tagName.toLowerCase();
      
      if (current.id) {
        selector += `#${current.id}`;
        path.unshift(selector);
        break;
      }

      if (current.className) {
        const classes = current.className.toString().split(' ').filter(c => c);
        if (classes.length > 0) {
          selector += `.${classes.slice(0, 2).join('.')}`;
        }
      }

      // Add nth-child if needed for uniqueness
      if (current.parentElement) {
        const siblings = Array.from(current.parentElement.children).filter(
          sibling => sibling.tagName === current!.tagName
        );
        
        if (siblings.length > 1) {
          const index = siblings.indexOf(current) + 1;
          selector += `:nth-child(${index})`;
        }
      }

      path.unshift(selector);
      current = current.parentElement;

      // Prevent infinite paths
      if (path.length > 10) break;
    }

    return path.join(' > ');
  }

  private generateXPath(element: HTMLElement): string {
    if (element.id) {
      return `//*[@id="${element.id}"]`;
    }

    const path: string[] = [];
    let current: Element | null = element;

    while (current && current.nodeType === Node.ELEMENT_NODE) {
      let index = 1;
      let sibling = current.previousElementSibling;

      while (sibling) {
        if (sibling.tagName === current.tagName) {
          index++;
        }
        sibling = sibling.previousElementSibling;
      }

      const tagName = current.tagName.toLowerCase();
      path.unshift(`${tagName}[${index}]`);
      current = current.parentElement;

      // Prevent infinite paths
      if (path.length > 10) break;
    }

    return `/${path.join('/')}`;
  }

  private determineElementType(element: HTMLElement): DiscoveredElement['elementType'] {
    const tagName = element.tagName.toLowerCase();
    const type = element.getAttribute('type');
    const role = element.getAttribute('role');

    if (tagName === 'button' || type === 'button' || type === 'submit' || role === 'button') {
      return 'button';
    }

    if (tagName === 'form') {
      return 'form';
    }

    if (tagName === 'a') {
      return 'link';
    }

    if (tagName === 'input') {
      return 'input';
    }

    if (tagName === 'select') {
      return 'select';
    }

    if (tagName === 'div' || tagName === 'span') {
      return tagName as 'div' | 'span';
    }

    return 'other';
  }

  private generateElementFingerprint(element: HTMLElement): string {
    const data = {
      tag: element.tagName,
      id: element.id,
      className: element.className,
      textContent: element.textContent?.trim(),
      attributes: Object.fromEntries(
        Array.from(element.attributes).map(attr => [attr.name, attr.value])
      )
    };

    return btoa(JSON.stringify(data));
  }

  private isElementInteractable(element: HTMLElement): boolean {
    const interactiveTypes = ['button', 'submit', 'reset', 'checkbox', 'radio'];
    const interactiveTags = ['button', 'a', 'select', 'textarea'];
    
    return interactiveTags.includes(element.tagName.toLowerCase()) ||
           interactiveTypes.includes(element.getAttribute('type') || '') ||
           element.hasAttribute('onclick') ||
           element.hasAttribute('role') ||
           element.hasAttribute('tabindex');
  }

  private async storeDiscoveredElements(
    elements: DiscoveredElement[],
    featureSlug: string,
    pagePath: string
  ): Promise<void> {
    if (elements.length === 0) return;

    const data = elements.map(element => ({
      organization_id: this.config.organizationId,
      feature_slug: featureSlug,
      page_path: pagePath,
      element_id: element.elementId,
      element_type: element.elementType,
      css_selector: element.cssSelector,
      xpath: element.xpath,
      attributes: element.attributes,
      discovered_at: element.discoveredAt,
      fingerprint: element.fingerprint,
      is_visible: element.isVisible,
      is_interactable: element.isInteractable
    }));

    await this.executeWithContext(
      async (supabase) => {
        const { error } = await supabase
          .from('discovered_elements_temp')
          .insert(data);

        return { data: true, error };
      },
      { requestId: this.generateRequestId() }
    );
  }

  private generateWebhookSuggestion(element: DiscoveredElement): WebhookSuggestion | null {
    let confidence = 0;
    const reasoning: string[] = [];
    let suggestedMethod: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' = 'POST';
    let priority: 'low' | 'medium' | 'high' = 'low';

    // Analyze element characteristics
    if (element.elementType === 'button') {
      confidence += 0.8;
      reasoning.push('Button elements are primary webhook candidates');
      priority = 'high';
    }

    if (element.elementType === 'form') {
      confidence += 0.7;
      reasoning.push('Form submissions are common webhook triggers');
      priority = 'high';
      suggestedMethod = 'POST';
    }

    if (element.textContent?.toLowerCase().includes('submit')) {
      confidence += 0.3;
      reasoning.push('Submit-related text suggests form submission');
    }

    if (element.textContent?.toLowerCase().includes('save')) {
      confidence += 0.3;
      reasoning.push('Save action suggests data persistence');
    }

    if (element.textContent?.toLowerCase().includes('delete')) {
      confidence += 0.2;
      reasoning.push('Delete action suggests data removal');
      suggestedMethod = 'DELETE';
    }

    if (element.attributes['data-testid']) {
      confidence += 0.2;
      reasoning.push('Test ID indicates important interactive element');
    }

    if (element.isInteractable) {
      confidence += 0.1;
      reasoning.push('Element is interactable');
    }

    // Only suggest if confidence is reasonable
    if (confidence < 0.3) {
      return null;
    }

    // Generate suggested endpoint
    const suggestedEndpoint = this.generateSuggestedEndpoint(element);

    // Generate payload template
    const payloadTemplate = this.generatePayloadTemplate(element);

    return {
      elementId: element.elementId,
      confidence: Math.min(confidence, 1.0),
      suggestedEndpoint,
      suggestedMethod,
      reasoning,
      payloadTemplate,
      priority
    };
  }

  private generateSuggestedEndpoint(element: DiscoveredElement): string {
    const baseUrl = 'https://your-webhook-server.com/webhooks';
    const action = this.inferActionFromElement(element);
    
    return `${baseUrl}/${action}`;
  }

  private inferActionFromElement(element: DiscoveredElement): string {
    const text = element.textContent?.toLowerCase() || '';
    const id = element.elementId.toLowerCase();

    if (text.includes('submit') || text.includes('save')) {
      return 'submit';
    }

    if (text.includes('delete') || text.includes('remove')) {
      return 'delete';
    }

    if (text.includes('update') || text.includes('edit')) {
      return 'update';
    }

    if (text.includes('create') || text.includes('add')) {
      return 'create';
    }

    if (id.includes('submit') || id.includes('save')) {
      return 'submit';
    }

    return 'action';
  }

  private generatePayloadTemplate(element: DiscoveredElement): Record<string, any> {
    const template: Record<string, any> = {
      elementId: '${elementId}',
      action: '${eventType}',
      timestamp: '${timestamp}',
      userId: '${userId}'
    };

    // Add element-specific fields
    if (element.elementType === 'form') {
      template.formData = '${formData}';
    }

    if (element.textContent) {
      template.elementText = element.textContent;
    }

    return template;
  }

  private startDOMMonitoring(featureSlug: string): void {
    if (this.mutationObserver) {
      this.stopDOMMonitoring();
    }

    this.mutationObserver = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.type === 'childList') {
          // Handle added/removed nodes
          this.handleDOMChanges(mutation, featureSlug);
        }
      }
    });

    this.mutationObserver.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['id', 'class', 'role', 'data-testid']
    });
  }

  private stopDOMMonitoring(): void {
    if (this.mutationObserver) {
      this.mutationObserver.disconnect();
      this.mutationObserver = null;
    }
  }

  private handleDOMChanges(mutation: MutationRecord, featureSlug: string): void {
    // Process added nodes
    for (const node of mutation.addedNodes) {
      if (node.nodeType === Node.ELEMENT_NODE) {
        const element = node as HTMLElement;
        if (this.isElementInteractable(element)) {
          // New interactive element discovered
          this.onNewElementDiscovered(element, featureSlug);
        }
      }
    }
  }

  private async onNewElementDiscovered(element: HTMLElement, featureSlug: string): Promise<void> {
    try {
      const pagePath = window.location.pathname;
      const discoveredElement = this.extractElementData(element, featureSlug, pagePath);
      
      if (discoveredElement) {
        await this.storeDiscoveredElements([discoveredElement], featureSlug, pagePath);
        
        // Auto-register if configured
        if (this.discoveryConfig.autoApprove) {
          await this.registerElement({
            featureSlug,
            pagePath,
            elementId: discoveredElement.elementId,
            displayName: discoveredElement.textContent || discoveredElement.elementId,
            elementType: discoveredElement.elementType,
            cssSelector: discoveredElement.cssSelector,
            xpath: discoveredElement.xpath,
            attributes: discoveredElement.attributes
          });
        }
      }
    } catch (error) {
      console.warn('Failed to process newly discovered element:', error);
    }
  }

  private detectElementChanges(previous: any, current: DiscoveredElement): Array<{ field: string; oldValue: any; newValue: any }> {
    const changes: Array<{ field: string; oldValue: any; newValue: any }> = [];
    
    const fieldsToCheck = ['cssSelector', 'xpath', 'textContent', 'attributes', 'isVisible'];
    
    for (const field of fieldsToCheck) {
      const oldValue = previous[field];
      const newValue = current[field as keyof DiscoveredElement];
      
      if (JSON.stringify(oldValue) !== JSON.stringify(newValue)) {
        changes.push({ field, oldValue, newValue });
      }
    }
    
    return changes;
  }

  // Additional private helper methods for database operations
  private async getKnownPages(featureSlug: string): Promise<string[]> {
    // Implementation would query the database for known pages
    return ['/dashboard', '/settings', '/profile']; // Mock data
  }

  private async getElementsForPage(featureSlug: string, pagePath: string): Promise<any[]> {
    // Implementation would query registered elements for a page
    return []; // Mock data
  }

  private async storeDiscoverySession(session: DiscoverySession): Promise<void> {
    // Implementation would store session in database
  }

  private async updateDiscoverySession(sessionId: string, updates: any): Promise<void> {
    // Implementation would update session in database
  }

  private async getDiscoverySession(sessionId: string): Promise<DiscoverySession | null> {
    // Implementation would retrieve session from database
    return null;
  }

  private async getRecentDiscoveredElements(sessionId: string, limit: number): Promise<DiscoveredElement[]> {
    // Implementation would get recent elements for session
    return [];
  }

  private async getDiscoveryStatistics(sessionId: string): Promise<any> {
    // Implementation would calculate discovery statistics
    return {
      totalElements: 0,
      newElements: 0,
      changedElements: 0,
      stableElements: 0
    };
  }

  private async getCurrentUserId(): Promise<string> {
    // Try to get actual user from auth if available
    try {
      const { data: { user } } = await this.supabase.auth.getUser();
      if (user?.id) {
        return user.id;
      }
    } catch (error) {
      // Fallback - continue with generated UUID
    }
    
    // Generate a consistent test UUID for testing
    return '00000000-0000-4000-8000-000000000001';
  }
}