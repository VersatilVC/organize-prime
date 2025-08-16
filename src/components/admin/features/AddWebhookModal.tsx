import React, { useState } from 'react';
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
import { Loader2, Webhook } from 'lucide-react';

interface AddWebhookModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  feature: SystemFeature;
}

export function AddWebhookModal({ open, onOpenChange, feature }: AddWebhookModalProps) {
  const { toast } = useToast();
  const { createWebhook, isCreating } = useFeatureWebhooks(feature.id);
  
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

  const resetForm = () => {
    setFormData({
      name: '',
      url: '',
      description: '',
      event_types: ['webhook.test'],
      timeout_seconds: 30,
      retry_attempts: 3,
      is_active: true
    });
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
    console.log('🔍 AddWebhookModal: Form submitted');

    if (!validateForm()) {
      console.log('❌ Form validation failed');
      return;
    }

    console.log('✅ Form validation passed, creating webhook:', formData);

    try {
      const result = await createWebhook({
        ...formData,
        feature_id: feature.id
      });
      
      console.log('✅ Webhook created successfully:', result);
      onOpenChange(false);
      resetForm();
    } catch (error) {
      console.error('❌ Error creating webhook:', error);
      // Error handled by hook, but let's also show it here for debugging
    }
  };

  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
      resetForm();
    }
    onOpenChange(isOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Webhook className="h-5 w-5" />
            Add Webhook for {feature.display_name}
          </DialogTitle>
          <DialogDescription>
            Configure a new N8N webhook endpoint for this feature
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
                Webhook will be associated with this feature
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
            <Label htmlFor="active">Enable webhook immediately</Label>
          </div>

          <div className="bg-muted/50 p-4 rounded-lg space-y-2">
            <h4 className="font-medium text-sm">Event Types</h4>
            <p className="text-xs text-muted-foreground">
              This webhook will be triggered for the following events related to the <strong>{feature.display_name}</strong> feature:
            </p>
            <div className="flex flex-wrap gap-1 mt-2">
              <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-primary/10 text-primary">
                webhook.test
              </span>
              <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-muted text-muted-foreground">
                feature.{feature.slug}.* (coming soon)
              </span>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isCreating}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isCreating}>
              {isCreating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Create Webhook
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}