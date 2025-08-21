// Phase 4.2: Webhook Flow Mapping and Relationship Display
// Visual dependency graphs showing webhook relationships and data flow

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  Network,
  GitBranch,
  Zap,
  ArrowRight,
  ArrowDown,
  Circle,
  Square,
  Triangle,
  Search,
  Filter,
  Maximize2,
  Download,
  Refresh,
  Play,
  Pause,
  RotateCcw
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { realtimeMonitoringService } from '@/services/webhook/RealtimeMonitoringService';
import type { WebhookRealtimeStatus } from '@/types/webhook-monitoring';
import { toast } from 'sonner';

interface WebhookFlowMapperProps {
  organizationId: string;
  className?: string;
}

interface WebhookNode {
  id: string;
  name: string;
  type: 'trigger' | 'action' | 'condition' | 'webhook';
  status: 'healthy' | 'warning' | 'critical' | 'unknown';
  position: { x: number; y: number };
  element_id?: string;
  feature_slug?: string;
  performance_score?: number;
  success_rate?: number;
  dependencies: string[];
  dependents: string[];
  metadata: {
    last_execution?: string;
    total_executions?: number;
    avg_response_time?: number;
  };
}

interface WebhookEdge {
  id: string;
  source: string;
  target: string;
  type: 'trigger' | 'data_flow' | 'dependency';
  weight: number;
  status: 'active' | 'inactive' | 'error';
  metadata: {
    data_transferred?: number;
    success_rate?: number;
    last_activity?: string;
  };
}

interface FlowLayout {
  nodes: WebhookNode[];
  edges: WebhookEdge[];
  bounds: {
    minX: number;
    maxX: number;
    minY: number;
    maxY: number;
  };
}

interface FilterState {
  search: string;
  nodeTypes: string[];
  statusFilter: string[];
  showInactive: boolean;
}

const NODE_COLORS = {
  trigger: '#3b82f6',    // Blue
  action: '#22c55e',     // Green  
  condition: '#f59e0b',  // Orange
  webhook: '#8b5cf6'     // Purple
};

const STATUS_COLORS = {
  healthy: '#22c55e',
  warning: '#f59e0b', 
  critical: '#ef4444',
  unknown: '#64748b'
};

export const WebhookFlowMapper: React.FC<WebhookFlowMapperProps> = ({
  organizationId,
  className = ''
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const [flowLayout, setFlowLayout] = useState<FlowLayout | null>(null);
  const [webhookStatuses, setWebhookStatuses] = useState<WebhookRealtimeStatus[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedNode, setSelectedNode] = useState<WebhookNode | null>(null);
  const [filters, setFilters] = useState<FilterState>({
    search: '',
    nodeTypes: [],
    statusFilter: [],
    showInactive: true
  });
  const [viewMode, setViewMode] = useState<'flow' | 'hierarchy' | 'circular'>('flow');
  const [isAnimating, setIsAnimating] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });

  // Load flow data
  useEffect(() => {
    loadFlowData();
    const interval = setInterval(loadFlowData, 30000);
    return () => clearInterval(interval);
  }, [organizationId, viewMode]);

  // Set up real-time updates
  useEffect(() => {
    const connectMonitoring = async () => {
      await realtimeMonitoringService.connect();
      realtimeMonitoringService.on('execution_completed', handleExecutionUpdate);
      realtimeMonitoringService.on('metrics_updated', handleMetricsUpdate);
    };

    connectMonitoring();
    
    return () => {
      realtimeMonitoringService.off('execution_completed', handleExecutionUpdate);
      realtimeMonitoringService.off('metrics_updated', handleMetricsUpdate);
    };
  }, []);

  const loadFlowData = async () => {
    setIsLoading(true);
    try {
      // Load webhook statuses
      const statuses = await realtimeMonitoringService.getAllWebhookStatuses();
      setWebhookStatuses(statuses);

      // Load webhook relationships
      const relationships = await loadWebhookRelationships();
      
      // Generate flow layout
      const layout = await generateFlowLayout(statuses, relationships);
      setFlowLayout(layout);

    } catch (error) {
      console.error('Failed to load flow data:', error);
      toast.error('Failed to load webhook flow data');
    } finally {
      setIsLoading(false);
    }
  };

  const loadWebhookRelationships = async () => {
    // Load from webhook_relationships table
    const { data: relationships, error } = await supabase
      .from('webhook_relationships')
      .select('*')
      .eq('organization_id', organizationId);

    if (error) {
      console.error('Failed to load relationships:', error);
      return [];
    }

    return relationships || [];
  };

  const generateFlowLayout = async (
    statuses: WebhookRealtimeStatus[], 
    relationships: any[]
  ): Promise<FlowLayout> => {
    // Create nodes from webhook statuses
    const nodes: WebhookNode[] = statuses.map((status, index) => ({
      id: status.webhook_id,
      name: status.webhook_name || status.webhook_id,
      type: determineNodeType(status),
      status: status.overall_health,
      position: calculateNodePosition(index, statuses.length, viewMode),
      element_id: status.element_id,
      feature_slug: status.feature_slug,
      performance_score: status.performance_metrics?.performance_score,
      success_rate: status.performance_metrics?.success_rate,
      dependencies: [],
      dependents: [],
      metadata: {
        last_execution: status.performance_metrics?.last_execution_at,
        total_executions: status.performance_metrics?.total_executions,
        avg_response_time: status.performance_metrics?.avg_response_time_ms
      }
    }));

    // Create edges from relationships
    const edges: WebhookEdge[] = relationships.map((rel, index) => ({
      id: `edge-${index}`,
      source: rel.source_webhook_id,
      target: rel.target_webhook_id,
      type: rel.relationship_type,
      weight: rel.dependency_weight || 1,
      status: rel.is_active ? 'active' : 'inactive',
      metadata: {
        data_transferred: rel.data_flow_volume,
        success_rate: rel.success_rate_percentage,
        last_activity: rel.last_activity_at
      }
    }));

    // Update node dependencies
    edges.forEach(edge => {
      const sourceNode = nodes.find(n => n.id === edge.source);
      const targetNode = nodes.find(n => n.id === edge.target);
      
      if (sourceNode && targetNode) {
        sourceNode.dependents.push(edge.target);
        targetNode.dependencies.push(edge.source);
      }
    });

    // Calculate bounds
    const positions = nodes.map(n => n.position);
    const bounds = {
      minX: Math.min(...positions.map(p => p.x)) - 100,
      maxX: Math.max(...positions.map(p => p.x)) + 100,
      minY: Math.min(...positions.map(p => p.y)) - 100,
      maxY: Math.max(...positions.map(p => p.y)) + 100
    };

    return { nodes, edges, bounds };
  };

  const determineNodeType = (status: WebhookRealtimeStatus): WebhookNode['type'] => {
    // Determine node type based on webhook characteristics
    if (status.element_type === 'button' || status.element_type === 'form') {
      return 'trigger';
    } else if (status.webhook_url?.includes('api/')) {
      return 'action';
    } else if (status.feature_slug?.includes('condition')) {
      return 'condition';
    }
    return 'webhook';
  };

  const calculateNodePosition = (index: number, total: number, mode: string): { x: number; y: number } => {
    const centerX = 400;
    const centerY = 300;
    const radius = 200;

    switch (mode) {
      case 'circular':
        const angle = (2 * Math.PI * index) / total;
        return {
          x: centerX + radius * Math.cos(angle),
          y: centerY + radius * Math.sin(angle)
        };
      
      case 'hierarchy':
        const levels = Math.ceil(Math.sqrt(total));
        const level = Math.floor(index / levels);
        const posInLevel = index % levels;
        return {
          x: 100 + posInLevel * 150,
          y: 100 + level * 120
        };
      
      case 'flow':
      default:
        const cols = Math.ceil(Math.sqrt(total));
        const row = Math.floor(index / cols);
        const col = index % cols;
        return {
          x: 100 + col * 180,
          y: 100 + row * 140
        };
    }
  };

  // Real-time event handlers
  const handleExecutionUpdate = () => {
    if (!isAnimating) {
      setIsAnimating(true);
      setTimeout(() => setIsAnimating(false), 2000);
    }
    // Refresh data after animation
    setTimeout(loadFlowData, 1000);
  };

  const handleMetricsUpdate = () => {
    loadFlowData();
  };

  // Filter and search
  const filteredNodes = flowLayout?.nodes.filter(node => {
    // Search filter
    if (filters.search && !node.name.toLowerCase().includes(filters.search.toLowerCase())) {
      return false;
    }
    
    // Node type filter
    if (filters.nodeTypes.length > 0 && !filters.nodeTypes.includes(node.type)) {
      return false;
    }
    
    // Status filter
    if (filters.statusFilter.length > 0 && !filters.statusFilter.includes(node.status)) {
      return false;
    }
    
    return true;
  }) || [];

  const filteredEdges = flowLayout?.edges.filter(edge => {
    // Show inactive filter
    if (!filters.showInactive && edge.status === 'inactive') {
      return false;
    }
    
    // Only show edges for filtered nodes
    const sourceVisible = filteredNodes.some(n => n.id === edge.source);
    const targetVisible = filteredNodes.some(n => n.id === edge.target);
    
    return sourceVisible && targetVisible;
  }) || [];

  // Zoom and pan handlers
  const handleZoomIn = () => setZoom(prev => Math.min(prev * 1.2, 3));
  const handleZoomOut = () => setZoom(prev => Math.max(prev / 1.2, 0.3));
  const handleResetView = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  // Export functionality
  const exportFlowDiagram = () => {
    if (!svgRef.current || !flowLayout) return;
    
    const svgElement = svgRef.current;
    const svgData = new XMLSerializer().serializeToString(svgElement);
    const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
    const svgUrl = URL.createObjectURL(svgBlob);
    
    const link = document.createElement('a');
    link.href = svgUrl;
    link.download = `webhook-flow-${viewMode}-${Date.now()}.svg`;
    link.click();
    
    URL.revokeObjectURL(svgUrl);
  };

  // Render methods
  const renderNode = (node: WebhookNode) => {
    const nodeColor = NODE_COLORS[node.type];
    const statusColor = STATUS_COLORS[node.status];
    const isSelected = selectedNode?.id === node.id;
    
    return (
      <TooltipProvider key={node.id}>
        <Tooltip>
          <TooltipTrigger>
            <g
              transform={`translate(${node.position.x}, ${node.position.y})`}
              onClick={() => setSelectedNode(node)}
              className="cursor-pointer"
            >
              {/* Node shape based on type */}
              {node.type === 'trigger' && (
                <circle
                  r="25"
                  fill={nodeColor}
                  stroke={statusColor}
                  strokeWidth={isSelected ? 4 : 2}
                  className={`transition-all duration-300 ${isAnimating ? 'animate-pulse' : ''}`}
                />
              )}
              {node.type === 'action' && (
                <rect
                  x="-25"
                  y="-25"
                  width="50"
                  height="50"
                  fill={nodeColor}
                  stroke={statusColor}
                  strokeWidth={isSelected ? 4 : 2}
                  rx="5"
                  className={`transition-all duration-300 ${isAnimating ? 'animate-pulse' : ''}`}
                />
              )}
              {node.type === 'condition' && (
                <polygon
                  points="-25,0 0,-25 25,0 0,25"
                  fill={nodeColor}
                  stroke={statusColor}
                  strokeWidth={isSelected ? 4 : 2}
                  className={`transition-all duration-300 ${isAnimating ? 'animate-pulse' : ''}`}
                />
              )}
              {node.type === 'webhook' && (
                <polygon
                  points="-20,-25 20,-25 25,0 20,25 -20,25 -25,0"
                  fill={nodeColor}
                  stroke={statusColor}
                  strokeWidth={isSelected ? 4 : 2}
                  className={`transition-all duration-300 ${isAnimating ? 'animate-pulse' : ''}`}
                />
              )}
              
              {/* Node icon */}
              <text
                x="0"
                y="5"
                textAnchor="middle"
                fill="white"
                fontSize="16"
                fontWeight="bold"
              >
                {node.type === 'trigger' ? '⚡' :
                 node.type === 'action' ? '🔧' :
                 node.type === 'condition' ? '❓' : '🔗'}
              </text>
              
              {/* Performance score indicator */}
              {node.performance_score && (
                <circle
                  cx="20"
                  cy="-20"
                  r="8"
                  fill={node.performance_score > 7 ? '#22c55e' : 
                        node.performance_score > 4 ? '#f59e0b' : '#ef4444'}
                  stroke="white"
                  strokeWidth="2"
                />
              )}
            </g>
          </TooltipTrigger>
          <TooltipContent>
            <div className="space-y-2">
              <div className="font-semibold">{node.name}</div>
              <div className="text-sm text-muted-foreground">
                Type: {node.type} • Status: {node.status}
              </div>
              {node.metadata.total_executions && (
                <div className="text-xs">
                  {node.metadata.total_executions} executions
                </div>
              )}
              {node.performance_score && (
                <div className="text-xs">
                  Score: {node.performance_score}/10
                </div>
              )}
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  };

  const renderEdge = (edge: WebhookEdge) => {
    const sourceNode = filteredNodes.find(n => n.id === edge.source);
    const targetNode = filteredNodes.find(n => n.id === edge.target);
    
    if (!sourceNode || !targetNode) return null;
    
    const strokeColor = edge.status === 'active' ? '#22c55e' : 
                       edge.status === 'error' ? '#ef4444' : '#64748b';
    const strokeWidth = edge.weight * 2;
    
    return (
      <g key={edge.id}>
        <line
          x1={sourceNode.position.x}
          y1={sourceNode.position.y}
          x2={targetNode.position.x}
          y2={targetNode.position.y}
          stroke={strokeColor}
          strokeWidth={strokeWidth}
          className={`transition-all duration-300 ${isAnimating ? 'animate-pulse' : ''}`}
          markerEnd="url(#arrowhead)"
        />
        
        {/* Data flow animation */}
        {edge.status === 'active' && isAnimating && (
          <circle r="3" fill={strokeColor}>
            <animateMotion
              dur="2s"
              repeatCount="indefinite"
              path={`M${sourceNode.position.x},${sourceNode.position.y} L${targetNode.position.x},${targetNode.position.y}`}
            />
          </circle>
        )}
      </g>
    );
  };

  const renderFilters = () => (
    <Card className="mb-4">
      <CardContent className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search nodes..."
              value={filters.search}
              onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
              className="pl-9"
            />
          </div>
          
          <Select value={viewMode} onValueChange={setViewMode}>
            <SelectTrigger>
              <SelectValue placeholder="Layout mode" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="flow">Flow Layout</SelectItem>
              <SelectItem value="hierarchy">Hierarchy Layout</SelectItem>
              <SelectItem value="circular">Circular Layout</SelectItem>
            </SelectContent>
          </Select>
          
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleZoomIn}>+</Button>
            <Button variant="outline" size="sm" onClick={handleZoomOut}>-</Button>
            <Button variant="outline" size="sm" onClick={handleResetView}>
              <RotateCcw className="h-4 w-4" />
            </Button>
          </div>
          
          <Button variant="outline" onClick={loadFlowData}>
            <Refresh className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          
          <Button variant="outline" onClick={exportFlowDiagram}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  const renderNodeDetails = () => {
    if (!selectedNode) return null;
    
    return (
      <Card className="mt-4">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Circle className="h-5 w-5" style={{ color: NODE_COLORS[selectedNode.type] }} />
            {selectedNode.name}
          </CardTitle>
          <CardDescription>
            {selectedNode.type} • {selectedNode.status}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <h4 className="font-medium mb-2">Dependencies ({selectedNode.dependencies.length})</h4>
              <div className="space-y-1">
                {selectedNode.dependencies.map(depId => {
                  const dep = filteredNodes.find(n => n.id === depId);
                  return dep ? (
                    <Badge key={depId} variant="outline">{dep.name}</Badge>
                  ) : null;
                })}
              </div>
            </div>
            
            <div>
              <h4 className="font-medium mb-2">Dependents ({selectedNode.dependents.length})</h4>
              <div className="space-y-1">
                {selectedNode.dependents.map(depId => {
                  const dep = filteredNodes.find(n => n.id === depId);
                  return dep ? (
                    <Badge key={depId} variant="outline">{dep.name}</Badge>
                  ) : null;
                })}
              </div>
            </div>
          </div>
          
          {selectedNode.metadata && (
            <div className="mt-4 pt-4 border-t">
              <h4 className="font-medium mb-2">Metrics</h4>
              <div className="grid grid-cols-3 gap-4 text-sm">
                {selectedNode.metadata.total_executions && (
                  <div>
                    <span className="text-muted-foreground">Executions:</span>
                    <div className="font-medium">{selectedNode.metadata.total_executions}</div>
                  </div>
                )}
                {selectedNode.success_rate && (
                  <div>
                    <span className="text-muted-foreground">Success Rate:</span>
                    <div className="font-medium">{Math.round(selectedNode.success_rate)}%</div>
                  </div>
                )}
                {selectedNode.metadata.avg_response_time && (
                  <div>
                    <span className="text-muted-foreground">Avg Response:</span>
                    <div className="font-medium">{Math.round(selectedNode.metadata.avg_response_time)}ms</div>
                  </div>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  if (isLoading) {
    return (
      <Card className={className}>
        <CardContent className="p-8">
          <div className="flex items-center justify-center space-x-2">
            <Network className="h-5 w-5 animate-spin" />
            <span>Loading webhook flow...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={className}>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Network className="h-6 w-6" />
            Webhook Flow Mapping
          </CardTitle>
          <CardDescription>
            Visual dependency graph showing webhook relationships and data flow
          </CardDescription>
        </CardHeader>
        <CardContent>
          {renderFilters()}
          
          <div ref={containerRef} className="relative border rounded-lg bg-gray-50 dark:bg-gray-900">
            <svg
              ref={svgRef}
              width="100%"
              height="600"
              viewBox={`${flowLayout?.bounds.minX || 0} ${flowLayout?.bounds.minY || 0} ${
                (flowLayout?.bounds.maxX || 800) - (flowLayout?.bounds.minX || 0)
              } ${(flowLayout?.bounds.maxY || 600) - (flowLayout?.bounds.minY || 0)}`}
              style={{ transform: `scale(${zoom}) translate(${pan.x}px, ${pan.y}px)` }}
            >
              {/* Arrow marker definition */}
              <defs>
                <marker
                  id="arrowhead"
                  markerWidth="10"
                  markerHeight="7"
                  refX="9"
                  refY="3.5"
                  orient="auto"
                >
                  <polygon points="0 0, 10 3.5, 0 7" fill="#666" />
                </marker>
              </defs>
              
              {/* Render edges first (behind nodes) */}
              {filteredEdges.map(renderEdge)}
              
              {/* Render nodes */}
              {filteredNodes.map(renderNode)}
              
              {/* Node labels */}
              {filteredNodes.map(node => (
                <text
                  key={`label-${node.id}`}
                  x={node.position.x}
                  y={node.position.y + 45}
                  textAnchor="middle"
                  fontSize="12"
                  fill="currentColor"
                  className="pointer-events-none"
                >
                  {node.name.length > 15 ? `${node.name.substring(0, 15)}...` : node.name}
                </text>
              ))}
            </svg>
          </div>
          
          {renderNodeDetails()}
        </CardContent>
      </Card>
    </div>
  );
};