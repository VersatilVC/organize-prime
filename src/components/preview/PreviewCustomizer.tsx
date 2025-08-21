// Phase 4.5: Preview Mode Customizer
// Customization interface for preview mode appearance and behavior

import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Settings,
  Palette,
  Eye,
  Zap,
  Keyboard,
  Monitor,
  Save,
  RotateCcw,
  X,
  ChevronDown,
  Paintbrush,
  Layers,
  MousePointer,
  Timer,
  Volume2,
  Moon,
  Sun,
  Contrast,
  Maximize,
  Square
} from 'lucide-react';
import { usePreview } from './PreviewController';
import { toast } from 'sonner';

// Theme and customization types
interface PreviewTheme {
  name: string;
  colors: {
    primary: string;
    secondary: string;
    success: string;
    warning: string;
    error: string;
    background: string;
    foreground: string;
  };
  overlayOpacity: number;
  borderRadius: number;
  shadowIntensity: number;
}

interface PreviewCustomization {
  // Visual settings
  theme: PreviewTheme;
  showElementInfo: boolean;
  showElementCount: boolean;
  highlightIntensity: number;
  overlayPosition: 'top' | 'bottom' | 'right' | 'left' | 'auto';
  
  // Interaction settings
  enableSounds: boolean;
  enableAnimations: boolean;
  enableAutoHighlight: boolean;
  clickDelay: number;
  
  // Display settings
  showConfidenceScores: boolean;
  showElementPaths: boolean;
  showPerformanceMetrics: boolean;
  compactMode: boolean;
  
  // Keyboard shortcuts
  shortcuts: {
    togglePreview: string;
    bulkMode: string;
    selectAll: string;
    clearSelection: string;
    showGroups: string;
  };
}

const DEFAULT_THEMES: PreviewTheme[] = [
  {
    name: 'Default Blue',
    colors: {
      primary: '#3b82f6',
      secondary: '#10b981',
      success: '#22c55e',
      warning: '#f59e0b',
      error: '#ef4444',
      background: '#ffffff',
      foreground: '#1f2937'
    },
    overlayOpacity: 0.9,
    borderRadius: 6,
    shadowIntensity: 0.2
  },
  {
    name: 'Dark Mode',
    colors: {
      primary: '#6366f1',
      secondary: '#8b5cf6',
      success: '#10b981',
      warning: '#f59e0b',
      error: '#f87171',
      background: '#1f2937',
      foreground: '#f9fafb'
    },
    overlayOpacity: 0.95,
    borderRadius: 8,
    shadowIntensity: 0.4
  },
  {
    name: 'High Contrast',
    colors: {
      primary: '#000000',
      secondary: '#ffffff',
      success: '#00ff00',
      warning: '#ffff00',
      error: '#ff0000',
      background: '#ffffff',
      foreground: '#000000'
    },
    overlayOpacity: 1.0,
    borderRadius: 2,
    shadowIntensity: 0.8
  },
  {
    name: 'Neon',
    colors: {
      primary: '#ff00ff',
      secondary: '#00ffff',
      success: '#00ff00',
      warning: '#ff8800',
      error: '#ff0044',
      background: '#0a0a0a',
      foreground: '#ffffff'
    },
    overlayOpacity: 0.9,
    borderRadius: 12,
    shadowIntensity: 0.6
  }
];

const DEFAULT_CUSTOMIZATION: PreviewCustomization = {
  theme: DEFAULT_THEMES[0],
  showElementInfo: true,
  showElementCount: true,
  highlightIntensity: 0.7,
  overlayPosition: 'auto',
  enableSounds: false,
  enableAnimations: true,
  enableAutoHighlight: true,
  clickDelay: 0,
  showConfidenceScores: false,
  showElementPaths: false,
  showPerformanceMetrics: false,
  compactMode: false,
  shortcuts: {
    togglePreview: 'Ctrl+Shift+P',
    bulkMode: 'B',
    selectAll: 'Ctrl+A',
    clearSelection: 'Ctrl+D',
    showGroups: 'G'
  }
};

interface PreviewCustomizerProps {
  className?: string;
}

export function PreviewCustomizer({ className = '' }: PreviewCustomizerProps) {
  const { state } = usePreview();
  const [isOpen, setIsOpen] = useState(false);
  const [customization, setCustomization] = useState<PreviewCustomization>(DEFAULT_CUSTOMIZATION);
  const [activeTab, setActiveTab] = useState('appearance');
  const [previewChanges, setPreviewChanges] = useState(false);

  // Don't render if preview mode is disabled
  if (!state.isEnabled) {
    return null;
  }

  // Load saved customization from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('preview-customization');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setCustomization({ ...DEFAULT_CUSTOMIZATION, ...parsed });
      } catch (error) {
        console.warn('Failed to load preview customization:', error);
      }
    }
  }, []);

  // Save customization to localStorage
  const saveCustomization = useCallback((newCustomization: PreviewCustomization) => {
    setCustomization(newCustomization);
    localStorage.setItem('preview-customization', JSON.stringify(newCustomization));
    applyCustomization(newCustomization);
    toast.success('Preview customization saved');
  }, []);

  // Apply customization to preview elements
  const applyCustomization = useCallback((config: PreviewCustomization) => {
    const styleId = 'preview-customization-styles';
    let style = document.getElementById(styleId) as HTMLStyleElement;
    
    if (!style) {
      style = document.createElement('style');
      style.id = styleId;
      document.head.appendChild(style);
    }

    const css = generateCustomizationCSS(config);
    style.textContent = css;

    // Update CSS custom properties for dynamic theming
    const root = document.documentElement;
    Object.entries(config.theme.colors).forEach(([key, value]) => {
      root.style.setProperty(`--preview-${key}`, value);
    });
    root.style.setProperty('--preview-overlay-opacity', config.theme.overlayOpacity.toString());
    root.style.setProperty('--preview-border-radius', `${config.theme.borderRadius}px`);
    root.style.setProperty('--preview-shadow-intensity', config.theme.shadowIntensity.toString());
  }, []);

  // Generate CSS from customization settings
  const generateCustomizationCSS = (config: PreviewCustomization): string => {
    const { theme, highlightIntensity, compactMode } = config;
    
    return `
      /* Preview element highlighting */
      .webhook-preview-element:hover {
        outline: 2px solid ${theme.colors.primary} !important;
        outline-offset: 2px;
        background-color: ${theme.colors.primary}${Math.round(highlightIntensity * 25).toString(16).padStart(2, '0')} !important;
        box-shadow: 0 0 ${theme.shadowIntensity * 20}px ${theme.colors.primary}${Math.round(theme.shadowIntensity * 51).toString(16).padStart(2, '0')};
        transition: all ${config.enableAnimations ? '0.2s ease' : 'none'};
        border-radius: ${theme.borderRadius}px;
      }
      
      .webhook-preview-element.selected {
        outline: 2px solid ${theme.colors.success} !important;
        outline-offset: 2px;
        background-color: ${theme.colors.success}${Math.round(highlightIntensity * 25).toString(16).padStart(2, '0')} !important;
        box-shadow: 0 0 ${theme.shadowIntensity * 25}px ${theme.colors.success}${Math.round(theme.shadowIntensity * 51).toString(16).padStart(2, '0')};
        border-radius: ${theme.borderRadius}px;
      }
      
      .webhook-preview-element.multi-selected {
        outline: 2px solid ${theme.colors.secondary} !important;
        outline-offset: 2px;
        background-color: ${theme.colors.secondary}${Math.round(highlightIntensity * 25).toString(16).padStart(2, '0')} !important;
        box-shadow: 0 0 ${theme.shadowIntensity * 25}px ${theme.colors.secondary}${Math.round(theme.shadowIntensity * 51).toString(16).padStart(2, '0')};
        border-radius: ${theme.borderRadius}px;
      }
      
      /* Preview overlays */
      .webhook-element-overlay .card {
        background-color: ${theme.colors.background} !important;
        border: 1px solid ${theme.colors.primary}${Math.round(theme.overlayOpacity * 51).toString(16).padStart(2, '0')} !important;
        border-radius: ${theme.borderRadius}px !important;
        opacity: ${theme.overlayOpacity};
        ${compactMode ? 'transform: scale(0.9);' : ''}
      }
      
      .webhook-element-overlay .card .text-blue-800,
      .webhook-element-overlay .card .text-green-800,
      .webhook-element-overlay .card .text-purple-800 {
        color: ${theme.colors.foreground} !important;
      }
      
      /* Animation controls */
      ${!config.enableAnimations ? `
        *, *::before, *::after {
          animation-duration: 0s !important;
          transition-duration: 0s !important;
        }
      ` : ''}
      
      /* Compact mode adjustments */
      ${compactMode ? `
        .webhook-element-overlay .card {
          font-size: 0.8em;
          padding: 0.5rem !important;
        }
        .webhook-element-overlay .badge {
          font-size: 0.7em;
        }
      ` : ''}
    `;
  };

  // Reset to defaults
  const resetToDefaults = useCallback(() => {
    setCustomization(DEFAULT_CUSTOMIZATION);
    localStorage.removeItem('preview-customization');
    applyCustomization(DEFAULT_CUSTOMIZATION);
    toast.success('Reset to default settings');
  }, [applyCustomization]);

  // Preview changes temporarily
  const togglePreviewChanges = useCallback(() => {
    setPreviewChanges(!previewChanges);
    if (!previewChanges) {
      applyCustomization(customization);
      toast.info('Previewing changes');
    } else {
      // Restore saved settings
      const saved = localStorage.getItem('preview-customization');
      const savedConfig = saved ? JSON.parse(saved) : DEFAULT_CUSTOMIZATION;
      applyCustomization(savedConfig);
      toast.info('Preview disabled');
    }
  }, [previewChanges, customization, applyCustomization]);

  // Handle theme selection
  const handleThemeChange = useCallback((themeName: string) => {
    const theme = DEFAULT_THEMES.find(t => t.name === themeName);
    if (theme) {
      const updated = { ...customization, theme };
      setCustomization(updated);
      if (previewChanges) {
        applyCustomization(updated);
      }
    }
  }, [customization, previewChanges, applyCustomization]);

  // Handle setting changes
  const handleSettingChange = useCallback((key: keyof PreviewCustomization, value: any) => {
    const updated = { ...customization, [key]: value };
    setCustomization(updated);
    if (previewChanges) {
      applyCustomization(updated);
    }
  }, [customization, previewChanges, applyCustomization]);

  const handleShortcutChange = useCallback((shortcut: keyof PreviewCustomization['shortcuts'], value: string) => {
    const updated = {
      ...customization,
      shortcuts: { ...customization.shortcuts, [shortcut]: value }
    };
    setCustomization(updated);
  }, [customization]);

  // Render theme selector
  const renderThemeSelector = () => (
    <div className="space-y-3">
      <Label className="text-sm font-medium">Theme</Label>
      <div className="grid grid-cols-2 gap-2">
        {DEFAULT_THEMES.map(theme => (
          <Card 
            key={theme.name}
            className={`cursor-pointer transition-colors border-2 ${
              customization.theme.name === theme.name 
                ? 'border-blue-500 bg-blue-50' 
                : 'border-gray-200 hover:border-gray-300'
            }`}
            onClick={() => handleThemeChange(theme.name)}
          >
            <CardContent className="p-3">
              <div className="flex items-center gap-2 mb-2">
                <div className="flex gap-1">
                  <div className="w-3 h-3 rounded" style={{ backgroundColor: theme.colors.primary }} />
                  <div className="w-3 h-3 rounded" style={{ backgroundColor: theme.colors.secondary }} />
                  <div className="w-3 h-3 rounded" style={{ backgroundColor: theme.colors.success }} />
                </div>
                <span className="text-xs font-medium">{theme.name}</span>
              </div>
              <div className="text-xs text-gray-500">
                Opacity: {Math.round(theme.overlayOpacity * 100)}%
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );

  // Render color customization
  const renderColorCustomization = () => (
    <div className="space-y-4">
      <Label className="text-sm font-medium">Custom Colors</Label>
      {Object.entries(customization.theme.colors).map(([key, value]) => (
        <div key={key} className="flex items-center justify-between">
          <Label className="text-sm capitalize">{key.replace(/([A-Z])/g, ' $1')}</Label>
          <div className="flex items-center gap-2">
            <Input
              type="color"
              value={value}
              onChange={(e) => {
                const updated = {
                  ...customization,
                  theme: {
                    ...customization.theme,
                    colors: { ...customization.theme.colors, [key]: e.target.value }
                  }
                };
                setCustomization(updated);
                if (previewChanges) applyCustomization(updated);
              }}
              className="w-12 h-8 p-0 border-0 rounded cursor-pointer"
            />
            <span className="text-xs font-mono w-16">{value}</span>
          </div>
        </div>
      ))}
    </div>
  );

  // Main customizer interface
  return (
    <>
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogTrigger asChild>
          <Button
            size="sm"
            variant="outline"
            className="fixed top-4 right-4 z-[10003] bg-white shadow-lg border-gray-200"
            data-preview-system="true"
          >
            <Settings className="h-4 w-4 mr-1" />
            <span className="text-xs">Customize</span>
          </Button>
        </DialogTrigger>

        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Palette className="h-5 w-5 text-blue-600" />
              Preview Customization
            </DialogTitle>
            <DialogDescription>
              Customize the appearance and behavior of preview mode
            </DialogDescription>
          </DialogHeader>

          <div className="flex items-center gap-2 py-2">
            <Switch
              id="preview-changes"
              checked={previewChanges}
              onCheckedChange={togglePreviewChanges}
            />
            <Label htmlFor="preview-changes" className="text-sm">
              Preview changes in real-time
            </Label>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="appearance">Appearance</TabsTrigger>
              <TabsTrigger value="behavior">Behavior</TabsTrigger>
              <TabsTrigger value="shortcuts">Shortcuts</TabsTrigger>
              <TabsTrigger value="advanced">Advanced</TabsTrigger>
            </TabsList>

            <ScrollArea className="h-96 mt-4">
              <TabsContent value="appearance" className="space-y-4">
                {renderThemeSelector()}
                <Separator />
                
                <div className="space-y-3">
                  <Label className="text-sm font-medium">Visual Settings</Label>
                  
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm">Highlight Intensity</Label>
                      <div className="flex items-center gap-2">
                        <Slider
                          value={[customization.highlightIntensity * 100]}
                          onValueChange={([value]) => 
                            handleSettingChange('highlightIntensity', value / 100)
                          }
                          max={100}
                          step={10}
                          className="w-24"
                        />
                        <span className="text-xs w-8">{Math.round(customization.highlightIntensity * 100)}%</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <Label className="text-sm">Overlay Position</Label>
                      <Select
                        value={customization.overlayPosition}
                        onValueChange={(value) => handleSettingChange('overlayPosition', value)}
                      >
                        <SelectTrigger className="w-24">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="auto">Auto</SelectItem>
                          <SelectItem value="top">Top</SelectItem>
                          <SelectItem value="bottom">Bottom</SelectItem>
                          <SelectItem value="left">Left</SelectItem>
                          <SelectItem value="right">Right</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                <Separator />
                {renderColorCustomization()}
              </TabsContent>

              <TabsContent value="behavior" className="space-y-4">
                <div className="space-y-4">
                  <Label className="text-sm font-medium">Interaction Settings</Label>
                  
                  {[
                    { key: 'showElementInfo', label: 'Show Element Information', icon: Eye },
                    { key: 'showElementCount', label: 'Show Element Count', icon: Square },
                    { key: 'enableAnimations', label: 'Enable Animations', icon: Zap },
                    { key: 'enableAutoHighlight', label: 'Auto-highlight on Hover', icon: MousePointer },
                    { key: 'enableSounds', label: 'Enable Sound Effects', icon: Volume2 },
                    { key: 'compactMode', label: 'Compact Mode', icon: Maximize }
                  ].map(({ key, label, icon: Icon }) => (
                    <div key={key} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Icon className="h-4 w-4 text-gray-500" />
                        <Label className="text-sm">{label}</Label>
                      </div>
                      <Switch
                        checked={customization[key as keyof PreviewCustomization] as boolean}
                        onCheckedChange={(checked) => handleSettingChange(key as keyof PreviewCustomization, checked)}
                      />
                    </div>
                  ))}

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Timer className="h-4 w-4 text-gray-500" />
                      <Label className="text-sm">Click Delay (ms)</Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <Slider
                        value={[customization.clickDelay]}
                        onValueChange={([value]) => handleSettingChange('clickDelay', value)}
                        max={1000}
                        step={50}
                        className="w-24"
                      />
                      <span className="text-xs w-12">{customization.clickDelay}ms</span>
                    </div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="shortcuts" className="space-y-4">
                <Label className="text-sm font-medium">Keyboard Shortcuts</Label>
                <div className="space-y-3">
                  {Object.entries(customization.shortcuts).map(([key, value]) => (
                    <div key={key} className="flex items-center justify-between">
                      <Label className="text-sm capitalize">
                        {key.replace(/([A-Z])/g, ' $1')}
                      </Label>
                      <Input
                        value={value}
                        onChange={(e) => handleShortcutChange(key as keyof PreviewCustomization['shortcuts'], e.target.value)}
                        className="w-32 text-xs font-mono"
                        placeholder="Enter shortcut"
                      />
                    </div>
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="advanced" className="space-y-4">
                <Label className="text-sm font-medium">Advanced Settings</Label>
                
                {[
                  { key: 'showConfidenceScores', label: 'Show Confidence Scores', icon: Contrast },
                  { key: 'showElementPaths', label: 'Show Element Paths', icon: Layers },
                  { key: 'showPerformanceMetrics', label: 'Show Performance Metrics', icon: Monitor }
                ].map(({ key, label, icon: Icon }) => (
                  <div key={key} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Icon className="h-4 w-4 text-gray-500" />
                      <Label className="text-sm">{label}</Label>
                    </div>
                    <Switch
                      checked={customization[key as keyof PreviewCustomization] as boolean}
                      onCheckedChange={(checked) => handleSettingChange(key as keyof PreviewCustomization, checked)}
                    />
                  </div>
                ))}
              </TabsContent>
            </ScrollArea>
          </Tabs>

          <DialogFooter>
            <Button variant="outline" onClick={resetToDefaults}>
              <RotateCcw className="h-4 w-4 mr-2" />
              Reset
            </Button>
            <Button onClick={() => saveCustomization(customization)}>
              <Save className="h-4 w-4 mr-2" />
              Save Settings
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}