import React, { memo, useRef } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Bell, Check, X } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface NotificationItemProps {
  notification: {
    id: string;
    title: string;
    message: string;
    type: string;
    created_at: string;
    read: boolean;
    action_url?: string;
  };
  onMarkAsRead: (id: string) => void;
  onDismiss: (id: string) => void;
}

const NotificationItem = memo(({ notification, onMarkAsRead, onDismiss }: NotificationItemProps) => {
  const getTypeColor = (type: string) => {
    switch (type) {
      case 'welcome_first_login':
        return 'default';
      case 'feedback_response':
        return 'secondary';
      case 'system_announcement':
        return 'destructive';
      case 'invitation_accepted':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  return (
    <Card className={`mb-3 ${!notification.read ? 'border-primary/50 bg-primary/5' : ''}`}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <Bell className={`h-4 w-4 ${!notification.read ? 'text-primary' : 'text-muted-foreground'}`} />
            <span className="font-medium">{notification.title}</span>
            {!notification.read && (
              <Badge variant="default" className="text-xs">
                New
              </Badge>
            )}
          </div>
          <Badge variant={getTypeColor(notification.type)} className="text-xs">
            {notification.type.replace(/_/g, ' ')}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
          {notification.message}
        </p>
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">
            {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
          </span>
          <div className="flex items-center gap-2">
            {!notification.read && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onMarkAsRead(notification.id)}
                className="flex items-center gap-1"
              >
                <Check className="h-3 w-3" />
                Mark Read
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onDismiss(notification.id)}
              className="flex items-center gap-1"
            >
              <X className="h-3 w-3" />
              Dismiss
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
});

NotificationItem.displayName = 'NotificationItem';

interface VirtualizedNotificationsListProps {
  notifications: Array<{
    id: string;
    title: string;
    message: string;
    type: string;
    created_at: string;
    read: boolean;
    action_url?: string;
  }>;
  onMarkAsRead: (id: string) => void;
  onDismiss: (id: string) => void;
  isLoading?: boolean;
}

export const VirtualizedNotificationsList = memo(({
  notifications,
  onMarkAsRead,
  onDismiss,
  isLoading
}: VirtualizedNotificationsListProps) => {
  const parentRef = useRef<HTMLDivElement>(null);
  
  const virtualizer = useVirtualizer({
    count: notifications.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 150, // Approximate height of each notification
    overscan: 3,
  });

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader>
              <div className="h-5 bg-muted rounded w-2/3"></div>
            </CardHeader>
            <CardContent>
              <div className="h-4 bg-muted rounded w-full mb-2"></div>
              <div className="h-4 bg-muted rounded w-1/2"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (notifications.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center text-muted-foreground">
          <Bell className="h-8 w-8 mx-auto mb-4 opacity-50" />
          <p>No notifications to display</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div
      ref={parentRef}
      className="max-h-[600px] overflow-auto"
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
          const notification = notifications[virtualItem.index];
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
              <NotificationItem
                notification={notification}
                onMarkAsRead={onMarkAsRead}
                onDismiss={onDismiss}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
});

VirtualizedNotificationsList.displayName = 'VirtualizedNotificationsList';