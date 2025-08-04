// Composable list header component for consistent list UIs
import React, { memo } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Plus, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ListHeaderProps {
  title: string;
  subtitle?: string;
  totalCount?: number;
  selectedCount?: number;
  canCreate?: boolean;
  createLabel?: string;
  onCreateClick?: () => void;
  onBulkAction?: (action: string) => void;
  bulkActions?: Array<{
    key: string;
    label: string;
    variant?: 'default' | 'destructive';
  }>;
  className?: string;
}

export const ListHeader = memo(({
  title,
  subtitle,
  totalCount,
  selectedCount = 0,
  canCreate = false,
  createLabel = 'Create',
  onCreateClick,
  onBulkAction,
  bulkActions = [],
  className
}: ListHeaderProps) => {
  const hasSelection = selectedCount > 0;

  return (
    <div className={cn("flex items-center justify-between mb-6", className)}>
      <div className="space-y-1">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
          {totalCount !== undefined && (
            <Badge variant="secondary" className="text-sm">
              {totalCount}
            </Badge>
          )}
        </div>
        {subtitle && (
          <p className="text-muted-foreground">
            {subtitle}
            {hasSelection && ` • ${selectedCount} selected`}
          </p>
        )}
      </div>
      
      <div className="flex items-center gap-2">
        {hasSelection && bulkActions.length > 0 && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                Bulk Actions <ChevronDown className="ml-2 h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {bulkActions.map((action, index) => (
                <React.Fragment key={action.key}>
                  {index > 0 && action.variant === 'destructive' && <DropdownMenuSeparator />}
                  <DropdownMenuItem 
                    onClick={() => onBulkAction?.(action.key)}
                    className={cn(
                      action.variant === 'destructive' && "text-destructive focus:text-destructive"
                    )}
                  >
                    {action.label}
                  </DropdownMenuItem>
                </React.Fragment>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
        
        {canCreate && (
          <Button onClick={onCreateClick} size="sm">
            <Plus className="mr-2 h-4 w-4" />
            {createLabel}
          </Button>
        )}
      </div>
    </div>
  );
});

ListHeader.displayName = 'ListHeader';