import React, { useState, useEffect, useMemo } from 'react';
import {
  Brain,
  CheckCircle,
  Clock,
  AlertCircle,
  Zap,
  Search,
  ChevronDown,
  Star,
  Activity,
  Database,
  FileText,
  TrendingUp,
  Filter,
  RotateCcw
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { useKnowledgeBases } from '../../hooks/useKnowledgeBases';

export interface KnowledgeBaseInfo {
  id: string;
  name: string;
  display_name: string;
  description?: string;
  file_count: number;
  total_vectors: number;
  status: 'active' | 'processing' | 'error' | 'inactive';
  last_updated: string;
  relevance_score?: number; // For smart suggestions
  usage_count?: number; // How often it's used
  processing_progress?: number; // 0-100 for processing status
}

interface SmartKBSelectorProps {
  selectedKbIds: string[];
  onSelectionChange: (kbIds: string[]) => void;
  currentMessage?: string; // For smart suggestions
  className?: string;
  maxSelections?: number;
  showStatusIndicators?: boolean;
  enableSmartSuggestions?: boolean;
}

export function SmartKBSelector({
  selectedKbIds,
  onSelectionChange,
  currentMessage = '',
  className,
  maxSelections = 5,
  showStatusIndicators = true,
  enableSmartSuggestions = true
}: SmartKBSelectorProps) {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [sortBy, setSortBy] = useState<'name' | 'relevance' | 'usage' | 'updated'>('relevance');
  const [statusFilter, setStatusFilter] = useState<string[]>(['active']);

  const { data: knowledgeBases, isLoading } = useKnowledgeBases();

  // Enhanced KB data with smart features
  const enhancedKBs = useMemo(() => {
    if (!knowledgeBases) return [];

    return knowledgeBases.map((kb): KnowledgeBaseInfo => ({
      id: kb.id,
      name: kb.name,
      display_name: kb.display_name,
      description: kb.description,
      file_count: kb.file_count || 0,
      total_vectors: kb.total_vectors || 0,
      status: kb.status || 'active',
      last_updated: kb.updated_at || '',
      relevance_score: calculateRelevanceScore(kb, currentMessage),
      usage_count: kb.usage_count || 0,
      processing_progress: kb.processing_progress || 100
    }));
  }, [knowledgeBases, currentMessage]);

  // Smart suggestions based on message content
  const smartSuggestions = useMemo(() => {
    if (!enableSmartSuggestions || !currentMessage.trim()) return [];

    return enhancedKBs
      .filter(kb => kb.status === 'active')
      .filter(kb => !selectedKbIds.includes(kb.id))
      .sort((a, b) => (b.relevance_score || 0) - (a.relevance_score || 0))
      .slice(0, 3);
  }, [enhancedKBs, currentMessage, selectedKbIds, enableSmartSuggestions]);

  // Filtered and sorted KBs
  const filteredKBs = useMemo(() => {
    let filtered = enhancedKBs;

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(kb => 
        kb.display_name.toLowerCase().includes(query) ||
        kb.name.toLowerCase().includes(query) ||
        kb.description?.toLowerCase().includes(query)
      );
    }

    // Apply status filter
    if (statusFilter.length > 0) {
      filtered = filtered.filter(kb => statusFilter.includes(kb.status));
    }

    // Sort
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.display_name.localeCompare(b.display_name);
        case 'relevance':
          return (b.relevance_score || 0) - (a.relevance_score || 0);
        case 'usage':
          return (b.usage_count || 0) - (a.usage_count || 0);
        case 'updated':
          return new Date(b.last_updated).getTime() - new Date(a.last_updated).getTime();
        default:
          return 0;
      }
    });

    return filtered;
  }, [enhancedKBs, searchQuery, statusFilter, sortBy]);

  // Handle KB selection
  const handleKBToggle = (kbId: string, checked: boolean) => {
    if (checked) {
      if (selectedKbIds.length >= maxSelections) {
        return; // Max selections reached
      }
      onSelectionChange([...selectedKbIds, kbId]);
    } else {
      onSelectionChange(selectedKbIds.filter(id => id !== kbId));
    }
  };

  // Apply smart suggestions
  const applySuggestion = (kbId: string) => {
    if (!selectedKbIds.includes(kbId) && selectedKbIds.length < maxSelections) {
      onSelectionChange([...selectedKbIds, kbId]);
    }
  };

  // Get status icon and color
  const getStatusInfo = (status: string, progress?: number) => {
    switch (status) {
      case 'active':
        return { icon: CheckCircle, color: 'text-green-500', text: 'Ready' };
      case 'processing':
        return { icon: Clock, color: 'text-yellow-500', text: `Processing ${progress || 0}%` };
      case 'error':
        return { icon: AlertCircle, color: 'text-red-500', text: 'Error' };
      case 'inactive':
        return { icon: AlertCircle, color: 'text-gray-500', text: 'Inactive' };
      default:
        return { icon: AlertCircle, color: 'text-gray-500', text: 'Unknown' };
    }
  };

  const selectedKBs = enhancedKBs.filter(kb => selectedKbIds.includes(kb.id));

  return (
    <TooltipProvider>
      <div className={className}>
        {/* Smart Suggestions */}
        {smartSuggestions.length > 0 && (
          <div className="mb-3">
            <div className="flex items-center gap-2 mb-2">
              <Zap className="h-4 w-4 text-yellow-500" />
              <span className="text-sm font-medium">Smart Suggestions</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {smartSuggestions.map((kb) => (
                <Button
                  key={kb.id}
                  variant="outline"
                  size="sm"
                  onClick={() => applySuggestion(kb.id)}
                  className="h-auto p-2 flex items-center gap-2"
                >
                  <Brain className="h-3 w-3" />
                  <span className="text-xs">{kb.display_name}</span>
                  <Badge variant="secondary" className="text-xs">
                    {Math.round((kb.relevance_score || 0) * 100)}%
                  </Badge>
                </Button>
              ))}
            </div>
          </div>
        )}

        {/* Main Selector */}
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" className="w-full justify-between">
              <div className="flex items-center gap-2">
                <Brain className="h-4 w-4" />
                <span>
                  {selectedKbIds.length === 0
                    ? 'Select Knowledge Bases'
                    : selectedKbIds.length === 1
                    ? selectedKBs[0]?.display_name
                    : `${selectedKbIds.length} Knowledge Bases`}
                </span>
              </div>
              <div className="flex items-center gap-2">
                {selectedKbIds.length > 0 && (
                  <Badge variant="secondary">{selectedKbIds.length}</Badge>
                )}
                <ChevronDown className="h-4 w-4" />
              </div>
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-96 p-0" align="start">
            <div className="p-4 space-y-4">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search knowledge bases..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>

              {/* Quick Actions */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onSelectionChange([])}
                    className="h-7 px-2"
                  >
                    <RotateCcw className="h-3 w-3 mr-1" />
                    Clear
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowAdvanced(!showAdvanced)}
                    className="h-7 px-2"
                  >
                    <Filter className="h-3 w-3 mr-1" />
                    Filters
                  </Button>
                </div>
                <div className="text-xs text-muted-foreground">
                  {selectedKbIds.length}/{maxSelections}
                </div>
              </div>

              {/* Advanced Filters */}
              {showAdvanced && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Filters & Sorting</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {/* Sort Options */}
                    <div>
                      <Label className="text-xs">Sort by</Label>
                      <div className="grid grid-cols-2 gap-1 mt-1">
                        {[
                          { value: 'relevance', label: 'Relevance', icon: TrendingUp },
                          { value: 'name', label: 'Name', icon: FileText },
                          { value: 'usage', label: 'Usage', icon: Activity },
                          { value: 'updated', label: 'Updated', icon: Clock }
                        ].map(option => (
                          <Button
                            key={option.value}
                            variant={sortBy === option.value ? "default" : "outline"}
                            size="sm"
                            onClick={() => setSortBy(option.value as any)}
                            className="h-7 justify-start"
                          >
                            <option.icon className="h-3 w-3 mr-1" />
                            {option.label}
                          </Button>
                        ))}
                      </div>
                    </div>

                    {/* Status Filter */}
                    <div>
                      <Label className="text-xs">Status</Label>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {['active', 'processing', 'error'].map(status => (
                          <div key={status} className="flex items-center space-x-1">
                            <Checkbox
                              id={status}
                              checked={statusFilter.includes(status)}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  setStatusFilter([...statusFilter, status]);
                                } else {
                                  setStatusFilter(statusFilter.filter(s => s !== status));
                                }
                              }}
                            />
                            <Label htmlFor={status} className="text-xs capitalize">
                              {status}
                            </Label>
                          </div>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* KB List */}
              <div className="max-h-64 overflow-y-auto space-y-2">
                {isLoading ? (
                  <div className="text-center py-4 text-sm text-muted-foreground">
                    Loading knowledge bases...
                  </div>
                ) : filteredKBs.length === 0 ? (
                  <div className="text-center py-4 text-sm text-muted-foreground">
                    No knowledge bases found
                  </div>
                ) : (
                  filteredKBs.map((kb) => {
                    const isSelected = selectedKbIds.includes(kb.id);
                    const statusInfo = getStatusInfo(kb.status, kb.processing_progress);
                    const isMaxReached = selectedKbIds.length >= maxSelections && !isSelected;

                    return (
                      <div
                        key={kb.id}
                        className={cn(
                          "p-3 rounded-lg border transition-colors",
                          isSelected ? "bg-accent border-primary" : "hover:bg-accent/50",
                          isMaxReached ? "opacity-50" : ""
                        )}
                      >
                        <div className="flex items-start gap-3">
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={(checked) => handleKBToggle(kb.id, !!checked)}
                            disabled={isMaxReached}
                          />
                          
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-medium text-sm truncate">
                                {kb.display_name}
                              </span>
                              
                              {showStatusIndicators && (
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <div className="flex items-center gap-1">
                                      <statusInfo.icon className={cn("h-3 w-3", statusInfo.color)} />
                                    </div>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>{statusInfo.text}</p>
                                  </TooltipContent>
                                </Tooltip>
                              )}

                              {kb.relevance_score && kb.relevance_score > 0.7 && (
                                <Badge variant="secondary" className="text-xs">
                                  {Math.round(kb.relevance_score * 100)}%
                                </Badge>
                              )}
                            </div>

                            {kb.description && (
                              <p className="text-xs text-muted-foreground truncate">
                                {kb.description}
                              </p>
                            )}

                            <div className="flex items-center gap-3 mt-1">
                              <div className="flex items-center gap-1">
                                <Database className="h-3 w-3 text-muted-foreground" />
                                <span className="text-xs text-muted-foreground">
                                  {kb.file_count} files
                                </span>
                              </div>
                              
                              <div className="flex items-center gap-1">
                                <Activity className="h-3 w-3 text-muted-foreground" />
                                <span className="text-xs text-muted-foreground">
                                  {kb.total_vectors} vectors
                                </span>
                              </div>

                              {kb.usage_count && kb.usage_count > 0 && (
                                <div className="flex items-center gap-1">
                                  <Star className="h-3 w-3 text-muted-foreground" />
                                  <span className="text-xs text-muted-foreground">
                                    {kb.usage_count} uses
                                  </span>
                                </div>
                              )}
                            </div>

                            {/* Processing Progress */}
                            {kb.status === 'processing' && kb.processing_progress !== undefined && (
                              <div className="mt-2">
                                <div className="w-full bg-gray-200 rounded-full h-1">
                                  <div 
                                    className="bg-blue-500 h-1 rounded-full transition-all duration-300"
                                    style={{ width: `${kb.processing_progress}%` }}
                                  />
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Selection Summary */}
              {selectedKbIds.length > 0 && (
                <div className="pt-2 border-t">
                  <div className="text-xs text-muted-foreground mb-2">
                    Selected ({selectedKbIds.length}):
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {selectedKBs.map((kb) => (
                      <Badge key={kb.id} variant="secondary" className="text-xs">
                        {kb.display_name}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </PopoverContent>
        </Popover>
      </div>
    </TooltipProvider>
  );
}

// Helper function to calculate relevance score based on message content
function calculateRelevanceScore(kb: any, message: string): number {
  if (!message.trim()) return 0;

  const messageWords = message.toLowerCase().split(/\s+/);
  const kbText = `${kb.display_name} ${kb.description || ''} ${kb.name}`.toLowerCase();
  
  // Simple keyword matching - in a real implementation, this could use
  // more sophisticated NLP techniques or vector similarity
  let score = 0;
  let matches = 0;

  messageWords.forEach(word => {
    if (word.length > 2 && kbText.includes(word)) {
      matches++;
      score += word.length / messageWords.length;
    }
  });

  // Boost score based on number of matches relative to message length
  if (matches > 0) {
    score = Math.min(1, score + (matches / messageWords.length) * 0.5);
  }

  return score;
}