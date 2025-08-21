// Phase 4: Visual Button-Level Webhook System - Preview Toggle
// Header toggle button for enabling/disabling preview mode

import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Eye, EyeOff, Settings } from 'lucide-react';
import { usePreview } from './PreviewController';
import { useUserRole } from '@/hooks/useUserRole';

interface PreviewToggleProps {
  className?: string;
}

export function PreviewToggle({ className = '' }: PreviewToggleProps) {
  const { role, loading: roleLoading } = useUserRole();
  const { state, actions } = usePreview();

  // Only show for super admins
  if (roleLoading || role !== 'super_admin') {
    return null;
  }

  const isActive = state.isEnabled;
  const isConfiguring = state.isConfiguring;
  const hasSelection = !!state.selectedElementId;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className={`relative preview-toggle-container ${className}`}>
            <Button
              variant={isActive ? "default" : "outline"}
              size="sm"
              onClick={actions.toggle}
              className={`
                preview-toggle-button transition-all duration-200
                ${isActive ? 'bg-blue-600 hover:bg-blue-700' : ''}
                ${isConfiguring ? 'ring-2 ring-green-500 ring-offset-2' : ''}
              `}
              aria-label={isActive ? "Disable preview mode" : "Enable preview mode"}
              data-preview-system="true"
            >
              {isActive ? (
                <Eye className="h-4 w-4 mr-2" />
              ) : (
                <EyeOff className="h-4 w-4 mr-2" />
              )}
              Preview
              
              {/* Status badges */}
              {isActive && (
                <Badge 
                  variant="secondary" 
                  className="ml-2 px-1 py-0 text-xs bg-white/20 text-white"
                >
                  ON
                </Badge>
              )}
              
              {isConfiguring && (
                <Settings className="h-3 w-3 ml-1 animate-pulse" />
              )}
            </Button>
            
            {/* Selection indicator */}
            {hasSelection && !isConfiguring && (
              <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full animate-pulse" />
            )}
          </div>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-64">
          <div className="text-sm">
            {!isActive && (
              <div>
                <div className="font-medium">Enable Preview Mode</div>
                <div className="text-xs text-muted-foreground">
                  Click to start configuring webhooks on page elements
                </div>
              </div>
            )}
            {isActive && !isConfiguring && (
              <div>
                <div className="font-medium">Preview Mode Active</div>
                <div className="text-xs text-muted-foreground">
                  Click elements to configure webhooks • Press ESC to exit
                </div>
              </div>
            )}
            {isConfiguring && (
              <div>
                <div className="font-medium">Configuring Element</div>
                <div className="text-xs text-muted-foreground">
                  Configuration panel is open • Press ESC to close
                </div>
              </div>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

// Keyboard shortcuts component (optional enhancement)
export function PreviewKeyboardShortcuts() {
  const { actions } = usePreview();

  React.useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Ctrl/Cmd + Shift + P to toggle preview mode
      if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key === 'P') {
        event.preventDefault();
        actions.toggle();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [actions]);

  return null; // This component only handles keyboard events
}