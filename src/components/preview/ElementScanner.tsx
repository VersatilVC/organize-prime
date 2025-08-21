// Phase 4: Visual Button-Level Webhook System - Element Scanner
// Scans and identifies interactive elements for webhook configuration

import React, { useEffect, useCallback, useRef } from 'react';
import { usePreview } from './PreviewController';
import { VisualOverlay } from './VisualOverlay';
import { ConfigurationPanel, useConfigurationPanel } from './ConfigurationPanel';
import { generateElementSignature, isInteractiveElement } from '@/lib/element-utils';

// Types
interface ScannedElement {
  id: string;
  signature: string;
  element: HTMLElement;
  boundingRect: DOMRect;
  interactionType: 'click' | 'submit' | 'change' | 'input';
  elementInfo: {
    tagName: string;
    className: string;
    id: string;
    textContent: string;
    ariaLabel?: string;
    title?: string;
  };
}

interface ElementScannerProps {
  children: React.ReactNode;
}

export function ElementScanner({ children }: ElementScannerProps) {
  const { state, actions } = usePreview();
  const configPanel = useConfigurationPanel();
  const scannerRef = useRef<HTMLDivElement>(null);
  const scannedElementsRef = useRef<Map<string, ScannedElement>>(new Map());
  const overlayElementsRef = useRef<Map<string, HTMLDivElement>>(new Map());

  // Scan for interactive elements
  const scanElements = useCallback(() => {
    if (!scannerRef.current || !state.isEnabled) return;

    const container = scannerRef.current;
    const interactiveElements = container.querySelectorAll(
      'button, input[type="button"], input[type="submit"], [role="button"], a, form, select, input, textarea'
    );

    const newScannedElements = new Map<string, ScannedElement>();

    interactiveElements.forEach((element) => {
      const htmlElement = element as HTMLElement;
      
      // Skip if not truly interactive or already has webhook overlay
      if (!isInteractiveElement(htmlElement) || htmlElement.closest('.webhook-preview-overlay')) {
        return;
      }

      const signature = generateElementSignature(htmlElement);
      const boundingRect = htmlElement.getBoundingClientRect();
      
      // Skip elements that are not visible
      if (boundingRect.width === 0 || boundingRect.height === 0) {
        return;
      }

      const elementInfo = {
        tagName: htmlElement.tagName.toLowerCase(),
        className: htmlElement.className,
        id: htmlElement.id,
        textContent: htmlElement.textContent?.trim().substring(0, 50) || '',
        ariaLabel: htmlElement.getAttribute('aria-label') || undefined,
        title: htmlElement.getAttribute('title') || undefined
      };

      const interactionType = determineInteractionType(htmlElement);

      const scannedElement: ScannedElement = {
        id: signature,
        signature,
        element: htmlElement,
        boundingRect,
        interactionType,
        elementInfo
      };

      newScannedElements.set(signature, scannedElement);
    });

    scannedElementsRef.current = newScannedElements;
    updateElementOverlays();
  }, [state.isEnabled]);

  // Determine interaction type based on element
  const determineInteractionType = (element: HTMLElement): ScannedElement['interactionType'] => {
    const tagName = element.tagName.toLowerCase();
    const type = element.getAttribute('type')?.toLowerCase();

    if (tagName === 'form') return 'submit';
    if (tagName === 'input') {
      if (type === 'submit' || type === 'button') return 'click';
      return 'change';
    }
    if (tagName === 'textarea' || tagName === 'select') return 'change';
    
    return 'click';
  };

  // Update visual overlays for elements
  const updateElementOverlays = useCallback(() => {
    // Clear existing overlays
    overlayElementsRef.current.forEach(overlay => {
      overlay.remove();
    });
    overlayElementsRef.current.clear();

    if (!state.isEnabled) return;

    // Add overlays for scanned elements
    scannedElementsRef.current.forEach((scannedElement) => {
      const { element, signature, elementInfo, interactionType } = scannedElement;
      
      // Add preview class to element and data attribute for lookup
      element.classList.add('webhook-preview-element');
      element.setAttribute('data-webhook-signature', signature);
      
      // Add selection state classes
      element.classList.remove('selected', 'multi-selected');
      if (state.selectedElementIds.has(signature)) {
        element.classList.add('multi-selected');
      } else if (state.selectedElementId === signature) {
        element.classList.add('selected');
      }

      // Create overlay for element info
      if (state.hoveredElementId === signature) {
        const overlay = document.createElement('div');
        overlay.className = 'webhook-preview-overlay';
        overlay.textContent = `${elementInfo.tagName} • ${interactionType} • ${
          elementInfo.textContent || elementInfo.ariaLabel || elementInfo.id || 'unnamed'
        }`;
        
        element.style.position = 'relative';
        element.appendChild(overlay);
        overlayElementsRef.current.set(signature, overlay);
      }
    });
  }, [state.isEnabled, state.selectedElementId, state.hoveredElementId]);

  // Handle element clicks with multi-selection support
  const handleElementClick = useCallback((event: Event) => {
    if (!state.isEnabled) return;

    const mouseEvent = event as MouseEvent;
    const target = mouseEvent.target as HTMLElement;
    const scannedElement = Array.from(scannedElementsRef.current.values())
      .find(se => se.element === target || se.element.contains(target));

    if (scannedElement) {
      event.preventDefault();
      event.stopPropagation();
      
      // Handle multi-selection with modifiers
      const isCtrlCmd = mouseEvent.ctrlKey || mouseEvent.metaKey;
      const isShift = mouseEvent.shiftKey;
      
      if (state.isBulkMode || isCtrlCmd || isShift) {
        // Multi-selection mode
        if (isShift && state.selectedElementId) {
          // Range selection from last selected element
          handleRangeSelection(state.selectedElementId, scannedElement.id);
        } else {
          // Toggle selection
          actions.selectElement(scannedElement.id, true);
        }
      } else {
        // Single selection mode (original behavior)
        if (state.isConfiguring && state.selectedElementId === scannedElement.id) {
          // Close configuration if clicking the same element
          actions.stopConfiguration();
        } else {
          // Start configuration for the clicked element
          actions.startConfiguration(scannedElement.id);
        }
      }
    }
  }, [state.isEnabled, state.isConfiguring, state.selectedElementId, state.isBulkMode, actions]);

  // Handle range selection (Shift+click)
  const handleRangeSelection = useCallback((startId: string, endId: string) => {
    const allElements = Array.from(scannedElementsRef.current.values());
    const startIndex = allElements.findIndex(el => el.id === startId);
    const endIndex = allElements.findIndex(el => el.id === endId);
    
    if (startIndex !== -1 && endIndex !== -1) {
      const start = Math.min(startIndex, endIndex);
      const end = Math.max(startIndex, endIndex);
      const rangeIds = allElements.slice(start, end + 1).map(el => el.id);
      
      // Add all elements in range to selection
      rangeIds.forEach(id => {
        if (!state.selectedElementIds.has(id)) {
          actions.toggleElementSelection(id);
        }
      });
    }
  }, [state.selectedElementIds, actions]);

  // Handle element hover
  const handleElementHover = useCallback((event: Event) => {
    if (!state.isEnabled || state.isConfiguring) return;

    const target = event.target as HTMLElement;
    const scannedElement = Array.from(scannedElementsRef.current.values())
      .find(se => se.element === target || se.element.contains(target));

    if (scannedElement) {
      actions.setHoveredElement(scannedElement.id);
    }
  }, [state.isEnabled, state.isConfiguring, actions]);

  // Handle element leave
  const handleElementLeave = useCallback(() => {
    if (!state.isEnabled || state.isConfiguring) return;
    actions.setHoveredElement(null);
  }, [state.isEnabled, state.isConfiguring, actions]);

  // Set up event listeners and scanning
  useEffect(() => {
    if (!scannerRef.current) return;

    const container = scannerRef.current;

    if (state.isEnabled) {
      // Initial scan
      scanElements();
      
      // Set up event listeners
      container.addEventListener('click', handleElementClick, true);
      container.addEventListener('mouseover', handleElementHover, true);
      container.addEventListener('mouseleave', handleElementLeave, true);

      // Rescan on DOM changes
      const observer = new MutationObserver(() => {
        setTimeout(scanElements, 100); // Debounce rescans
      });
      
      observer.observe(container, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['class', 'style', 'hidden']
      });

      return () => {
        container.removeEventListener('click', handleElementClick, true);
        container.removeEventListener('mouseover', handleElementHover, true);
        container.removeEventListener('mouseleave', handleElementLeave, true);
        observer.disconnect();
      };
    } else {
      // Clean up when disabled
      scannedElementsRef.current.forEach((scannedElement) => {
        scannedElement.element.classList.remove('webhook-preview-element', 'selected', 'multi-selected');
        scannedElement.element.removeAttribute('data-webhook-signature');
      });
      
      overlayElementsRef.current.forEach(overlay => {
        overlay.remove();
      });
      overlayElementsRef.current.clear();
    }
  }, [state.isEnabled, state.isConfiguring, scanElements, handleElementClick, handleElementHover, handleElementLeave]);

  // Update overlays when state changes
  useEffect(() => {
    updateElementOverlays();
  }, [state.selectedElementId, state.hoveredElementId, updateElementOverlays]);

  // Inject CSS styles
  useEffect(() => {
    if (state.isEnabled) {
      const styleId = 'webhook-preview-styles';
      if (!document.getElementById(styleId)) {
        const style = document.createElement('style');
        style.id = styleId;
        style.textContent = `
          .webhook-preview-element {
            position: relative;
            transition: all 0.2s ease;
          }
          
          .webhook-preview-element:hover {
            outline: 2px solid #3b82f6;
            outline-offset: 2px;
            background-color: rgba(59, 130, 246, 0.1) !important;
            z-index: 1000;
          }
          
          .webhook-preview-element.selected {
            outline: 2px solid #10b981;
            outline-offset: 2px;
            background-color: rgba(16, 185, 129, 0.1) !important;
            z-index: 1001;
          }
          
          .webhook-preview-element.multi-selected {
            outline: 2px solid #a855f7;
            outline-offset: 2px;
            background-color: rgba(168, 85, 247, 0.1) !important;
            z-index: 1002;
          }
          
          .webhook-preview-overlay {
            position: absolute;
            top: -28px;
            left: 0;
            background: rgba(0, 0, 0, 0.9);
            color: white;
            padding: 4px 8px;
            border-radius: 4px;
            font-size: 11px;
            font-weight: 500;
            z-index: 10000;
            pointer-events: none;
            white-space: nowrap;
            max-width: 300px;
            overflow: hidden;
            text-overflow: ellipsis;
          }
        `;
        document.head.appendChild(style);
      }
    } else {
      const existingStyle = document.getElementById('webhook-preview-styles');
      if (existingStyle) {
        existingStyle.remove();
      }
    }

    return () => {
      if (!state.isEnabled) {
        const existingStyle = document.getElementById('webhook-preview-styles');
        if (existingStyle) {
          existingStyle.remove();
        }
      }
    };
  }, [state.isEnabled]);

  return (
    <div ref={scannerRef} className="webhook-element-scanner">
      {children}
      <VisualOverlay />
      <ConfigurationPanel 
        isOpen={configPanel.isOpen}
        elementId={configPanel.elementId}
        onClose={configPanel.onClose}
      />
    </div>
  );
}

// Hook to get scanned element data
export function useScannedElement(elementId: string | null): ScannedElement | null {
  const scannerRef = React.useRef<Map<string, ScannedElement>>(new Map());
  
  React.useEffect(() => {
    // This would need to be connected to the scanner's state
    // For now, return null - this will be enhanced when ElementScanner is integrated
  }, [elementId]);

  if (!elementId) return null;
  return scannerRef.current.get(elementId) || null;
}