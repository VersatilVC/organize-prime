/**
 * Main Webhook Management Page
 * Provides comprehensive webhook management interface for super admins
 */

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Settings, BarChart3, Activity, AlertCircle, CheckCircle, TestTube, Upload, FileCode, GitBranch } from 'lucide-react';
import { toast } from 'sonner';

// Import our webhook components
import { WebhookInventory } from '@/components/webhooks/management/WebhookInventory';
import { WebhookAnalyticsDashboard } from '@/components/webhooks/analytics/WebhookAnalyticsDashboard';
import { WebhookConfigurationModal } from '@/components/webhooks/configuration/WebhookConfigurationModal';
import { WebhookLiveMonitor } from '@/components/webhooks/monitoring/WebhookLiveMonitor';
import { WebhookTester } from '@/components/webhooks/testing/WebhookTester';
import { WebhookImportExport } from '@/components/webhooks/operations/WebhookImportExport';
import { WebhookTemplates } from '@/components/webhooks/templates/WebhookTemplates';

// Import hooks
import { useActualElementWebhooks } from '@/hooks/useActualElementWebhooks';
import { useUserRole } from '@/hooks/useUserRole';

function WebhookManagement() {
  const [activeTab, setActiveTab] = useState('inventory');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  
  
  // Check permissions
  const { role } = useUserRole();
  const isSuperAdmin = role === 'super_admin';

  // Get webhook data for overview
  const { data: webhooksData, isLoading: webhooksLoading } = useActualElementWebhooks();

  // Redirect if not super admin
  if (!isSuperAdmin) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-destructive" />
              Access Denied
            </CardTitle>
            <CardDescription>
              Webhook management is only available to super administrators.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  // Calculate overview stats - handle paginated response
  const totalWebhooks = webhooksData?.totalCount || 0;
  const webhooks = webhooksData?.webhooks || [];
  const activeWebhooks = webhooks.filter(w => w.isActive).length || 0;
  const healthyWebhooks = webhooks.filter(w => w.healthStatus === 'healthy').length || 0;
  const errorWebhooks = webhooks.filter(w => w.healthStatus === 'error').length || 0;

  const handleCreateWebhook = () => {
    setIsCreateModalOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Webhook Management</h1>
          <p className="text-muted-foreground">
            Manage and monitor Visual Button-Level Webhook assignments across all features
          </p>
        </div>
        <Button onClick={handleCreateWebhook} className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Create Webhook
        </Button>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Webhooks</CardTitle>
            <Settings className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalWebhooks}</div>
            <p className="text-xs text-muted-foreground">
              Across all features and pages
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Webhooks</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeWebhooks}</div>
            <p className="text-xs text-muted-foreground">
              Currently enabled and running
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Healthy</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{healthyWebhooks}</div>
            <p className="text-xs text-muted-foreground">
              Operating normally
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Errors</CardTitle>
            <AlertCircle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{errorWebhooks}</div>
            <p className="text-xs text-muted-foreground">
              Require attention
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="inventory" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Inventory
          </TabsTrigger>
          <TabsTrigger value="analytics" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Analytics
          </TabsTrigger>
          <TabsTrigger value="monitoring" className="flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Live Monitor
          </TabsTrigger>
          <TabsTrigger value="testing" className="flex items-center gap-2">
            <TestTube className="h-4 w-4" />
            Testing
          </TabsTrigger>
          <TabsTrigger value="templates" className="flex items-center gap-2">
            <FileCode className="h-4 w-4" />
            Templates
          </TabsTrigger>
          <TabsTrigger value="tools" className="flex items-center gap-2">
            <Upload className="h-4 w-4" />
            Tools
          </TabsTrigger>
        </TabsList>

        <TabsContent value="inventory" className="space-y-4">
          <WebhookInventory />
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <WebhookAnalyticsDashboard />
        </TabsContent>

        <TabsContent value="monitoring" className="space-y-4">
          <WebhookLiveMonitor />
        </TabsContent>

        <TabsContent value="testing" className="space-y-4">
          <WebhookTester />
        </TabsContent>


        <TabsContent value="templates" className="space-y-4">
          <WebhookTemplates />
        </TabsContent>

        <TabsContent value="tools" className="space-y-4">
          <WebhookImportExport />
        </TabsContent>
      </Tabs>

      {/* Create Webhook Modal */}
      <WebhookConfigurationModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        mode="create"
      />
    </div>
  );
}

export default WebhookManagement;