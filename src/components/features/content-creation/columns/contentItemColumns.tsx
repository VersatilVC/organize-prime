// Content Items DataTable Columns - Phase 3: UI Components

import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { TableColumn } from '@/components/composition/DataTable';
import type { ContentItemWithDetails } from '@/types/content-creation';
import { CONTENT_STATUSES } from '@/types/content-creation';
import { 
  FileText, 
  Star,
  Calendar,
  Sparkles,
  MoreHorizontal,
  Edit,
  Trash2,
  Eye,
  Upload,
  Archive,
  Copy,
  Share
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface ContentItemColumnsProps {
  onEdit: (item: ContentItemWithDetails) => void;
  onDelete: (item: ContentItemWithDetails) => void;
  onCreateDerivatives: (item: ContentItemWithDetails) => void;
  onView?: (item: ContentItemWithDetails) => void;
  onPublish?: (item: ContentItemWithDetails) => void;
  onArchive?: (item: ContentItemWithDetails) => void;
  onDuplicate?: (item: ContentItemWithDetails) => void;
}

export const getContentItemColumns = ({
  onEdit,
  onDelete,
  onCreateDerivatives,
  onView,
  onPublish,
  onArchive,
  onDuplicate
}: ContentItemColumnsProps): TableColumn<ContentItemWithDetails>[] => [
  {
    key: 'title',
    label: 'Content Item',
    sortable: true,
    render: (item) => (
      <div className="flex items-center gap-3">
        <div className="p-2 bg-green-100 dark:bg-green-900/20 rounded-lg relative">
          <FileText className="h-4 w-4 text-green-600 dark:text-green-400" />
          {item.is_major_item && (
            <Star className="h-3 w-3 text-yellow-500 absolute -top-1 -right-1 fill-current" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="font-medium truncate pr-2">{item.title}</span>
            {item.is_major_item && (
              <Badge variant="secondary" className="text-xs">
                Major
              </Badge>
            )}
          </div>
          {item.brief_title && (
            <div className="text-sm text-muted-foreground mt-1">
              From: {item.brief_title}
            </div>
          )}
          {item.content && (
            <div className="text-sm text-muted-foreground line-clamp-1 mt-1">
              {item.content.substring(0, 100)}...
            </div>
          )}
        </div>
      </div>
    ),
    width: '350px'
  },
  {
    key: 'content_type',
    label: 'Content Type',
    sortable: true,
    render: (item) => (
      <div className="flex items-center gap-2">
        <FileText className="h-4 w-4 text-muted-foreground" />
        <Badge variant="outline" className="capitalize">
          {item.content_type.replace('_', ' ')}
        </Badge>
      </div>
    ),
    width: '150px'
  },
  {
    key: 'status',
    label: 'Status',
    sortable: true,
    render: (item) => {
      const statusConfig = CONTENT_STATUSES.ITEMS.find(s => s.value === item.status);
      const colorClass = {
        gray: 'bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-900 dark:text-gray-300 dark:border-gray-700',
        orange: 'bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-900 dark:text-orange-300 dark:border-orange-700',
        blue: 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900 dark:text-blue-300 dark:border-blue-700',
        green: 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900 dark:text-green-300 dark:border-green-700',
        yellow: 'bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900 dark:text-yellow-300 dark:border-yellow-700'
      }[statusConfig?.color || 'gray'];

      return (
        <Badge 
          variant="outline" 
          className={colorClass}
        >
          {statusConfig?.label || item.status}
        </Badge>
      );
    },
    width: '100px'
  },
  {
    key: 'is_major_item',
    label: 'Type',
    sortable: true,
    render: (item) => (
      <div className="flex items-center gap-2">
        {item.is_major_item ? (
          <>
            <Star className="h-4 w-4 text-yellow-500" />
            <Badge variant="default" className="text-xs">
              Major
            </Badge>
          </>
        ) : (
          <>
            <Copy className="h-4 w-4 text-muted-foreground" />
            <Badge variant="secondary" className="text-xs">
              Derivative
            </Badge>
          </>
        )}
      </div>
    ),
    width: '100px'
  },
  {
    key: 'derivatives_count',
    label: 'Derivatives',
    sortable: true,
    render: (item) => (
      <div className="flex items-center gap-2">
        <Copy className="h-4 w-4 text-muted-foreground" />
        <span className="font-medium">{item.derivatives_count}</span>
        {item.is_major_item && item.derivatives_count === 0 && (
          <span className="text-xs text-muted-foreground">(none yet)</span>
        )}
      </div>
    ),
    width: '120px'
  },
  {
    key: 'created_at',
    label: 'Created',
    sortable: true,
    render: (item) => (
      <div className="flex items-center gap-2">
        <Calendar className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm text-muted-foreground">
          {new Date(item.created_at).toLocaleDateString()}
        </span>
      </div>
    ),
    width: '120px'
  },
  {
    key: 'actions',
    label: 'Actions',
    render: (item) => (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
            <MoreHorizontal className="h-4 w-4" />
            <span className="sr-only">Open menu</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-52">
          {onView && (
            <>
              <DropdownMenuItem onClick={() => onView(item)}>
                <Eye className="mr-2 h-4 w-4" />
                View Content
              </DropdownMenuItem>
              <DropdownMenuSeparator />
            </>
          )}
          
          {/* Major item actions */}
          {item.is_major_item && (
            <>
              <DropdownMenuItem 
                onClick={() => onCreateDerivatives(item)}
                disabled={!item.can_create_derivatives}
                className="text-blue-600 focus:text-blue-600"
              >
                <Sparkles className="mr-2 h-4 w-4" />
                Create Derivatives
              </DropdownMenuItem>
              <DropdownMenuSeparator />
            </>
          )}

          {/* Publishing actions */}
          {onPublish && (item.status === 'approved' || item.status === 'review') && (
            <DropdownMenuItem 
              onClick={() => onPublish(item)}
              className="text-green-600 focus:text-green-600"
            >
              <Upload className="mr-2 h-4 w-4" />
              Publish
            </DropdownMenuItem>
          )}

          {/* Share/Duplicate actions */}
          {onDuplicate && (
            <DropdownMenuItem onClick={() => onDuplicate(item)}>
              <Copy className="mr-2 h-4 w-4" />
              Duplicate
            </DropdownMenuItem>
          )}

          <DropdownMenuItem 
            onClick={() => {
              // Placeholder for share functionality
              console.log('Share item:', item.id);
            }}
          >
            <Share className="mr-2 h-4 w-4" />
            Share
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          {/* Standard actions */}
          <DropdownMenuItem onClick={() => onEdit(item)}>
            <Edit className="mr-2 h-4 w-4" />
            Edit
          </DropdownMenuItem>

          {/* Archive/Delete actions */}
          {onArchive && item.status !== 'archived' && (
            <DropdownMenuItem 
              onClick={() => onArchive(item)}
              className="text-orange-600 focus:text-orange-600"
            >
              <Archive className="mr-2 h-4 w-4" />
              Archive
            </DropdownMenuItem>
          )}

          <DropdownMenuItem 
            onClick={() => onDelete(item)}
            className="text-destructive focus:text-destructive"
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    ),
    width: '60px'
  }
];