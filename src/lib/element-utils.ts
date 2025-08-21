// Phase 4: Visual Button-Level Webhook System - Element Utilities
// Utilities for identifying and working with interactive elements

// Browser-compatible crypto functions

// Types
export interface ElementSignatureData {
  tagName: string;
  id?: string;
  className?: string;
  textContent?: string;
  ariaLabel?: string;
  role?: string;
  type?: string;
  name?: string;
  parentContext?: string;
}

// Check if element is part of the preview system UI
function isPreviewSystemElement(element: HTMLElement): boolean {
  // Check if element or any parent has preview system classes
  let current: HTMLElement | null = element;
  
  while (current) {
    const className = current.className || '';
    
    // Exclude preview system specific elements
    if (
      // Preview toggle button and its children
      className.includes('preview-toggle') ||
      // Configuration panel and its children
      className.includes('configuration-panel') ||
      className.includes('webhook-element-overlay') ||
      className.includes('webhook-selection-highlight') ||
      className.includes('webhook-preview-overlay') ||
      // Any element with preview-related data attributes
      current.hasAttribute('data-preview-system') ||
      current.hasAttribute('data-webhook-overlay') ||
      // Elements inside portals (overlays, panels)
      current.closest('[data-radix-portal]') ||
      // Tooltip content
      current.getAttribute('role') === 'tooltip' ||
      // Elements that are part of dropdowns, dialogs, etc.
      current.getAttribute('role') === 'menu' ||
      current.getAttribute('role') === 'menuitem' ||
      current.getAttribute('role') === 'dialog' ||
      // Check if it's a child of the preview toggle specifically
      current.closest('button')?.textContent?.includes('Preview')
    ) {
      return true;
    }
    
    current = current.parentElement;
  }
  
  return false;
}

// Check if an element is interactive
export function isInteractiveElement(element: HTMLElement): boolean {
  // Exclude preview system UI elements
  if (isPreviewSystemElement(element)) {
    return false;
  }

  const tagName = element.tagName.toLowerCase();
  const type = element.getAttribute('type')?.toLowerCase();
  const role = element.getAttribute('role')?.toLowerCase();

  // Direct interactive elements
  if (tagName === 'button' || tagName === 'a' || tagName === 'form') {
    return true;
  }

  // Input elements
  if (tagName === 'input' && (
    type === 'button' || 
    type === 'submit' || 
    type === 'reset' ||
    type === 'checkbox' ||
    type === 'radio'
  )) {
    return true;
  }

  // Form controls
  if (tagName === 'select' || tagName === 'textarea') {
    return true;
  }

  // Elements with interactive roles
  if (role === 'button' || role === 'link' || role === 'menuitem') {
    return true;
  }

  // Elements with click handlers (basic detection)
  if (element.onclick || element.getAttribute('onclick')) {
    return true;
  }

  // Check for common interactive classes or data attributes
  const className = element.className || '';
  const interactiveClasses = [
    'btn', 'button', 'link', 'clickable', 'interactive',
    'submit', 'action', 'trigger', 'toggle'
  ];
  
  if (interactiveClasses.some(cls => className.includes(cls))) {
    return true;
  }

  // Check for data attributes that suggest interactivity
  const interactiveAttributes = [
    'data-action', 'data-click', 'data-toggle', 'data-submit',
    'data-trigger', 'data-handler'
  ];
  
  if (interactiveAttributes.some(attr => element.hasAttribute(attr))) {
    return true;
  }

  return false;
}

// Generate a stable signature for an element based on its content and context
export function generateElementSignature(element: HTMLElement): string {
  const signatureData: ElementSignatureData = {
    tagName: element.tagName.toLowerCase(),
    id: element.id || undefined,
    className: cleanClassName(element.className),
    textContent: cleanTextContent(element.textContent),
    ariaLabel: element.getAttribute('aria-label') || undefined,
    role: element.getAttribute('role') || undefined,
    type: element.getAttribute('type') || undefined,
    name: element.getAttribute('name') || undefined,
    parentContext: getParentContext(element)
  };

  // Create a stable string representation
  const signatureString = JSON.stringify(signatureData, Object.keys(signatureData).sort());
  
  // Use a simple hash instead of crypto for browser compatibility
  return hashString(signatureString);
}

// Generate a content-based hash for security
export function generateElementContentHash(element: HTMLElement): string {
  const content = {
    outerHTML: element.outerHTML.substring(0, 500), // Limit size
    computedStyle: getRelevantStyles(element),
    position: getElementPosition(element)
  };
  
  const contentString = JSON.stringify(content);
  return hashString(contentString);
}

// Clean and normalize class names
function cleanClassName(className: string): string {
  if (!className) return '';
  
  // Remove dynamic classes (contain timestamps, random IDs, etc.)
  return className
    .split(' ')
    .filter(cls => {
      // Keep stable class names, remove dynamic ones
      return !cls.match(/\d{10,}/) && // No timestamps
             !cls.match(/^[a-f0-9]{8,}$/) && // No hash-like strings
             !cls.includes('--') && // No CSS variables
             cls.length > 1; // No single characters
    })
    .sort() // Stable order
    .join(' ');
}

// Clean and normalize text content
function cleanTextContent(textContent: string | null): string {
  if (!textContent) return '';
  
  return textContent
    .trim()
    .replace(/\s+/g, ' ') // Normalize whitespace
    .substring(0, 100); // Limit length
}

// Get parent context for better uniqueness
function getParentContext(element: HTMLElement): string {
  const parent = element.parentElement;
  if (!parent) return '';
  
  // Get a simplified parent signature
  const parentInfo = {
    tagName: parent.tagName.toLowerCase(),
    id: parent.id || undefined,
    className: cleanClassName(parent.className).split(' ').slice(0, 3).join(' '), // First 3 classes only
  };
  
  return JSON.stringify(parentInfo);
}

// Get relevant CSS styles for signature
function getRelevantStyles(element: HTMLElement): Record<string, string> {
  const computedStyle = window.getComputedStyle(element);
  const relevantProps = [
    'display', 'position', 'width', 'height', 
    'backgroundColor', 'color', 'fontSize'
  ];
  
  const styles: Record<string, string> = {};
  relevantProps.forEach(prop => {
    styles[prop] = computedStyle.getPropertyValue(prop);
  });
  
  return styles;
}

// Get element position information
function getElementPosition(element: HTMLElement): { x: number; y: number; width: number; height: number } {
  const rect = element.getBoundingClientRect();
  return {
    x: Math.round(rect.x),
    y: Math.round(rect.y),
    width: Math.round(rect.width),
    height: Math.round(rect.height)
  };
}

// Simple string hashing function (browser-compatible)
function hashString(str: string): string {
  // Generate multiple hash values to create a longer, stable signature
  let hash1 = 0;
  let hash2 = 5381; // Different initial value for second hash
  
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash1 = ((hash1 << 5) - hash1) + char;
    hash1 = hash1 & hash1; // Convert to 32bit integer
    
    hash2 = ((hash2 << 5) + hash2) + char;
    hash2 = hash2 & hash2; // Convert to 32bit integer
  }
  
  // Combine both hashes to create a longer signature
  const part1 = Math.abs(hash1).toString(36);
  const part2 = Math.abs(hash2).toString(36);
  const signature = `${part1}${part2}`;
  
  // Ensure minimum length of 11 characters (database constraint requires > 10)
  return signature.length > 10 ? signature : signature.padEnd(11, 'x');
}

// Extract element information for display
export function getElementDisplayInfo(element: HTMLElement): {
  label: string;
  description: string;
  type: string;
} {
  const tagName = element.tagName.toLowerCase();
  const textContent = element.textContent?.trim();
  const ariaLabel = element.getAttribute('aria-label');
  const title = element.getAttribute('title');
  const id = element.id;
  const type = element.getAttribute('type');

  // Determine label
  let label = ariaLabel || title || textContent || id || `${tagName} element`;
  if (label.length > 30) {
    label = label.substring(0, 27) + '...';
  }

  // Determine description
  let description = `${tagName}`;
  if (type) description += `[type="${type}"]`;
  if (id) description += `#${id}`;

  // Determine interaction type
  let interactionType = 'click';
  if (tagName === 'form') interactionType = 'submit';
  if (tagName === 'input' || tagName === 'textarea' || tagName === 'select') {
    interactionType = 'input';
  }

  return {
    label,
    description,
    type: interactionType
  };
}

// Validate element signature
export function validateElementSignature(signature: string, element: HTMLElement): boolean {
  const currentSignature = generateElementSignature(element);
  return signature === currentSignature;
}

// Find element by signature
export function findElementBySignature(signature: string, container: HTMLElement = document.body): HTMLElement | null {
  const interactiveElements = container.querySelectorAll(
    'button, input[type="button"], input[type="submit"], [role="button"], a, form, select, input, textarea'
  );

  for (const element of interactiveElements) {
    const htmlElement = element as HTMLElement;
    if (isInteractiveElement(htmlElement) && generateElementSignature(htmlElement) === signature) {
      return htmlElement;
    }
  }

  return null;
}