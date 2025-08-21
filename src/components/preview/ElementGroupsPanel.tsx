// Phase 4.5: Element Groups Panel
// Visual interface for smart element grouping and group management

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Layers,
  ChevronDown,
  ChevronRight,
  Users,
  Workflow,
  Navigation,
  Database,
  Settings,
  Zap,
  Eye,
  EyeOff,
  RefreshCw,
  Target,
  GitBranch,
  Box,
  FormInput,
  MousePointer,
  Check,
  X,
  Info,
  Lightbulb
} from 'lucide-react';
import { usePreview } from './PreviewController';
import { analyzeElementGroups, ElementGroup, GroupElement } from '@/lib/element-grouping';
import { toast } from 'sonner';

interface ElementGroupsPanelProps {
  className?: string;
}

interface GroupVisualization {
  group: ElementGroup;
  isVisible: boolean;
  isExpanded: boolean;
  highlightColor: string;
}

const GROUP_TYPE_ICONS = {
  form: FormInput,
  workflow: Workflow,
  navigation: Navigation,
  'action-set': MousePointer,
  'data-entry': Database,
  custom: Box
} as const;

const GROUP_TYPE_COLORS = {
  form: '#10b981', // green
  workflow: '#3b82f6', // blue
  navigation: '#8b5cf6', // purple
  'action-set': '#f59e0b', // amber
  'data-entry': '#06b6d4', // cyan
  custom: '#6b7280' // gray
} as const;

const CONFIDENCE_LEVELS = {
  high: { min: 0.8, color: '#10b981', label: 'High' },
  medium: { min: 0.6, color: '#f59e0b', label: 'Medium' },
  low: { min: 0.4, color: '#ef4444', label: 'Low' }
} as const;

export function ElementGroupsPanel({ className = '' }: ElementGroupsPanelProps) {
  const { state, actions } = usePreview();
  const [groups, setGroups] = useState<ElementGroup[]>([]);
  const [groupVisualizations, setGroupVisualizations] = useState<Map<string, GroupVisualization>>(new Map());
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showGroupsPanel, setShowGroupsPanel] = useState(false);
  const [autoGrouping, setAutoGrouping] = useState(true);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);

  // Don't render if preview mode is disabled
  if (!state.isEnabled) {
    return null;
  }

  // Analyze elements and generate groups
  const analyzeGroups = useCallback(async () => {
    setIsAnalyzing(true);
    
    try {
      // Get all interactive elements from the page
      const interactiveElements = Array.from(
        document.querySelectorAll('.webhook-preview-element')
      ) as HTMLElement[];

      if (interactiveElements.length === 0) {
        toast.info('No interactive elements found to group');
        return;
      }

      // Perform smart grouping analysis
      const analyzedGroups = analyzeElementGroups(document.body, interactiveElements);
      setGroups(analyzedGroups);

      // Initialize visualizations
      const newVisualizations = new Map<string, GroupVisualization>();
      analyzedGroups.forEach((group, index) => {
        newVisualizations.set(group.id, {
          group,
          isVisible: group.confidence >= 0.6, // Auto-show high confidence groups
          isExpanded: group.confidence >= 0.8, // Auto-expand highest confidence groups
          highlightColor: GROUP_TYPE_COLORS[group.type] || GROUP_TYPE_COLORS.custom
        });
      });
      setGroupVisualizations(newVisualizations);

      toast.success(`Found ${analyzedGroups.length} element groups`);
    } catch (error) {
      console.error('Group analysis failed:', error);
      toast.error('Failed to analyze element groups');
    } finally {
      setIsAnalyzing(false);
    }
  }, []);

  // Auto-analyze when elements change (if enabled)
  useEffect(() => {
    if (!autoGrouping || !state.isEnabled) return;

    const debounceTimeout = setTimeout(analyzeGroups, 1000);
    return () => clearTimeout(debounceTimeout);
  }, [state.isEnabled, autoGrouping, analyzeGroups]);

  // Listen for show-element-groups event from preview indicator
  useEffect(() => {
    const handleShowGroups = () => {
      setShowGroupsPanel(true);
      if (groups.length === 0) {
        analyzeGroups();
      }
    };

    window.addEventListener('show-element-groups', handleShowGroups);
    return () => window.removeEventListener('show-element-groups', handleShowGroups);
  }, [groups.length, analyzeGroups]);

  // Handle group visualization toggle
  const toggleGroupVisibility = useCallback((groupId: string) => {
    setGroupVisualizations(prev => {
      const newMap = new Map(prev);
      const visualization = newMap.get(groupId);
      if (visualization) {
        const updated = { ...visualization, isVisible: !visualization.isVisible };
        newMap.set(groupId, updated);
        
        // Update element highlighting
        updateGroupHighlighting(updated.group, updated.isVisible, updated.highlightColor);
      }
      return newMap;
    });
  }, []);

  const toggleGroupExpansion = useCallback((groupId: string) => {
    setGroupVisualizations(prev => {
      const newMap = new Map(prev);
      const visualization = newMap.get(groupId);
      if (visualization) {
        newMap.set(groupId, { ...visualization, isExpanded: !visualization.isExpanded });
      }
      return newMap;
    });
  }, []);

  // Apply visual highlighting to group elements
  const updateGroupHighlighting = useCallback((group: ElementGroup, visible: boolean, color: string) => {
    group.elements.forEach(groupElement => {
      const element = document.querySelector(`[data-webhook-signature="${groupElement.signature}"]`) as HTMLElement;
      if (element) {
        if (visible) {
          element.style.boxShadow = `0 0 0 2px ${color}, 0 0 8px ${color}40`;
          element.setAttribute('data-group-id', group.id);
          element.setAttribute('data-group-name', group.name);
        } else {
          element.style.boxShadow = '';
          element.removeAttribute('data-group-id');
          element.removeAttribute('data-group-name');
        }
      }
    });
  }, []);

  // Select all elements in a group
  const selectGroup = useCallback((group: ElementGroup) => {
    const elementIds = group.elements.map(el => el.signature);
    actions.selectAllElements(elementIds);
    if (!state.isBulkMode) {
      actions.enableBulkMode();
    }
    setSelectedGroupId(group.id);
    toast.info(`Selected ${group.name} (${elementIds.length} elements)`);
  }, [actions, state.isBulkMode]);

  // Get confidence level info
  const getConfidenceLevel = useCallback((confidence: number) => {
    if (confidence >= CONFIDENCE_LEVELS.high.min) return CONFIDENCE_LEVELS.high;
    if (confidence >= CONFIDENCE_LEVELS.medium.min) return CONFIDENCE_LEVELS.medium;
    return CONFIDENCE_LEVELS.low;
  }, []);

  // Render group summary stats
  const groupStats = useMemo(() => {
    const stats = {
      total: groups.length,
      high: groups.filter(g => g.confidence >= 0.8).length,
      medium: groups.filter(g => g.confidence >= 0.6 && g.confidence < 0.8).length,
      low: groups.filter(g => g.confidence < 0.6).length,
      visible: Array.from(groupVisualizations.values()).filter(v => v.isVisible).length
    };
    return stats;
  }, [groups, groupVisualizations]);

  if (!showGroupsPanel && groups.length === 0) {
    // Show compact trigger button
    return createPortal(
      <div className={`fixed top-4 left-4 z-[10003] ${className}`} data-preview-system="true">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size="sm"
                variant="outline"
                className="bg-white shadow-lg border-indigo-200"
                onClick={() => setShowGroupsPanel(true)}
                disabled={isAnalyzing}
              >
                {isAnalyzing ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <Layers className="h-4 w-4" />
                )}
                <span className="ml-1 text-xs">Groups</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Analyze element groups</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>,
      document.body
    );
  }

  return createPortal(
    <div className={`fixed top-4 left-4 z-[10003] w-80 ${className}`} data-preview-system="true">
      <Card className="border-indigo-200 bg-white shadow-lg">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Layers className="h-5 w-5 text-indigo-600" />
              <CardTitle className="text-lg text-indigo-900">Smart Groups</CardTitle>
            </div>
            <div className="flex items-center gap-2">
              {groups.length > 0 && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={analyzeGroups}
                  disabled={isAnalyzing}
                >
                  <RefreshCw className={`h-3 w-3 ${isAnalyzing ? 'animate-spin' : ''}`} />
                </Button>
              )}
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setShowGroupsPanel(false)}
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          </div>
          <CardDescription className="text-indigo-700">
            Intelligent element grouping and workflow detection
          </CardDescription>
        </CardHeader>

        <CardContent>
          {/* Auto-grouping toggle */}
          <div className="flex items-center justify-between mb-4">
            <Label htmlFor="auto-grouping" className="text-sm font-medium">
              Auto-analyze groups
            </Label>
            <Switch
              id="auto-grouping"
              checked={autoGrouping}
              onCheckedChange={setAutoGrouping}
            />
          </div>

          {isAnalyzing && (
            <div className="mb-4 p-3 bg-indigo-50 rounded-lg">
              <div className="flex items-center gap-2 text-sm text-indigo-700 mb-2">
                <RefreshCw className="h-4 w-4 animate-spin" />
                Analyzing element relationships...
              </div>
              <Progress value={75} className="h-2" />
            </div>
          )}

          {groups.length === 0 && !isAnalyzing && (
            <div className="text-center py-6">
              <Lightbulb className="h-8 w-8 text-indigo-400 mx-auto mb-2" />
              <p className="text-sm text-gray-600 mb-3">
                No groups detected yet
              </p>
              <Button onClick={analyzeGroups} size="sm">
                <Target className="h-4 w-4 mr-2" />
                Analyze Elements
              </Button>
            </div>
          )}

          {groups.length > 0 && (
            <>
              {/* Group statistics */}
              <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>Total: <span className="font-semibold">{groupStats.total}</span></div>
                  <div>Visible: <span className="font-semibold">{groupStats.visible}</span></div>
                  <div className="text-green-600">High: {groupStats.high}</div>
                  <div className="text-orange-600">Medium: {groupStats.medium}</div>
                </div>
              </div>

              {/* Groups list */}
              <ScrollArea className="h-96">
                <div className="space-y-2">
                  {groups.map(group => {
                    const visualization = groupVisualizations.get(group.id);
                    if (!visualization) return null;

                    const IconComponent = GROUP_TYPE_ICONS[group.type];
                    const confidenceLevel = getConfidenceLevel(group.confidence);
                    const isSelected = selectedGroupId === group.id;

                    return (
                      <Card 
                        key={group.id}
                        className={`border transition-colors ${
                          isSelected ? 'border-indigo-500 bg-indigo-50' : 'border-gray-200'
                        }`}
                      >
                        <Collapsible 
                          open={visualization.isExpanded}
                          onOpenChange={() => toggleGroupExpansion(group.id)}
                        >
                          <CollapsibleTrigger asChild>
                            <CardHeader className="pb-2 cursor-pointer hover:bg-gray-50">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2 flex-1">
                                  {visualization.isExpanded ? (
                                    <ChevronDown className="h-3 w-3 text-gray-400" />
                                  ) : (
                                    <ChevronRight className="h-3 w-3 text-gray-400" />
                                  )}
                                  <IconComponent className="h-4 w-4" style={{ color: visualization.highlightColor }} />
                                  <div className="flex-1 min-w-0">
                                    <div className="font-medium text-sm truncate">
                                      {group.name}
                                    </div>
                                    <div className="text-xs text-gray-500">
                                      {group.elements.length} elements
                                    </div>
                                  </div>
                                </div>
                                
                                <div className="flex items-center gap-1">
                                  <Badge 
                                    variant="outline" 
                                    className="text-xs px-1 py-0"
                                    style={{ 
                                      borderColor: confidenceLevel.color, 
                                      color: confidenceLevel.color 
                                    }}
                                  >
                                    {Math.round(group.confidence * 100)}%
                                  </Badge>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-6 w-6 p-0"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      toggleGroupVisibility(group.id);
                                    }}
                                  >
                                    {visualization.isVisible ? (
                                      <Eye className="h-3 w-3 text-green-600" />
                                    ) : (
                                      <EyeOff className="h-3 w-3 text-gray-400" />
                                    )}
                                  </Button>
                                </div>
                              </div>
                            </CardHeader>
                          </CollapsibleTrigger>

                          <CollapsibleContent>
                            <CardContent className="pt-0">
                              <p className="text-xs text-gray-600 mb-3">
                                {group.description}
                              </p>

                              {/* Group elements */}
                              <div className="space-y-1 mb-3">
                                {group.elements.slice(0, 3).map(element => (
                                  <div key={element.id} className="flex items-center gap-2 text-xs">
                                    <div className={`w-2 h-2 rounded-full`} 
                                         style={{ backgroundColor: visualization.highlightColor }} />
                                    <span className="truncate flex-1">
                                      {element.element.textContent?.trim().substring(0, 30) || 
                                       element.element.tagName.toLowerCase()}
                                    </span>
                                    <Badge variant="secondary" className="text-xs px-1 py-0">
                                      {element.role}
                                    </Badge>
                                  </div>
                                ))}
                                {group.elements.length > 3 && (
                                  <div className="text-xs text-gray-500 pl-4">
                                    +{group.elements.length - 3} more elements
                                  </div>
                                )}
                              </div>

                              {/* Action buttons */}
                              <div className="flex gap-1">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="text-xs h-6 px-2"
                                  onClick={() => selectGroup(group)}
                                >
                                  <Check className="h-3 w-3 mr-1" />
                                  Select
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="text-xs h-6 px-2"
                                  onClick={() => toggleGroupVisibility(group.id)}
                                >
                                  {visualization.isVisible ? (
                                    <>
                                      <EyeOff className="h-3 w-3 mr-1" />
                                      Hide
                                    </>
                                  ) : (
                                    <>
                                      <Eye className="h-3 w-3 mr-1" />
                                      Show
                                    </>
                                  )}
                                </Button>
                                {group.suggestedWebhookFlow && group.suggestedWebhookFlow.length > 0 && (
                                  <TooltipProvider>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          className="text-xs h-6 px-2"
                                        >
                                          <Zap className="h-3 w-3 mr-1" />
                                          Flow
                                        </Button>
                                      </TooltipTrigger>
                                      <TooltipContent>
                                        <p>Suggested webhook flow:</p>
                                        <div className="text-xs">
                                          {group.suggestedWebhookFlow.join(' → ')}
                                        </div>
                                      </TooltipContent>
                                    </Tooltip>
                                  </TooltipProvider>
                                )}
                              </div>
                            </CardContent>
                          </CollapsibleContent>
                        </Collapsible>
                      </Card>
                    );
                  })}
                </div>
              </ScrollArea>
            </>
          )}
        </CardContent>
      </Card>
    </div>,
    document.body
  );
}