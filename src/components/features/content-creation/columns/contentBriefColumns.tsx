// Content Briefs DataTable Columns - Phase 3: UI Components

import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { TableColumn } from '@/components/composition/DataTable';
import type { ContentBriefWithDetails } from '@/types/content-creation';
import { CONTENT_STATUSES } from '@/types/content-creation';
import { 
  FileText, 
  Tag,
  Users,
  Calendar,
  Sparkles,
  MoreHorizontal,
  Edit,
  Trash2,
  Eye,
  Check,
  X,
  Clock,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface ContentBriefColumnsProps {
  onEdit: (brief: ContentBriefWithDetails) => void;
  onDelete: (brief: ContentBriefWithDetails) => void;
  onGenerateContent: (brief: ContentBriefWithDetails) => void;
  onView?: (brief: ContentBriefWithDetails) => void;
  onApprove?: (brief: ContentBriefWithDetails) => void;
  onReject?: (brief: ContentBriefWithDetails) => void;
}

export const getContentBriefColumns = ({
  onEdit,
  onDelete,
  onGenerateContent,
  onView,
  onApprove,
  onReject
}: ContentBriefColumnsProps): TableColumn<ContentBriefWithDetails>[] => [
  {
    key: 'title',
    label: 'Brief',
    sortable: true,
    render: (brief) => (
      <div className="flex items-center gap-3">
        <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
          <FileText className="h-4 w-4 text-blue-600 dark:text-blue-400" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="font-medium truncate pr-2">{brief.title}</div>
          {brief.idea_title && (
            <div className="text-sm text-muted-foreground mt-1">
              From: {brief.idea_title}
            </div>
          )}
          {brief.requirements && (
            <div className="text-sm text-muted-foreground line-clamp-1 mt-1">
              {brief.requirements}
            </div>
          )}
        </div>
      </div>
    ),
    width: '320px'
  },
  {
    key: 'content_type',
    label: 'Content Type',
    sortable: true,
    render: (brief) => (
      <div className="flex items-center gap-2">
        <FileText className="h-4 w-4 text-muted-foreground" />
        <Badge variant="outline" className="capitalize">
          {brief.content_type.replace('_', ' ')}
        </Badge>
      </div>
    ),
    width: '150px'
  },
  {
    key: 'tone',
    label: 'Tone & Audience',
    render: (brief) => (
      <div className="space-y-1">
        {brief.tone && (
          <div className="flex items-center gap-2">
            <Tag className="h-3 w-3 text-muted-foreground" />
            <Badge variant="secondary" className="text-xs capitalize">
              {brief.tone}
            </Badge>
          </div>
        )}
        {brief.target_audience && (
          <div className="flex items-center gap-2">
            <Users className="h-3 w-3 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">
              {brief.target_audience}
            </span>
          </div>
        )}
      </div>
    ),
    width: '140px'
  },
  {
    key: 'keywords',
    label: 'Keywords',
    render: (brief) => (
      <div className="flex items-center gap-2">
        <Tag className="h-4 w-4 text-muted-foreground" />
        <div className="flex flex-wrap gap-1">
          {brief.keywords && brief.keywords.length > 0 ? (
            brief.keywords.slice(0, 2).map((keyword, index) => (
              <Badge key={index} variant="secondary" className="text-xs">
                {keyword}
              </Badge>
            ))
          ) : (
            <span className="text-sm text-muted-foreground">None</span>
          )}
          {brief.keywords && brief.keywords.length > 2 && (
            <Badge variant="secondary" className="text-xs">
              +{brief.keywords.length - 2}
            </Badge>
          )}
        </div>
      </div>
    ),
    width: '120px'
  },
  {
    key: 'status',
    label: 'Status',
    sortable: true,
    render: (brief) => {
      const statusConfig = CONTENT_STATUSES.BRIEFS.find(s => s.value === brief.status);
      const colorClass = {
        gray: 'bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-900 dark:text-gray-300 dark:border-gray-700',
        blue: 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900 dark:text-blue-300 dark:border-blue-700',
        orange: 'bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-900 dark:text-orange-300 dark:border-orange-700',
        green: 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900 dark:text-green-300 dark:border-green-700',
        yellow: 'bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900 dark:text-yellow-300 dark:border-yellow-700'
      }[statusConfig?.color || 'gray'];

      return (
        <Badge 
          variant="outline" 
          className={colorClass}
        >
          {statusConfig?.label || brief.status}
        </Badge>
      );
    },
    width: '100px'
  },
  {
    key: 'generation_status',
    label: 'Generation',
    render: (brief) => {
      const status = brief.generation_status || 'pending';
      
      if (status === 'processing') {
        return (
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-blue-500 animate-spin" />
            <Badge variant="outline" className="text-blue-600 border-blue-200 bg-blue-50">
              Generating
            </Badge>
          </div>
        );
      } else if (status === 'completed') {
        return (
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-green-500" />
            <Badge variant="outline" className="text-green-600 border-green-200 bg-green-50">
              Completed
            </Badge>
          </div>
        );
      } else if (status === 'error') {
        return (
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-red-500" />
            <Badge variant="outline" className="text-red-600 border-red-200 bg-red-50">
              Failed
            </Badge>
          </div>
        );
      } else {
        return (
          <div className="flex items-center gap-2">
            <div className="h-4 w-4 rounded-full border-2 border-gray-300" />
            <Badge variant="outline" className="text-gray-600">
              Ready
            </Badge>
          </div>
        );
      }
    },
    width: '120px'
  },
  {
    key: 'content_items_count',
    label: 'Items',
    sortable: true,
    render: (brief) => (
      <div className="flex items-center gap-2">
        <FileText className="h-4 w-4 text-muted-foreground" />
        <span className="font-medium">{brief.content_items_count}</span>
      </div>
    ),
    width: '70px'
  },
  {
    key: 'created_at',
    label: 'Created',
    sortable: true,
    render: (brief) => (
      <div className="flex items-center gap-2">
        <Calendar className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm text-muted-foreground">
          {new Date(brief.created_at).toLocaleDateString()}
        </span>
      </div>
    ),
    width: '120px'
  },
  {
    key: 'actions',
    label: 'Actions',
    render: (brief) => (
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
              <DropdownMenuItem onClick={() => onView(brief)}>
                <Eye className="mr-2 h-4 w-4" />
                View Details
              </DropdownMenuItem>
              <DropdownMenuSeparator />
            </>
          )}
          <DropdownMenuItem 
            onClick={() => onGenerateContent(brief)}
            disabled={!brief.can_generate_content || brief.generation_status === 'processing'}
            className="text-blue-600 focus:text-blue-600"
          >
            {brief.generation_status === 'processing' ? (
              <>
                <Clock className="mr-2 h-4 w-4 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-4 w-4" />
                Generate Content
              </>
            )}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          {onApprove && brief.status === 'draft' && (
            <DropdownMenuItem 
              onClick={() => onApprove(brief)}
              className="text-green-600 focus:text-green-600"
            >
              <Check className="mr-2 h-4 w-4" />
              Approve
            </DropdownMenuItem>
          )}
          {onReject && brief.status === 'draft' && (
            <DropdownMenuItem 
              onClick={() => onReject(brief)}
              className="text-orange-600 focus:text-orange-600"
            >
              <X className="mr-2 h-4 w-4" />
              Archive
            </DropdownMenuItem>
          )}
          {(onApprove || onReject) && brief.status === 'draft' && (
            <DropdownMenuSeparator />
          )}
          <DropdownMenuItem onClick={() => onEdit(brief)}>
            <Edit className="mr-2 h-4 w-4" />
            Edit
          </DropdownMenuItem>
          <DropdownMenuItem 
            onClick={() => onDelete(brief)}
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