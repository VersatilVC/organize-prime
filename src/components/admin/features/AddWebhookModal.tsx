import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { 
  Webhook, 
  TestTube,
  Loader2,
  CheckCircle,
  XCircle,
  Code,
  Clock,
  RotateCcw
} from 'lucide-react';

interface AddWebhookModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  trigger?: React.ReactNode;
}

const httpMethods = ['POST', 'PUT', 'GET', 'PATCH'];

const features = [
  { id: '1', name: 'Knowledge Base', slug: 'knowledge-base' },
  { id: '2', name: 'Content Creation', slug: 'content-creation' },
  { id: '3', name: 'Market Intelligence', slug: 'market-intel' },
];

export function AddWebhookModal({ open, onOpenChange, trigger }: AddWebhookModalProps) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'success' | 'failed'>('idle');
  const [testResponse, setTestResponse] = useState<string>('');
  
  const [formData, setFormData] = useState({
    featureId: '',
    name: '',
    description: '',
    endpointUrl: '',
    method: 'POST',
    timeoutSeconds: 30,
    retryAttempts: 3,
    headers: '{\n  "Content-Type": "application/json",\n  "Authorization": "Bearer your-token"\n}'
  });

  const handleTestWebhook = async () => {
    if (!formData.endpointUrl) {
      toast({
        title: 'Missing URL',
        description: 'Please enter an endpoint URL to test',
        variant: 'destructive',
      });
      return;
    }

    setTestStatus('testing');
    setTestResponse('');
    
    try {
      // Simulate webhook test
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Mock response
      const mockResponse = {
        status: 200,
        message: 'OK',
        response_time: '245ms',
        timestamp: new Date().toISOString()
      };
      
      setTestResponse(JSON.stringify(mockResponse, null, 2));
      setTestStatus('success');
      
      toast({
        title: 'Test Successful',
        description: 'Webhook endpoint responded successfully',
      });
    } catch (error) {
      setTestStatus('failed');
      setTestResponse(JSON.stringify({ 
        error: 'Connection failed',
        message: 'Could not connect to endpoint'
      }, null, 2));
      
      toast({
        title: 'Test Failed',
        description: 'Could not connect to webhook endpoint',
        variant: 'destructive',
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Validate headers JSON
      JSON.parse(formData.headers);
      
      // Implementation for creating webhook
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      toast({
        title: 'Webhook Created',
        description: `${formData.name} has been created successfully`,
      });
      
      // Reset form
      setFormData({
        featureId: '',
        name: '',
        description: '',
        endpointUrl: '',
        method: 'POST',
        timeoutSeconds: 30,
        retryAttempts: 3,
        headers: '{\n  "Content-Type": "application/json",\n  "Authorization": "Bearer your-token"\n}'
      });
      setTestStatus('idle');
      setTestResponse('');
      
      onOpenChange(false);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to create webhook. Please check your configuration.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const isValid = formData.featureId && formData.name && formData.endpointUrl;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Webhook className="h-5 w-5" />
            Add New Webhook
          </DialogTitle>
          <DialogDescription>
            Create a new webhook endpoint for feature integration
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Configuration Panel */}
            <div className="space-y-6">
              {/* Basic Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Basic Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="feature">Feature *</Label>
                    <Select
                      value={formData.featureId}
                      onValueChange={(value) => setFormData(prev => ({ ...prev, featureId: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select a feature" />
                      </SelectTrigger>
                      <SelectContent>
                        {features.map((feature) => (
                          <SelectItem key={feature.id} value={feature.id}>
                            {feature.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="name">Webhook Name *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="e.g., Process Document"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="Describe what this webhook does..."
                      rows={3}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Endpoint Configuration */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Endpoint Configuration</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="url">Endpoint URL *</Label>
                    <Input
                      id="url"
                      type="url"
                      value={formData.endpointUrl}
                      onChange={(e) => setFormData(prev => ({ ...prev, endpointUrl: e.target.value }))}
                      placeholder="https://api.example.com/webhook"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="method">HTTP Method</Label>
                      <Select
                        value={formData.method}
                        onValueChange={(value) => setFormData(prev => ({ ...prev, method: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {httpMethods.map((method) => (
                            <SelectItem key={method} value={method}>
                              {method}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="timeout">Timeout (seconds)</Label>
                      <Input
                        id="timeout"
                        type="number"
                        min="5"
                        max="300"
                        value={formData.timeoutSeconds}
                        onChange={(e) => setFormData(prev => ({ ...prev, timeoutSeconds: parseInt(e.target.value) }))}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="retries">Retry Attempts</Label>
                    <Input
                      id="retries"
                      type="number"
                      min="0"
                      max="10"
                      value={formData.retryAttempts}
                      onChange={(e) => setFormData(prev => ({ ...prev, retryAttempts: parseInt(e.target.value) }))}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="headers">Headers (JSON)</Label>
                    <Textarea
                      id="headers"
                      value={formData.headers}
                      onChange={(e) => setFormData(prev => ({ ...prev, headers: e.target.value }))}
                      className="font-mono text-sm"
                      rows={6}
                    />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Test Panel */}
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <TestTube className="h-4 w-4" />
                    Test Webhook
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleTestWebhook}
                    disabled={!formData.endpointUrl || testStatus === 'testing'}
                    className="w-full"
                  >
                    {testStatus === 'testing' && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    <TestTube className="h-4 w-4 mr-2" />
                    {testStatus === 'testing' ? 'Testing...' : 'Test Endpoint'}
                  </Button>

                  {testStatus !== 'idle' && (
                    <Card className="mt-4">
                      <CardHeader className="pb-3">
                        <div className="flex items-center gap-2">
                          {testStatus === 'success' && <CheckCircle className="h-4 w-4 text-green-500" />}
                          {testStatus === 'failed' && <XCircle className="h-4 w-4 text-red-500" />}
                          {testStatus === 'testing' && <Clock className="h-4 w-4 text-yellow-500" />}
                          <span className="font-medium">
                            {testStatus === 'success' && 'Test Successful'}
                            {testStatus === 'failed' && 'Test Failed'}
                            {testStatus === 'testing' && 'Testing...'}
                          </span>
                        </div>
                      </CardHeader>
                      {testResponse && (
                        <CardContent className="pt-0">
                          <div className="space-y-2">
                            <Label>Response</Label>
                            <pre className="bg-muted p-3 rounded-md text-xs overflow-auto max-h-40">
                              {testResponse}
                            </pre>
                          </div>
                        </CardContent>
                      )}
                    </Card>
                  )}
                </CardContent>
              </Card>

              {/* Preview */}
              {formData.name && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Preview</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium">{formData.name}</h3>
                        <Badge variant="outline">{formData.method}</Badge>
                      </div>
                      
                      {formData.description && (
                        <p className="text-sm text-muted-foreground">
                          {formData.description}
                        </p>
                      )}
                      
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">URL:</span>
                          <span className="truncate ml-2">{formData.endpointUrl || 'Not set'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Timeout:</span>
                          <span>{formData.timeoutSeconds}s</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Retries:</span>
                          <span>{formData.retryAttempts}</span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>

          {/* Actions */}
          <Separator />
          <div className="flex justify-end gap-2">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={!isValid || isLoading}
            >
              {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Create Webhook
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}