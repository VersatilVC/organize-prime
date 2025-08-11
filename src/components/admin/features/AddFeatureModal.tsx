import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { 
  Package, 
  Palette, 
  Hash,
  FileText,
  Loader2,
  Check
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface AddFeatureModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  trigger?: React.ReactNode;
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
  'Package', 'FileText', 'BarChart3', 'Users', 'Settings',
  'Zap', 'Database', 'Globe', 'MessageSquare', 'Calendar'
];

export function AddFeatureModal({ open, onOpenChange, trigger }: AddFeatureModalProps) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    displayName: '',
    slug: '',
    description: '',
    category: '',
    iconName: 'Package',
    colorHex: '#3b82f6'
  });

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
    setIsLoading(true);

    try {
      // Implementation for creating feature
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate API call
      
      toast({
        title: 'Feature Created',
        description: `${formData.displayName} has been created successfully`,
      });
      
      // Reset form
      setFormData({
        displayName: '',
        slug: '',
        description: '',
        category: '',
        iconName: 'Package',
        colorHex: '#3b82f6'
      });
      
      onOpenChange(false);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to create feature',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const isValid = formData.displayName && formData.slug && formData.category;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Add New Feature
          </DialogTitle>
          <DialogDescription>
            Create a new system feature that can be enabled across organizations
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
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
              />
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
              {iconOptions.map((icon) => (
                <Button
                  key={icon}
                  type="button"
                  variant={formData.iconName === icon ? "default" : "outline"}
                  size="sm"
                  className="h-10"
                  onClick={() => setFormData(prev => ({ ...prev, iconName: icon }))}
                >
                  <Package className="h-4 w-4" />
                </Button>
              ))}
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
                    <Package className="h-5 w-5" />
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

          {/* Actions */}
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
              Create Feature
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}