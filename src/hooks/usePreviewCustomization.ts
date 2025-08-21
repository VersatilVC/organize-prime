// Phase 4.5: Preview Customization Hook
// Centralized hook for managing preview mode customization

import { useState, useCallback, useEffect } from 'react';

export interface PreviewCustomizationSettings {
  // Theme settings
  primaryColor: string;
  secondaryColor: string;
  successColor: string;
  backgroundColor: string;
  overlayOpacity: number;
  borderRadius: number;
  
  // Highlight settings  
  highlightIntensity: number;
  enableAnimations: boolean;
  enableSounds: boolean;
  
  // Display settings
  showElementInfo: boolean;
  showElementCount: boolean;
  compactMode: boolean;
  overlayPosition: 'top' | 'bottom' | 'left' | 'right' | 'auto';
  
  // Interaction settings
  autoHighlight: boolean;
  clickDelay: number;
  
  // Advanced settings
  showConfidenceScores: boolean;
  showElementPaths: boolean;
  showPerformanceMetrics: boolean;
}

const DEFAULT_SETTINGS: PreviewCustomizationSettings = {
  primaryColor: '#3b82f6',
  secondaryColor: '#10b981',
  successColor: '#22c55e',
  backgroundColor: '#ffffff',
  overlayOpacity: 0.9,
  borderRadius: 6,
  highlightIntensity: 0.7,
  enableAnimations: true,
  enableSounds: false,
  showElementInfo: true,
  showElementCount: true,
  compactMode: false,
  overlayPosition: 'auto',
  autoHighlight: true,
  clickDelay: 0,
  showConfidenceScores: false,
  showElementPaths: false,
  showPerformanceMetrics: false
};

export function usePreviewCustomization() {
  const [settings, setSettings] = useState<PreviewCustomizationSettings>(DEFAULT_SETTINGS);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load settings from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('preview-customization-settings');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setSettings({ ...DEFAULT_SETTINGS, ...parsed });
      } catch (error) {
        console.warn('Failed to load preview customization settings:', error);
      }
    }
    setIsLoaded(true);
  }, []);

  // Save settings to localStorage
  const saveSettings = useCallback((newSettings: Partial<PreviewCustomizationSettings>) => {
    const updated = { ...settings, ...newSettings };
    setSettings(updated);
    localStorage.setItem('preview-customization-settings', JSON.stringify(updated));
  }, [settings]);

  // Reset to defaults
  const resetSettings = useCallback(() => {
    setSettings(DEFAULT_SETTINGS);
    localStorage.removeItem('preview-customization-settings');
  }, []);

  // Apply settings to DOM
  const applySettings = useCallback((settingsToApply: PreviewCustomizationSettings = settings) => {
    // Apply CSS custom properties
    const root = document.documentElement;
    root.style.setProperty('--preview-primary-color', settingsToApply.primaryColor);
    root.style.setProperty('--preview-secondary-color', settingsToApply.secondaryColor);
    root.style.setProperty('--preview-success-color', settingsToApply.successColor);
    root.style.setProperty('--preview-background-color', settingsToApply.backgroundColor);
    root.style.setProperty('--preview-overlay-opacity', settingsToApply.overlayOpacity.toString());
    root.style.setProperty('--preview-border-radius', `${settingsToApply.borderRadius}px`);
    root.style.setProperty('--preview-highlight-intensity', settingsToApply.highlightIntensity.toString());

    // Apply dynamic styles
    updatePreviewStyles(settingsToApply);
  }, [settings]);

  // Update preview element styles
  const updatePreviewStyles = useCallback((settingsToApply: PreviewCustomizationSettings) => {
    const styleId = 'preview-customization-dynamic-styles';
    let style = document.getElementById(styleId) as HTMLStyleElement;
    
    if (!style) {
      style = document.createElement('style');
      style.id = styleId;
      document.head.appendChild(style);
    }

    const highlightAlpha = Math.round(settingsToApply.highlightIntensity * 40).toString(16).padStart(2, '0');
    const transitionDuration = settingsToApply.enableAnimations ? '0.2s' : '0s';

    style.textContent = `
      .webhook-preview-element:hover {
        outline: 2px solid ${settingsToApply.primaryColor} !important;
        outline-offset: 2px;
        background-color: ${settingsToApply.primaryColor}${highlightAlpha} !important;
        border-radius: ${settingsToApply.borderRadius}px;
        transition: all ${transitionDuration} ease;
        ${settingsToApply.enableSounds ? 'cursor: pointer;' : ''}
      }
      
      .webhook-preview-element.selected {
        outline: 2px solid ${settingsToApply.successColor} !important;
        outline-offset: 2px;
        background-color: ${settingsToApply.successColor}${highlightAlpha} !important;
        border-radius: ${settingsToApply.borderRadius}px;
        transition: all ${transitionDuration} ease;
      }
      
      .webhook-preview-element.multi-selected {
        outline: 2px solid ${settingsToApply.secondaryColor} !important;
        outline-offset: 2px;
        background-color: ${settingsToApply.secondaryColor}${highlightAlpha} !important;
        border-radius: ${settingsToApply.borderRadius}px;
        transition: all ${transitionDuration} ease;
      }
      
      .webhook-element-overlay .card {
        background-color: ${settingsToApply.backgroundColor} !important;
        opacity: ${settingsToApply.overlayOpacity} !important;
        border-radius: ${settingsToApply.borderRadius}px !important;
        ${settingsToApply.compactMode ? 'transform: scale(0.85); font-size: 0.85em;' : ''}
      }
      
      ${!settingsToApply.enableAnimations ? `
        *, *::before, *::after {
          animation-duration: 0s !important;
          transition-duration: 0s !important;
        }
      ` : ''}
    `;
  }, []);

  // Export settings
  const exportSettings = useCallback(() => {
    const blob = new Blob([JSON.stringify(settings, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `preview-customization-${Date.now()}.json`;
    link.click();
    URL.revokeObjectURL(url);
  }, [settings]);

  // Import settings
  const importSettings = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const imported = JSON.parse(e.target?.result as string);
        const merged = { ...DEFAULT_SETTINGS, ...imported };
        setSettings(merged);
        localStorage.setItem('preview-customization-settings', JSON.stringify(merged));
      } catch (error) {
        console.error('Failed to import settings:', error);
      }
    };
    reader.readAsText(file);
  }, []);

  // Get theme presets
  const getThemePresets = useCallback(() => [
    {
      name: 'Default Blue',
      settings: {
        primaryColor: '#3b82f6',
        secondaryColor: '#10b981',
        successColor: '#22c55e',
        backgroundColor: '#ffffff',
        overlayOpacity: 0.9,
        borderRadius: 6
      }
    },
    {
      name: 'Dark Mode',
      settings: {
        primaryColor: '#6366f1',
        secondaryColor: '#8b5cf6',
        successColor: '#10b981',
        backgroundColor: '#1f2937',
        overlayOpacity: 0.95,
        borderRadius: 8
      }
    },
    {
      name: 'High Contrast',
      settings: {
        primaryColor: '#000000',
        secondaryColor: '#ffffff',
        successColor: '#00ff00',
        backgroundColor: '#ffffff',
        overlayOpacity: 1.0,
        borderRadius: 2
      }
    }
  ], []);

  return {
    settings,
    isLoaded,
    saveSettings,
    resetSettings,
    applySettings,
    exportSettings,
    importSettings,
    getThemePresets
  };
}