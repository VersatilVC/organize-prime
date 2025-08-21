// Phase 4: Visual Button-Level Webhook System - Visual Overlay
// Visual overlay component for showing element information and selection state

import React, { useEffect, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { 
  Settings, 
  MousePointer, 
  FormInput, 
  Send, 
  Eye,
  X,
  Webhook,
  Activity,
  CheckSquare,
  Square,
  Layers
} from 'lucide-react';
import { usePreview } from './PreviewController';
import { getElementDisplayInfo } from '@/lib/element-utils';
import { PreviewBulkPanel } from './PreviewBulkPanel';
import { ElementGroupsPanel } from './ElementGroupsPanel';
import { PreviewCustomizer } from './PreviewCustomizer';
import { PreviewAnalytics } from './PreviewAnalytics';

// Types
interface OverlayPosition {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface ElementOverlayProps {
  elementId: string;
  element: HTMLElement;
  position: OverlayPosition;
  isSelected: boolean;
  isHovered: boolean;
  isMultiSelected: boolean;
  onConfigure: () => void;
  onToggleSelection: () => void;
}

// Individual element overlay component
function ElementOverlay({ 
  elementId, 
  element, 
  position, 
  isSelected, 
  isHovered,
  isMultiSelected,
  onConfigure,
  onToggleSelection
}: ElementOverlayProps) {
  const elementInfo = getElementDisplayInfo(element);
  
  // Get interaction type icon
  const getInteractionIcon = () => {
    switch (elementInfo.type) {
      case 'submit': return Send;
      case 'input': return FormInput;
      default: return MousePointer;
    }
  };

  const InteractionIcon = getInteractionIcon();

  // Calculate overlay position (above element if possible, below if not enough space)
  const overlayStyle: React.CSSProperties = {
    position: 'fixed',
    left: position.x,
    top: position.y - (isSelected ? 40 : 28),
    zIndex: 10001,
    pointerEvents: 'none'
  };

  // Adjust position if overlay would go off-screen
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  const estimatedWidth = 200; // Approximate overlay width
  
  if (position.x + estimatedWidth > viewportWidth) {
    overlayStyle.left = viewportWidth - estimatedWidth - 10;
  }
  
  if (position.y - 40 < 0) {
    overlayStyle.top = position.y + position.height + 5;
  }

  return createPortal(
    <div style={overlayStyle} className="webhook-element-overlay" data-preview-system="true">
      <Card className={`
        shadow-lg border-2 transition-all duration-200 max-w-xs
        ${isMultiSelected ? 'border-purple-500 bg-purple-50' : 
          isSelected ? 'border-green-500 bg-green-50' : 'border-blue-500 bg-blue-50'}
      `} data-preview-system="true">
        <CardContent className="p-2">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <InteractionIcon className={`
                h-3 w-3 flex-shrink-0
                ${isMultiSelected ? 'text-purple-600' : 
                  isSelected ? 'text-green-600' : 'text-blue-600'}
              `} />
              
              <div className="min-w-0 flex-1">
                <div className={`
                  text-xs font-medium truncate
                  ${isMultiSelected ? 'text-purple-800' :
                    isSelected ? 'text-green-800' : 'text-blue-800'}
                `}>
                  {elementInfo.label}
                </div>
                <div className="text-xs text-muted-foreground truncate">
                  {elementInfo.description}
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-1">
              {isMultiSelected && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-6 w-6 p-0 pointer-events-auto"
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleSelection();
                  }}
                >
                  <CheckSquare className="h-3 w-3 text-purple-600" />
                </Button>
              )}
              
              {isSelected && !isMultiSelected && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-6 w-6 p-0 pointer-events-auto"
                  onClick={(e) => {
                    e.stopPropagation();
                    onConfigure();
                  }}
                >
                  <Settings className="h-3 w-3" />
                </Button>
              )}
            </div>
          </div>
          
          {/* Status indicators */}
          <div className="flex items-center gap-1 mt-1">
            <Badge 
              variant={isMultiSelected || isSelected ? "default" : "secondary"} 
              className="text-xs px-1 py-0"
            >
              {elementInfo.type}
            </Badge>
            
            {(isSelected || isMultiSelected) && (
              <Badge variant="outline" className="text-xs px-1 py-0">
                <Webhook className="h-2 w-2 mr-1" />
                Ready
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>
    </div>,
    document.body
  );
}

// Selection highlight component
function SelectionHighlight({ position, isSelected, isMultiSelected }: { 
  position: OverlayPosition; 
  isSelected: boolean;
  isMultiSelected: boolean;
}) {
  const highlightColor = isMultiSelected ? '#a855f7' : isSelected ? '#10b981' : '#3b82f6';
  const bgColor = isMultiSelected ? 'rgba(168, 85, 247, 0.1)' : 
                   isSelected ? 'rgba(16, 185, 129, 0.1)' : 'rgba(59, 130, 246, 0.1)';
  const shadowColor = isMultiSelected ? 'rgba(168, 85, 247, 0.3)' : 
                      isSelected ? 'rgba(16, 185, 129, 0.3)' : 'rgba(59, 130, 246, 0.3)';

  const highlightStyle: React.CSSProperties = {
    position: 'fixed',
    left: position.x - 2,
    top: position.y - 2,
    width: position.width + 4,
    height: position.height + 4,
    border: `2px solid ${highlightColor}`,
    borderRadius: '4px',
    backgroundColor: bgColor,
    pointerEvents: 'none',
    zIndex: 10000,
    transition: 'all 0.2s ease',
    boxShadow: `0 0 0 1px ${shadowColor}, 0 4px 12px ${shadowColor}`
  };

  return createPortal(
    <div style={highlightStyle} className="webhook-selection-highlight" data-preview-system="true" />,
    document.body
  );
}

// Main visual overlay manager
export function VisualOverlay() {
  const { state, actions } = usePreview();
  const [elementPositions, setElementPositions] = useState<Map<string, OverlayPosition>>(new Map());
  const [elements, setElements] = useState<Map<string, HTMLElement>>(new Map());

  // Update element positions
  const updateElementPositions = useCallback(() => {
    if (!state.isEnabled) {
      setElementPositions(new Map());
      setElements(new Map());
      return;
    }

    // Find all elements with preview classes
    const previewElements = document.querySelectorAll('.webhook-preview-element');
    const newPositions = new Map<string, OverlayPosition>();
    const newElements = new Map<string, HTMLElement>();

    previewElements.forEach((element) => {
      const htmlElement = element as HTMLElement;
      const rect = htmlElement.getBoundingClientRect();
      
      // Only show overlays for visible elements
      if (rect.width > 0 && rect.height > 0) {
        // Use the webhook signature from ElementScanner
        const elementId = htmlElement.dataset.webhookSignature || 
          htmlElement.dataset.webhookId || 
          `${htmlElement.tagName}-${Math.round(rect.x)}-${Math.round(rect.y)}`;
        
        newPositions.set(elementId, {
          x: rect.x + window.scrollX,
          y: rect.y + window.scrollY,
          width: rect.width,
          height: rect.height
        });
        
        newElements.set(elementId, htmlElement);
      }
    });

    setElementPositions(newPositions);
    setElements(newElements);
  }, [state.isEnabled]);

  // Update positions on scroll and resize
  useEffect(() => {
    if (!state.isEnabled) return;

    const updatePositions = () => {
      requestAnimationFrame(updateElementPositions);
    };

    // Update on scroll and resize
    window.addEventListener('scroll', updatePositions, { passive: true });
    window.addEventListener('resize', updatePositions, { passive: true });

    // Initial update
    updatePositions();

    return () => {
      window.removeEventListener('scroll', updatePositions);
      window.removeEventListener('resize', updatePositions);
    };
  }, [state.isEnabled, updateElementPositions]);

  // Update when preview state changes
  useEffect(() => {
    updateElementPositions();
  }, [state.selectedElementId, state.hoveredElementId, updateElementPositions]);

  // Handle configuration
  const handleConfigure = useCallback((elementId: string) => {
    actions.startConfiguration(elementId);
  }, [actions]);

  // Handle toggle selection for bulk mode
  const handleToggleSelection = useCallback((elementId: string) => {
    actions.toggleElementSelection(elementId);
  }, [actions]);

  // Don't render anything if preview is disabled
  if (!state.isEnabled) {
    return null;
  }

  return (
    <TooltipProvider>
      {/* Render overlays for all elements */}
      {Array.from(elementPositions.entries()).map(([elementId, position]) => {
        const element = elements.get(elementId);
        if (!element) return null;

        const isSelected = state.selectedElementId === elementId;
        const isHovered = state.hoveredElementId === elementId;
        const isMultiSelected = state.selectedElementIds.has(elementId);

        // Only show overlay if element is hovered, selected, or multi-selected
        if (!isSelected && !isHovered && !isMultiSelected) return null;

        return (
          <React.Fragment key={elementId}>
            {/* Selection highlight */}
            <SelectionHighlight 
              position={position} 
              isSelected={isSelected}
              isMultiSelected={isMultiSelected}
            />
            
            {/* Element overlay */}
            <ElementOverlay
              elementId={elementId}
              element={element}
              position={position}
              isSelected={isSelected}
              isHovered={isHovered}
              isMultiSelected={isMultiSelected}
              onConfigure={() => handleConfigure(elementId)}
              onToggleSelection={() => handleToggleSelection(elementId)}
            />
          </React.Fragment>
        );
      })}
      
      {/* Global preview mode indicator */}
      {state.isEnabled && !state.isConfiguring && !state.isBulkMode && (
        <PreviewModeIndicator />
      )}

      {/* Bulk operations panel */}
      <PreviewBulkPanel />
      
      {/* Element grouping panel */}
      <ElementGroupsPanel />
      
      {/* Preview customizer */}
      <PreviewCustomizer />
      
      {/* Analytics panel */}
      <PreviewAnalytics />
    </TooltipProvider>
  );
}

// Global preview mode indicator
function PreviewModeIndicator() {
  const { actions } = usePreview();
  
  return createPortal(
    <div className="fixed bottom-4 right-4 z-[10002]" data-preview-system="true">
      <Card className="border-blue-500 bg-blue-50 shadow-lg" data-preview-system="true">
        <CardContent className="p-3">
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-blue-600 animate-pulse" />
            <div className="text-sm">
              <div className="font-medium text-blue-800">Preview Mode Active</div>
              <div className="text-xs text-blue-600">
                Click elements to configure webhooks • Press ESC to exit
              </div>
            </div>
            <Button
              size="sm"
              variant="outline"
              className="h-7 px-2 text-xs text-indigo-600 border-indigo-200"
              onClick={() => {
                // Trigger element groups analysis by dispatching a custom event
                window.dispatchEvent(new CustomEvent('show-element-groups'));
              }}
              data-preview-system="true"
            >
              <Layers className="h-3 w-3 mr-1" />
              Groups
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-7 px-2 text-xs text-purple-600 border-purple-200"
              onClick={actions.enableBulkMode}
              data-preview-system="true"
            >
              <CheckSquare className="h-3 w-3 mr-1" />
              Bulk
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-6 w-6 p-0 text-blue-600"
              onClick={actions.disable}
              data-preview-system="true"
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>,
    document.body
  );
}