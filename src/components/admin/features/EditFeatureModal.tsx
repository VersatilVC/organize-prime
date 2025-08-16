import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useSystemFeatures } from '@/hooks/database/useSystemFeatures';
import { useFeatureValidation } from '@/hooks/database/useFeatureValidation';
import { FeaturePageManager } from './FeaturePageManager';
import { FeatureWebhookManager } from './FeatureWebhookManager';
import { Icons } from '@/components/ui/icons';
import { 
  Package, 
  Loader2,
  Check
} from 'lucide-react';
import type { SystemFeature } from '@/types/features';
import type { FeaturePage } from '@/types/feature-pages';

interface EditFeatureModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  feature: SystemFeature | null;
}

const categories = [
  { value: 'business', label: 'Business', color: '#3b82f6' },
  { value: 'productivity', label: 'Productivity', color: '#10b981' },
  { value: 'analytics', label: 'Analytics', color: '#8b5cf6' },
  { value: 'communication', label: 'Communication', color: '#f59e0b' },
  { value: 'integration', label: 'Integration', color: '#6366f1' },
];

const predefinedColors = [
  '#3b82f6', '#10b981', '#8b5cf6', '#f59e0b', '#ef4444',
  '#6366f1', '#ec4899', '#14b8a6', '#f97316', '#84cc16'
];

const iconOptions = [
  'package', 'fileText', 'barChart', 'users', 'settings',
  'zap', 'database', 'messageSquare', 'calendar'
];

export function EditFeatureModal({ open, onOpenChange, feature }: EditFeatureModalProps) {
  const { toast } = useToast();
  const { updateFeature, isUpdating } = useSystemFeatures();
  const { validateFeatureData } = useFeatureValidation();
  const [currentStep, setCurrentStep] = useState(1);
  const [pages, setPages] = useState<FeaturePage[]>([]);
  const [formData, setFormData] = useState({
    displayName: '',
    slug: '',
    description: '',
    category: '',
    iconName: 'package',
    colorHex: '#3b82f6'
  });

  // Update form data when feature changes
  useEffect(() => {
    if (feature) {
      setFormData({
        displayName: feature.display_name,
        slug: feature.slug,
        description: feature.description || '',
        category: feature.category,
        iconName: feature.icon_name,
        colorHex: feature.color_hex
      });
      
      // Load existing pages from navigation_config.pages (database structure)
      const existingPages = feature.navigation_config?.pages || [];
      console.log('🔍 EditFeatureModal: Feature data:', feature);
      console.log('🔍 EditFeatureModal: Navigation config:', feature.navigation_config);
      console.log('🔍 EditFeatureModal: Existing pages from database:', existingPages);
      
      // Convert to FeaturePage format if needed (in case of different structure)
      const formattedPages: FeaturePage[] = existingPages.map((page: any, index: number) => ({
        id: page.id || `page-${index}`,
        title: page.title || page.name || 'Untitled Page',
        route: page.route || page.href || '',
        description: page.description || '',
        component: page.component || 'Custom',
        permissions: page.permissions || ['read'],
        isDefault: page.isDefault || index === 0,
        menuOrder: page.menuOrder || index,
        icon: page.icon || 'FileText'
      }));
      
      setPages(formattedPages);
    }
  }, [feature]);

  // Reset step only when modal opens
  useEffect(() => {
    if (open) {
      setCurrentStep(1);
    }
  }, [open]);

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .replace(/\s+/g, '-')
      .trim();
  };

  const handleDisplayNameChange = (value: string) => {
    setFormData(prev => ({
      ...prev,
      displayName: value,
      slug: generateSlug(value)
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!feature) return;

    // Validate feature data including pages
    const validation = await validateFeatureData({
      ...formData,
      pages
    }, feature.id);

    if (!validation.isValid) {
      validation.errors.forEach(error => {
        toast({
          title: 'Validation Error',
          description: error,
          variant: 'destructive',
        });
      });
      return;
    }

    try {
      console.log('🔍 EditFeatureModal: Submitting pages:', pages);
      console.log('🔍 EditFeatureModal: Full update payload:', {
        id: feature.id,
        updates: {
          displayName: formData.displayName,
          description: formData.description,
          category: formData.category,
          iconName: formData.iconName,
          colorHex: formData.colorHex,
          navigation_config: {
            pages: pages
          }
        }
      });
      
      await updateFeature({
        id: feature.id,
        updates: {
          displayName: formData.displayName,
          description: formData.description,
          category: formData.category,
          iconName: formData.iconName,
          colorHex: formData.colorHex,
          navigation_config: {
            pages: pages
          }
        }
      });
      
      toast({
        title: 'Success',
        description: `Feature "${formData.displayName}" updated successfully`,
      });
      
      onOpenChange(false);
    } catch (error) {
      console.error('Error updating feature:', error);
    }
  };

  const handleNextStep = (e: React.MouseEvent) => {
    e.preventDefault(); // Prevent form submission
    console.log('Next step clicked, current step:', currentStep, 'isValid:', isValid);
    if (currentStep === 1 && isValid) {
      setCurrentStep(2);
      console.log('Moving to step 2');
    } else if (currentStep === 2) {
      setCurrentStep(3);
      console.log('Moving to step 3');
    }
  };

  const handlePrevStep = () => {
    if (currentStep === 2) {
      setCurrentStep(1);
    } else if (currentStep === 3) {
      setCurrentStep(2);
    }
  };

  const isValid = formData.displayName && formData.slug && formData.category;

  if (!feature) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Edit Feature - Step {currentStep} of 3
          </DialogTitle>
          <DialogDescription>
            {currentStep === 1 
              ? 'Update the feature configuration and settings'
              : currentStep === 2
              ? 'Manage the pages and routes for your feature'
              : 'Configure N8N webhooks for feature automation'
            }
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {currentStep === 1 && (
            <>
              {/* Basic Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="displayName">Display Name *</Label>
                  <Input
                    id="displayName"
                    value={formData.displayName}
                    onChange={(e) => handleDisplayNameChange(e.target.value)}
                    placeholder="e.g., Document Management"
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="slug">Slug *</Label>
                  <Input
                    id="slug"
                    value={formData.slug}
                    onChange={(e) => setFormData(prev => ({ ...prev, slug: e.target.value }))}
                    placeholder="e.g., document-management"
                    required
                    disabled // Prevent slug changes for existing features
                  />
                  <p className="text-xs text-muted-foreground">
                    Slug cannot be changed for existing features
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Describe what this feature does..."
                  rows={3}
                />
              </div>

              {/* Category Selection */}
              <div className="space-y-2">
                <Label>Category *</Label>
                <Select
                  value={formData.category}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, category: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((category) => (
                      <SelectItem key={category.value} value={category.value}>
                        <div className="flex items-center gap-2">
                          <div 
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: category.color }}
                          />
                          {category.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Icon Selection */}
              <div className="space-y-2">
                <Label>Icon</Label>
                <div className="grid grid-cols-5 gap-2">
                  {iconOptions.map((icon) => {
                    const IconComponent = Icons[icon as keyof typeof Icons] || Icons.package;
                    return (
                      <Button
                        key={icon}
                        type="button"
                        variant={formData.iconName === icon ? "default" : "outline"}
                        size="sm"
                        className="h-10"
                        onClick={() => setFormData(prev => ({ ...prev, iconName: icon }))}
                      >
                        <IconComponent className="h-4 w-4" />
                      </Button>
                    );
                  })}
                </div>
              </div>

              {/* Color Selection */}
              <div className="space-y-2">
                <Label>Theme Color</Label>
                <div className="flex items-center gap-2">
                  <div className="grid grid-cols-5 gap-2">
                    {predefinedColors.map((color) => (
                      <Button
                        key={color}
                        type="button"
                        variant="outline"
                        size="sm"
                        className="w-10 h-10 p-0 relative"
                        style={{ backgroundColor: color }}
                        onClick={() => setFormData(prev => ({ ...prev, colorHex: color }))}
                      >
                        {formData.colorHex === color && (
                          <Check className="h-4 w-4 text-white" />
                        )}
                      </Button>
                    ))}
                  </div>
                  <Input
                    type="color"
                    value={formData.colorHex}
                    onChange={(e) => setFormData(prev => ({ ...prev, colorHex: e.target.value }))}
                    className="w-16 h-10"
                  />
                </div>
              </div>

              {/* Preview */}
              {formData.displayName && (
                <div className="space-y-2">
                  <Label>Preview</Label>
                  <Card className="p-4">
                    <div className="flex items-center gap-3">
                      <div 
                        className="w-10 h-10 rounded-lg flex items-center justify-center text-white"
                        style={{ backgroundColor: formData.colorHex }}
                      >
                        {(() => {
                          const IconComponent = Icons[formData.iconName as keyof typeof Icons] || Icons.package;
                          return <IconComponent className="h-5 w-5" />;
                        })()}
                      </div>
                      <div>
                        <h3 className="font-medium">{formData.displayName}</h3>
                        {formData.category && (
                          <Badge variant="outline" className="text-xs mt-1">
                            {categories.find(c => c.value === formData.category)?.label}
                          </Badge>
                        )}
                      </div>
                    </div>
                    {formData.description && (
                      <p className="text-sm text-muted-foreground mt-2">
                        {formData.description}
                      </p>
                    )}
                  </Card>
                </div>
              )}
            </>
          )}

          {currentStep === 2 && (
            <div className="space-y-4">
              <FeaturePageManager
                pages={pages}
                onChange={setPages}
                featureSlug={formData.slug}
              />
            </div>
          )}

          {currentStep === 3 && feature && (
            <div className="space-y-4">
              <FeatureWebhookManager feature={feature} />
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-between gap-2">
            <div>
              {(currentStep === 2 || currentStep === 3) && (
                <Button 
                  type="button" 
                  variant="outline"
                  onClick={handlePrevStep}
                >
                  Previous
                </Button>
              )}
            </div>
            
            <div className="flex gap-2">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              
              {currentStep === 1 ? (
                <Button 
                  type="button" 
                  onClick={handleNextStep}
                  disabled={!isValid}
                >
                  Next: Manage Pages
                </Button>
              ) : currentStep === 2 ? (
                <Button 
                  type="button" 
                  onClick={handleNextStep}
                >
                  Next: Manage Webhooks
                </Button>
              ) : (
                <Button 
                  type="submit" 
                  disabled={isUpdating}
                >
                  {isUpdating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Update Feature
                </Button>
              )}
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}