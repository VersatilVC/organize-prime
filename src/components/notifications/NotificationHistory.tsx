import React, { useRef, useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { UserRole } from '@/hooks/useUserRole';
// Use the organization data structure from context
import { Loader2, Eye, Download, Search, Calendar } from 'lucide-react';
import { format } from 'date-fns';
import { useVirtualizer } from '@tanstack/react-virtual';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { debounce } from '@/lib/utils';
import { Progress } from '@/components/ui/progress';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

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
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(50);
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const setDebouncedSearch = useMemo(() => debounce((v: string) => setDebouncedSearchTerm(v), 300), []);
  const queryClient = useQueryClient();
  const [exporting, setExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const exportControllerRef = useRef<AbortController | null>(null);
  const { user } = useAuth();

  const [virtualizationEnabled, setVirtualizationEnabled] = useState(true);
  const [virtualizationThreshold, setVirtualizationThreshold] = useState(150);
  const [settingsLoaded, setSettingsLoaded] = useState(false);

  // Load persisted preferences (user overrides, then org defaults)
  useEffect(() => {
    const loadPrefs = async () => {
      if (!user?.id) return;
      try {
        const [userRes, orgRes] = await Promise.all([
          supabase.from('profiles').select('preferences').eq('id', user.id).single(),
          currentOrganization?.id
            ? supabase
                .from('organization_settings')
                .select('value')
                .eq('organization_id', currentOrganization.id)
                .eq('category', 'notifications')
                .eq('key', 'notification_history_defaults')
                .maybeSingle()
            : Promise.resolve({ data: null } as any),
        ]);

        const userPrefs = (userRes.data?.preferences as any)?.notification_history;
        const orgDefaults = (orgRes as any)?.data?.value as any;

        const enabled = (userPrefs?.virtualizationEnabled ?? orgDefaults?.virtualizationEnabled ?? true) as boolean;
        const threshold = (userPrefs?.threshold ?? orgDefaults?.threshold ?? 150) as number;

        setVirtualizationEnabled(Boolean(enabled));
        setVirtualizationThreshold(Number.isFinite(threshold) ? threshold : 150);
      } catch (e) {
        console.error('Failed to load notification history preferences', e);
      } finally {
        setSettingsLoaded(true);
      }
    };
    loadPrefs();
  }, [user?.id, currentOrganization?.id]);

  const saveUserPrefs = async (enabled: boolean, threshold: number) => {
    if (!user?.id) return;
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('preferences')
        .eq('id', user.id)
        .single();

      const existing = (profile?.preferences as any) ?? {};
      const next = {
        ...existing,
        notification_history: {
          ...(existing.notification_history ?? {}),
          virtualizationEnabled: enabled,
          threshold,
        },
      };
      await supabase.from('profiles').update({ preferences: next }).eq('id', user.id);
    } catch (e) {
      console.error('Failed to save user notification history preferences', e);
    }
  };

  const saveOrgDefaults = async (enabled: boolean, threshold: number) => {
    if (!currentOrganization?.id) return;
    if (!(userRole === 'admin' || userRole === 'super_admin')) return;
    try {
      const { data: existing } = await supabase
        .from('organization_settings')
        .select('id')
        .eq('organization_id', currentOrganization.id)
        .eq('category', 'notifications')
        .eq('key', 'notification_history_defaults')
        .maybeSingle();

      const value = { virtualizationEnabled: enabled, threshold } as any;

      if (existing?.id) {
        await supabase.from('organization_settings').update({ value }).eq('id', existing.id);
      } else {
        await supabase.from('organization_settings').insert({
          organization_id: currentOrganization.id,
          category: 'notifications',
          key: 'notification_history_defaults',
          value,
        });
      }
    } catch (e) {
      // Ignore permission errors for non-admins
      console.warn('Org defaults not saved (insufficient rights or other issue).', e);
    }
  };

  const debouncedPersist = useMemo(
    () =>
      debounce((enabled: boolean, threshold: number) => {
        saveUserPrefs(enabled, threshold);
        if (userRole === 'admin' || userRole === 'super_admin') {
          saveOrgDefaults(enabled, threshold);
        }
      }, 600),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [userRole, user?.id, currentOrganization?.id]
  );

  useEffect(() => {
    if (!settingsLoaded) return;
    debouncedPersist(virtualizationEnabled, virtualizationThreshold);
  }, [virtualizationEnabled, virtualizationThreshold, settingsLoaded, debouncedPersist]);

  // Debounce search term and reset page on filters/page size change
  useEffect(() => {
    setDebouncedSearch(searchTerm);
  }, [searchTerm, setDebouncedSearch]);

  useEffect(() => {
    setPage(0);
  }, [debouncedSearchTerm, typeFilter, dateFilter, pageSize, currentOrganization?.id]);

  // Server-side filtered, paginated history
  const { data: notifications, isLoading } = useQuery({
    queryKey: [
      'notification-history',
      userRole,
      currentOrganization?.id,
      debouncedSearchTerm,
      typeFilter,
      dateFilter,
      page,
      pageSize,
    ],
    queryFn: async () => {
      let query = supabase
        .from('notifications')
        .select(
          `
          id,
          title,
          message,
          type,
          created_at,
          data,
          organization_id,
          organizations(name)
        `,
          { count: 'exact' }
        )
        .order('created_at', { ascending: false });

      // Scope by organization if available to satisfy RLS for admins/super_admins
      if (currentOrganization?.id) {
        query = query.eq('organization_id', currentOrganization.id);
      } else if (userRole === 'user' && user?.id) {
        // Regular users: only their notifications
        query = query.eq('user_id', user.id);
      }

      if (typeFilter !== 'all') {
        query = query.eq('type', typeFilter);
      }

      if (debouncedSearchTerm.trim()) {
        const term = debouncedSearchTerm.trim();
        query = query.or(`title.ilike.%${term}%,message.ilike.%${term}%`);
      }

      if (dateFilter !== 'all') {
        const now = new Date();
        let since = new Date(0);
        switch (dateFilter) {
          case 'today':
            since = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            break;
          case 'week':
            since = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            break;
          case 'month':
            since = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
            break;
        }
        query = query.gte('created_at', since.toISOString());
      }

      const from = page * pageSize;
      const to = from + pageSize - 1;

      const { data, error, count } = await query.range(from, to);

      if (error) {
        console.error('Error fetching notification history:', error);
        return { items: [], total: 0 };
      }

      const items = (data || []).map((notification: any) => ({
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

      return { items, total: count || 0 };
    },
  });

  const items = notifications?.items ?? [];
  const totalCount = notifications?.total ?? 0;

  // Prefetch next page for smoother pagination
  useEffect(() => {
    if (isLoading) return;
    const hasNext = (page + 1) * pageSize < totalCount;
    if (!hasNext) return;

    queryClient.prefetchQuery({
      queryKey: [
        'notification-history',
        userRole,
        currentOrganization?.id,
        debouncedSearchTerm,
        typeFilter,
        dateFilter,
        page + 1,
        pageSize,
      ],
      queryFn: async () => {
        let query = supabase
          .from('notifications')
          .select(
            `
            id,
            title,
            message,
            type,
            created_at,
            data,
            organization_id,
            organizations(name)
          `
          )
          .order('created_at', { ascending: false });

        if (currentOrganization?.id) {
          query = query.eq('organization_id', currentOrganization.id);
        } else if (userRole === 'user' && user?.id) {
          query = query.eq('user_id', user.id);
        }
        if (typeFilter !== 'all') query = query.eq('type', typeFilter);
        if (debouncedSearchTerm.trim()) {
          const term = debouncedSearchTerm.trim();
          query = query.or(`title.ilike.%${term}%,message.ilike.%${term}%`);
        }
        if (dateFilter !== 'all') {
          const now = new Date();
          let since = new Date(0);
          switch (dateFilter) {
            case 'today':
              since = new Date(now.getFullYear(), now.getMonth(), now.getDate());
              break;
            case 'week':
              since = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
              break;
            case 'month':
              since = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
              break;
          }
          query = query.gte('created_at', since.toISOString());
        }

        const from = (page + 1) * pageSize;
        const to = from + pageSize - 1;
        const { data, error } = await query.range(from, to);
        if (error) return { items: [], total: totalCount };
        const items = (data || []).map((n: any) => ({
          id: n.id,
          title: n.title,
          message: n.message,
          type: n.type,
          created_at: n.created_at,
          sender_name: (n.data as any)?.sender_name || 'System',
          recipient_count: (n.data as any)?.recipient_count || 0,
          organization_name: n.organizations?.name || 'Unknown',
          delivery_status: 'sent' as const,
        })) as NotificationRecord[];
        return { items, total: totalCount };
      },
    });
  }, [isLoading, page, pageSize, totalCount, debouncedSearchTerm, typeFilter, dateFilter, currentOrganization?.id, userRole, user?.id, queryClient]);

  const parentRef = useRef<HTMLDivElement>(null);
  const enableVirtual = virtualizationEnabled && totalCount > virtualizationThreshold;
  const rowVirtualizer = useVirtualizer({
    count: enableVirtual ? items.length : 0,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 56,
    overscan: 8,
  });
  const virtualRows = rowVirtualizer.getVirtualItems();
  const paddingTop = virtualRows.length > 0 ? virtualRows[0].start : 0;
  const paddingBottom = virtualRows.length > 0 ? rowVirtualizer.getTotalSize() - virtualRows[virtualRows.length - 1].end : 0;
  const COLS = 7;

  const exportToCsv = () => {
    if (totalCount > pageSize) {
      toast({
        title: 'Export limited',
        description: `Exporting only current page (${pageSize} of ${totalCount}). Use filters to narrow results.`,
      });
    }
    if (!items || items.length === 0) return;

    const headers = ['Title', 'Type', 'Sent Date', 'Sender', 'Recipients', 'Status'];
    const csvContent = [
      headers.join(','),
      ...items.map(notification => [
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
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
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
              {totalCount} notifications
            </div>
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Switch id="virtualize-switch" checked={virtualizationEnabled} onCheckedChange={setVirtualizationEnabled} />
                <Label htmlFor="virtualize-switch" className="text-sm">Virtualize</Label>
              </div>
              <div className="flex items-center gap-2">
                <Label htmlFor="virtualize-threshold" className="text-sm">Threshold</Label>
                <Input
                  id="virtualize-threshold"
                  type="number"
                  min={50}
                  step={50}
                  value={virtualizationThreshold}
                  onChange={(e) => setVirtualizationThreshold(Math.max(0, Number(e.target.value) || 0))}
                  className="w-24"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Notifications Table */}
      <Card>
        <CardContent className="p-0">
          <div ref={parentRef} className="max-h-[640px] overflow-auto">
            <Table>
            <TableHeader className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
              <TableRow>
                <TableHead className="sticky left-0 z-20 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">Title</TableHead>
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
) : items.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    No notifications found matching your criteria.
                  </TableCell>
                </TableRow>
              ) : enableVirtual ? (
                <>
                  {paddingTop > 0 && (
                    <TableRow>
                      <TableCell colSpan={COLS} style={{ height: paddingTop }} />
                    </TableRow>
                  )}

                  {virtualRows.map((virtualRow) => {
                    const notification = items[virtualRow.index];
                    return (
                      <TableRow key={notification.id}>
                        <TableCell className="sticky left-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 font-medium max-w-xs">
                          <div className="truncate" title={notification.title}>
                            {notification.title}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{getTypeLabel(notification.type)}</Badge>
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
                    );
                  })}

                  {paddingBottom > 0 && (
                    <TableRow>
                      <TableCell colSpan={COLS} style={{ height: paddingBottom }} />
                    </TableRow>
                  )}
                </>
              ) : (
                items.map((notification) => (
                  <TableRow key={notification.id}>
                    <TableCell className="sticky left-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 font-medium max-w-xs">
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
          </div>
        </CardContent>
      </Card>

      {/* Pagination */}
      <div className="flex items-center justify-between gap-4 mt-4">
        <div className="text-sm text-muted-foreground">
          Showing {items.length > 0 ? page * pageSize + 1 : 0}–
          {Math.min((page + 1) * pageSize, totalCount)} of {totalCount}
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" disabled={page === 0 || isLoading} onClick={() => setPage((p) => Math.max(0, p - 1))}>
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={(page + 1) * pageSize >= totalCount || isLoading}
            onClick={() => setPage((p) => p + 1)}
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  );
}