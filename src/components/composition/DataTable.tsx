// Composable data table component with sorting and selection
import React, { memo } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { cn } from '@/lib/utils';

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

  if (isLoading) {
    return (
      <div className={cn("border rounded-lg", className)}>
        <Table>
          <TableHeader>
            <TableRow>
              {hasSelection && <TableHead className="w-12"></TableHead>}
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

  if (data.length === 0) {
    return (
      <div className={cn("border rounded-lg", className)}>
        <Table>
          <TableHeader>
            <TableRow>
              {hasSelection && <TableHead className="w-12"></TableHead>}
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

  return (
    <div className={cn("border rounded-lg", className)}>
      <Table>
        <TableHeader>
          <TableRow>
            {hasSelection && (
              <TableHead className="w-12">
                <Checkbox
                  checked={allSelected}
                  onCheckedChange={handleSelectAll}
                  aria-label="Select all items"
                  {...(someSelected && { "data-indeterminate": true })}
                />
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
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={(checked) => handleItemSelect(item, !!checked)}
                      aria-label={`Select item ${index + 1}`}
                      onClick={(e) => e.stopPropagation()}
                    />
                  </TableCell>
                )}
                {columns.map((column) => (
                  <TableCell key={column.key} className={column.className}>
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