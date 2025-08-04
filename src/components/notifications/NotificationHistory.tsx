import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { UserRole } from '@/hooks/useUserRole';
// Use the organization data structure from context
import { Loader2, Eye, Download, Search, Calendar } from 'lucide-react';
import { format } from 'date-fns';

interface NotificationHistoryProps {
  userRole: UserRole;
  currentOrganization: any | null;
}

interface NotificationRecord {
  id: string;
  title: string;
  message: string;
  type: string;
  created_at: string;
  sender_name: string;
  recipient_count: number;
  organization_name?: string;
  delivery_status: 'sent' | 'pending' | 'failed';
}

export function NotificationHistory({ userRole, currentOrganization }: NotificationHistoryProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');
  const [selectedNotification, setSelectedNotification] = useState<NotificationRecord | null>(null);

  // Fetch notification history
  const { data: notifications, isLoading } = useQuery({
    queryKey: ['notification-history', userRole, currentOrganization?.id, searchTerm, typeFilter, dateFilter],
    queryFn: async () => {
      let query = supabase
        .from('notifications')
        .select(`
          id,
          title,
          message,
          type,
          created_at,
          data,
          organization_id,
          organizations!inner(name)
        `)
        .order('created_at', { ascending: false })
        .limit(100);

      // Filter by organization for admins
      if (userRole === 'admin' && currentOrganization?.id) {
        query = query.eq('organization_id', currentOrganization.id);
      }

      const { data, error } = await query;
      
      if (error) {
        console.error('Error fetching notification history:', error);
        return [];
      }

      return (data || []).map(notification => ({
        id: notification.id,
        title: notification.title,
        message: notification.message,
        type: notification.type,
        created_at: notification.created_at,
        sender_name: (notification.data as any)?.sender_name || 'System',
        recipient_count: (notification.data as any)?.recipient_count || 0,
        organization_name: notification.organizations?.name || 'Unknown',
        delivery_status: 'sent' as const,
      })) as NotificationRecord[];
    }
  });

  const filteredNotifications = notifications?.filter(notification => {
    const matchesSearch = notification.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         notification.message.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = typeFilter === 'all' || notification.type === typeFilter;
    
    let matchesDate = true;
    if (dateFilter !== 'all') {
      const notificationDate = new Date(notification.created_at);
      const now = new Date();
      
      switch (dateFilter) {
        case 'today':
          matchesDate = notificationDate.toDateString() === now.toDateString();
          break;
        case 'week':
          const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          matchesDate = notificationDate >= weekAgo;
          break;
        case 'month':
          const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          matchesDate = notificationDate >= monthAgo;
          break;
      }
    }

    return matchesSearch && matchesType && matchesDate;
  });

  const exportToCsv = () => {
    if (!filteredNotifications || filteredNotifications.length === 0) return;

    const headers = ['Title', 'Type', 'Sent Date', 'Sender', 'Recipients', 'Status'];
    const csvContent = [
      headers.join(','),
      ...filteredNotifications.map(notification => [
        `"${notification.title}"`,
        notification.type,
        format(new Date(notification.created_at), 'yyyy-MM-dd HH:mm'),
        `"${notification.sender_name}"`,
        notification.recipient_count,
        notification.delivery_status,
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `notification-history-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'system_announcement': return 'System Announcement';
      case 'user_invitation_accepted': return 'User Invitation';
      case 'feedback_response': return 'Feedback Response';
      case 'welcome_first_login': return 'Welcome Message';
      default: return type;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'sent':
        return <Badge variant="default">Sent</Badge>;
      case 'pending':
        return <Badge variant="secondary">Pending</Badge>;
      case 'failed':
        return <Badge variant="destructive">Failed</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold">Notification History</h3>
          <p className="text-sm text-muted-foreground">
            View and export sent notifications and announcements
          </p>
        </div>
        <Button onClick={exportToCsv} variant="outline" className="flex items-center gap-2">
          <Download className="h-4 w-4" />
          Export CSV
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search notifications..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="system_announcement">System Announcements</SelectItem>
                <SelectItem value="user_invitation_accepted">User Invitations</SelectItem>
                <SelectItem value="feedback_response">Feedback Responses</SelectItem>
                <SelectItem value="welcome_first_login">Welcome Messages</SelectItem>
              </SelectContent>
            </Select>

            <Select value={dateFilter} onValueChange={setDateFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by date" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Time</SelectItem>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="week">Past Week</SelectItem>
                <SelectItem value="month">Past Month</SelectItem>
              </SelectContent>
            </Select>

            <div className="flex items-center text-sm text-muted-foreground">
              <Calendar className="h-4 w-4 mr-2" />
              {filteredNotifications?.length || 0} notifications
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Notifications Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Sent Date</TableHead>
                <TableHead>Sender</TableHead>
                <TableHead>Recipients</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                  </TableCell>
                </TableRow>
              ) : filteredNotifications?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    No notifications found matching your criteria.
                  </TableCell>
                </TableRow>
              ) : (
                filteredNotifications?.map((notification) => (
                  <TableRow key={notification.id}>
                    <TableCell className="font-medium max-w-xs">
                      <div className="truncate" title={notification.title}>
                        {notification.title}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {getTypeLabel(notification.type)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {format(new Date(notification.created_at), 'MMM dd, yyyy HH:mm')}
                    </TableCell>
                    <TableCell>{notification.sender_name}</TableCell>
                    <TableCell>{notification.recipient_count}</TableCell>
                    <TableCell>{getStatusBadge(notification.delivery_status)}</TableCell>
                    <TableCell className="text-right">
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setSelectedNotification(notification)}
                            className="flex items-center gap-1"
                          >
                            <Eye className="h-3 w-3" />
                            View
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-2xl">
                          <DialogHeader>
                            <DialogTitle>Notification Details</DialogTitle>
                          </DialogHeader>
                          {selectedNotification && (
                            <div className="space-y-4">
                              <div>
                                <h4 className="font-semibold text-lg">{selectedNotification.title}</h4>
                                <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                                  <span>Sent by {selectedNotification.sender_name}</span>
                                  <span>•</span>
                                  <span>{format(new Date(selectedNotification.created_at), 'MMM dd, yyyy HH:mm')}</span>
                                  <span>•</span>
                                  <span>{selectedNotification.recipient_count} recipients</span>
                                </div>
                              </div>
                              <div>
                                <h5 className="font-medium mb-2">Message</h5>
                                <p className="whitespace-pre-wrap text-sm">{selectedNotification.message}</p>
                              </div>
                              <div className="flex items-center gap-4">
                                <div>
                                  <span className="text-sm font-medium">Type: </span>
                                  <Badge variant="outline">{getTypeLabel(selectedNotification.type)}</Badge>
                                </div>
                                <div>
                                  <span className="text-sm font-medium">Status: </span>
                                  {getStatusBadge(selectedNotification.delivery_status)}
                                </div>
                              </div>
                            </div>
                          )}
                        </DialogContent>
                      </Dialog>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}