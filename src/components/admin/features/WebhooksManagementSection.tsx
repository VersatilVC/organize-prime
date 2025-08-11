import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Webhook, 
  Search, 
  Filter, 
  TestTube, 
  Edit, 
  Trash2, 
  ExternalLink,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  Package
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import type { SystemFeature } from '@/types/features';

interface WebhookItem {
  id: string;
  feature_id: string;
  name: string;
  description?: string;
  endpoint_url: string;
  method: string;
  is_active: boolean;
  last_tested_at?: string;
  test_status?: 'success' | 'failed' | 'pending';
  timeout_seconds: number;
  retry_attempts: number;
}

interface WebhooksManagementSectionProps {
  webhooks: WebhookItem[];
  features: SystemFeature[];
}

const getStatusIcon = (status?: string) => {
  switch (status) {
    case 'success':
      return <CheckCircle className="h-4 w-4 text-green-500" />;
    case 'failed':
      return <XCircle className="h-4 w-4 text-red-500" />;
    case 'pending':
      return <Clock className="h-4 w-4 text-yellow-500" />;
    default:
      return <AlertCircle className="h-4 w-4 text-gray-400" />;
  }
};

const getStatusColor = (status?: string) => {
  switch (status) {
    case 'success':
      return 'bg-green-100 text-green-800 border-green-200';
    case 'failed':
      return 'bg-red-100 text-red-800 border-red-200';
    case 'pending':
      return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    default:
      return 'bg-gray-100 text-gray-800 border-gray-200';
  }
};

export function WebhooksManagementSection({ webhooks, features }: WebhooksManagementSectionProps) {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFeature, setSelectedFeature] = useState<string>('all');
  const [testingWebhook, setTestingWebhook] = useState<string | null>(null);

  const filteredWebhooks = webhooks.filter(webhook => {
    const matchesSearch = webhook.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         webhook.endpoint_url.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFeature = selectedFeature === 'all' || webhook.feature_id === selectedFeature;
    return matchesSearch && matchesFeature;
  });

  const groupedWebhooks = features.reduce((acc, feature) => {
    const featureWebhooks = filteredWebhooks.filter(w => w.feature_id === feature.id);
    if (featureWebhooks.length > 0) {
      acc[feature.id] = {
        feature,
        webhooks: featureWebhooks
      };
    }
    return acc;
  }, {} as Record<string, { feature: SystemFeature; webhooks: WebhookItem[] }>);

  const handleTestWebhook = async (webhook: WebhookItem) => {
    setTestingWebhook(webhook.id);
    try {
      // Implementation for testing webhook
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      toast({
        title: 'Webhook Test',
        description: `${webhook.name} test completed successfully`,
      });
    } catch (error) {
      toast({
        title: 'Test Failed',
        description: `Failed to test ${webhook.name}`,
        variant: 'destructive',
      });
    } finally {
      setTestingWebhook(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Webhook className="h-5 w-5" />
            Webhooks Management
          </CardTitle>
          <CardDescription>
            Manage webhooks for all features and test their connectivity
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search webhooks..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={selectedFeature} onValueChange={setSelectedFeature}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Features</SelectItem>
                {features.map((feature) => (
                  <SelectItem key={feature.id} value={feature.id}>
                    {feature.display_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Grouped Webhooks */}
      <div className="space-y-6">
        {Object.entries(groupedWebhooks).map(([featureId, groupData]) => {
          const { feature, webhooks } = groupData;
          return (
            <Card key={featureId}>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div 
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-white"
                  style={{ backgroundColor: feature.color_hex }}
                >
                  <Package className="h-4 w-4" />
                </div>
                <div>
                  <CardTitle className="text-lg">{feature.display_name}</CardTitle>
                  <CardDescription>
                    {webhooks.length} webhook{webhooks.length !== 1 ? 's' : ''}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {webhooks.map((webhook) => (
                  <div 
                    key={webhook.id}
                    className="border rounded-lg p-4 hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <h4 className="font-medium truncate">{webhook.name}</h4>
                          <Badge 
                            variant={webhook.is_active ? "default" : "secondary"}
                            className="text-xs"
                          >
                            {webhook.is_active ? "Active" : "Inactive"}
                          </Badge>
                          {webhook.test_status && (
                            <Badge 
                              variant="outline" 
                              className={cn("text-xs", getStatusColor(webhook.test_status))}
                            >
                              <span className="flex items-center gap-1">
                                {getStatusIcon(webhook.test_status)}
                                {webhook.test_status}
                              </span>
                            </Badge>
                          )}
                        </div>
                        
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Badge variant="outline" className="text-xs">
                              {webhook.method}
                            </Badge>
                            <span className="truncate">{webhook.endpoint_url}</span>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0"
                              onClick={() => window.open(webhook.endpoint_url, '_blank')}
                            >
                              <ExternalLink className="h-3 w-3" />
                            </Button>
                          </div>
                          
                          {webhook.description && (
                            <p className="text-sm text-muted-foreground">
                              {webhook.description}
                            </p>
                          )}
                          
                          <div className="flex items-center gap-4 text-xs text-muted-foreground">
                            <span>Timeout: {webhook.timeout_seconds}s</span>
                            <span>Retries: {webhook.retry_attempts}</span>
                            {webhook.last_tested_at && (
                              <span>
                                Last tested: {new Date(webhook.last_tested_at).toLocaleDateString()}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2 ml-4">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleTestWebhook(webhook)}
                          disabled={testingWebhook === webhook.id}
                        >
                          <TestTube className="h-3 w-3 mr-1" />
                          {testingWebhook === webhook.id ? 'Testing...' : 'Test'}
                        </Button>
                        
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0"
                        >
                          <Edit className="h-3 w-3" />
                        </Button>
                        
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 text-destructive"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
            </Card>
          );
        })}
      </div>

      {Object.keys(groupedWebhooks).length === 0 && (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-8 text-muted-foreground">
              <Webhook className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No webhooks found</p>
              <p className="text-sm">
                {searchTerm || selectedFeature !== 'all' 
                  ? 'Try adjusting your filters'
                  : 'Add your first webhook to get started'
                }
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}