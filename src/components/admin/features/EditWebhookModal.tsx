import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { useFeatureWebhooks } from '@/hooks/useFeatureWebhooks';
// import { validateWebhookUrl } from '@/lib/webhook-testing';
import type { SystemFeature } from '@/types/features';
import { Loader2, Edit, TestTube } from 'lucide-react';

interface EditWebhookModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  webhook: any;
  feature: SystemFeature;
}

export function EditWebhookModal({ open, onOpenChange, webhook, feature }: EditWebhookModalProps) {
  const { toast } = useToast();
  const { updateWebhook, testWebhook, isUpdating, isTesting } = useFeatureWebhooks(feature.id);
  
  const [formData, setFormData] = useState({
    name: '',
    url: '',
    description: '',
    event_types: ['webhook.test'],
    timeout_seconds: 30,
    retry_attempts: 3,
    is_active: true
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  // Update form when webhook changes
  useEffect(() => {
    if (webhook) {
      setFormData({
        name: webhook.name || '',
        url: webhook.url || '',
        description: webhook.description || '',
        event_types: webhook.event_types || ['webhook.test'],
        timeout_seconds: webhook.timeout_seconds || 30,
        retry_attempts: webhook.retry_attempts || 3,
        is_active: webhook.is_active ?? true
      });
      setErrors({});
    }
  }, [webhook]);

  const resetForm = () => {
    if (webhook) {
      setFormData({
        name: webhook.name || '',
        url: webhook.url || '',
        description: webhook.description || '',
        event_types: webhook.event_types || ['webhook.test'],
        timeout_seconds: webhook.timeout_seconds || 30,
        retry_attempts: webhook.retry_attempts || 3,
        is_active: webhook.is_active ?? true
      });
    }
    setErrors({});
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Webhook name is required';
    }

    if (!formData.url.trim()) {
      newErrors.url = 'Webhook URL is required';
    } else {
      // Simple URL validation fallback
      try {
        new URL(formData.url);
        // Must be HTTP or HTTPS
        if (!formData.url.startsWith('http://') && !formData.url.startsWith('https://')) {
          newErrors.url = 'URL must use HTTP or HTTPS protocol';
        }
      } catch {
        newErrors.url = 'Invalid URL format';
      }
    }

    if (formData.timeout_seconds < 5 || formData.timeout_seconds > 300) {
      newErrors.timeout_seconds = 'Timeout must be between 5 and 300 seconds';
    }

    if (formData.retry_attempts < 0 || formData.retry_attempts > 10) {
      newErrors.retry_attempts = 'Retry attempts must be between 0 and 10';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm() || !webhook) {
      return;
    }

    try {
      await updateWebhook({
        id: webhook.id,
        ...formData
      });
      
      onOpenChange(false);
    } catch (error) {
      // Error handled by hook
    }
  };

  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
      resetForm();
    }
    onOpenChange(isOpen);
  };

  const handleTestWebhook = async () => {
    if (!webhook) return;
    
    try {
      await testWebhook(webhook.id);
      // Success and error messages are handled by the hook
    } catch (error) {
      console.error('Test webhook error:', error);
    }
  };

  if (!webhook) return null;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Edit className="h-5 w-5" />
            Edit Webhook: {webhook.name}
          </DialogTitle>
          <DialogDescription>
            Update the webhook configuration for the <strong>{feature.display_name}</strong> feature
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Webhook Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="e.g., Process Document"
                className={errors.name ? 'border-destructive' : ''}
              />
              {errors.name && (
                <p className="text-sm text-destructive">{errors.name}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="feature">Feature</Label>
              <Input
                id="feature"
                value={feature.display_name}
                disabled
                className="bg-muted"
              />
              <p className="text-xs text-muted-foreground">
                Webhook is associated with this feature
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="url">Webhook URL *</Label>
            <Input
              id="url"
              value={formData.url}
              onChange={(e) => setFormData(prev => ({ ...prev, url: e.target.value }))}
              placeholder="https://n8n.example.com/webhook/..."
              className={errors.url ? 'border-destructive' : ''}
            />
            {errors.url && (
              <p className="text-sm text-destructive">{errors.url}</p>
            )}
            <p className="text-xs text-muted-foreground">
              Use HTTPS URLs for production environments
            </p>
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

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="timeout">Timeout (seconds)</Label>
              <Input
                id="timeout"
                type="number"
                min="5"
                max="300"
                value={formData.timeout_seconds}
                onChange={(e) => setFormData(prev => ({ 
                  ...prev, 
                  timeout_seconds: parseInt(e.target.value) || 30 
                }))}
                className={errors.timeout_seconds ? 'border-destructive' : ''}
              />
              {errors.timeout_seconds && (
                <p className="text-sm text-destructive">{errors.timeout_seconds}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="retry">Retry Attempts</Label>
              <Input
                id="retry"
                type="number"
                min="0"
                max="10"
                value={formData.retry_attempts}
                onChange={(e) => setFormData(prev => ({ 
                  ...prev, 
                  retry_attempts: parseInt(e.target.value) || 3 
                }))}
                className={errors.retry_attempts ? 'border-destructive' : ''}
              />
              {errors.retry_attempts && (
                <p className="text-sm text-destructive">{errors.retry_attempts}</p>
              )}
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              id="active"
              checked={formData.is_active}
              onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_active: checked }))}
            />
            <Label htmlFor="active">Enable webhook</Label>
          </div>

          {/* Webhook Statistics */}
          <div className="bg-muted/50 p-4 rounded-lg space-y-2">
            <h4 className="font-medium text-sm">Webhook Statistics</h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Success Count:</span>
                <span className="ml-2 font-medium text-green-600">{webhook.success_count || 0}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Failure Count:</span>
                <span className="ml-2 font-medium text-red-600">{webhook.failure_count || 0}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Avg Response:</span>
                <span className="ml-2 font-medium">{webhook.avg_response_time || 0}ms</span>
              </div>
              <div>
                <span className="text-muted-foreground">Last Triggered:</span>
                <span className="ml-2 font-medium">
                  {webhook.last_triggered 
                    ? new Date(webhook.last_triggered).toLocaleDateString() 
                    : 'Never'}
                </span>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isUpdating || isTesting}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={handleTestWebhook}
              disabled={isUpdating || isTesting}
            >
              {isTesting ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <TestTube className="h-4 w-4 mr-2" />
              )}
              Test Webhook
            </Button>
            <Button type="submit" disabled={isUpdating || isTesting}>
              {isUpdating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Update Webhook
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}