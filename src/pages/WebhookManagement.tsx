/**
 * Global Webhook Management Page
 * Accessible from the main navigation for all users
 */

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Webhook, Globe, TestTube, Info, Settings } from 'lucide-react';
import { WebhookPanel } from '@/components/webhooks/WebhookPanel';
import { SimpleWebhookAssignments } from '@/components/webhooks/SimpleWebhookAssignments';
import { AppLayout } from '@/components/layout/AppLayout';
import { useWebhooks } from '@/hooks/useWebhooks';

export default function WebhookManagement() {
  const { webhooks, isLoading } = useWebhooks();

  const activeWebhooks = webhooks.filter(w => w.is_active);
  const inactiveWebhooks = webhooks.filter(w => !w.is_active);
  const testedWebhooks = webhooks.filter(w => w.last_tested_at);
  const workingWebhooks = webhooks.filter(w => w.last_test_status === 'success');

  return (
    <AppLayout>
      <div className="container mx-auto py-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Webhook Management</h1>
            <p className="text-muted-foreground">
              Configure webhooks and create custom buttons to trigger external integrations
            </p>
          </div>
          
          {!isLoading && (
            <div className="flex gap-2">
              <Badge variant="outline" className="flex items-center gap-1">
                <Globe className="h-3 w-3" />
                {activeWebhooks.length} Active
              </Badge>
              <Badge variant="outline" className="flex items-center gap-1">
                <TestTube className="h-3 w-3" />
                {workingWebhooks.length} Working
              </Badge>
            </div>
          )}
        </div>

        {/* Overview Cards */}
        {!isLoading && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Webhooks</CardTitle>
                <Webhook className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{webhooks.length}</div>
                <p className="text-xs text-muted-foreground">
                  {activeWebhooks.length} active, {inactiveWebhooks.length} inactive
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active Webhooks</CardTitle>
                <Globe className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">{activeWebhooks.length}</div>
                <p className="text-xs text-muted-foreground">
                  Ready to receive requests
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Tested Webhooks</CardTitle>
                <TestTube className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{testedWebhooks.length}</div>
                <p className="text-xs text-muted-foreground">
                  {workingWebhooks.length} working properly
                </p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Info Alert */}
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            <strong>Webhook Integration:</strong> Webhooks allow you to connect OrganizePrime with external services 
            like N8N, Zapier, or custom applications. Create webhooks, then assign them to feature pages and button positions.
          </AlertDescription>
        </Alert>

        {/* Main Content Tabs */}
        <Tabs defaultValue="webhooks" className="space-y-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="webhooks" className="flex items-center gap-2">
              <Webhook className="h-4 w-4" />
              Webhook Configuration
            </TabsTrigger>
            <TabsTrigger value="assignments" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Webhook Assignments
            </TabsTrigger>
          </TabsList>

          <TabsContent value="webhooks" className="space-y-4">
            <WebhookPanel 
              title="Webhook Endpoints"
              description="Create and manage webhook endpoints for external integrations"
            />
          </TabsContent>

          <TabsContent value="assignments" className="space-y-4">
            <SimpleWebhookAssignments />
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}