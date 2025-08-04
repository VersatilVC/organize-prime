import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from '@/components/ui/breadcrumb';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useUserRole } from '@/hooks/useUserRole';
import { useOrganizationData } from '@/contexts/OrganizationContext';
import { AppLayout } from '@/components/layout/AppLayout';
import { Loader2, Send, FileText, History, Settings } from 'lucide-react';
import { 
  SendAnnouncementForm, 
  NotificationTemplatesManager, 
  NotificationHistory
} from '@/components/notifications';

export default function NotificationManagement() {
  const { user } = useAuth();
  const { role, loading: roleLoading } = useUserRole();
  const { currentOrganization } = useOrganizationData();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('send');

  // Check access permissions
  useEffect(() => {
    if (!roleLoading && role !== 'super_admin' && role !== 'admin') {
      toast({
        title: 'Access Denied',
        description: 'You do not have permission to access notification management',
        variant: 'destructive',
      });
      navigate('/settings/profile');
    }
  }, [role, roleLoading, navigate, toast]);

  if (roleLoading || (role !== 'super_admin' && role !== 'admin')) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="container mx-auto px-6 py-6 max-w-7xl">
        {/* Header */}
        <div className="mb-6">
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink href="/">Dashboard</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbLink href="/settings/profile">Settings</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>Notification Management</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
          <h1 className="text-3xl font-bold mt-4">Notification Management</h1>
          <p className="text-muted-foreground mt-2">
            Manage announcements, templates, and notification history for {role === 'super_admin' ? 'the entire system' : 'your organization'}
          </p>
        </div>

        <Card>
          <CardContent className="p-6">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="send" className="flex items-center gap-2">
                  <Send className="h-4 w-4" />
                  Send Announcement
                </TabsTrigger>
                <TabsTrigger value="templates" className="flex items-center gap-2" disabled={role !== 'super_admin'}>
                  <FileText className="h-4 w-4" />
                  Templates
                </TabsTrigger>
                <TabsTrigger value="history" className="flex items-center gap-2">
                  <History className="h-4 w-4" />
                  History
                </TabsTrigger>
              </TabsList>

              <TabsContent value="send">
                <SendAnnouncementForm 
                  userRole={role} 
                  currentOrganization={currentOrganization}
                />
              </TabsContent>

              <TabsContent value="templates">
                {role === 'super_admin' ? (
                  <NotificationTemplatesManager />
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    Only super administrators can manage notification templates.
                  </div>
                )}
              </TabsContent>


              <TabsContent value="history">
                <NotificationHistory 
                  userRole={role}
                  currentOrganization={currentOrganization}
                />
              </TabsContent>

            </Tabs>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}