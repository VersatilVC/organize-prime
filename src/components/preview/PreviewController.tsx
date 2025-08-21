// Phase 4: Visual Button-Level Webhook System - Preview Controller
// Core controller for managing preview mode state and functionality

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';

// Types
export interface PreviewState {
  isEnabled: boolean;
  selectedElementId: string | null;
  selectedElementIds: Set<string>; // Multi-selection support
  hoveredElementId: string | null;
  isConfiguring: boolean;
  isBulkMode: boolean; // Bulk operations mode
  bulkOperation: string | null; // Current bulk operation type
}

export interface PreviewContextValue {
  state: PreviewState;
  actions: {
    enable: () => void;
    disable: () => void;
    toggle: () => void;
    selectElement: (elementId: string, multiSelect?: boolean) => void;
    toggleElementSelection: (elementId: string) => void;
    selectAllElements: (elementIds: string[]) => void;
    clearSelection: () => void;
    setHoveredElement: (elementId: string | null) => void;
    startConfiguration: (elementId: string) => void;
    stopConfiguration: () => void;
    enableBulkMode: () => void;
    disableBulkMode: () => void;
    setBulkOperation: (operation: string | null) => void;
  };
}

// Context
const PreviewContext = createContext<PreviewContextValue | null>(null);

// Storage keys
const STORAGE_KEYS = {
  PREVIEW_ENABLED: 'webhook-preview-enabled',
  PREVIEW_STATE: 'webhook-preview-state'
} as const;

// Hook for consuming preview context
export function usePreview() {
  const context = useContext(PreviewContext);
  if (!context) {
    throw new Error('usePreview must be used within PreviewProvider');
  }
  return context;
}

// Provider component
interface PreviewProviderProps {
  children: React.ReactNode;
}

export function PreviewProvider({ children }: PreviewProviderProps) {
  // Initialize state from session storage
  const [state, setState] = useState<PreviewState>(() => {
    const storedState = sessionStorage.getItem(STORAGE_KEYS.PREVIEW_STATE);
    const storedEnabled = sessionStorage.getItem(STORAGE_KEYS.PREVIEW_ENABLED);
    
    return {
      isEnabled: storedEnabled === 'true',
      selectedElementId: null,
      selectedElementIds: new Set<string>(),
      hoveredElementId: null,
      isConfiguring: false,
      isBulkMode: false,
      bulkOperation: null,
      ...((storedState && JSON.parse(storedState)) || {})
    };
  });

  // Persist state to session storage
  useEffect(() => {
    sessionStorage.setItem(STORAGE_KEYS.PREVIEW_ENABLED, String(state.isEnabled));
    sessionStorage.setItem(STORAGE_KEYS.PREVIEW_STATE, JSON.stringify({
      selectedElementId: state.selectedElementId,
      hoveredElementId: state.hoveredElementId,
      isConfiguring: state.isConfiguring
    }));
  }, [state]);

  // Actions
  const enable = useCallback(() => {
    setState(prev => ({ ...prev, isEnabled: true }));
    toast.success('Preview mode enabled', {
      description: 'Click on interactive elements to configure webhooks'
    });
  }, []);

  const disable = useCallback(() => {
    setState(prev => ({
      ...prev,
      isEnabled: false,
      selectedElementId: null,
      selectedElementIds: new Set<string>(),
      hoveredElementId: null,
      isConfiguring: false,
      isBulkMode: false,
      bulkOperation: null
    }));
    toast.info('Preview mode disabled');
  }, []);

  const toggle = useCallback(() => {
    if (state.isEnabled) {
      disable();
    } else {
      enable();
    }
  }, [state.isEnabled, enable, disable]);

  const selectElement = useCallback((elementId: string, multiSelect: boolean = false) => {
    setState(prev => {
      if (prev.isBulkMode || multiSelect) {
        // Multi-selection mode
        const newSelectedIds = new Set(prev.selectedElementIds);
        if (newSelectedIds.has(elementId)) {
          newSelectedIds.delete(elementId);
        } else {
          newSelectedIds.add(elementId);
        }
        return {
          ...prev,
          selectedElementIds: newSelectedIds,
          selectedElementId: newSelectedIds.size === 1 ? Array.from(newSelectedIds)[0] : null,
          hoveredElementId: null
        };
      } else {
        // Single selection mode (original behavior)
        return {
          ...prev,
          selectedElementId: elementId,
          selectedElementIds: new Set([elementId]),
          hoveredElementId: null
        };
      }
    });
  }, []);

  const toggleElementSelection = useCallback((elementId: string) => {
    setState(prev => {
      const newSelectedIds = new Set(prev.selectedElementIds);
      if (newSelectedIds.has(elementId)) {
        newSelectedIds.delete(elementId);
      } else {
        newSelectedIds.add(elementId);
      }
      return {
        ...prev,
        selectedElementIds: newSelectedIds,
        selectedElementId: newSelectedIds.size === 1 ? Array.from(newSelectedIds)[0] : null,
      };
    });
  }, []);

  const selectAllElements = useCallback((elementIds: string[]) => {
    setState(prev => ({
      ...prev,
      selectedElementIds: new Set(elementIds),
      selectedElementId: elementIds.length === 1 ? elementIds[0] : null,
    }));
  }, []);

  const clearSelection = useCallback(() => {
    setState(prev => ({ 
      ...prev, 
      selectedElementId: null,
      selectedElementIds: new Set<string>(),
      hoveredElementId: null,
      isConfiguring: false
    }));
  }, []);

  const setHoveredElement = useCallback((elementId: string | null) => {
    setState(prev => ({ ...prev, hoveredElementId: elementId }));
  }, []);

  const startConfiguration = useCallback((elementId: string) => {
    setState(prev => ({ 
      ...prev, 
      selectedElementId: elementId,
      isConfiguring: true,
      hoveredElementId: null
    }));
  }, []);

  const stopConfiguration = useCallback(() => {
    setState(prev => ({ ...prev, isConfiguring: false }));
  }, []);

  const enableBulkMode = useCallback(() => {
    setState(prev => ({ ...prev, isBulkMode: true }));
    toast.info('Bulk selection mode enabled', {
      description: 'Click elements to select multiple, Shift+click for range selection'
    });
  }, []);

  const disableBulkMode = useCallback(() => {
    setState(prev => ({ 
      ...prev, 
      isBulkMode: false,
      bulkOperation: null,
      selectedElementIds: prev.selectedElementId ? new Set([prev.selectedElementId]) : new Set()
    }));
    toast.info('Bulk selection mode disabled');
  }, []);

  const setBulkOperation = useCallback((operation: string | null) => {
    setState(prev => ({ ...prev, bulkOperation: operation }));
  }, []);

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeydown = (event: KeyboardEvent) => {
      if (!state.isEnabled) return;

      // ESC key handling
      if (event.key === 'Escape') {
        if (state.isConfiguring) {
          stopConfiguration();
        } else if (state.isBulkMode) {
          disableBulkMode();
        } else {
          disable();
        }
        return;
      }

      // Only handle other shortcuts when not configuring
      if (state.isConfiguring) return;

      // Ctrl/Cmd + A: Select all elements
      if ((event.ctrlKey || event.metaKey) && event.key === 'a') {
        event.preventDefault();
        if (!state.isBulkMode) {
          enableBulkMode();
        }
        // Select all interactive elements
        const allElements = document.querySelectorAll('.webhook-preview-element');
        const elementIds = Array.from(allElements)
          .map(el => el.getAttribute('data-webhook-signature'))
          .filter(id => id !== null) as string[];
        selectAllElements(elementIds);
        return;
      }

      // Ctrl/Cmd + D: Clear selection
      if ((event.ctrlKey || event.metaKey) && event.key === 'd') {
        event.preventDefault();
        clearSelection();
        return;
      }

      // B key: Toggle bulk mode
      if (event.key === 'b' || event.key === 'B') {
        if (state.isBulkMode) {
          disableBulkMode();
        } else {
          enableBulkMode();
        }
        return;
      }

      // Delete key: Delete selected webhooks (in bulk mode)
      if (event.key === 'Delete' && state.isBulkMode && state.selectedElementIds.size > 0) {
        setBulkOperation('delete_all');
        return;
      }
    };

    document.addEventListener('keydown', handleKeydown);
    return () => document.removeEventListener('keydown', handleKeydown);
  }, [
    state.isEnabled, state.isConfiguring, state.isBulkMode, state.selectedElementIds,
    disable, stopConfiguration, enableBulkMode, disableBulkMode, 
    selectAllElements, clearSelection, setBulkOperation
  ]);

  // Add preview mode class to body
  useEffect(() => {
    const body = document.body;
    if (state.isEnabled) {
      body.classList.add('webhook-preview-mode');
    } else {
      body.classList.remove('webhook-preview-mode');
    }

    return () => {
      body.classList.remove('webhook-preview-mode');
    };
  }, [state.isEnabled]);

  const contextValue: PreviewContextValue = {
    state,
    actions: {
      enable,
      disable,
      toggle,
      selectElement,
      toggleElementSelection,
      selectAllElements,
      clearSelection,
      setHoveredElement,
      startConfiguration,
      stopConfiguration,
      enableBulkMode,
      disableBulkMode,
      setBulkOperation
    }
  };

  return (
    <PreviewContext.Provider value={contextValue}>
      {children}
    </PreviewContext.Provider>
  );
}

// CSS styles for preview mode (will be injected)
export const PREVIEW_MODE_STYLES = `
  .webhook-preview-mode {
    cursor: crosshair !important;
  }
  
  .webhook-preview-mode * {
    pointer-events: auto !important;
  }
  
  .webhook-preview-element {
    position: relative;
    transition: all 0.2s ease;
  }
  
  .webhook-preview-element:hover {
    outline: 2px solid #3b82f6;
    outline-offset: 2px;
    background-color: rgba(59, 130, 246, 0.1) !important;
  }
  
  .webhook-preview-element.selected {
    outline: 2px solid #10b981;
    outline-offset: 2px;
    background-color: rgba(16, 185, 129, 0.1) !important;
  }
  
  .webhook-preview-overlay {
    position: absolute;
    top: -24px;
    left: 0;
    background: rgba(0, 0, 0, 0.8);
    color: white;
    padding: 2px 8px;
    border-radius: 4px;
    font-size: 12px;
    font-weight: 500;
    z-index: 10000;
    pointer-events: none;
    white-space: nowrap;
  }
`;