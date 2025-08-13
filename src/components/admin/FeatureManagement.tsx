import * as React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { 
  Plus, 
  Edit, 
  Trash2, 
  Webhook, 
  Settings, 
  Activity, 
  Building2, 
  BarChart3,
  Package,
  Loader2,
  TestTube,
  ExternalLink,
  Info
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { AvailableFeaturesSection } from './features/AvailableFeaturesSection';
import { AddFeatureModal } from './features/AddFeatureModal';
import { FeatureConfigurationPanel } from './features/FeatureConfigurationPanel';
import { WebhooksManagementSection } from './features/WebhooksManagementSection';
import { AddWebhookModal } from './features/AddWebhookModal';
import { useSystemFeatures } from '@/hooks/database/useSystemFeatures';
import { useFeatureWebhooks } from '@/hooks/database/useFeatureWebhooks';

export function FeatureManagement() {
  const { toast } = useToast();
  const [selectedFeature, setSelectedFeature] = React.useState<string | null>(null);
  const [isAddFeatureOpen, setIsAddFeatureOpen] = React.useState(false);
  const [isAddWebhookOpen, setIsAddWebhookOpen] = React.useState(false);
  
  const { features, isLoading: featuresLoading } = useSystemFeatures();
  const { webhooks, isLoading: webhooksLoading } = useFeatureWebhooks();

  const isLoading = featuresLoading || webhooksLoading;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Feature Management</h2>
          <p className="text-muted-foreground">
            Manage system features, webhooks, and configurations
          </p>
        </div>
        <div className="flex gap-2">
          <AddWebhookModal 
            open={isAddWebhookOpen}
            onOpenChange={setIsAddWebhookOpen}
            trigger={
              <Button variant="outline" size="sm">
                <Webhook className="h-4 w-4 mr-2" />
                Add Webhook
              </Button>
            }
          />
          <AddFeatureModal 
            open={isAddFeatureOpen}
            onOpenChange={setIsAddFeatureOpen}
            trigger={
              <Button size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Add Feature
              </Button>
            }
          />
        </div>
      </div>

      <Tabs defaultValue="features" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="features" className="flex items-center gap-2">
            <Package className="h-4 w-4" />
            Features
          </TabsTrigger>
          <TabsTrigger value="configuration" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Configuration
          </TabsTrigger>
          <TabsTrigger value="webhooks" className="flex items-center gap-2">
            <Webhook className="h-4 w-4" />
            Webhooks
          </TabsTrigger>
          <TabsTrigger value="analytics" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Analytics
          </TabsTrigger>
        </TabsList>

        <TabsContent value="features" className="space-y-6">
          <AvailableFeaturesSection 
            features={features}
            onFeatureSelect={setSelectedFeature}
          />
        </TabsContent>

        <TabsContent value="configuration" className="space-y-6">
          <FeatureConfigurationPanel 
            selectedFeature={selectedFeature}
            features={features}
            onFeatureSelect={setSelectedFeature}
          />
        </TabsContent>

        <TabsContent value="webhooks" className="space-y-6">
          <WebhooksManagementSection 
            webhooks={webhooks || []}
            features={features || []}
          />
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Feature Analytics
              </CardTitle>
              <CardDescription>
                Usage statistics and performance metrics for system features
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Feature analytics coming soon...</p>
                <p className="text-sm">Track feature usage, performance, and adoption metrics</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}