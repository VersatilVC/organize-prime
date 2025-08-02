import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { UserRole } from '@/hooks/useUserRole';
// Use the organization data structure from context
import { Loader2, CheckCheck, Trash2, Download, Calendar } from 'lucide-react';

interface BulkNotificationActionsProps {
  userRole: UserRole;
  currentOrganization: any | null;
}

export function BulkNotificationActions({ userRole, currentOrganization }: BulkNotificationActionsProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [dateRange, setDateRange] = useState({
    startDate: '',
    endDate: '',
  });

  // Mark all notifications as read mutation
  const markAllReadMutation = useMutation({
    mutationFn: async () => {
      const organizationId = userRole === 'admin' ? currentOrganization?.id : undefined;
      
      const { error } = await supabase.functions.invoke('bulk-mark-notifications-read', {
        body: {
          organizationId,
          userRole,
        }
      });

      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: 'Success',
        description: 'All notifications marked as read',
      });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: 'Failed to mark notifications as read. Please try again.',
        variant: 'destructive',
      });
      console.error('Mark all read error:', error);
    }
  });

  // Delete old notifications mutation
  const deleteOldNotificationsMutation = useMutation({
    mutationFn: async () => {
      if (!dateRange.startDate || !dateRange.endDate) {
        throw new Error('Please select a date range');
      }

      const organizationId = userRole === 'admin' ? currentOrganization?.id : undefined;
      
      const { error } = await supabase.functions.invoke('bulk-delete-notifications', {
        body: {
          startDate: dateRange.startDate,
          endDate: dateRange.endDate,
          organizationId,
          userRole,
        }
      });

      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: 'Success',
        description: 'Old notifications deleted successfully',
      });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notification-history'] });
      setDateRange({ startDate: '', endDate: '' });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete notifications. Please try again.',
        variant: 'destructive',
      });
      console.error('Delete notifications error:', error);
    }
  });

  // Export notification data mutation
  const exportNotificationsMutation = useMutation({
    mutationFn: async () => {
      const organizationId = userRole === 'admin' ? currentOrganization?.id : undefined;
      
      const { data, error } = await supabase.functions.invoke('export-notification-data', {
        body: {
          organizationId,
          userRole,
          startDate: dateRange.startDate,
          endDate: dateRange.endDate,
        }
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      // Create and download CSV file
      const blob = new Blob([data.csvContent], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = data.filename;
      a.click();
      window.URL.revokeObjectURL(url);
      
      toast({
        title: 'Success',
        description: 'Notification data exported successfully',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: 'Failed to export notification data. Please try again.',
        variant: 'destructive',
      });
      console.error('Export notifications error:', error);
    }
  });

  const handleMarkAllRead = () => {
    markAllReadMutation.mutate();
  };

  const handleDeleteOldNotifications = () => {
    deleteOldNotificationsMutation.mutate();
  };

  const handleExportData = () => {
    exportNotificationsMutation.mutate();
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold">Bulk Notification Actions</h3>
        <p className="text-sm text-muted-foreground">
          Perform bulk operations on notifications for {userRole === 'super_admin' ? 'the entire system' : 'your organization'}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {/* Mark All Read */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <CheckCheck className="h-5 w-5" />
              Mark All Read
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Mark all notifications as read for {userRole === 'admin' ? 'users in your organization' : 'all users'}.
            </p>
            
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" className="w-full">
                  Mark All Notifications Read
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Mark All Notifications as Read?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will mark all notifications as read for {userRole === 'admin' ? 'users in your organization' : 'all users in the system'}. 
                    This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleMarkAllRead} disabled={markAllReadMutation.isPending}>
                    {markAllReadMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : null}
                    Mark All Read
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </CardContent>
        </Card>

        {/* Delete Old Notifications */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Trash2 className="h-5 w-5" />
              Delete Old Notifications
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Delete notifications within a specific date range to clean up old data.
            </p>
            
            <div className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="startDate">Start Date</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={dateRange.startDate}
                  onChange={(e) => setDateRange(prev => ({ ...prev, startDate: e.target.value }))}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="endDate">End Date</Label>
                <Input
                  id="endDate"
                  type="date"
                  value={dateRange.endDate}
                  onChange={(e) => setDateRange(prev => ({ ...prev, endDate: e.target.value }))}
                />
              </div>
            </div>
            
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button 
                  variant="destructive" 
                  className="w-full"
                  disabled={!dateRange.startDate || !dateRange.endDate}
                >
                  Delete Notifications
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete Old Notifications?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will permanently delete all notifications between {dateRange.startDate} and {dateRange.endDate} for {userRole === 'admin' ? 'your organization' : 'the entire system'}. 
                    This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDeleteOldNotifications} disabled={deleteOldNotificationsMutation.isPending}>
                    {deleteOldNotificationsMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : null}
                    Delete Notifications
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </CardContent>
        </Card>

        {/* Export Data */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Download className="h-5 w-5" />
              Export Data
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Export notification data to CSV for analysis and reporting.
            </p>
            
            <div className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="exportStartDate">Start Date (Optional)</Label>
                <Input
                  id="exportStartDate"
                  type="date"
                  value={dateRange.startDate}
                  onChange={(e) => setDateRange(prev => ({ ...prev, startDate: e.target.value }))}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="exportEndDate">End Date (Optional)</Label>
                <Input
                  id="exportEndDate"
                  type="date"
                  value={dateRange.endDate}
                  onChange={(e) => setDateRange(prev => ({ ...prev, endDate: e.target.value }))}
                />
              </div>
            </div>
            
            <Button 
              variant="outline" 
              className="w-full flex items-center gap-2"
              onClick={handleExportData}
              disabled={exportNotificationsMutation.isPending}
            >
              {exportNotificationsMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Download className="h-4 w-4" />
              )}
              Export to CSV
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}