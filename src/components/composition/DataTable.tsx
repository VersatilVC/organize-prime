// Composable data table component with sorting and selection
import React, { memo, useRef } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useVirtualizer } from '@tanstack/react-virtual';

export interface TableColumn<T = any> {
  key: string;
  label: string;
  sortable?: boolean;
  render?: (item: T, index: number) => React.ReactNode;
  className?: string;
  width?: string;
}

interface DataTableProps<T = any> {
  data: T[];
  columns: TableColumn<T>[];
  
  // Selection
  selectedItems?: string[];
  onItemSelect?: (itemId: string, selected: boolean) => void;
  onSelectAll?: (selected: boolean) => void;
  getItemId?: (item: T) => string;
  
  // Sorting
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  onSort?: (key: string) => void;
  
  // Row actions
  onRowClick?: (item: T, index: number) => void;
  rowClassName?: (item: T, index: number) => string;
  
  // Loading and empty states
  isLoading?: boolean;
  emptyMessage?: string;
  
  // Performance
  virtualized?: boolean;
  estimateSize?: number; // approximate row height in px
  maxBodyHeight?: number; // max height of scrollable area in px
  
  className?: string;
}

export const DataTable = memo(<T,>({
  data,
  columns,
  selectedItems = [],
  onItemSelect,
  onSelectAll,
  getItemId = (item: any) => item.id,
  sortBy,
  sortOrder = 'asc',
  onSort,
  onRowClick,
  rowClassName,
  isLoading = false,
  emptyMessage = 'No data available',
  virtualized = false,
  estimateSize = 56,
  maxBodyHeight = 480,
  className
}: DataTableProps<T>) => {
  const hasSelection = onItemSelect && onSelectAll;
  const allSelected = data.length > 0 && selectedItems.length === data.length;
  const someSelected = selectedItems.length > 0 && selectedItems.length < data.length;

  const getSortIcon = (columnKey: string) => {
    if (sortBy !== columnKey) return <ArrowUpDown className="ml-2 h-4 w-4" />;
    return sortOrder === 'asc' 
      ? <ArrowUp className="ml-2 h-4 w-4" />
      : <ArrowDown className="ml-2 h-4 w-4" />;
  };

  const handleSelectAll = (checked: boolean) => {
    onSelectAll?.(checked);
  };

  const handleItemSelect = (item: T, checked: boolean) => {
    const itemId = getItemId(item);
    onItemSelect?.(itemId, checked);
  };

  // Loading state
  if (isLoading) {
    return (
      <div className={cn("border rounded-lg overflow-x-auto", className)}>
        <Table>
          <TableHeader>
            <TableRow>
              {hasSelection && <TableHead className="w-14"></TableHead>}
              {columns.map((column) => (
                <TableHead key={column.key} className={column.className}>
                  {column.label}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {[...Array(5)].map((_, i) => (
              <TableRow key={i}>
                {hasSelection && (
                  <TableCell>
                    <div className="h-4 w-4 bg-muted rounded animate-pulse" />
                  </TableCell>
                )}
                {columns.map((column) => (
                  <TableCell key={column.key}>
                    <div className="h-4 bg-muted rounded animate-pulse" />
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    );
  }

  // Empty state
  if (data.length === 0) {
    return (
      <div className={cn("border rounded-lg overflow-x-auto", className)}>
        <Table>
          <TableHeader>
            <TableRow>
              {hasSelection && <TableHead className="w-14"></TableHead>}
              {columns.map((column) => (
                <TableHead key={column.key} className={column.className}>
                  {column.label}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
        </Table>
        <div className="p-8 text-center text-muted-foreground">
          {emptyMessage}
        </div>
      </div>
    );
  }

  // Virtualization setup
  const parentRef = useRef<HTMLDivElement>(null);
  const rowVirtualizer = virtualized
    ? useVirtualizer({
        count: data.length,
        getScrollElement: () => parentRef.current,
        estimateSize: () => estimateSize,
        overscan: 8,
      })
    : null;

  if (virtualized && rowVirtualizer) {
    const virtualRows = rowVirtualizer.getVirtualItems();
    const paddingTop = virtualRows.length > 0 ? virtualRows[0].start : 0;
    const paddingBottom = virtualRows.length > 0
      ? rowVirtualizer.getTotalSize() - virtualRows[virtualRows.length - 1].end
      : 0;

    const colSpan = columns.length + (hasSelection ? 1 : 0);

    return (
      <div ref={parentRef} className={cn("border rounded-lg overflow-auto", className)} style={{ maxHeight: maxBodyHeight }}>
        <Table>
          <TableHeader>
            <TableRow>
              {hasSelection && (
                <TableHead className="w-14">
                  <div className="flex items-center justify-center pr-2">
                    <Checkbox
                      checked={allSelected}
                      onCheckedChange={handleSelectAll}
                      aria-label="Select all items"
                      {...(someSelected && { "data-indeterminate": true })}
                    />
                  </div>
                </TableHead>
              )}
              {columns.map((column) => (
                <TableHead 
                  key={column.key} 
                  className={cn(column.className, column.width && `w-[${column.width}]`)}
                >
                  {column.sortable && onSort ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="-ml-3 h-8 data-[state=open]:bg-accent"
                      onClick={() => onSort(column.key)}
                    >
                      <span>{column.label}</span>
                      {getSortIcon(column.key)}
                    </Button>
                  ) : (
                    column.label
                  )}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {paddingTop > 0 && (
              <TableRow>
                <TableCell colSpan={colSpan} style={{ height: paddingTop }} />
              </TableRow>
            )}

            {virtualRows.map((virtualRow) => {
              const item = data[virtualRow.index];
              const itemId = getItemId(item);
              const isSelected = selectedItems.includes(itemId);

              return (
                <TableRow 
                  key={itemId}
                  data-index={virtualRow.index}
                  style={{ height: virtualRow.size }}
                  className={cn(
                    isSelected && "bg-muted/50",
                    onRowClick && "cursor-pointer hover:bg-muted/30",
                    rowClassName?.(item, virtualRow.index)
                  )}
                  onClick={() => onRowClick?.(item, virtualRow.index)}
                >
                  {hasSelection && (
                    <TableCell>
                      <div className="flex items-center justify-center pr-2">
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={(checked) => handleItemSelect(item, !!checked)}
                          aria-label={`Select item ${virtualRow.index + 1}`}
                          onClick={(e) => e.stopPropagation()}
                        />
                      </div>
                    </TableCell>
                  )}
                  {columns.map((column) => (
                    <TableCell 
                      key={column.key} 
                      className={cn(
                        column.className,
                        "max-w-[200px] truncate",
                        column.width && `w-[${column.width}]`
                      )}
                      title={column.render ? undefined : String((item as any)[column.key] || '')}
                    >
                      {column.render ? column.render(item, virtualRow.index) : (item as any)[column.key]}
                    </TableCell>
                  ))}
                </TableRow>
              );
            })}

            {paddingBottom > 0 && (
              <TableRow>
                <TableCell colSpan={colSpan} style={{ height: paddingBottom }} />
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    );
  }

  // Non-virtualized fallback
  return (
    <div className={cn("border rounded-lg overflow-x-auto", className)}>
      <Table>
        <TableHeader>
          <TableRow>
            {hasSelection && (
              <TableHead className="w-14">
                <div className="flex items-center justify-center pr-2">
                  <Checkbox
                    checked={allSelected}
                    onCheckedChange={handleSelectAll}
                    aria-label="Select all items"
                    {...(someSelected && { "data-indeterminate": true })}
                  />
                </div>
              </TableHead>
            )}
            {columns.map((column) => (
              <TableHead 
                key={column.key} 
                className={cn(column.className, column.width && `w-[${column.width}]`)}
              >
                {column.sortable && onSort ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="-ml-3 h-8 data-[state=open]:bg-accent"
                    onClick={() => onSort(column.key)}
                  >
                    <span>{column.label}</span>
                    {getSortIcon(column.key)}
                  </Button>
                ) : (
                  column.label
                )}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((item, index) => {
            const itemId = getItemId(item);
            const isSelected = selectedItems.includes(itemId);
            
            return (
              <TableRow 
                key={itemId}
                className={cn(
                  isSelected && "bg-muted/50",
                  onRowClick && "cursor-pointer hover:bg-muted/30",
                  rowClassName?.(item, index)
                )}
                onClick={() => onRowClick?.(item, index)}
              >
                {hasSelection && (
                  <TableCell>
                    <div className="flex items-center justify-center pr-2">
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={(checked) => handleItemSelect(item, !!checked)}
                        aria-label={`Select item ${index + 1}`}
                        onClick={(e) => e.stopPropagation()}
                      />
                    </div>
                  </TableCell>
                )}
                {columns.map((column) => (
                  <TableCell 
                    key={column.key} 
                    className={cn(
                      column.className,
                      "max-w-[200px] truncate",
                      column.width && `w-[${column.width}]`
                    )}
                    title={column.render ? undefined : String((item as any)[column.key] || '')}
                  >
                    {column.render ? column.render(item, index) : (item as any)[column.key]}
                  </TableCell>
                ))}
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
});

DataTable.displayName = 'DataTable';