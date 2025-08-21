// Phase 4.5: Smart Element Grouping
// Intelligent detection of element relationships and workflows

import { generateElementSignature } from './element-utils';

export interface ElementGroup {
  id: string;
  name: string;
  type: 'form' | 'workflow' | 'navigation' | 'action-set' | 'data-entry' | 'custom';
  elements: GroupElement[];
  confidence: number; // 0-1 score for grouping accuracy
  description: string;
  suggestedWebhookFlow?: string[];
}

export interface GroupElement {
  id: string;
  signature: string;
  element: HTMLElement;
  role: 'primary' | 'secondary' | 'supporting';
  relationship: string; // Describes relationship to other elements
}

export interface GroupingContext {
  containerElement: HTMLElement;
  allElements: HTMLElement[];
  existingGroups: ElementGroup[];
}

// Main grouping engine
export class SmartElementGrouper {
  private confidenceThreshold = 0.6;
  
  constructor(private context: GroupingContext) {}

  // Analyze all elements and generate intelligent groupings
  analyzeAndGroup(): ElementGroup[] {
    const groups: ElementGroup[] = [];
    const ungroupedElements = new Set(this.context.allElements);

    // Step 1: Form-based grouping (highest priority)
    const formGroups = this.detectFormGroups(Array.from(ungroupedElements));
    formGroups.forEach(group => {
      groups.push(group);
      group.elements.forEach(el => ungroupedElements.delete(el.element));
    });

    // Step 2: Container-based grouping
    const containerGroups = this.detectContainerGroups(Array.from(ungroupedElements));
    containerGroups.forEach(group => {
      if (group.confidence >= this.confidenceThreshold) {
        groups.push(group);
        group.elements.forEach(el => ungroupedElements.delete(el.element));
      }
    });

    // Step 3: Workflow-based grouping (sequential actions)
    const workflowGroups = this.detectWorkflowGroups(Array.from(ungroupedElements));
    workflowGroups.forEach(group => {
      if (group.confidence >= this.confidenceThreshold) {
        groups.push(group);
        group.elements.forEach(el => ungroupedElements.delete(el.element));
      }
    });

    // Step 4: Semantic grouping (similar purpose/text)
    const semanticGroups = this.detectSemanticGroups(Array.from(ungroupedElements));
    semanticGroups.forEach(group => {
      if (group.confidence >= this.confidenceThreshold) {
        groups.push(group);
        group.elements.forEach(el => ungroupedElements.delete(el.element));
      }
    });

    // Step 5: Proximity-based grouping (last resort)
    const proximityGroups = this.detectProximityGroups(Array.from(ungroupedElements));
    proximityGroups.forEach(group => {
      if (group.confidence >= 0.4) { // Lower threshold for proximity
        groups.push(group);
        group.elements.forEach(el => ungroupedElements.delete(el.element));
      }
    });

    return this.optimizeGroups(groups);
  }

  // Detect form-based element groups (highest confidence)
  private detectFormGroups(elements: HTMLElement[]): ElementGroup[] {
    const groups: ElementGroup[] = [];
    const processedForms = new Set<HTMLElement>();

    elements.forEach(element => {
      const form = element.closest('form');
      if (form && !processedForms.has(form)) {
        processedForms.add(form);
        
        const formElements = elements.filter(el => 
          el.closest('form') === form || el === form
        );

        if (formElements.length >= 2) {
          const groupElements = this.analyzeFormElements(formElements, form);
          
          groups.push({
            id: `form-${this.generateGroupId(form)}`,
            name: this.inferFormName(form, formElements),
            type: 'form',
            elements: groupElements,
            confidence: 0.95,
            description: `Form workflow with ${groupElements.length} interactive elements`,
            suggestedWebhookFlow: this.suggestFormWebhookFlow(groupElements)
          });
        }
      }
    });

    return groups;
  }

  // Analyze elements within a form context
  private analyzeFormElements(elements: HTMLElement[], form: HTMLElement): GroupElement[] {
    const groupElements: GroupElement[] = [];
    
    elements.forEach(element => {
      const signature = generateElementSignature(element);
      let role: 'primary' | 'secondary' | 'supporting' = 'supporting';
      let relationship = 'form-member';

      // Determine element role within form
      const tagName = element.tagName.toLowerCase();
      const type = element.getAttribute('type')?.toLowerCase();
      const className = element.className.toLowerCase();
      const textContent = element.textContent?.toLowerCase() || '';

      if (tagName === 'button' || type === 'submit') {
        role = 'primary';
        relationship = 'form-submit';
      } else if (type === 'reset' || textContent.includes('cancel') || textContent.includes('clear')) {
        role = 'secondary';
        relationship = 'form-reset';
      } else if (tagName === 'input' || tagName === 'textarea' || tagName === 'select') {
        role = 'supporting';
        relationship = 'data-input';
      } else if (className.includes('validate') || className.includes('check')) {
        role = 'secondary';
        relationship = 'form-validation';
      }

      groupElements.push({
        id: signature,
        signature,
        element,
        role,
        relationship
      });
    });

    return groupElements;
  }

  // Detect container-based groups (cards, panels, sections)
  private detectContainerGroups(elements: HTMLElement[]): ElementGroup[] {
    const groups: ElementGroup[] = [];
    const containerSelectors = [
      '.card', '.panel', '.section', '.widget', '.module',
      '[role="region"]', '[role="main"]', '[role="complementary"]',
      '.container', '.wrapper', '.block', '.component'
    ];

    containerSelectors.forEach(selector => {
      const containers = this.context.containerElement.querySelectorAll(selector);
      
      containers.forEach(container => {
        const containerElements = elements.filter(el => 
          container.contains(el) && container !== el
        );

        if (containerElements.length >= 2) {
          const groupElements = containerElements.map(element => ({
            id: generateElementSignature(element),
            signature: generateElementSignature(element),
            element,
            role: this.inferElementRole(element, container),
            relationship: this.inferContainerRelationship(element, container)
          }));

          groups.push({
            id: `container-${this.generateGroupId(container as HTMLElement)}`,
            name: this.inferContainerName(container as HTMLElement, containerElements),
            type: this.inferContainerType(container as HTMLElement, containerElements),
            elements: groupElements,
            confidence: this.calculateContainerConfidence(container as HTMLElement, containerElements),
            description: `Container-based group with ${containerElements.length} elements`,
            suggestedWebhookFlow: this.suggestContainerWebhookFlow(groupElements)
          });
        }
      });
    });

    return groups;
  }

  // Detect workflow-based groups (sequential user actions)
  private detectWorkflowGroups(elements: HTMLElement[]): ElementGroup[] {
    const groups: ElementGroup[] = [];
    const workflows = this.identifyWorkflowPatterns(elements);

    workflows.forEach(workflow => {
      if (workflow.elements.length >= 2) {
        groups.push({
          id: `workflow-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
          name: workflow.name,
          type: 'workflow',
          elements: workflow.elements,
          confidence: workflow.confidence,
          description: workflow.description,
          suggestedWebhookFlow: workflow.suggestedWebhookFlow
        });
      }
    });

    return groups;
  }

  // Detect semantic groups (similar purpose/meaning)
  private detectSemanticGroups(elements: HTMLElement[]): ElementGroup[] {
    const groups: ElementGroup[] = [];
    const semanticClusters = this.clusterBySemantic(elements);

    semanticClusters.forEach(cluster => {
      if (cluster.elements.length >= 2) {
        const groupElements = cluster.elements.map(element => ({
          id: generateElementSignature(element),
          signature: generateElementSignature(element),
          element,
          role: 'primary' as const,
          relationship: cluster.relationship
        }));

        groups.push({
          id: `semantic-${cluster.theme}`,
          name: cluster.name,
          type: cluster.type,
          elements: groupElements,
          confidence: cluster.confidence,
          description: cluster.description,
          suggestedWebhookFlow: cluster.suggestedWebhookFlow
        });
      }
    });

    return groups;
  }

  // Detect proximity-based groups (spatially close elements)
  private detectProximityGroups(elements: HTMLElement[]): ElementGroup[] {
    const groups: ElementGroup[] = [];
    const proximityThreshold = 150; // pixels
    const clusters = this.spatialClustering(elements, proximityThreshold);

    clusters.forEach(cluster => {
      if (cluster.length >= 3) { // Higher threshold for proximity groups
        const groupElements = cluster.map(element => ({
          id: generateElementSignature(element),
          signature: generateElementSignature(element),
          element,
          role: 'primary' as const,
          relationship: 'spatially-related'
        }));

        groups.push({
          id: `proximity-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
          name: `Grouped Elements (${cluster.length})`,
          type: 'custom',
          elements: groupElements,
          confidence: 0.5,
          description: `${cluster.length} spatially grouped elements`,
          suggestedWebhookFlow: ['sequential-execution']
        });
      }
    });

    return groups;
  }

  // Workflow pattern identification
  private identifyWorkflowPatterns(elements: HTMLElement[]) {
    const workflows: any[] = [];

    // CRUD operations pattern
    const crudElements = this.identifyCRUDPattern(elements);
    if (crudElements.length >= 2) {
      workflows.push({
        name: 'CRUD Operations',
        elements: crudElements,
        confidence: 0.8,
        description: 'Create, Read, Update, Delete operations workflow',
        suggestedWebhookFlow: ['validation', 'execute', 'audit', 'notify']
      });
    }

    // Multi-step process pattern
    const stepElements = this.identifyMultiStepPattern(elements);
    if (stepElements.length >= 2) {
      workflows.push({
        name: 'Multi-Step Process',
        elements: stepElements,
        confidence: 0.75,
        description: 'Sequential multi-step user workflow',
        suggestedWebhookFlow: ['step-validation', 'step-completion', 'progress-tracking']
      });
    }

    // Authentication flow pattern
    const authElements = this.identifyAuthPattern(elements);
    if (authElements.length >= 2) {
      workflows.push({
        name: 'Authentication Flow',
        elements: authElements,
        confidence: 0.9,
        description: 'User authentication and authorization workflow',
        suggestedWebhookFlow: ['pre-auth', 'auth-success', 'auth-failure', 'session-management']
      });
    }

    return workflows;
  }

  // Helper methods for pattern identification
  private identifyCRUDPattern(elements: HTMLElement[]): GroupElement[] {
    const crudKeywords = {
      create: ['create', 'add', 'new', 'insert', 'post'],
      read: ['read', 'view', 'get', 'fetch', 'load', 'display'],
      update: ['update', 'edit', 'modify', 'change', 'put', 'patch'],
      delete: ['delete', 'remove', 'destroy', 'trash', 'del']
    };

    const crudElements: GroupElement[] = [];
    
    elements.forEach(element => {
      const text = (element.textContent || element.getAttribute('aria-label') || '').toLowerCase();
      const className = element.className.toLowerCase();
      
      let crudType = '';
      for (const [type, keywords] of Object.entries(crudKeywords)) {
        if (keywords.some(keyword => text.includes(keyword) || className.includes(keyword))) {
          crudType = type;
          break;
        }
      }

      if (crudType) {
        crudElements.push({
          id: generateElementSignature(element),
          signature: generateElementSignature(element),
          element,
          role: 'primary',
          relationship: `crud-${crudType}`
        });
      }
    });

    return crudElements;
  }

  private identifyMultiStepPattern(elements: HTMLElement[]): GroupElement[] {
    const stepElements: GroupElement[] = [];
    const stepKeywords = ['step', 'next', 'previous', 'continue', 'back', 'finish', 'complete'];

    elements.forEach(element => {
      const text = (element.textContent || '').toLowerCase();
      const hasStepKeyword = stepKeywords.some(keyword => text.includes(keyword));
      const hasStepNumber = /step\s*\d+|^\d+\./.test(text);

      if (hasStepKeyword || hasStepNumber) {
        stepElements.push({
          id: generateElementSignature(element),
          signature: generateElementSignature(element),
          element,
          role: 'primary',
          relationship: 'step-control'
        });
      }
    });

    return stepElements;
  }

  private identifyAuthPattern(elements: HTMLElement[]): GroupElement[] {
    const authElements: GroupElement[] = [];
    const authKeywords = ['login', 'signin', 'signup', 'register', 'logout', 'password', 'username', 'auth'];

    elements.forEach(element => {
      const text = (element.textContent || element.getAttribute('name') || '').toLowerCase();
      const className = element.className.toLowerCase();
      
      if (authKeywords.some(keyword => text.includes(keyword) || className.includes(keyword))) {
        authElements.push({
          id: generateElementSignature(element),
          signature: generateElementSignature(element),
          element,
          role: 'primary',
          relationship: 'authentication'
        });
      }
    });

    return authElements;
  }

  // Semantic clustering
  private clusterBySemantic(elements: HTMLElement[]) {
    const clusters: any[] = [];
    const semanticThemes = this.identifySemanticThemes(elements);

    semanticThemes.forEach(theme => {
      clusters.push({
        theme: theme.name,
        name: theme.displayName,
        type: theme.type,
        elements: theme.elements,
        confidence: theme.confidence,
        relationship: theme.relationship,
        description: theme.description,
        suggestedWebhookFlow: theme.suggestedWebhookFlow
      });
    });

    return clusters;
  }

  private identifySemanticThemes(elements: HTMLElement[]) {
    const themes = [
      {
        name: 'navigation',
        displayName: 'Navigation Controls',
        type: 'navigation' as const,
        keywords: ['nav', 'menu', 'link', 'go', 'home', 'back', 'forward'],
        relationship: 'navigation-control',
        suggestedWebhookFlow: ['navigation-tracking', 'analytics']
      },
      {
        name: 'data-entry',
        displayName: 'Data Entry',
        type: 'data-entry' as const,
        keywords: ['input', 'form', 'field', 'enter', 'type', 'select'],
        relationship: 'data-input',
        suggestedWebhookFlow: ['validation', 'auto-save', 'completion']
      },
      {
        name: 'actions',
        displayName: 'Action Buttons',
        type: 'action-set' as const,
        keywords: ['button', 'action', 'do', 'perform', 'execute', 'run'],
        relationship: 'action-trigger',
        suggestedWebhookFlow: ['pre-action', 'execution', 'result-handling']
      }
    ];

    return themes.map(theme => {
      const matchingElements = elements.filter(element => {
        const text = (element.textContent || '').toLowerCase();
        const className = element.className.toLowerCase();
        const tagName = element.tagName.toLowerCase();
        
        return theme.keywords.some(keyword => 
          text.includes(keyword) || className.includes(keyword) || tagName.includes(keyword)
        );
      });

      return {
        ...theme,
        elements: matchingElements,
        confidence: Math.min(0.8, matchingElements.length * 0.2),
        description: `${theme.displayName} with ${matchingElements.length} elements`
      };
    }).filter(theme => theme.elements.length >= 2);
  }

  // Spatial clustering for proximity groups
  private spatialClustering(elements: HTMLElement[], threshold: number): HTMLElement[][] {
    const clusters: HTMLElement[][] = [];
    const processed = new Set<HTMLElement>();

    elements.forEach(element => {
      if (processed.has(element)) return;

      const cluster = [element];
      processed.add(element);

      const elementRect = element.getBoundingClientRect();
      
      elements.forEach(otherElement => {
        if (processed.has(otherElement) || element === otherElement) return;

        const otherRect = otherElement.getBoundingClientRect();
        const distance = this.calculateElementDistance(elementRect, otherRect);

        if (distance <= threshold) {
          cluster.push(otherElement);
          processed.add(otherElement);
        }
      });

      if (cluster.length >= 2) {
        clusters.push(cluster);
      }
    });

    return clusters;
  }

  private calculateElementDistance(rect1: DOMRect, rect2: DOMRect): number {
    const centerX1 = rect1.left + rect1.width / 2;
    const centerY1 = rect1.top + rect1.height / 2;
    const centerX2 = rect2.left + rect2.width / 2;
    const centerY2 = rect2.top + rect2.height / 2;

    return Math.sqrt(Math.pow(centerX2 - centerX1, 2) + Math.pow(centerY2 - centerY1, 2));
  }

  // Optimization and utility methods
  private optimizeGroups(groups: ElementGroup[]): ElementGroup[] {
    // Remove duplicate elements across groups (prefer higher confidence groups)
    const optimizedGroups: ElementGroup[] = [];
    const usedElements = new Set<string>();

    // Sort by confidence (highest first)
    groups.sort((a, b) => b.confidence - a.confidence);

    groups.forEach(group => {
      const filteredElements = group.elements.filter(el => !usedElements.has(el.signature));
      
      if (filteredElements.length >= 2) {
        filteredElements.forEach(el => usedElements.add(el.signature));
        optimizedGroups.push({
          ...group,
          elements: filteredElements
        });
      }
    });

    return optimizedGroups;
  }

  private generateGroupId(element: HTMLElement): string {
    const id = element.id || element.className.split(' ')[0] || element.tagName.toLowerCase();
    return `${id}-${Date.now().toString(36)}`;
  }

  private inferFormName(form: HTMLElement, elements: HTMLElement[]): string {
    // Try to get form name from various sources
    const formName = form.getAttribute('name') || 
                     form.getAttribute('id') || 
                     form.getAttribute('aria-label');
    
    if (formName) return formName;

    // Infer from submit button text
    const submitButton = elements.find(el => 
      el.tagName.toLowerCase() === 'button' || 
      el.getAttribute('type') === 'submit'
    );
    
    if (submitButton?.textContent) {
      return `${submitButton.textContent.trim()} Form`;
    }

    // Infer from form context
    const heading = form.querySelector('h1, h2, h3, h4, h5, h6');
    if (heading?.textContent) {
      return `${heading.textContent.trim()} Form`;
    }

    return 'Form Group';
  }

  private suggestFormWebhookFlow(elements: GroupElement[]): string[] {
    const flow = ['form-validation'];
    
    if (elements.some(el => el.relationship === 'form-submit')) {
      flow.push('form-submission');
    }
    
    if (elements.some(el => el.relationship === 'data-input')) {
      flow.unshift('data-validation');
    }
    
    flow.push('completion-notification');
    return flow;
  }

  private inferContainerName(container: HTMLElement, elements: HTMLElement[]): string {
    const containerName = container.getAttribute('aria-label') || 
                         container.getAttribute('data-name') ||
                         container.className.split(' ')[0];
    
    if (containerName) return containerName;

    const heading = container.querySelector('h1, h2, h3, h4, h5, h6');
    if (heading?.textContent) {
      return heading.textContent.trim();
    }

    return `Container Group (${elements.length} elements)`;
  }

  private inferContainerType(container: HTMLElement, elements: HTMLElement[]): ElementGroup['type'] {
    const className = container.className.toLowerCase();
    
    if (className.includes('nav')) return 'navigation';
    if (className.includes('form') || elements.some(el => el.tagName.toLowerCase() === 'form')) return 'form';
    if (className.includes('action') || className.includes('button')) return 'action-set';
    if (className.includes('input') || className.includes('field')) return 'data-entry';
    
    return 'custom';
  }

  private calculateContainerConfidence(container: HTMLElement, elements: HTMLElement[]): number {
    let confidence = 0.4; // Base confidence for container grouping
    
    // Increase confidence based on semantic indicators
    const className = container.className.toLowerCase();
    if (className.includes('group') || className.includes('section')) confidence += 0.2;
    if (container.hasAttribute('role')) confidence += 0.1;
    if (container.querySelector('h1, h2, h3, h4, h5, h6')) confidence += 0.1;
    
    // Increase confidence based on element coherence
    const tagTypes = new Set(elements.map(el => el.tagName.toLowerCase()));
    if (tagTypes.size <= 2) confidence += 0.1; // Similar element types
    
    return Math.min(confidence, 0.9);
  }

  private suggestContainerWebhookFlow(elements: GroupElement[]): string[] {
    const relationships = elements.map(el => el.relationship);
    
    if (relationships.includes('form-submit')) {
      return ['validation', 'submission', 'completion'];
    }
    
    if (relationships.includes('navigation-control')) {
      return ['navigation-tracking', 'analytics'];
    }
    
    return ['interaction-tracking', 'analytics'];
  }

  private inferElementRole(element: HTMLElement, container: HTMLElement): 'primary' | 'secondary' | 'supporting' {
    const tagName = element.tagName.toLowerCase();
    const type = element.getAttribute('type')?.toLowerCase();
    
    if (tagName === 'button' || type === 'submit') return 'primary';
    if (tagName === 'a' || type === 'button') return 'secondary';
    return 'supporting';
  }

  private inferContainerRelationship(element: HTMLElement, container: HTMLElement): string {
    const containerClass = container.className.toLowerCase();
    const elementTag = element.tagName.toLowerCase();
    
    if (containerClass.includes('nav')) return 'navigation-item';
    if (containerClass.includes('form')) return 'form-element';
    if (containerClass.includes('action')) return 'action-item';
    
    return `${elementTag}-in-container`;
  }
}

// Convenience function to analyze and group elements
export function analyzeElementGroups(
  containerElement: HTMLElement, 
  interactiveElements: HTMLElement[]
): ElementGroup[] {
  const context: GroupingContext = {
    containerElement,
    allElements: interactiveElements,
    existingGroups: []
  };

  const grouper = new SmartElementGrouper(context);
  return grouper.analyzeAndGroup();
}