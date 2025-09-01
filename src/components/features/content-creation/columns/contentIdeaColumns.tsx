// Content Ideas DataTable Columns - Phase 3: UI Components

import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { TableColumn } from '@/components/composition/DataTable';
import type { ContentIdeaWithDetails } from '@/types/content-creation';
import { CONTENT_STATUSES } from '@/types/content-creation';
import { 
  Lightbulb, 
  Tag,
  Users,
  Calendar,
  FileText,
  MoreHorizontal,
  Edit,
  Trash2,
  Plus,
  Eye,
  Brain,
  TrendingUp
} from 'lucide-react';
import { ExtractionStatusBadge } from '../components/ExtractionStatusBadge';
import { ContentSuggestions } from '../components/ContentSuggestions';
import { ContentSuggestionsViewerWrapper } from '../components/ContentSuggestionsViewerWrapper';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface ContentIdeaColumnsProps {
  onEdit: (idea: ContentIdeaWithDetails) => void;
  onDelete: (idea: ContentIdeaWithDetails) => void;
  onCreateBrief: (idea: ContentIdeaWithDetails) => void;
  onViewBrief?: (briefId: string) => void;
}

export const getContentIdeaColumns = ({
  onEdit,
  onDelete,
  onCreateBrief,
  onViewBrief
}: ContentIdeaColumnsProps): TableColumn<ContentIdeaWithDetails>[] => [
  {
    key: 'title',
    label: 'Idea',
    sortable: true,
    render: (idea) => (
      <div className="flex items-center gap-3">
        <div className="p-2 bg-yellow-100 dark:bg-yellow-900/20 rounded-lg">
          <Lightbulb className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="font-medium truncate pr-2">{idea.title}</div>
          {idea.description && (
            <div className="text-sm text-muted-foreground line-clamp-2 mt-1">
              {idea.description}
            </div>
          )}
        </div>
      </div>
    ),
    width: '120px'
  },
  {
    key: 'content_type',
    label: 'Type',
    sortable: true,
    render: (idea) => (
      <div className="flex items-center gap-1">
        <FileText className="h-3 w-3 text-muted-foreground" />
        <Badge variant="outline" className="text-xs px-1 py-0">
          {idea.content_type.replace('_', ' ')}
        </Badge>
      </div>
    ),
    width: '65px'
  },
  {
    key: 'status',
    label: 'Status',
    render: (idea) => (
      <div className="flex flex-col gap-1">
        <ExtractionStatusBadge
          extraction_status={idea.extraction_status}
          processing_status={idea.processing_status}
        />
        {(idea.source_files?.length || 0) > 0 && (
          <span className="text-xs text-muted-foreground">
            {idea.source_files?.length} file{(idea.source_files?.length || 0) !== 1 ? 's' : ''}
          </span>
        )}
      </div>
    ),
    width: '60px'
  },
  {
    key: 'target_audience',
    label: 'Audience',
    sortable: true,
    render: (idea) => (
      <div className="flex items-center gap-1">
        <Users className="h-3 w-3 text-muted-foreground" />
        <span className="text-xs truncate">
          {idea.target_audience || 'None'}
        </span>
      </div>
    ),
    width: '60px'
  },
  {
    key: 'keywords',
    label: 'Keywords',
    render: (idea) => (
      <div className="flex items-center gap-2">
        <Tag className="h-4 w-4 text-muted-foreground" />
        <div className="flex flex-wrap gap-1">
          {idea.keywords && idea.keywords.length > 0 ? (
            idea.keywords.slice(0, 2).map((keyword, index) => (
              <Badge key={index} variant="secondary" className="text-xs">
                {keyword}
              </Badge>
            ))
          ) : (
            <span className="text-sm text-muted-foreground">None</span>
          )}
          {idea.keywords && idea.keywords.length > 2 && (
            <Badge variant="secondary" className="text-xs">
              +{idea.keywords.length - 2}
            </Badge>
          )}
        </div>
      </div>
    ),
    width: '50px'
  },
  {
    key: 'ai_suggestions',
    label: 'Suggestions',
    render: (idea) => {
      const suggestionsCount = idea.ai_suggestions?.suggestions?.length || 0;
      const hasResearch = !!idea.research_summary;
      const hasAIContent = suggestionsCount > 0 || hasResearch;

      if (!hasAIContent) {
        return (
          <div className="flex items-center gap-1 text-muted-foreground">
            <Brain className="h-3 w-3" />
            <span className="text-xs">None</span>
          </div>
        );
      }

      return (
        <div className="flex items-center gap-1">
          <div className="flex items-center gap-1">
            {suggestionsCount > 0 && (
              <Badge variant="secondary" className="flex items-center gap-1 text-xs">
                <Brain className="h-3 w-3" />
                {suggestionsCount}
              </Badge>
            )}
            {hasResearch && (
              <Badge variant="outline" className="flex items-center gap-1 text-xs">
                <TrendingUp className="h-3 w-3" />
                R
              </Badge>
            )}
          </div>
          <ContentSuggestionsViewerWrapper
            idea={idea}
            suggestions={idea.ai_suggestions}
            researchSummary={idea.research_summary}
            onCreateBrief={onCreateBrief}
            onViewBrief={onViewBrief}
          >
            <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
              <Eye className="h-3 w-3" />
            </Button>
          </ContentSuggestionsViewerWrapper>
        </div>
      );
    },
    width: '60px'
  },
  {
    key: 'briefs_count',
    label: 'Briefs',
    sortable: true,
    render: (idea) => (
      <div className="flex items-center gap-2">
        <FileText className="h-4 w-4 text-muted-foreground" />
        <span className="font-medium">{idea.briefs_count}</span>
      </div>
    ),
    width: '35px'
  },
  {
    key: 'created_at',
    label: 'Created',
    sortable: true,
    render: (idea) => (
      <div className="flex items-center gap-2">
        <Calendar className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm text-muted-foreground">
          {new Date(idea.created_at).toLocaleDateString()}
        </span>
      </div>
    ),
    width: '60px'
  },
  {
    key: 'actions',
    label: '',
    render: (idea) => (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
            <MoreHorizontal className="h-3 w-3" />
            <span className="sr-only">Open menu</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          {(idea.ai_suggestions?.suggestions?.length || idea.research_summary) && (
            <>
              <ContentSuggestionsViewerWrapper
                idea={idea}
                suggestions={idea.ai_suggestions}
                researchSummary={idea.research_summary}
                onCreateBrief={onCreateBrief}
                onViewBrief={onViewBrief}
              >
                <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                  <Brain className="mr-2 h-4 w-4" />
                  View Content Suggestions
                </DropdownMenuItem>
              </ContentSuggestionsViewerWrapper>
              <DropdownMenuSeparator />
            </>
          )}
          <DropdownMenuItem onClick={() => onEdit(idea)}>
            <Edit className="mr-2 h-4 w-4" />
            Edit
          </DropdownMenuItem>
          <DropdownMenuItem 
            onClick={() => onDelete(idea)}
            className="text-destructive focus:text-destructive"
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    ),
    width: '20px'
  }
];