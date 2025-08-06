import React, { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useMutation } from '@tanstack/react-query';
import { 
  Package, 
  Settings, 
  Store, 
  ChevronLeft, 
  ChevronRight,
  Check,
  X
} from 'lucide-react';
import * as Icons from 'lucide-react';

import { type AppCategory } from '@/hooks/useAppCategories';

interface AppCreationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categories: AppCategory[];
  onSuccess: () => void;
}

interface AppFormData {
  name: string;
  slug: string;
  description: string;
  long_description: string;
  category: string;
  icon_name: string;
  pricing_model: 'free' | 'paid' | 'freemium';
  base_price: number;
  required_permissions: string[];
  n8n_webhooks: Record<string, string>;
  is_featured: boolean;
  is_active: boolean;
  requires_approval: boolean;
}

const AVAILABLE_ICONS = [
  'Package', 'Users', 'Settings', 'Store', 'BarChart3', 'Calendar', 'Mail', 
  'FileText', 'Camera', 'Heart', 'Star', 'Zap', 'Shield', 'Globe', 'Lock',
  'Key', 'Database', 'Cloud', 'Code', 'Smartphone', 'Monitor', 'Tablet',
  'Headphones', 'Mic', 'Video', 'Image', 'Music', 'BookOpen', 'PenTool'
];

const AVAILABLE_PERMISSIONS = [
  'read:profile',
  'write:profile', 
  'read:organization',
  'write:organization',
  'read:users',
  'write:users',
  'read:files',
  'write:files',
  'read:feedback',
  'write:feedback',
  'admin:system'
];

const PRICING_MODELS = [
  { value: 'free', label: 'Free', description: 'No cost to use' },
  { value: 'paid', label: 'Paid', description: 'One-time or recurring payment' },
  { value: 'freemium', label: 'Freemium', description: 'Free with premium features' }
];

export const AppCreationModal: React.FC<AppCreationModalProps> = ({
  open,
  onOpenChange,
  categories,
  onSuccess
}) => {
  const { toast } = useToast();
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<AppFormData>({
    name: '',
    slug: '',
    description: '',
    long_description: '',
    category: '',
    icon_name: 'Package',
    pricing_model: 'free',
    base_price: 0,
    required_permissions: [],
    n8n_webhooks: {},
    is_featured: false,
    is_active: true,
    requires_approval: true
  });
  const [webhookKey, setWebhookKey] = useState('');
  const [webhookValue, setWebhookValue] = useState('');

  // Auto-generate slug from name
  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  };

  const handleNameChange = (name: string) => {
    setFormData(prev => ({
      ...prev,
      name,
      slug: generateSlug(name)
    }));
  };

  const addWebhook = () => {
    if (webhookKey && webhookValue) {
      setFormData(prev => ({
        ...prev,
        n8n_webhooks: {
          ...prev.n8n_webhooks,
          [webhookKey]: webhookValue
        }
      }));
      setWebhookKey('');
      setWebhookValue('');
    }
  };

  const removeWebhook = (key: string) => {
    setFormData(prev => {
      const { [key]: removed, ...rest } = prev.n8n_webhooks;
      return { ...prev, n8n_webhooks: rest };
    });
  };

  const togglePermission = (permission: string) => {
    setFormData(prev => ({
      ...prev,
      required_permissions: prev.required_permissions.includes(permission)
        ? prev.required_permissions.filter(p => p !== permission)
        : [...prev.required_permissions, permission]
    }));
  };

  // Validation
  const isStep1Valid = formData.name && formData.description && formData.category;
  const isStep2Valid = true; // All fields are optional in step 2
  const isStep3Valid = true; // All fields are optional in step 3

  const canProceed = useMemo(() => {
    switch (currentStep) {
      case 1: return isStep1Valid;
      case 2: return isStep2Valid;
      case 3: return isStep3Valid;
      default: return false;
    }
  }, [currentStep, isStep1Valid, isStep2Valid, isStep3Valid]);

  const createAppMutation = useMutation({
    mutationFn: async (data: AppFormData) => {
      const { error } = await supabase
        .from('marketplace_apps' as any)
        .insert({
          name: data.name,
          slug: data.slug,
          description: data.description,
          long_description: data.long_description,
          category: data.category,
          icon_name: data.icon_name,
          pricing_model: data.pricing_model,
          base_price: data.base_price,
          required_permissions: data.required_permissions,
          n8n_webhooks: data.n8n_webhooks,
          is_featured: data.is_featured,
          is_active: data.is_active,
          requires_approval: data.requires_approval
        });
      
      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: 'Success',
        description: 'App created successfully',
      });
      onSuccess();
      onOpenChange(false);
      // Reset form
      setFormData({
        name: '',
        slug: '',
        description: '',
        long_description: '',
        category: '',
        icon_name: 'Package',
        pricing_model: 'free',
        base_price: 0,
        required_permissions: [],
        n8n_webhooks: {},
        is_featured: false,
        is_active: true,
        requires_approval: true
      });
      setCurrentStep(1);
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'Failed to create app',
        variant: 'destructive',
      });
    }
  });

  const handleNext = () => {
    if (currentStep < 3) {
      setCurrentStep(prev => prev + 1);
    } else {
      createAppMutation.mutate(formData);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const getStepIcon = (step: number) => {
    switch (step) {
      case 1: return <Package className="h-4 w-4" />;
      case 2: return <Settings className="h-4 w-4" />;
      case 3: return <Store className="h-4 w-4" />;
      default: return null;
    }
  };

  const renderStep1 = () => (
    <div className="space-y-4">
      <div>
        <Label htmlFor="app-name">App Name *</Label>
        <Input
          id="app-name"
          value={formData.name}
          onChange={(e) => handleNameChange(e.target.value)}
          placeholder="Enter app name"
        />
      </div>

      <div>
        <Label htmlFor="app-slug">App Slug</Label>
        <Input
          id="app-slug"
          value={formData.slug}
          onChange={(e) => setFormData(prev => ({ ...prev, slug: e.target.value }))}
          placeholder="app-slug"
        />
        <p className="text-xs text-muted-foreground mt-1">
          Auto-generated from name, but can be customized
        </p>
      </div>

      <div>
        <Label htmlFor="app-description">Description *</Label>
        <Textarea
          id="app-description"
          value={formData.description}
          onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
          placeholder="Brief description of the app"
          rows={3}
        />
      </div>

      <div>
        <Label htmlFor="app-long-description">Long Description</Label>
        <Textarea
          id="app-long-description"
          value={formData.long_description}
          onChange={(e) => setFormData(prev => ({ ...prev, long_description: e.target.value }))}
          placeholder="Detailed description for the marketplace"
          rows={4}
        />
      </div>

      <div>
        <Label htmlFor="app-category">Category *</Label>
        <Select value={formData.category} onValueChange={(value) => setFormData(prev => ({ ...prev, category: value }))}>
          <SelectTrigger>
            <SelectValue placeholder="Select a category" />
          </SelectTrigger>
          <SelectContent>
            {categories.map((category) => (
              <SelectItem key={category.id} value={category.slug}>
                {category.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label>Icon</Label>
        <div className="grid grid-cols-8 gap-2 mt-2 max-h-40 overflow-y-auto p-2 border rounded-md">
          {AVAILABLE_ICONS.map((iconName) => {
            const IconComponent = Icons[iconName as keyof typeof Icons] as React.ComponentType<any>;
            return (
              <button
                key={iconName}
                type="button"
                onClick={() => setFormData(prev => ({ ...prev, icon_name: iconName }))}
                className={`p-2 rounded-md border-2 transition-colors ${
                  formData.icon_name === iconName 
                    ? 'border-primary bg-primary/10' 
                    : 'border-muted hover:border-border'
                }`}
              >
                <IconComponent className="h-4 w-4 mx-auto" />
              </button>
            );
          })}
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          Selected: {formData.icon_name}
        </p>
      </div>
    </div>
  );

  const renderStep2 = () => (
    <div className="space-y-6">
      <div>
        <Label>Pricing Model</Label>
        <div className="grid gap-3 mt-2">
          {PRICING_MODELS.map((model) => (
            <Card 
              key={model.value}
              className={`cursor-pointer transition-colors ${
                formData.pricing_model === model.value 
                  ? 'border-primary bg-primary/5' 
                  : 'hover:border-border'
              }`}
              onClick={() => setFormData(prev => ({ ...prev, pricing_model: model.value as any }))}
            >
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium">{model.label}</h4>
                    <p className="text-sm text-muted-foreground">{model.description}</p>
                  </div>
                  {formData.pricing_model === model.value && (
                    <Check className="h-4 w-4 text-primary" />
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {formData.pricing_model !== 'free' && (
        <div>
          <Label htmlFor="base-price">Base Price (USD)</Label>
          <Input
            id="base-price"
            type="number"
            min="0"
            step="0.01"
            value={formData.base_price}
            onChange={(e) => setFormData(prev => ({ ...prev, base_price: parseFloat(e.target.value) || 0 }))}
            placeholder="0.00"
          />
        </div>
      )}

      <div>
        <Label>Required Permissions</Label>
        <div className="grid grid-cols-2 gap-2 mt-2 max-h-48 overflow-y-auto">
          {AVAILABLE_PERMISSIONS.map((permission) => (
            <div key={permission} className="flex items-center space-x-2">
              <input
                type="checkbox"
                id={`permission-${permission}`}
                checked={formData.required_permissions.includes(permission)}
                onChange={() => togglePermission(permission)}
                className="rounded border-border"
              />
              <Label 
                htmlFor={`permission-${permission}`}
                className="text-sm font-normal cursor-pointer"
              >
                {permission}
              </Label>
            </div>
          ))}
        </div>
      </div>

      <div>
        <Label>N8N Webhook Endpoints</Label>
        <div className="space-y-3 mt-2">
          <div className="flex gap-2">
            <Input
              placeholder="Webhook name"
              value={webhookKey}
              onChange={(e) => setWebhookKey(e.target.value)}
            />
            <Input
              placeholder="Webhook URL"
              value={webhookValue}
              onChange={(e) => setWebhookValue(e.target.value)}
            />
            <Button type="button" onClick={addWebhook} disabled={!webhookKey || !webhookValue}>
              Add
            </Button>
          </div>
          
          {Object.entries(formData.n8n_webhooks).length > 0 && (
            <div className="space-y-2">
              {Object.entries(formData.n8n_webhooks).map(([key, value]) => (
                <div key={key} className="flex items-center gap-2 p-2 border rounded-md">
                  <Badge variant="outline">{key}</Badge>
                  <span className="text-sm truncate flex-1">{value}</span>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => removeWebhook(key)}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );

  const renderStep3 = () => (
    <div className="space-y-6">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <Label>Featured App</Label>
            <p className="text-sm text-muted-foreground">
              Display this app prominently in the marketplace
            </p>
          </div>
          <Switch
            checked={formData.is_featured}
            onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_featured: checked }))}
          />
        </div>

        <div className="flex items-center justify-between">
          <div>
            <Label>Active Status</Label>
            <p className="text-sm text-muted-foreground">
              App is available for installation
            </p>
          </div>
          <Switch
            checked={formData.is_active}
            onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_active: checked }))}
          />
        </div>

        <div className="flex items-center justify-between">
          <div>
            <Label>Requires Approval</Label>
            <p className="text-sm text-muted-foreground">
              Organizations need approval to install this app
            </p>
          </div>
          <Switch
            checked={formData.requires_approval}
            onCheckedChange={(checked) => setFormData(prev => ({ ...prev, requires_approval: checked }))}
          />
        </div>
      </div>

      {/* Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">App Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm">
            <div><strong>Name:</strong> {formData.name}</div>
            <div><strong>Slug:</strong> {formData.slug}</div>
            <div><strong>Category:</strong> {categories.find(c => c.slug === formData.category)?.name}</div>
            <div><strong>Pricing:</strong> {formData.pricing_model}</div>
            <div><strong>Permissions:</strong> {formData.required_permissions.length} selected</div>
            <div><strong>Webhooks:</strong> {Object.keys(formData.n8n_webhooks).length} configured</div>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Create New Marketplace App
          </DialogTitle>
        </DialogHeader>

        {/* Step Indicator */}
        <div className="flex items-center justify-center space-x-4 py-4">
          {[1, 2, 3].map((step) => (
            <div key={step} className="flex items-center">
              <div className={`flex items-center justify-center w-8 h-8 rounded-full border-2 ${
                step <= currentStep 
                  ? 'border-primary bg-primary text-primary-foreground' 
                  : 'border-muted-foreground text-muted-foreground'
              }`}>
                {step < currentStep ? (
                  <Check className="h-4 w-4" />
                ) : (
                  getStepIcon(step)
                )}
              </div>
              {step < 3 && (
                <div className={`w-12 h-0.5 ${
                  step < currentStep ? 'bg-primary' : 'bg-muted'
                }`} />
              )}
            </div>
          ))}
        </div>

        <div className="space-y-6">
          {/* Step Content */}
          <div className="min-h-[400px]">
            {currentStep === 1 && renderStep1()}
            {currentStep === 2 && renderStep2()}
            {currentStep === 3 && renderStep3()}
          </div>

          {/* Navigation */}
          <div className="flex justify-between">
            <Button
              variant="outline"
              onClick={handleBack}
              disabled={currentStep === 1}
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Back
            </Button>

            <Button
              onClick={handleNext}
              disabled={!canProceed || createAppMutation.isPending}
            >
              {currentStep === 3 ? (
                createAppMutation.isPending ? 'Creating...' : 'Create App'
              ) : (
                <>
                  Next
                  <ChevronRight className="h-4 w-4 ml-1" />
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};