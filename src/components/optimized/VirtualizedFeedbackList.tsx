import React, { memo, useRef } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Eye, MessageSquare } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useOptimizedFeedbackList } from '@/hooks/useOptimizedFeedbackList';

interface FeedbackItemProps {
  feedback: {
    id: string;
    title: string;
    description: string;
    status: string;
    priority: string;
    created_at: string;
    user_name: string;
    category: string;
    attachments_count: number;
  };
  onView: (id: string) => void;
}

const FeedbackItem = memo(({ feedback, onView }: FeedbackItemProps) => {
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'destructive';
      case 'medium':
        return 'default';
      case 'low':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'destructive';
      case 'in_progress':
        return 'default';
      case 'resolved':
        return 'secondary';
      case 'closed':
        return 'outline';
      default:
        return 'outline';
    }
  };

  return (
    <Card className="mb-4">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <CardTitle className="text-lg font-medium">{feedback.title}</CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant={getPriorityColor(feedback.priority)}>
              {feedback.priority}
            </Badge>
            <Badge variant={getStatusColor(feedback.status)}>
              {feedback.status}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground mb-4 line-clamp-2">
          {feedback.description}
        </p>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <span>By {feedback.user_name}</span>
            <span>{formatDistanceToNow(new Date(feedback.created_at), { addSuffix: true })}</span>
            {feedback.attachments_count > 0 && (
              <span className="flex items-center gap-1">
                <MessageSquare className="h-4 w-4" />
                {feedback.attachments_count}
              </span>
            )}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onView(feedback.id)}
            className="flex items-center gap-2"
          >
            <Eye className="h-4 w-4" />
            View
          </Button>
        </div>
      </CardContent>
    </Card>
  );
});

FeedbackItem.displayName = 'FeedbackItem';

interface VirtualizedFeedbackListProps {
  statusFilter?: string;
  priorityFilter?: string;
  onViewFeedback: (id: string) => void;
}

export const VirtualizedFeedbackList = memo(({
  statusFilter,
  priorityFilter,
  onViewFeedback
}: VirtualizedFeedbackListProps) => {
  const { feedback, total, isLoading } = useOptimizedFeedbackList({
    pageSize: 100, // Load more items for virtualization
    statusFilter,
    priorityFilter
  });

  const parentRef = useRef<HTMLDivElement>(null);
  
  const virtualizer = useVirtualizer({
    count: feedback.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 200, // Approximate height of each feedback item
    overscan: 5,
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader>
              <div className="h-6 bg-muted rounded w-3/4"></div>
            </CardHeader>
            <CardContent>
              <div className="h-4 bg-muted rounded w-full mb-2"></div>
              <div className="h-4 bg-muted rounded w-2/3"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (feedback.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center text-muted-foreground">
          No feedback found matching your criteria.
        </CardContent>
      </Card>
    );
  }

  return (
    <div
      ref={parentRef}
      className="max-h-[800px] overflow-auto"
      style={{
        contain: 'strict',
      }}
    >
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          width: '100%',
          position: 'relative',
        }}
      >
        {virtualizer.getVirtualItems().map((virtualItem) => {
          const feedbackItem = feedback[virtualItem.index];
          return (
            <div
              key={virtualItem.key}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                transform: `translateY(${virtualItem.start}px)`,
              }}
            >
              <FeedbackItem
                feedback={feedbackItem}
                onView={onViewFeedback}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
});

VirtualizedFeedbackList.displayName = 'VirtualizedFeedbackList';